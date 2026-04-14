import type {
  FlowWorkerMessage,
  FlowWorkerResult,
  SerializedGraph,
} from '../data/partition/types';
import type { LandUse } from '../config/types';
import { MID_DECAY_BETA, MID_MAX_DISTANCE } from '../data/midMobilityData';

// Priority queue for A* algorithm
class PriorityQueue<T> {
  private heap: { value: T; priority: number }[] = [];

  enqueue(value: T, priority: number): void {
    this.heap.push({ value, priority });
    this.bubbleUp(this.heap.length - 1);
  }

  dequeue(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const result = this.heap[0].value;
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }
    return result;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex].priority <= this.heap[index].priority) break;
      [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      let smallest = index;
      if (left < length && this.heap[left].priority < this.heap[smallest].priority) {
        smallest = left;
      }
      if (right < length && this.heap[right].priority < this.heap[smallest].priority) {
        smallest = right;
      }
      if (smallest === index) break;
      [this.heap[smallest], this.heap[index]] = [this.heap[index], this.heap[smallest]];
      index = smallest;
    }
  }
}

// Conversion factor
const DEGREES_TO_METERS = 111000;

function euclideanDistance(coord1: [number, number], coord2: [number, number]): number {
  const dx = (coord2[0] - coord1[0]) * DEGREES_TO_METERS;
  const dy = (coord2[1] - coord1[1]) * DEGREES_TO_METERS;
  return Math.sqrt(dx * dx + dy * dy);
}

// Worker state
let nodes: Map<string, { id: string; coord: [number, number] }> = new Map();
let edges: Map<string, Array<{ to: string; weight: number }>> = new Map();
let spatialIndex: Map<string, string[]> = new Map(); // Grid cell -> node IDs
const SPATIAL_CELL_SIZE = 0.001; // ~100m

// Path cache
const pathCache = new Map<string, { points: [number, number][]; distance: number }>();
const MAX_CACHE_SIZE = 5000;

function initializeGraph(graph: SerializedGraph): void {
  nodes.clear();
  edges.clear();
  spatialIndex.clear();
  pathCache.clear();

  for (const node of graph.nodes) {
    nodes.set(node.id, node);

    // Add to spatial index
    const cellKey = getSpatialCellKey(node.coord);
    if (!spatialIndex.has(cellKey)) {
      spatialIndex.set(cellKey, []);
    }
    spatialIndex.get(cellKey)!.push(node.id);
  }

  for (const edge of graph.edges) {
    if (!edges.has(edge.from)) {
      edges.set(edge.from, []);
    }
    edges.get(edge.from)!.push({ to: edge.to, weight: edge.weight });
  }
}

function getSpatialCellKey(coord: [number, number]): string {
  const col = Math.floor(coord[0] / SPATIAL_CELL_SIZE);
  const row = Math.floor(coord[1] / SPATIAL_CELL_SIZE);
  return `${row},${col}`;
}

function findNearestNode(coord: [number, number]): { id: string; coord: [number, number] } | null {
  const [lng, lat] = coord;
  const col = Math.floor(lng / SPATIAL_CELL_SIZE);
  const row = Math.floor(lat / SPATIAL_CELL_SIZE);

  // Search nearby cells
  let nearest: { id: string; coord: [number, number] } | null = null;
  let nearestDist = Infinity;

  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const cellKey = `${row + dr},${col + dc}`;
      const nodeIds = spatialIndex.get(cellKey);
      if (!nodeIds) continue;

      for (const nodeId of nodeIds) {
        const node = nodes.get(nodeId);
        if (!node) continue;

        const dist = euclideanDistance(coord, node.coord);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = node;
        }
      }
    }
  }

  return nearest;
}

