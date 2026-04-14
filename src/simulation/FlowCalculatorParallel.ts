import type { Building, LandUse, GraphEdge, TransportMode } from '../config/types';
import type { BuildingStore } from '../data/BuildingStore';
import type { StreetGraph } from '../data/streetGraph';
import type { SegmentUsage } from '../data/StreetUsageTracker';
import type { GraphPartitioner } from '../data/partition/GraphPartitioner';
import type { IncrementalManager } from '../data/partition/IncrementalManager';
import type {
  FlowWorkerMessage,
  FlowWorkerResult,
  SerializedGraph,
} from '../data/partition/types';
import { HierarchicalPathfinder } from './hierarchicalPathfinder';
import { Pathfinder } from './pathfinder';
import { ODMatrix } from './odMatrix';
import { StreetUsageTracker } from '../data/StreetUsageTracker';

// Import worker using Vite's worker syntax
import FlowWorkerModule from './flowWorker?worker';

export interface FlowResult {
  streetFlows: SegmentUsage[];
  buildingGenerated: Map<string, number>;
  buildingAttracted: Map<string, number>;
  totalTrips: number;
  avgDistance: number;
}

interface WorkerPoolEntry {
  worker: Worker;
  busy: boolean;
}

/**
 * FlowCalculatorParallel computes trip distribution using parallel Web Workers.
 * It can operate in two modes:
 * 1. Hierarchical mode: Uses partitioned graph and HierarchicalPathfinder
 * 2. Parallel mode: Uses Web Worker pool for parallel computation
 */
export class FlowCalculatorParallel {
  private buildingStore: BuildingStore;
  private streetGraph: StreetGraph;
  private partitioner: GraphPartitioner | null = null;
  private incrementalManager: IncrementalManager | null = null;
  private hierarchicalPathfinder: HierarchicalPathfinder | null = null;
  private simplePathfinder: Pathfinder | null = null;
  private odMatrix: ODMatrix;
  private workerPool: WorkerPoolEntry[] = [];
  private isInitialized = false;
  private useParallelWorkers: boolean;
  private numWorkers: number;

  constructor(
    buildingStore: BuildingStore,
    streetGraph: StreetGraph,
    options: {
      useParallelWorkers?: boolean;
      numWorkers?: number;
    } = {}
  ) {
    this.buildingStore = buildingStore;
    this.streetGraph = streetGraph;
    this.odMatrix = new ODMatrix();
    this.useParallelWorkers = options.useParallelWorkers ?? false;
    this.numWorkers = options.numWorkers ?? Math.min(4, navigator.hardwareConcurrency || 4);
  }

  /**
   * Enable partitioned pathfinding for faster computation.
   * Note: Currently uses simple A* pathfinder for performance.
   * Hierarchical pathfinder is available for future incremental updates.
   */
  enablePartitioning(partitioner: GraphPartitioner, manager?: IncrementalManager): void {
    this.partitioner = partitioner;
    this.incrementalManager = manager ?? null;

    // Use simple A* pathfinder for now (much faster than hierarchical for full calculations)
    this.simplePathfinder = new Pathfinder(this.streetGraph);

    // Keep hierarchical pathfinder for future incremental update support
    this.hierarchicalPathfinder = new HierarchicalPathfinder(this.streetGraph, partitioner);

    if (this.incrementalManager && this.hierarchicalPathfinder) {
      this.hierarchicalPathfinder.setIncrementalManager(this.incrementalManager);
    }

    console.log('FlowCalculatorParallel: Partitioning enabled (using simple A* pathfinder)');
  }

