import type { Path, GraphNode } from '../config/types';
import type { StreetGraph } from '../data/streetGraph';
import type { GraphPartitioner } from '../data/partition/GraphPartitioner';
import type { GridCell, HierarchicalPathResult, CachedPathEntry } from '../data/partition/types';
import type { IncrementalManager } from '../data/partition/IncrementalManager';
import { haversineDistance } from '../data/streetGraph';

const CACHE_SIZE = 5000;

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

/**
 * LRU Cache with cell tracking for invalidation.
 */
class LRUCache {
  private cache: Map<string, CachedPathEntry> = new Map();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: string): CachedPathEntry | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: string, value: CachedPathEntry): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Invalidate entries that traverse any of the given cells.
   */
  invalidateForCells(dirtyCells: Set<string>): number {
    if (dirtyCells.size === 0) return 0;

    let removed = 0;
    const keysToRemove: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      for (const cellId of entry.cellsTraversed) {
        if (dirtyCells.has(cellId)) {
          keysToRemove.push(key);
          break;
        }
      }
    }

    for (const key of keysToRemove) {
      this.cache.delete(key);
      removed++;
    }

    return removed;
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

/**
 * HierarchicalPathfinder implements two-level pathfinding:
 * - Same-cell paths: Direct A* on cell subgraph
 * - Cross-cell paths: Uses precomputed boundary paths + A* over cell graph
 */
export class HierarchicalPathfinder {
  private graph: StreetGraph;
  private partitioner: GraphPartitioner;
  private incrementalManager: IncrementalManager | null = null;
  private cache: LRUCache;
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(graph: StreetGraph, partitioner: GraphPartitioner) {
    this.graph = graph;
    this.partitioner = partitioner;
    this.cache = new LRUCache(CACHE_SIZE);
  }

  /**
   * Set the incremental manager for cache invalidation.
   */
  setIncrementalManager(manager: IncrementalManager): void {
    this.incrementalManager = manager;
    this.incrementalManager.onCacheInvalidation((dirtyCells) => {
      const removed = this.cache.invalidateForCells(dirtyCells);
      if (removed > 0) {
        console.log(`HierarchicalPathfinder: Invalidated ${removed} cache entries`);
      }
    });
  }

  /**
   * Find a path between two coordinates using hierarchical pathfinding.
   */
  findPath(from: [number, number], to: [number, number]): HierarchicalPathResult {
    // Check cache first
    const cacheKey = this.getCacheKey(from, to);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.cacheHits++;
      return {
        points: cached.path.points,
        totalDistance: cached.path.totalDistance,
        cellsTraversed: Array.from(cached.cellsTraversed),
        isLocalPath: cached.cellsTraversed.size === 1,
      };
    }
    this.cacheMisses++;

    // Find nearest graph nodes
    const startNode = this.graph.findNearestNode(from);
    const endNode = this.graph.findNearestNode(to);

    // If no graph or no nearby nodes, return direct path
    if (!startNode || !endNode) {
      const directPath = {
        points: [from, to] as [number, number][],
        totalDistance: haversineDistance(from, to),
        cellsTraversed: [] as string[],
        isLocalPath: true,
      };
      return directPath;
    }

    // If same node, return path through that node
    if (startNode.id === endNode.id) {
      const path = {
        points: [from, startNode.coord, to] as [number, number][],
        totalDistance: haversineDistance(from, startNode.coord) + haversineDistance(startNode.coord, to),
        cellsTraversed: [this.partitioner.getCellId(startNode.coord)],
        isLocalPath: true,
      };
      return path;
    }

    // Determine which cells the endpoints are in
    const startCellId = this.partitioner.getCellId(startNode.coord);
    const endCellId = this.partitioner.getCellId(endNode.coord);

    let result: HierarchicalPathResult;

    if (startCellId === endCellId) {
      // Same-cell path: use direct A* on cell subgraph
      result = this.findLocalPath(from, to, startNode, endNode, startCellId);
    } else {
      // Cross-cell path: use hierarchical pathfinding
      result = this.findHierarchicalPath(from, to, startNode, endNode, startCellId, endCellId);
    }

