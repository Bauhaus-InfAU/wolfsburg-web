import type { Building, LandUse, TransportMode } from '../config/types';
import { BuildingStore } from '../data/buildingStore';
import { StreetGraph } from '../data/streetGraph';
import { StreetUsageTracker, type SegmentUsage } from '../data/StreetUsageTracker';
import { ODMatrix } from './odMatrix';
import { Pathfinder } from './pathfinder';

export interface FlowResult {
  streetFlows: SegmentUsage[];
  buildingGenerated: Map<string, number>;
  buildingAttracted: Map<string, number>;
  totalTrips: number;
  avgDistance: number;
}

/**
 * FlowCalculator computes trip distribution and assigns flows to streets.
 * Unlike the agent-based simulation, this computes all flows instantly
 * without animation, significantly reducing memory usage.
 */
export class FlowCalculator {
  private buildingStore: BuildingStore;
  private odMatrix: ODMatrix;
  private pathfinder: Pathfinder;

  constructor(buildingStore: BuildingStore, streetGraph: StreetGraph) {
    this.buildingStore = buildingStore;
    this.odMatrix = new ODMatrix();
    this.pathfinder = new Pathfinder(streetGraph);
  }

  /**
   * Calculate all flows based on enabled land uses (sync version).
   * Returns flow data for streets and buildings.
   * @param enabledLandUses - Set of enabled land use types
   * @param transportMode - Transport mode for decay calculations and routing (default: pedestrian)
   */
  calculate(enabledLandUses: Set<LandUse>, transportMode: TransportMode = 'pedestrian'): FlowResult {
    console.log('FlowCalculator: Starting calculation...');
    console.log(`  Transport mode: ${transportMode}`);
    console.log(`  Residential buildings: ${this.buildingStore.residential.length}`);
    console.log(`  Destination buildings: ${this.buildingStore.destinations.length}`);

    // Recalculate O-D matrix with current land uses and transport mode
    console.log('FlowCalculator: Building O-D matrix...');
    this.odMatrix.calculate(
      this.buildingStore.residential,
      this.buildingStore.destinations,
      enabledLandUses,
      transportMode
    );
    console.log('FlowCalculator: O-D matrix complete');

    const usageTracker = new StreetUsageTracker();
    const buildingGenerated = new Map<string, number>();
    const buildingAttracted = new Map<string, number>();
    let totalTrips = 0;
    let totalDistance = 0;

    const residential = this.buildingStore.residential;
    let pathsComputed = 0;

    console.log('FlowCalculator: Computing paths and flows...');

    // For each residential building, compute expected trip distribution
    for (const origin of residential) {
      if (!this.odMatrix.hasDestinations(origin.id)) continue;

      // Get trip probabilities for this origin
      const tripRate = this.getTripRate(origin);
      if (tripRate <= 0) continue;

      // Get expected destinations (only those with significant probability)
      const entries = this.odMatrix.getEntries(origin.id);
      if (!entries) continue;

      for (const entry of entries) {
        const expectedTrips = entry.probability * tripRate;
        if (expectedTrips < 0.1) continue; // Skip negligible flows (raised threshold)

        const tripCount = Math.round(expectedTrips);
        if (tripCount <= 0) continue;

        // Find path using mode-specific routing (cars use roads, pedestrians can use paths, etc.)
        const path = this.pathfinder.findPath(origin.centroid, entry.destination.centroid, transportMode);
        pathsComputed++;

        // Record street usage (excluding first/last connector segments)
        // Record once with weight instead of looping
        if (path.points.length > 2) {
          usageTracker.recordPathWithWeight(path.points.slice(1, -1), tripCount);
        }

        // Track per-building flows
        buildingGenerated.set(
          origin.id,
          (buildingGenerated.get(origin.id) || 0) + tripCount
        );
        buildingAttracted.set(
          entry.destination.id,
          (buildingAttracted.get(entry.destination.id) || 0) + tripCount
        );

        totalTrips += tripCount;
        totalDistance += path.totalDistance * tripCount;
      }
    }

    const avgDistance = totalTrips > 0 ? totalDistance / totalTrips : 0;

    console.log(`FlowCalculator: Complete - ${totalTrips} trips, ${pathsComputed} paths computed`);

    return {
      streetFlows: usageTracker.getSegmentUsage(),
      buildingGenerated,
      buildingAttracted,
      totalTrips,
      avgDistance,
    };
  }