  /**
   * Initialize Web Worker pool.
   */
  async initializeWorkers(): Promise<void> {
    if (this.isInitialized || !this.useParallelWorkers) return;

    console.log(`FlowCalculatorParallel: Initializing ${this.numWorkers} workers...`);

    // Serialize graph data for workers
    const serializedGraph = this.serializeGraph();

    // Serialize destination buildings
    const destinations = this.buildingStore.destinations.map((b) => ({
      id: b.id,
      centroid: b.centroid,
      estimatedResidents: b.estimatedResidents,
      landUseAreas: Array.from(b.landUseAreas.entries()),
    }));

    // Create worker pool
    const initPromises: Promise<void>[] = [];

    for (let i = 0; i < this.numWorkers; i++) {
      const worker = new FlowWorkerModule() as Worker;
      this.workerPool.push({ worker, busy: false });

      const initPromise = new Promise<void>((resolve, reject) => {
        const handler = (event: MessageEvent<FlowWorkerResult>) => {
          if (event.data.type === 'init_complete') {
            worker.removeEventListener('message', handler);
            resolve();
          } else if (event.data.type === 'error') {
            worker.removeEventListener('message', handler);
            reject(new Error(event.data.error));
          }
        };
        worker.addEventListener('message', handler);
      });

      initPromises.push(initPromise);

      // Send init message
      const initMessage: FlowWorkerMessage = {
        type: 'init',
        graph: serializedGraph,
        buildings: destinations,
      };
      worker.postMessage(initMessage);
    }

    await Promise.all(initPromises);
    this.isInitialized = true;
    console.log('FlowCalculatorParallel: Workers initialized');
  }

  /**
   * Terminate all workers.
   */
  terminateWorkers(): void {
    for (const entry of this.workerPool) {
      entry.worker.terminate();
    }
    this.workerPool = [];
    this.isInitialized = false;
  }

  /**
   * Calculate flows using single-threaded hierarchical pathfinding.
   * @param enabledLandUses - Set of enabled land use types
   * @param transportMode - Transport mode for decay calculations (default: pedestrian)
   */
  calculate(enabledLandUses: Set<LandUse>, transportMode: TransportMode = 'pedestrian'): FlowResult {
    console.log('FlowCalculatorParallel: Starting single-threaded calculation...');
    console.log(`  Transport mode: ${transportMode}`);
    const startTime = performance.now();

    // Recalculate O-D matrix with transport mode
    this.odMatrix.calculate(
      this.buildingStore.residential,
      this.buildingStore.destinations,
      enabledLandUses,
      transportMode
    );

    const usageTracker = new StreetUsageTracker();
    const buildingGenerated = new Map<string, number>();
    const buildingAttracted = new Map<string, number>();
    let totalTrips = 0;
    let totalDistance = 0;

    // Use simple A* pathfinder (faster than hierarchical for full calculations)
    const pathfinder = this.simplePathfinder;
    let pathsComputed = 0;

    for (const origin of this.buildingStore.residential) {
      if (!this.odMatrix.hasDestinations(origin.id)) continue;

      const tripRate = this.getTripRate(origin);
      if (tripRate <= 0) continue;

      const entries = this.odMatrix.getEntries(origin.id);
      if (!entries) continue;

      for (const entry of entries) {
        const expectedTrips = entry.probability * tripRate;
        if (expectedTrips < 0.1) continue;

        const tripCount = Math.round(expectedTrips);
        if (tripCount <= 0) continue;

        // Use simple A* pathfinder with mode-specific routing (cars use roads, pedestrians can use paths, etc.)
        let path: { points: [number, number][]; totalDistance: number };
        if (pathfinder) {
          const result = pathfinder.findPath(origin.centroid, entry.destination.centroid, transportMode);
          path = { points: result.points, totalDistance: result.totalDistance };
        } else {
          // Fallback to direct distance
          const dx = entry.destination.centroid[0] - origin.centroid[0];
          const dy = entry.destination.centroid[1] - origin.centroid[1];
          const dist = Math.sqrt(dx * dx + dy * dy) * 111000;
          path = { points: [origin.centroid, entry.destination.centroid], totalDistance: dist };
        }
        pathsComputed++;

        // Record street usage
        if (path.points.length > 2) {
          usageTracker.recordPathWithWeight(path.points.slice(1, -1), tripCount);
        }

        buildingGenerated.set(origin.id, (buildingGenerated.get(origin.id) || 0) + tripCount);
        buildingAttracted.set(
          entry.destination.id,
          (buildingAttracted.get(entry.destination.id) || 0) + tripCount
        );

        totalTrips += tripCount;
        totalDistance += path.totalDistance * tripCount;
      }
    }

    const elapsed = performance.now() - startTime;
    const avgDistance = totalTrips > 0 ? totalDistance / totalTrips : 0;

    console.log(
      `FlowCalculatorParallel: Complete - ${totalTrips} trips, ${pathsComputed} paths in ${elapsed.toFixed(1)}ms`
    );

    return {
      streetFlows: usageTracker.getSegmentUsage(),
      buildingGenerated,
      buildingAttracted,
      totalTrips,
      avgDistance,
    };
  }