    // Cache the result
    this.cache.set(cacheKey, {
      path: { points: result.points, totalDistance: result.totalDistance },
      cellsTraversed: new Set(result.cellsTraversed),
    });

    return result;
  }

  /**
   * Find a path within a single cell using A*.
   */
  private findLocalPath(
    from: [number, number],
    to: [number, number],
    startNode: GraphNode,
    endNode: GraphNode,
    cellId: string
  ): HierarchicalPathResult {
    const cell = this.partitioner.getCellById(cellId);
    if (!cell) {
      // Fallback to direct path
      return {
        points: [from, to],
        totalDistance: haversineDistance(from, to),
        cellsTraversed: [cellId],
        isLocalPath: true,
      };
    }

    // Run A* on cell subgraph
    const path = this.astarLocal(startNode, endNode, cell);

    if (path) {
      const fullPath: [number, number][] = [from, ...path.points, to];
      const totalDistance =
        haversineDistance(from, path.points[0]) +
        path.totalDistance +
        haversineDistance(path.points[path.points.length - 1], to);

      return {
        points: fullPath,
        totalDistance,
        cellsTraversed: [cellId],
        isLocalPath: true,
      };
    }

    // Fallback to direct path
    return {
      points: [from, to],
      totalDistance: haversineDistance(from, to),
      cellsTraversed: [cellId],
      isLocalPath: true,
    };
  }

  /**
   * Find a path across multiple cells using hierarchical pathfinding.
   */
  private findHierarchicalPath(
    from: [number, number],
    to: [number, number],
    startNode: GraphNode,
    endNode: GraphNode,
    startCellId: string,
    endCellId: string
  ): HierarchicalPathResult {
    const startCell = this.partitioner.getCellById(startCellId);
    const endCell = this.partitioner.getCellById(endCellId);

    if (!startCell || !endCell) {
      // Fallback to full A*
      return this.fallbackFullAstar(from, to, startNode, endNode);
    }

    // Step 1: Find paths from start to start-cell boundary nodes
    const startToBoundary = this.findPathsToBoundary(startNode, startCell);

    // Step 2: Find paths from end-cell boundary nodes to end
    const boundaryToEnd = this.findPathsFromBoundary(endNode, endCell);

    if (startToBoundary.size === 0 || boundaryToEnd.size === 0) {
      // Fallback to full A*
      return this.fallbackFullAstar(from, to, startNode, endNode);
    }

    // Step 3: Find best path through cell graph
    const hierarchicalPath = this.findCellLevelPath(
      startCellId,
      endCellId,
      startToBoundary,
      boundaryToEnd
    );

    if (!hierarchicalPath) {
      // Fallback to full A*
      return this.fallbackFullAstar(from, to, startNode, endNode);
    }

    // Build full path with all coordinates
    const fullPath: [number, number][] = [from, ...hierarchicalPath.points, to];
    const totalDistance =
      haversineDistance(from, hierarchicalPath.points[0]) +
      hierarchicalPath.totalDistance +
      haversineDistance(hierarchicalPath.points[hierarchicalPath.points.length - 1], to);

    return {
      points: fullPath,
      totalDistance,
      cellsTraversed: hierarchicalPath.cellsTraversed,
      isLocalPath: false,
    };
  }

  /**
   * Run A* on a cell's subgraph.
   */
  private astarLocal(start: GraphNode, end: GraphNode, cell: GridCell): Path | null {
    const openSet = new PriorityQueue<string>();
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    const visited = new Set<string>();

    gScore.set(start.id, 0);
    fScore.set(start.id, haversineDistance(start.coord, end.coord));
    openSet.enqueue(start.id, fScore.get(start.id)!);

    while (!openSet.isEmpty()) {
      const currentId = openSet.dequeue()!;

      if (currentId === end.id) {
        return this.reconstructPath(cameFrom, currentId);
      }

      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const edges = this.graph.edges.get(currentId);
      if (!edges) continue;

      const currentG = gScore.get(currentId)!;

      for (const edge of edges) {
        // Only follow edges within the cell
        if (!cell.nodes.has(edge.to)) continue;
        if (visited.has(edge.to)) continue;

        const tentativeG = currentG + edge.weight;

        if (tentativeG < (gScore.get(edge.to) ?? Infinity)) {
          cameFrom.set(edge.to, currentId);
          gScore.set(edge.to, tentativeG);

          const neighbor = this.graph.nodes.get(edge.to);
          if (neighbor) {
            const f = tentativeG + haversineDistance(neighbor.coord, end.coord);
            fScore.set(edge.to, f);
            openSet.enqueue(edge.to, f);
          }
        }
      }
    }

    return null;
  }

  /**
   * Find paths from a node to all boundary nodes in its cell.
   */
  private findPathsToBoundary(node: GraphNode, cell: GridCell): Map<string, { distance: number; path: string[] }> {
    const result = new Map<string, { distance: number; path: string[] }>();

    if (cell.boundaryNodes.has(node.id)) {
      // Start node is itself a boundary node
      result.set(node.id, { distance: 0, path: [node.id] });
    }

    // Run Dijkstra from start node to find distances to all boundary nodes
    const distances = new Map<string, number>();
    const previous = new Map<string, string>();
    const visited = new Set<string>();
    const queue = new PriorityQueue<string>();

    distances.set(node.id, 0);
    queue.enqueue(node.id, 0);

    while (!queue.isEmpty()) {
      const current = queue.dequeue()!;

      if (visited.has(current)) continue;
      visited.add(current);

      // If this is a boundary node, record it
      if (cell.boundaryNodes.has(current) && current !== node.id) {
        const path = this.reconstructNodePath(previous, current, node.id);
        result.set(current, { distance: distances.get(current)!, path });
      }

      const edges = this.graph.edges.get(current);
      if (!edges) continue;

      const currentDist = distances.get(current)!;

      for (const edge of edges) {
        if (!cell.nodes.has(edge.to)) continue;
        if (visited.has(edge.to)) continue;

        const newDist = currentDist + edge.weight;

        if (newDist < (distances.get(edge.to) ?? Infinity)) {
          distances.set(edge.to, newDist);
          previous.set(edge.to, current);
          queue.enqueue(edge.to, newDist);
        }
      }
    }

    return result;
  }

  /**
   * Find paths from all boundary nodes in a cell to a target node.
   */
  private findPathsFromBoundary(node: GraphNode, cell: GridCell): Map<string, { distance: number; path: string[] }> {
    // This is equivalent to finding paths from node to boundary (reverse direction)
    // For undirected graphs, we can use the same approach
    return this.findPathsToBoundary(node, cell);
  }

  /**
   * Find the best path through the cell graph using precomputed boundary paths.
   */
  private findCellLevelPath(
    startCellId: string,
    endCellId: string,
    startToBoundary: Map<string, { distance: number; path: string[] }>,
    boundaryToEnd: Map<string, { distance: number; path: string[] }>
  ): { points: [number, number][]; totalDistance: number; cellsTraversed: string[] } | null {
    const partition = this.partitioner.getPartition();
    if (!partition) return null;

    // Use A* over the cell-boundary graph
    // Nodes are boundary nodes, edges are either within-cell (precomputed) or cross-cell edges
    const openSet = new PriorityQueue<string>();
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>();
    const nodeCell = new Map<string, string>();
    const visited = new Set<string>();

    // Initialize with start cell's boundary nodes
    for (const [boundaryNodeId, data] of startToBoundary.entries()) {
      gScore.set(boundaryNodeId, data.distance);
      nodeCell.set(boundaryNodeId, startCellId);

      const boundaryNode = this.graph.nodes.get(boundaryNodeId);
      const endCellCenter = this.getCellCenter(endCellId);
      if (boundaryNode && endCellCenter) {
        const heuristic = haversineDistance(boundaryNode.coord, endCellCenter);
        openSet.enqueue(boundaryNodeId, data.distance + heuristic);
      }
    }

    // Track best path to end
    let bestEndNode: string | null = null;
    let bestEndDistance = Infinity;

    while (!openSet.isEmpty()) {
      const currentId = openSet.dequeue()!;

      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const currentCell = nodeCell.get(currentId)!;
      const currentG = gScore.get(currentId)!;

      // Check if we reached end cell
      if (currentCell === endCellId && boundaryToEnd.has(currentId)) {
        const toEnd = boundaryToEnd.get(currentId)!;
        const totalDist = currentG + toEnd.distance;
        if (totalDist < bestEndDistance) {
          bestEndDistance = totalDist;
          bestEndNode = currentId;
        }
        continue;
      }

      const cell = partition.cells.get(currentCell);
      if (!cell) continue;

      // Explore within-cell edges (precomputed boundary paths)
      const boundaryPaths = cell.boundaryPaths.get(currentId);
      if (boundaryPaths) {
        for (const [targetId, precomputed] of boundaryPaths.entries()) {
          if (visited.has(targetId)) continue;

          const tentativeG = currentG + precomputed.distance;

          if (tentativeG < (gScore.get(targetId) ?? Infinity)) {
            cameFrom.set(targetId, currentId);
            gScore.set(targetId, tentativeG);
            nodeCell.set(targetId, currentCell);

            const targetNode = this.graph.nodes.get(targetId);
            const endCellCenter = this.getCellCenter(endCellId);
            if (targetNode && endCellCenter) {
              const heuristic = haversineDistance(targetNode.coord, endCellCenter);
              openSet.enqueue(targetId, tentativeG + heuristic);
            }
          }
        }
      }

      // Explore cross-cell edges
      const edges = this.graph.edges.get(currentId);
      if (edges) {
        for (const edge of edges) {
          if (visited.has(edge.to)) continue;

          const toCellId = this.partitioner.getCellId(
            this.graph.nodes.get(edge.to)?.coord ?? [0, 0]
          );

          if (toCellId !== currentCell) {
            // Cross-cell edge
            const tentativeG = currentG + edge.weight;

            if (tentativeG < (gScore.get(edge.to) ?? Infinity)) {
              cameFrom.set(edge.to, currentId);
              gScore.set(edge.to, tentativeG);
              nodeCell.set(edge.to, toCellId);

              const targetNode = this.graph.nodes.get(edge.to);
              const endCellCenter = this.getCellCenter(endCellId);
              if (targetNode && endCellCenter) {
                const heuristic = haversineDistance(targetNode.coord, endCellCenter);
                openSet.enqueue(edge.to, tentativeG + heuristic);
              }
            }
          }
        }
      }
    }

    if (!bestEndNode) return null;

    // Reconstruct the full path
    const pathNodes: string[] = [bestEndNode];
    let current = bestEndNode;

    while (cameFrom.has(current)) {
      const prev = cameFrom.get(current)!;
      const prevCell = nodeCell.get(prev)!;
      const currCell = nodeCell.get(current)!;

      // If same cell, include intermediate nodes from precomputed path
      if (prevCell === currCell) {
        const cell = partition.cells.get(prevCell);
        if (cell) {
          const precomputed = cell.boundaryPaths.get(prev)?.get(current);
          if (precomputed && precomputed.intermediateNodes.length > 0) {
            // Insert intermediate nodes in reverse order
            for (let i = precomputed.intermediateNodes.length - 1; i >= 0; i--) {
              pathNodes.unshift(precomputed.intermediateNodes[i]);
            }
          }
        }
      }

      pathNodes.unshift(prev);
      current = prev;
    }

    // Add path from start to first boundary node
    const firstBoundary = pathNodes[0];
    const startData = startToBoundary.get(firstBoundary);
    if (startData && startData.path.length > 1) {
      pathNodes.unshift(...startData.path.slice(0, -1));
    }

    // Add path from last boundary node to end
    const lastBoundary = pathNodes[pathNodes.length - 1];
    const endData = boundaryToEnd.get(lastBoundary);
    if (endData && endData.path.length > 1) {
      // endData.path goes from end to boundary, so reverse it
      pathNodes.push(...endData.path.slice(1).reverse());
    }

    // Convert node IDs to coordinates
    const points: [number, number][] = [];
    const cellsTraversed = new Set<string>();

    for (const nodeId of pathNodes) {
      const node = this.graph.nodes.get(nodeId);
      if (node) {
        points.push(node.coord);
        cellsTraversed.add(this.partitioner.getCellId(node.coord));
      }
    }

    return {
      points,
      totalDistance: bestEndDistance,
      cellsTraversed: Array.from(cellsTraversed),
    };
  }

  /**
   * Fallback to full A* when hierarchical pathfinding fails.
   */
  private fallbackFullAstar(
    from: [number, number],
    to: [number, number],
    startNode: GraphNode,
    endNode: GraphNode
  ): HierarchicalPathResult {
    const openSet = new PriorityQueue<string>();
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    const visited = new Set<string>();

    gScore.set(startNode.id, 0);
    fScore.set(startNode.id, haversineDistance(startNode.coord, endNode.coord));
    openSet.enqueue(startNode.id, fScore.get(startNode.id)!);

    while (!openSet.isEmpty()) {
      const currentId = openSet.dequeue()!;

      if (currentId === endNode.id) {
        const path = this.reconstructPath(cameFrom, currentId);
        if (path) {
          const fullPath: [number, number][] = [from, ...path.points, to];
          const totalDistance =
            haversineDistance(from, path.points[0]) +
            path.totalDistance +
            haversineDistance(path.points[path.points.length - 1], to);

          // Track cells traversed
          const cellsTraversed = new Set<string>();
          for (const point of path.points) {
            cellsTraversed.add(this.partitioner.getCellId(point));
          }

          return {
            points: fullPath,
            totalDistance,
            cellsTraversed: Array.from(cellsTraversed),
            isLocalPath: false,
          };
        }
      }

      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const edges = this.graph.edges.get(currentId);
      if (!edges) continue;

      const currentG = gScore.get(currentId)!;

      for (const edge of edges) {
        if (visited.has(edge.to)) continue;

        const tentativeG = currentG + edge.weight;

        if (tentativeG < (gScore.get(edge.to) ?? Infinity)) {
          cameFrom.set(edge.to, currentId);
          gScore.set(edge.to, tentativeG);

          const neighbor = this.graph.nodes.get(edge.to);
          if (neighbor) {
            const f = tentativeG + haversineDistance(neighbor.coord, endNode.coord);
            fScore.set(edge.to, f);
            openSet.enqueue(edge.to, f);
          }
        }
      }
    }

    // No path found
    return {
      points: [from, to],
      totalDistance: haversineDistance(from, to),
      cellsTraversed: [],
      isLocalPath: true,
    };
  }

  /**
   * Reconstruct path from cameFrom map.
   */
  private reconstructPath(cameFrom: Map<string, string>, current: string): Path | null {
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

    return points.length > 0 ? { points, totalDistance } : null;
  }

  /**
   * Reconstruct node ID path from previous map.
   */
  private reconstructNodePath(previous: Map<string, string>, target: string, start: string): string[] {
    const path: string[] = [target];
    let current = target;

    while (previous.has(current) && current !== start) {
      current = previous.get(current)!;
      path.unshift(current);
    }

    if (current !== start) {
      path.unshift(start);
    }

    return path;
  }

  /**
   * Get the center coordinate of a cell.
   */
  private getCellCenter(cellId: string): [number, number] | null {
    const cell = this.partitioner.getCellById(cellId);
    if (!cell) return null;

    return [
      (cell.bounds.minLng + cell.bounds.maxLng) / 2,
      (cell.bounds.minLat + cell.bounds.maxLat) / 2,
    ];
  }

  /**
   * Get cache key for a path query.
   */
  private getCacheKey(from: [number, number], to: [number, number]): string {
    return `${from[0].toFixed(5)},${from[1].toFixed(5)}-${to[0].toFixed(5)},${to[1].toFixed(5)}`;
  }

  /**
   * Get cache statistics.
   */
  getCacheStats(): { hits: number; misses: number; size: number; hitRate: number } {
    const total = this.cacheHits + this.cacheMisses;
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      size: this.cache.size,
      hitRate: total > 0 ? this.cacheHits / total : 0,
    };
  }

  /**
   * Clear the path cache.
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Invalidate cache entries for specific cells.
   */
  invalidateForCells(cellIds: Set<string>): number {
    return this.cache.invalidateForCells(cellIds);
  }
}
