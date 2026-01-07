import type { Path, GraphNode } from '../config/types';
import { StreetGraph, haversineDistance } from '../data/streetGraph';
import { SIMULATION_DEFAULTS } from '../config/constants';

// Simple priority queue using a sorted array
class PriorityQueue<T> {
  private items: { value: T; priority: number }[] = [];

  enqueue(value: T, priority: number): void {
    const item = { value, priority };
    let inserted = false;

    for (let i = 0; i < this.items.length; i++) {
      if (priority < this.items[i].priority) {
        this.items.splice(i, 0, item);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      this.items.push(item);
    }
  }

  dequeue(): T | undefined {
    return this.items.shift()?.value;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  has(value: T): boolean {
    return this.items.some((item) => item.value === value);
  }
}

// LRU Cache for path caching
class LRUCache<K, V> {
  private cache: Map<K, V> = new Map();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove oldest (first) entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }
}

export class Pathfinder {
  private graph: StreetGraph;
  private cache: LRUCache<string, Path>;

  constructor(graph: StreetGraph) {
    this.graph = graph;
    this.cache = new LRUCache(SIMULATION_DEFAULTS.PATH_CACHE_SIZE);
  }

  /**
   * Find a path between two coordinates using A* algorithm.
   */
  findPath(from: [number, number], to: [number, number]): Path {
    // Check cache first
    const cacheKey = this.getCacheKey(from, to);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    // Find nearest graph nodes
    const startNode = this.graph.findNearestNode(from);
    const endNode = this.graph.findNearestNode(to);

    // If no graph or no nearby nodes, return direct path
    if (!startNode || !endNode) {
      return {
        points: [from, to],
        totalDistance: haversineDistance(from, to),
      };
    }

    // If same node, return path through that node
    if (startNode.id === endNode.id) {
      return {
        points: [from, startNode.coord, to],
        totalDistance:
          haversineDistance(from, startNode.coord) + haversineDistance(startNode.coord, to),
      };
    }

    // A* search
    const path = this.astar(startNode, endNode);

    if (path) {
      // Add origin and destination to path
      const fullPath: [number, number][] = [from, ...path.points, to];
      const totalDistance =
        haversineDistance(from, path.points[0]) +
        path.totalDistance +
        haversineDistance(path.points[path.points.length - 1], to);

      const result = { points: fullPath, totalDistance };
      this.cache.set(cacheKey, result);
      return result;
    }

    // Fallback to direct path
    const directPath = {
      points: [from, to] as [number, number][],
      totalDistance: haversineDistance(from, to),
    };
    this.cache.set(cacheKey, directPath);
    return directPath;
  }

  private astar(start: GraphNode, end: GraphNode): Path | null {
    const openSet = new PriorityQueue<string>();
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();

    gScore.set(start.id, 0);
    fScore.set(start.id, this.heuristic(start, end));
    openSet.enqueue(start.id, fScore.get(start.id)!);

    const visited = new Set<string>();

    while (!openSet.isEmpty()) {
      const currentId = openSet.dequeue()!;

      if (currentId === end.id) {
        return this.reconstructPath(cameFrom, currentId);
      }

      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const neighbors = this.graph.getNeighbors(currentId);

      for (const edge of neighbors) {
        if (visited.has(edge.to)) continue;

        const tentativeG = (gScore.get(currentId) ?? Infinity) + edge.weight;

        if (tentativeG < (gScore.get(edge.to) ?? Infinity)) {
          cameFrom.set(edge.to, currentId);
          gScore.set(edge.to, tentativeG);

          const neighbor = this.graph.nodes.get(edge.to);
          if (neighbor) {
            const f = tentativeG + this.heuristic(neighbor, end);
            fScore.set(edge.to, f);
            openSet.enqueue(edge.to, f);
          }
        }
      }
    }

    return null; // No path found
  }

  private heuristic(from: GraphNode, to: GraphNode): number {
    return haversineDistance(from.coord, to.coord);
  }

  private reconstructPath(cameFrom: Map<string, string>, current: string): Path {
    const points: [number, number][] = [];
    let totalDistance = 0;
    let node = current;
    let prevCoord: [number, number] | null = null;

    while (node) {
      const graphNode = this.graph.nodes.get(node);
      if (graphNode) {
        points.unshift(graphNode.coord);
        if (prevCoord) {
          totalDistance += haversineDistance(graphNode.coord, prevCoord);
        }
        prevCoord = graphNode.coord;
      }
      node = cameFrom.get(node)!;
    }

    return { points, totalDistance };
  }

  private getCacheKey(from: [number, number], to: [number, number]): string {
    // For degree coordinates, 5 decimal places ≈ 1m precision
    return `${from[0].toFixed(5)},${from[1].toFixed(5)}-${to[0].toFixed(5)},${to[1].toFixed(5)}`;
  }
}