  /**
   * Calculate all flows with progress updates (async version).
   * Yields to event loop periodically to allow UI updates.
   * @param enabledLandUses - Set of enabled land use types
   * @param onProgress - Callback for progress updates (percent 0-100, status message)
   * @param transportMode - Transport mode for decay calculations (default: pedestrian)
   */
  async calculateAsync(
    enabledLandUses: Set<LandUse>,
    onProgress: (percent: number, status: string) => void,
    transportMode: TransportMode = 'pedestrian'
  ): Promise<FlowResult> {
    console.log('FlowCalculator: Starting async calculation...');
    console.log(`  Transport mode: ${transportMode}`);
    console.log(`  Residential buildings: ${this.buildingStore.residential.length}`);
    console.log(`  Destination buildings: ${this.buildingStore.destinations.length}`);

    // Recalculate O-D matrix with current land uses and transport mode
    onProgress(0, 'Building O-D matrix...');
    await new Promise(resolve => setTimeout(resolve, 0)); // Yield for UI update

    console.log('FlowCalculator: Building O-D matrix...');
    this.odMatrix.calculate(
      this.buildingStore.residential,
      this.buildingStore.destinations,
      enabledLandUses,
      transportMode
    );
    console.log('FlowCalculator: O-D matrix complete');

    const usageTracker = new StreetUsageTracker();
    const buildingGenerated = new Map<string, number>();
    const buildingAttracted = new Map<string, number>();
    let totalTrips = 0;
    let totalDistance = 0;

    const residential = this.buildingStore.residential;
    const totalOrigins = residential.length;
    let processedOrigins = 0;
    let pathsComputed = 0;

    onProgress(5, 'Computing paths and flows...');
    await new Promise(resolve => setTimeout(resolve, 0)); // Yield for UI update

    console.log('FlowCalculator: Computing paths and flows...');

    // Process in batches, yielding between batches
    const BATCH_SIZE = 50;

    for (let i = 0; i < residential.length; i++) {
      const origin = residential[i];
      processedOrigins++;

      if (!this.odMatrix.hasDestinations(origin.id)) continue;

      // Get trip probabilities for this origin
      const tripRate = this.getTripRate(origin);
      if (tripRate <= 0) continue;

      // Get expected destinations (only those with significant probability)
      const entries = this.odMatrix.getEntries(origin.id);
      if (!entries) continue;

      for (const entry of entries) {
        const expectedTrips = entry.probability * tripRate;
        if (expectedTrips < 0.1) continue;

        const tripCount = Math.round(expectedTrips);
        if (tripCount <= 0) continue;

        // Find path using mode-specific routing (cars use roads, pedestrians can use paths, etc.)
        const path = this.pathfinder.findPath(origin.centroid, entry.destination.centroid, transportMode);
        pathsComputed++;

        // Record street usage
        if (path.points.length > 2) {
          usageTracker.recordPathWithWeight(path.points.slice(1, -1), tripCount);
        }

        // Track per-building flows
        buildingGenerated.set(
          origin.id,
          (buildingGenerated.get(origin.id) || 0) + tripCount
        );
        buildingAttracted.set(
          entry.destination.id,
          (buildingAttracted.get(entry.destination.id) || 0) + tripCount
        );

        totalTrips += tripCount;
        totalDistance += path.totalDistance * tripCount;
      }

      // Yield to event loop every BATCH_SIZE buildings
      if (processedOrigins % BATCH_SIZE === 0) {
        // Scale percent from 5-95 range (5% for O-D matrix, 95-100% for finalization)
        const percent = 5 + Math.round((processedOrigins / totalOrigins) * 90);
        onProgress(percent, `Processing ${processedOrigins.toLocaleString()} / ${totalOrigins.toLocaleString()} buildings...`);
        // Yield to allow React to re-render
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    onProgress(98, 'Finalizing...');
    const avgDistance = totalTrips > 0 ? totalDistance / totalTrips : 0;

    console.log(`FlowCalculator: Complete - ${totalTrips} trips, ${pathsComputed} paths computed`);

    return {
      streetFlows: usageTracker.getSegmentUsage(),
      buildingGenerated,
      buildingAttracted,
      totalTrips,
      avgDistance,
    };
  }

  /**
   * Get expected trip rate for a building (trips per simulated hour).
   * Based on residential population and activity patterns.
   */
  private getTripRate(building: Building): number {
    // Assume each resident makes ~2-3 trips per day
    // For the flow model, we calculate expected trips per "session"
    // Using a factor that produces reasonable flow volumes
    const tripsPerResident = 0.5; // Expected trips during displayed period
    return building.estimatedResidents * tripsPerResident;
  }

  /**
   * Get average distances by land use.
   */
  getAverageDistancesByLandUse(): Map<LandUse, { avgDistance: number; count: number }> {
    return this.odMatrix.getAverageDistancesByLandUse();
  }

  /**
   * Find shortest path between two coordinates.
   * Exposed for path preview feature.
   * @param from - Starting coordinates [lng, lat]
   * @param to - Destination coordinates [lng, lat]
   * @param mode - Transport mode for mode-specific routing (default: pedestrian)
   */
  findPath(from: [number, number], to: [number, number], mode: TransportMode = 'pedestrian') {
    return this.pathfinder.findPath(from, to, mode);
  }
}
