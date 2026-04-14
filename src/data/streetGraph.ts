import RBush from 'rbush';
import type { GraphNode, GraphEdge, StreetCollection, SpatialItem, TransportMode } from '../config/types';
import { COORD_PRECISION } from '../config/constants';
import type { GraphPartitioner } from './partition/GraphPartitioner';
import type { IncrementalManager } from './partition/IncrementalManager';
import type { GraphChange } from './partition/types';

// Conversion factor: 1 degree ≈ 111,000 meters
const DEGREES_TO_METERS = 111000;

// Railway classes to always exclude
const RAILWAY_CLASSES = new Set([
  'standard_gauge',
  'narrow_gauge',
  'rail',
  'tram',
  'subway',
]);

// Street classes accessible by pedestrians (can walk on)
// Excludes high-speed roads where pedestrians are prohibited
const PEDESTRIAN_ACCESSIBLE_CLASSES = new Set([
  'footway',
  'path',
  'pedestrian',
  'steps',
  'cycleway',    // Often shared with pedestrians
  'residential',
  'service',
  'living_street',
  'unclassified',
  'track',
  'tertiary',     // Pedestrians can walk along tertiary roads
  'tertiary_link',
  'secondary',    // Pedestrians can walk along secondary roads (with sidewalks)
  'secondary_link',
  'primary',      // Pedestrians can walk along primary roads (with sidewalks)
  'primary_link',
]);

// Street classes accessible by bicycle
// Can use bike paths and most roads except motorways
const BICYCLE_ACCESSIBLE_CLASSES = new Set([
  'cycleway',
  'path',
  'footway',      // Often allowed for bikes
  'residential',
  'service',
  'living_street',
  'unclassified',
  'track',
  'tertiary',
  'tertiary_link',
  'secondary',
  'secondary_link',
  'primary',
  'primary_link',
  // Cyclists typically avoid trunk and motorway
]);

// Street classes accessible by car
// Only actual roads, no pedestrian/bike paths
const CAR_ACCESSIBLE_CLASSES = new Set([
  'motorway',
  'motorway_link',
  'trunk',
  'trunk_link',
  'primary',
  'primary_link',
  'secondary',
  'secondary_link',
  'tertiary',
  'tertiary_link',
  'residential',
  'service',       // Parking lots, driveways
  'living_street',
  'unclassified',
]);

// Map of transport mode to accessible street classes
const MODE_ACCESSIBLE_CLASSES: Record<TransportMode, Set<string>> = {
  pedestrian: PEDESTRIAN_ACCESSIBLE_CLASSES,
  bicycle: BICYCLE_ACCESSIBLE_CLASSES,
  car: CAR_ACCESSIBLE_CLASSES,
};

/**
 * Check if a street class is accessible for a given transport mode.
 */
export function isStreetAccessible(streetClass: string | undefined, mode: TransportMode): boolean {
  if (!streetClass) return true; // Unknown class, allow by default
  if (RAILWAY_CLASSES.has(streetClass)) return false; // Railways never accessible
  if (streetClass === 'unknown') return mode === 'pedestrian'; // Unknown streets only for pedestrians
  return MODE_ACCESSIBLE_CLASSES[mode].has(streetClass);
}

// Euclidean distance converting from degrees to meters
// Input coordinates are in degrees (from Heron GeoJSON export)
// Output is in meters for use with simulation parameters
export function euclideanDistance(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const dx = (coord2[0] - coord1[0]) * DEGREES_TO_METERS;
  const dy = (coord2[1] - coord1[1]) * DEGREES_TO_METERS;
  return Math.sqrt(dx * dx + dy * dy);
}

// Alias for compatibility
export const haversineDistance = euclideanDistance;

// Create a unique key for a coordinate
function coordKey(coord: [number, number]): string {
  const lng = coord[0].toFixed(COORD_PRECISION);
  const lat = coord[1].toFixed(COORD_PRECISION);
  return `${lng},${lat}`;
}

export class StreetGraph {
  public nodes: Map<string, GraphNode> = new Map();
  public edges: Map<string, GraphEdge[]> = new Map();
  public spatialIndex: RBush<SpatialItem>;