function findPath(
  from: [number, number],
  to: [number, number]
): { points: [number, number][]; distance: number } {
  // Check cache
  const cacheKey = `${from[0].toFixed(5)},${from[1].toFixed(5)}-${to[0].toFixed(5)},${to[1].toFixed(5)}`;
  const cached = pathCache.get(cacheKey);
  if (cached) return cached;

  const startNode = findNearestNode(from);
  const endNode = findNearestNode(to);

  if (!startNode || !endNode) {
    return { points: [from, to], distance: euclideanDistance(from, to) };
  }

  if (startNode.id === endNode.id) {
    const result = {
      points: [from, startNode.coord, to] as [number, number][],
      distance: euclideanDistance(from, startNode.coord) + euclideanDistance(startNode.coord, to),
    };
    cacheResult(cacheKey, result);
    return result;
  }

  // A* search
  const openSet = new PriorityQueue<string>();
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>();
  const visited = new Set<string>();

  gScore.set(startNode.id, 0);
  openSet.enqueue(startNode.id, euclideanDistance(startNode.coord, endNode.coord));

  while (!openSet.isEmpty()) {
    const currentId = openSet.dequeue()!;

    if (currentId === endNode.id) {
      const path = reconstructPath(cameFrom, currentId);
      const fullPath: [number, number][] = [from, ...path.points, to];
      const totalDistance =
        euclideanDistance(from, path.points[0]) +
        path.distance +
        euclideanDistance(path.points[path.points.length - 1], to);

      const result = { points: fullPath, distance: totalDistance };
      cacheResult(cacheKey, result);
      return result;
    }

    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const nodeEdges = edges.get(currentId);
    if (!nodeEdges) continue;

    const currentG = gScore.get(currentId)!;

    for (const edge of nodeEdges) {
      if (visited.has(edge.to)) continue;

      const tentativeG = currentG + edge.weight;

      if (tentativeG < (gScore.get(edge.to) ?? Infinity)) {
        cameFrom.set(edge.to, currentId);
        gScore.set(edge.to, tentativeG);

        const neighbor = nodes.get(edge.to);
        if (neighbor) {
          const f = tentativeG + euclideanDistance(neighbor.coord, endNode.coord);
          openSet.enqueue(edge.to, f);
        }
      }
    }
  }

  // No path found
  const result = { points: [from, to] as [number, number][], distance: euclideanDistance(from, to) };
  cacheResult(cacheKey, result);
  return result;
}

function reconstructPath(
  cameFrom: Map<string, string>,
  current: string
): { points: [number, number][]; distance: number } {
  const points: [number, number][] = [];
  let totalDistance = 0;
  let node = current;
  let prevCoord: [number, number] | null = null;

  while (node) {
    const graphNode = nodes.get(node);
    if (graphNode) {
      points.unshift(graphNode.coord);
      if (prevCoord) {
        totalDistance += euclideanDistance(graphNode.coord, prevCoord);
      }
      prevCoord = graphNode.coord;
    }
    node = cameFrom.get(node)!;
  }

  return { points, distance: totalDistance };
}

function cacheResult(key: string, result: { points: [number, number][]; distance: number }): void {
  if (pathCache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entry
    const firstKey = pathCache.keys().next().value;
    if (firstKey) pathCache.delete(firstKey);
  }
  pathCache.set(key, result);
}

function segmentKey(from: [number, number], to: [number, number]): string {
  // Normalize segment key so (A,B) and (B,A) are the same
  const fromStr = `${from[0].toFixed(5)},${from[1].toFixed(5)}`;
  const toStr = `${to[0].toFixed(5)},${to[1].toFixed(5)}`;
  return fromStr < toStr ? `${fromStr}-${toStr}` : `${toStr}-${fromStr}`;
}

interface WorkerBuilding {
  id: string;
  centroid: [number, number];
  estimatedResidents: number;
  landUseAreas: Array<[string, number]>;
}