  /**
   * Calculate flows using parallel Web Workers.
   * @param enabledLandUses - Set of enabled land use types
   * @param onProgress - Progress callback
   * @param transportMode - Transport mode for decay calculations (default: pedestrian)
   */
  async calculateParallel(
    enabledLandUses: Set<LandUse>,
    onProgress?: (percent: number, status: string) => void,
    transportMode: TransportMode = 'pedestrian'
  ): Promise<FlowResult> {
    if (!this.useParallelWorkers || !this.isInitialized) {
      // Fall back to single-threaded calculation
      return this.calculateAsync(enabledLandUses, onProgress, transportMode);
    }

    console.log('FlowCalculatorParallel: Starting parallel calculation...');
    const startTime = performance.now();

    onProgress?.(0, 'Preparing batches...');

    // Prepare origin batches
    const origins = this.buildingStore.residential.map((b) => ({
      id: b.id,
      centroid: b.centroid,
      estimatedResidents: b.estimatedResidents,
      landUseAreas: Array.from(b.landUseAreas.entries()),
    }));

    const enabledList = Array.from(enabledLandUses);
    const batchSize = Math.ceil(origins.length / this.numWorkers);
    const batches: (typeof origins)[] = [];

    for (let i = 0; i < origins.length; i += batchSize) {
      batches.push(origins.slice(i, i + batchSize));
    }

    onProgress?.(5, `Computing flows in ${batches.length} parallel batches...`);

    // Submit batches to workers
    const results = await Promise.all(
      batches.map((batch, index) => this.submitBatch(batch, enabledList, index))
    );

    onProgress?.(90, 'Merging results...');

    // Merge results
    const mergedSegments: Record<string, number> = {};
    const buildingGenerated = new Map<string, number>();
    const buildingAttracted = new Map<string, number>();
    let totalTrips = 0;
    let totalDistance = 0;

    for (const result of results) {
      if (result.segmentCounts) {
        for (const [key, count] of Object.entries(result.segmentCounts)) {
          mergedSegments[key] = (mergedSegments[key] || 0) + count;
        }
      }
      if (result.buildingGenerated) {
        for (const [id, count] of Object.entries(result.buildingGenerated)) {
          buildingGenerated.set(id, (buildingGenerated.get(id) || 0) + count);
        }
      }
      if (result.buildingAttracted) {
        for (const [id, count] of Object.entries(result.buildingAttracted)) {
          buildingAttracted.set(id, (buildingAttracted.get(id) || 0) + count);
        }
      }
      totalTrips += result.totalTrips ?? 0;
      totalDistance += result.totalDistance ?? 0;
    }

    // Convert segment counts to SegmentUsage format
    const streetFlows: SegmentUsage[] = [];
    const maxCount = Math.max(...Object.values(mergedSegments), 1);
    for (const [key, count] of Object.entries(mergedSegments)) {
      const [fromStr, toStr] = key.split('-');
      const [fromLng, fromLat] = fromStr.split(',').map(Number);
      const [toLng, toLat] = toStr.split(',').map(Number);
      streetFlows.push({
        from: [fromLng, fromLat],
        to: [toLng, toLat],
        count,
        normalized: count / maxCount,
      });
    }

    const elapsed = performance.now() - startTime;
    const avgDistance = totalTrips > 0 ? totalDistance / totalTrips : 0;

    onProgress?.(100, 'Complete');

    console.log(`FlowCalculatorParallel: Parallel complete - ${totalTrips} trips in ${elapsed.toFixed(1)}ms`);

    return {
      streetFlows,
      buildingGenerated,
      buildingAttracted,
      totalTrips,
      avgDistance,
    };
  }