  // Partitioning support
  private partitioner: GraphPartitioner | null = null;
  private incrementalManager: IncrementalManager | null = null;
  private changeListeners: Array<(change: GraphChange) => void> = [];

  constructor() {
    this.spatialIndex = new RBush();
  }

  /**
   * Enable partitioning for this graph.
   * Returns the partitioner instance for use with pathfinding.
   */
  setPartitioner(partitioner: GraphPartitioner): void {
    this.partitioner = partitioner;
  }

  /**
   * Set the incremental manager for tracking graph changes.
   */
  setIncrementalManager(manager: IncrementalManager): void {
    this.incrementalManager = manager;
  }

  /**
   * Add a listener for graph changes.
   */
  addChangeListener(listener: (change: GraphChange) => void): void {
    this.changeListeners.push(listener);
  }

  /**
   * Remove a change listener.
   */
  removeChangeListener(listener: (change: GraphChange) => void): void {
    const index = this.changeListeners.indexOf(listener);
    if (index !== -1) {
      this.changeListeners.splice(index, 1);
    }
  }

  /**
   * Notify listeners of a graph change.
   */
  private notifyChange(change: GraphChange): void {
    for (const listener of this.changeListeners) {
      listener(change);
    }
    if (this.incrementalManager) {
      this.incrementalManager.applyChange(change);
    }
  }

  buildFromGeoJSON(collection: StreetCollection): void {
    const spatialItems: SpatialItem[] = [];

    // First pass: create nodes and edges from all street segments
    // We build a complete graph and filter by mode during pathfinding
    for (const feature of collection.features) {
      if (feature.geometry.type !== 'LineString') continue;

      // Get street class for mode-specific routing
      const streetClass = (feature.properties as { class?: string })?.class;

      // Skip railways (not usable by any mode)
      if (streetClass && RAILWAY_CLASSES.has(streetClass)) {
        continue;
      }

      const coords = feature.geometry.coordinates as [number, number][];
      if (coords.length < 2) continue;

      // Process each segment of the linestring
      for (let i = 0; i < coords.length - 1; i++) {
        const from = coords[i];
        const to = coords[i + 1];

        const fromKey = coordKey(from);
        const toKey = coordKey(to);

        // Add nodes
        if (!this.nodes.has(fromKey)) {
          this.nodes.set(fromKey, { id: fromKey, coord: from });
        }
        if (!this.nodes.has(toKey)) {
          this.nodes.set(toKey, { id: toKey, coord: to });
        }

        // Calculate distance
        const distance = haversineDistance(from, to);

        // Add bidirectional edges with street class
        this.addEdgeInternal(fromKey, toKey, distance, streetClass);
        this.addEdgeInternal(toKey, fromKey, distance, streetClass);
      }
    }

    // Build spatial index for nodes
    for (const node of this.nodes.values()) {
      const [lng, lat] = node.coord;
      spatialItems.push({
        minX: lng,
        minY: lat,
        maxX: lng,
        maxY: lat,
        id: node.id,
      });
    }

    this.spatialIndex.load(spatialItems);

    console.log(`StreetGraph built: ${this.nodeCount} nodes, ${this.edgeCount} edges`);
  }

  private addEdgeInternal(from: string, to: string, weight: number, streetClass?: string): boolean {
    if (!this.edges.has(from)) {
      this.edges.set(from, []);
    }

    // Check if edge already exists
    const existing = this.edges.get(from)!;
    const exists = existing.some((e) => e.to === to);
    if (!exists) {
      existing.push({ from, to, weight, streetClass });
      return true;
    }
    return false;
  }