function calculateBatch(
  origins: WorkerBuilding[],
  destinations: WorkerBuilding[],
  enabledLandUses: Set<string>
): FlowWorkerResult {
  const segmentCounts: Record<string, number> = {};
  const buildingGenerated: Record<string, number> = {};
  const buildingAttracted: Record<string, number> = {};
  let totalTrips = 0;
  let totalDistance = 0;

  // Filter destinations by enabled land uses
  const filteredDestinations = destinations.filter((dest) =>
    dest.landUseAreas.some(([landUse]) => enabledLandUses.has(landUse))
  );

  if (filteredDestinations.length === 0) {
    return {
      type: 'batch_complete',
      segmentCounts,
      buildingGenerated,
      buildingAttracted,
      totalTrips: 0,
      totalDistance: 0,
    };
  }

  for (const origin of origins) {
    if (origin.estimatedResidents <= 0) continue;

    const tripRate = origin.estimatedResidents * 0.5; // trips per resident per session

    // Calculate O-D probabilities for this origin
    const odEntries: Array<{ destination: WorkerBuilding; probability: number; distance: number }> =
      [];
    let totalWeight = 0;

    for (const dest of filteredDestinations) {
      const distance = euclideanDistance(origin.centroid, dest.centroid);

      // Calculate attractiveness based on land use weights and decay
      let attractiveness = 0;

      for (const [landUse, area] of dest.landUseAreas) {
        if (!enabledLandUses.has(landUse)) continue;

        const maxDist = MID_MAX_DISTANCE[landUse as LandUse] ?? 2000;
        if (distance > maxDist) continue;

        const decay = MID_DECAY_BETA[landUse as LandUse] ?? 0.002;
        const weight = area * Math.exp(-decay * distance);
        attractiveness += weight;
      }

      if (attractiveness > 0.001) {
        odEntries.push({ destination: dest, probability: attractiveness, distance });
        totalWeight += attractiveness;
      }
    }

    if (totalWeight === 0) continue;

    // Normalize probabilities and calculate flows
    for (const entry of odEntries) {
      entry.probability /= totalWeight;
      const expectedTrips = entry.probability * tripRate;

      if (expectedTrips < 0.1) continue;

      const tripCount = Math.round(expectedTrips);
      if (tripCount <= 0) continue;

      // Find path and record segment usage
      const path = findPath(origin.centroid, entry.destination.centroid);

      // Record segment usage (excluding first/last connector segments)
      if (path.points.length > 2) {
        for (let i = 1; i < path.points.length - 2; i++) {
          const key = segmentKey(path.points[i], path.points[i + 1]);
          segmentCounts[key] = (segmentCounts[key] || 0) + tripCount;
        }
      }

      // Track per-building flows
      buildingGenerated[origin.id] = (buildingGenerated[origin.id] || 0) + tripCount;
      buildingAttracted[entry.destination.id] =
        (buildingAttracted[entry.destination.id] || 0) + tripCount;

      totalTrips += tripCount;
      totalDistance += path.distance * tripCount;
    }
  }

  return {
    type: 'batch_complete',
    segmentCounts,
    buildingGenerated,
    buildingAttracted,
    totalTrips,
    totalDistance,
  };
}

// Store destinations for batch processing
let storedDestinations: WorkerBuilding[] = [];

// Message handler
self.onmessage = (event: MessageEvent<FlowWorkerMessage>) => {
  const message = event.data;

  try {
    switch (message.type) {
      case 'init': {
        if (message.graph) {
          initializeGraph(message.graph);
        }
        if (message.buildings) {
          // Store destinations for later use
          storedDestinations = message.buildings;
        }
        self.postMessage({ type: 'init_complete' } as FlowWorkerResult);
        break;
      }

      case 'calculate': {
        if (!message.buildings || !message.enabledLandUses) {
          self.postMessage({
            type: 'error',
            error: 'Missing buildings or enabledLandUses',
          } as FlowWorkerResult);
          break;
        }

        const enabledSet = new Set(message.enabledLandUses);
        const result = calculateBatch(message.buildings, storedDestinations, enabledSet);
        result.batchId = message.batchId;
        self.postMessage(result);
        break;
      }

      default:
        self.postMessage({
          type: 'error',
          error: `Unknown message type: ${(message as FlowWorkerMessage).type}`,
        } as FlowWorkerResult);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    } as FlowWorkerResult);
  }
};
