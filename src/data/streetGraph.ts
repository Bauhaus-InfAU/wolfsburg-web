import RBush from 'rbush';
import type { GraphNode, GraphEdge, StreetCollection, SpatialItem } from '../config/types';
import { COORD_PRECISION } from '../config/constants';

// Conversion factor: 1 degree ≈ 111,000 meters
const DEGREES_TO_METERS = 111000;

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

  constructor() {
    this.spatialIndex = new RBush();
  }

  buildFromGeoJSON(collection: StreetCollection): void {
    const spatialItems: SpatialItem[] = [];

    // First pass: create nodes and edges from all street segments
    for (const feature of collection.features) {
      if (feature.geometry.type !== 'LineString') continue;

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

        // Add bidirectional edges
        this.addEdge(fromKey, toKey, distance);
        this.addEdge(toKey, fromKey, distance);
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
  }

  private addEdge(from: string, to: string, weight: number): void {
    if (!this.edges.has(from)) {
      this.edges.set(from, []);
    }

    // Check if edge already exists
    const existing = this.edges.get(from)!;
    const exists = existing.some((e) => e.to === to);
    if (!exists) {
      existing.push({ from, to, weight });
    }
  }

  getNeighbors(nodeId: string): GraphEdge[] {
    return this.edges.get(nodeId) || [];
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
