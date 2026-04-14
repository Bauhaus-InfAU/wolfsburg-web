import type { Path, GraphNode, TransportMode } from '../config/types';
import { StreetGraph, haversineDistance } from '../data/streetGraph';
import { SIMULATION_DEFAULTS } from '../config/constants';

// P2: Binary min-heap priority queue for O(log n) operations
// Uses parallel arrays instead of object array to avoid allocation overhead
class PriorityQueue<T> {
  private values: T[] = [];
  private priorities: number[] = [];

  enqueue(value: T, priority: number): void {
    this.values.push(value);
    this.priorities.push(priority);
    this.bubbleUp(this.values.length - 1);
  }

  dequeue(): T | undefined {
    const length = this.values.length;
    if (length === 0) return undefined;

    const result = this.values[0];

    if (length > 1) {
      // Move last element to root
      this.values[0] = this.values[length - 1];
      this.priorities[0] = this.priorities[length - 1];
    }

    this.values.pop();
    this.priorities.pop();

    if (this.values.length > 0) {
      this.bubbleDown(0);
    }

    return result;
  }

  isEmpty(): boolean {
    return this.values.length === 0;
  }

  private bubbleUp(index: number): void {
    const value = this.values[index];
    const priority = this.priorities[index];

    while (index > 0) {
      const parentIndex = (index - 1) >>> 1; // Faster than Math.floor for positive integers
      const parentPriority = this.priorities[parentIndex];

      if (parentPriority <= priority) break;

      // Move parent down
      this.values[index] = this.values[parentIndex];
      this.priorities[index] = parentPriority;
      index = parentIndex;
    }

    // Place value in final position
    this.values[index] = value;
    this.priorities[index] = priority;
  }

  private bubbleDown(index: number): void {
    const length = this.values.length;
    const value = this.values[0];
    const priority = this.priorities[0];

    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = leftChild + 1;
      let smallest = index;
      let smallestPriority = priority;

      if (leftChild < length) {
        const leftPriority = this.priorities[leftChild];
        if (leftPriority < smallestPriority) {
          smallest = leftChild;
          smallestPriority = leftPriority;
        }
      }

      if (rightChild < length) {
        const rightPriority = this.priorities[rightChild];
        if (rightPriority < smallestPriority) {
          smallest = rightChild;
        }
      }

      if (smallest === index) break;

      // Move smallest child up
      this.values[index] = this.values[smallest];
      this.priorities[index] = this.priorities[smallest];
      index = smallest;
    }

    // Place value in final position
    this.values[index] = value;
    this.priorities[index] = priority;
  }
}

// LRU Cache for path caching with hit/miss tracking
class LRUCache<K, V> {
  private cache: Map<K, V> = new Map();
  private maxSize: number;
  private hits = 0;
  private misses = 0;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.hits++;
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    } else {
      this.misses++;
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

  getStats(): { hits: number; misses: number; size: number; maxSize: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: total > 0 ? this.hits / total : 0,
    };
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
   * @param from - Starting coordinates [lng, lat]
   * @param to - Destination coordinates [lng, lat]
   * @param mode - Transport mode for filtering accessible edges (default: pedestrian)
   */
  findPath(from: [number, number], to: [number, number], mode: TransportMode = 'pedestrian'): Path {
    // Check cache first (cache key includes mode)
    const cacheKey = this.getCacheKey(from, to, mode);
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

    // A* search with mode-specific edge filtering
    const path = this.astar(startNode, endNode, mode);

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

  private astar(start: GraphNode, end: GraphNode, mode: TransportMode = 'pedestrian'): Path | null {
    const openSet = new PriorityQueue<string>();
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    // Cache heuristic values - h(n) to end never changes during search
    const heuristicCache = new Map<string, number>();

    const startH = this.heuristic(start, end);
    heuristicCache.set(start.id, startH);
    gScore.set(start.id, 0);
    fScore.set(start.id, startH);
    openSet.enqueue(start.id, startH);

    const visited = new Set<string>();

    while (!openSet.isEmpty()) {
      const currentId = openSet.dequeue()!;

      if (currentId === end.id) {
        return this.reconstructPath(cameFrom, currentId);
      }

      if (visited.has(currentId)) continue;
      visited.add(currentId);

      // Use mode-specific neighbors (filters by accessible street classes)
      const neighbors = this.graph.getNeighborsForMode(currentId, mode);

      for (const edge of neighbors) {
        if (visited.has(edge.to)) continue;

        const tentativeG = (gScore.get(currentId) ?? Infinity) + edge.weight;

        if (tentativeG < (gScore.get(edge.to) ?? Infinity)) {
          cameFrom.set(edge.to, currentId);
          gScore.set(edge.to, tentativeG);

          const neighbor = this.graph.nodes.get(edge.to);
          if (neighbor) {
            // Use cached heuristic or compute and cache it
            let h = heuristicCache.get(edge.to);
            if (h === undefined) {
              h = this.heuristic(neighbor, end);
              heuristicCache.set(edge.to, h);
            }
            const f = tentativeG + h;
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

    // Use push() instead of unshift() to avoid O(n²) complexity
    // unshift() is O(n) per call as it shifts all elements
    while (node) {
      const graphNode = this.graph.nodes.get(node);
      if (graphNode) {
        points.push(graphNode.coord);
        if (prevCoord) {
          totalDistance += haversineDistance(graphNode.coord, prevCoord);
        }
        prevCoord = graphNode.coord;
      }
      node = cameFrom.get(node)!;
    }

    // Reverse once at the end - O(n) total instead of O(n²)
    points.reverse();

    return { points, totalDistance };
  }

  private getCacheKey(from: [number, number], to: [number, number], mode: TransportMode = 'pedestrian'): string {
    // Use integer math instead of toFixed() to avoid string allocation overhead
    // Math.round with 1e5 gives 5 decimal places ≈ 1m precision
    // Include mode in cache key since different modes use different paths
    const f0 = Math.round(from[0] * 1e5);
    const f1 = Math.round(from[1] * 1e5);
    const t0 = Math.round(to[0] * 1e5);
    const t1 = Math.round(to[1] * 1e5);
    return `${mode}:${f0},${f1}-${t0},${t1}`;
  }

  /**
   * Get cache statistics for monitoring performance.
   */
  getCacheStats(): { hits: number; misses: number; size: number; maxSize: number; hitRate: number } {
    return this.cache.getStats();
  }
}