  /**
   * Calculate flows with progress updates (async single-threaded version).
   * @param enabledLandUses - Set of enabled land use types
   * @param onProgress - Progress callback
   * @param transportMode - Transport mode for decay calculations (default: pedestrian)
   */
  async calculateAsync(
    enabledLandUses: Set<LandUse>,
    onProgress?: (percent: number, status: string) => void,
    transportMode: TransportMode = 'pedestrian'
  ): Promise<FlowResult> {
    console.log('FlowCalculatorParallel: Starting async calculation...');
    console.log(`  Transport mode: ${transportMode}`);
    const startTime = performance.now();

    onProgress?.(0, 'Building O-D matrix...');
    await new Promise((resolve) => setTimeout(resolve, 0));

    this.odMatrix.calculate(
      this.buildingStore.residential,
      this.buildingStore.destinations,
      enabledLandUses,
      transportMode
    );

    const usageTracker = new StreetUsageTracker();
    const buildingGenerated = new Map<string, number>();
    const buildingAttracted = new Map<string, number>();
    let totalTrips = 0;
    let totalDistance = 0;

    const residential = this.buildingStore.residential;
    const totalOrigins = residential.length;
    let processedOrigins = 0;
    let pathsComputed = 0;

    onProgress?.(5, 'Computing paths and flows...');
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Use simple A* pathfinder (faster than hierarchical for full calculations)
    const pathfinder = this.simplePathfinder;
    const BATCH_SIZE = 50;

    for (let i = 0; i < residential.length; i++) {
      const origin = residential[i];
      processedOrigins++;

      if (!this.odMatrix.hasDestinations(origin.id)) continue;

      const tripRate = this.getTripRate(origin);
      if (tripRate <= 0) continue;

      const entries = this.odMatrix.getEntries(origin.id);
      if (!entries) continue;

      for (const entry of entries) {
        const expectedTrips = entry.probability * tripRate;
        if (expectedTrips < 0.1) continue;

        const tripCount = Math.round(expectedTrips);
        if (tripCount <= 0) continue;

        // Use mode-specific routing (cars use roads, pedestrians can use paths, etc.)
        let path: { points: [number, number][]; totalDistance: number };
        if (pathfinder) {
          const result = pathfinder.findPath(origin.centroid, entry.destination.centroid, transportMode);
          path = { points: result.points, totalDistance: result.totalDistance };
        } else {
          const dx = entry.destination.centroid[0] - origin.centroid[0];
          const dy = entry.destination.centroid[1] - origin.centroid[1];
          const dist = Math.sqrt(dx * dx + dy * dy) * 111000;
          path = { points: [origin.centroid, entry.destination.centroid], totalDistance: dist };
        }
        pathsComputed++;

        if (path.points.length > 2) {
          usageTracker.recordPathWithWeight(path.points.slice(1, -1), tripCount);
        }

        buildingGenerated.set(origin.id, (buildingGenerated.get(origin.id) || 0) + tripCount);
        buildingAttracted.set(
          entry.destination.id,
          (buildingAttracted.get(entry.destination.id) || 0) + tripCount
        );

        totalTrips += tripCount;
        totalDistance += path.totalDistance * tripCount;
      }

      if (processedOrigins % BATCH_SIZE === 0) {
        const percent = 5 + Math.round((processedOrigins / totalOrigins) * 90);
        onProgress?.(
          percent,
          `Processing ${processedOrigins.toLocaleString()} / ${totalOrigins.toLocaleString()} buildings...`
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    onProgress?.(98, 'Finalizing...');

    const elapsed = performance.now() - startTime;
    const avgDistance = totalTrips > 0 ? totalDistance / totalTrips : 0;

    console.log(
      `FlowCalculatorParallel: Complete - ${totalTrips} trips, ${pathsComputed} paths in ${elapsed.toFixed(1)}ms`
    );

    return {
      streetFlows: usageTracker.getSegmentUsage(),
      buildingGenerated,
      buildingAttracted,
      totalTrips,
      avgDistance,
    };
  }

  /**
   * Submit a batch to an available worker.
   */
  private async submitBatch(
    buildings: Array<{
      id: string;
      centroid: [number, number];
      estimatedResidents: number;
      landUseAreas: Array<[string, number]>;
    }>,
    enabledLandUses: string[],
    batchId: number
  ): Promise<FlowWorkerResult> {
    // Find an available worker
    const workerEntry = this.workerPool.find((w) => !w.busy) ?? this.workerPool[0];
    workerEntry.busy = true;

    return new Promise((resolve, reject) => {
      const handler = (event: MessageEvent<FlowWorkerResult>) => {
        if (event.data.batchId === batchId) {
          workerEntry.worker.removeEventListener('message', handler);
          workerEntry.busy = false;

          if (event.data.type === 'error') {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data);
          }
        }
      };

      workerEntry.worker.addEventListener('message', handler);

      const message: FlowWorkerMessage = {
        type: 'calculate',
        buildings,
        enabledLandUses,
        batchId,
      };
      workerEntry.worker.postMessage(message);
    });
  }

  /**
   * Get trip rate for a building.
   */
  private getTripRate(building: Building): number {
    const tripsPerResident = 0.5;
    return building.estimatedResidents * tripsPerResident;
  }

  /**
   * Serialize the street graph for worker transfer.
   */
  private serializeGraph(): SerializedGraph {
    const nodes: SerializedGraph['nodes'] = [];
    const edges: GraphEdge[] = [];

    for (const node of this.streetGraph.nodes.values()) {
      nodes.push({ id: node.id, coord: node.coord });
    }

    for (const [from, nodeEdges] of this.streetGraph.edges.entries()) {
      for (const edge of nodeEdges) {
        edges.push({ from, to: edge.to, weight: edge.weight });
      }
    }

    return { nodes, edges };
  }

  /**
   * Get average distances by land use.
   */
  getAverageDistancesByLandUse(): Map<LandUse, { avgDistance: number; count: number }> {
    return this.odMatrix.getAverageDistancesByLandUse();
  }

  /**
   * Find a path between two coordinates (for preview).
   * @param from - Starting coordinates [lng, lat]
   * @param to - Destination coordinates [lng, lat]
   * @param mode - Transport mode for mode-specific routing (default: pedestrian)
   */
  findPath(from: [number, number], to: [number, number], mode: TransportMode = 'pedestrian') {
    // Use simple A* pathfinder for path preview with mode-specific routing
    if (this.simplePathfinder) {
      const result = this.simplePathfinder.findPath(from, to, mode);
      return { points: result.points, totalDistance: result.totalDistance };
    }

    // Fallback to direct distance
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const dist = Math.sqrt(dx * dx + dy * dy) * 111000;
    return { points: [from, to], totalDistance: dist };
  }

  /**
   * Get the hierarchical pathfinder instance.
   */
  getPathfinder(): HierarchicalPathfinder | null {
    return this.hierarchicalPathfinder;
  }

  /**
   * Get the simple A* pathfinder instance (used for actual calculations).
   */
  getSimplePathfinder(): Pathfinder | null {
    return this.simplePathfinder;
  }

  /**
   * Get cache statistics from the simple A* pathfinder.
   */
  getCacheStats(): { hits: number; misses: number; size: number; maxSize: number; hitRate: number } | null {
    return this.simplePathfinder?.getCacheStats() ?? null;
  }

  /**
   * Check if partitioning is enabled.
   */
  isPartitioningEnabled(): boolean {
    return this.partitioner !== null;
  }
}