  /**
   * Add a street edge interactively (for graph editing).
   * Adds nodes if they don't exist and creates bidirectional edges.
   * Notifies listeners of the change.
   */
  addStreetEdge(from: [number, number], to: [number, number], streetClass?: string): void {
    const fromKey = coordKey(from);
    const toKey = coordKey(to);

    // Add nodes if they don't exist
    let fromNodeAdded = false;
    let toNodeAdded = false;

    if (!this.nodes.has(fromKey)) {
      this.nodes.set(fromKey, { id: fromKey, coord: from });
      this.spatialIndex.insert({
        minX: from[0],
        minY: from[1],
        maxX: from[0],
        maxY: from[1],
        id: fromKey,
      });
      fromNodeAdded = true;
    }

    if (!this.nodes.has(toKey)) {
      this.nodes.set(toKey, { id: toKey, coord: to });
      this.spatialIndex.insert({
        minX: to[0],
        minY: to[1],
        maxX: to[0],
        maxY: to[1],
        id: toKey,
      });
      toNodeAdded = true;
    }

    // Calculate distance
    const distance = haversineDistance(from, to);

    // Add bidirectional edges
    const edgeAdded1 = this.addEdgeInternal(fromKey, toKey, distance, streetClass);
    const edgeAdded2 = this.addEdgeInternal(toKey, fromKey, distance, streetClass);

    // Notify listeners
    if (fromNodeAdded) {
      this.notifyChange({ type: 'add_node', nodeId: fromKey, coord: from });
    }
    if (toNodeAdded) {
      this.notifyChange({ type: 'add_node', nodeId: toKey, coord: to });
    }
    if (edgeAdded1 || edgeAdded2) {
      this.notifyChange({ type: 'add_edge', from: fromKey, to: toKey, weight: distance });
    }
  }

  /**
   * Remove a street edge interactively (for graph editing).
   * Removes bidirectional edges but keeps nodes.
   * Notifies listeners of the change.
   */
  removeStreetEdge(from: [number, number], to: [number, number]): void {
    const fromKey = coordKey(from);
    const toKey = coordKey(to);

    let edgeRemoved = false;

    // Remove edge from->to
    const fromEdges = this.edges.get(fromKey);
    if (fromEdges) {
      const index = fromEdges.findIndex((e) => e.to === toKey);
      if (index !== -1) {
        fromEdges.splice(index, 1);
        edgeRemoved = true;
      }
    }

    // Remove edge to->from
    const toEdges = this.edges.get(toKey);
    if (toEdges) {
      const index = toEdges.findIndex((e) => e.to === fromKey);
      if (index !== -1) {
        toEdges.splice(index, 1);
        edgeRemoved = true;
      }
    }

    if (edgeRemoved) {
      this.notifyChange({ type: 'remove_edge', from: fromKey, to: toKey });
    }
  }

  /**
   * Get the partitioner instance.
   */
  getPartitioner(): GraphPartitioner | null {
    return this.partitioner;
  }

  /**
   * Get the incremental manager instance.
   */
  getIncrementalManager(): IncrementalManager | null {
    return this.incrementalManager;
  }

  getNeighbors(nodeId: string): GraphEdge[] {
    return this.edges.get(nodeId) || [];
  }

  /**
   * Get neighbors filtered by transport mode accessibility.
   * Only returns edges that the given mode can traverse.
   */
  getNeighborsForMode(nodeId: string, mode: TransportMode): GraphEdge[] {
    const allEdges = this.edges.get(nodeId) || [];
    return allEdges.filter(edge => isStreetAccessible(edge.streetClass, mode));
  }

  findNearestNode(coord: [number, number]): GraphNode | null {
    const [x, y] = coord;
    // Search radius in degrees (100m ≈ 0.0009 degrees)
    const searchRadius = 0.001;

    const nearby = this.spatialIndex.search({
      minX: x - searchRadius,
      minY: y - searchRadius,
      maxX: x + searchRadius,
      maxY: y + searchRadius,
    });

    if (nearby.length === 0) {
      // Expand search (500m ≈ 0.0045 degrees)
      const expanded = this.spatialIndex.search({
        minX: x - 0.005,
        minY: y - 0.005,
        maxX: x + 0.005,
        maxY: y + 0.005,
      });
      if (expanded.length === 0) return null;
      nearby.push(...expanded);
    }

    let nearest: GraphNode | null = null;
    let nearestDist = Infinity;

    for (const item of nearby) {
      const node = this.nodes.get(item.id);
      if (!node) continue;

      const dist = haversineDistance(coord, node.coord);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = node;
      }
    }

    return nearest;
  }

  get nodeCount(): number {
    return this.nodes.size;
  }

  get edgeCount(): number {
    let count = 0;
    for (const edges of this.edges.values()) {
      count += edges.length;
    }
    return count / 2; // Divide by 2 for bidirectional edges
  }
}
