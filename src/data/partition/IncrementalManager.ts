import type { GraphPartitioner } from './GraphPartitioner';
import type { StreetGraph } from '../streetGraph';
import type { GraphChange, CachedPathEntry } from './types';
import type { Path } from '../../config/types';

/**
 * IncrementalManager handles incremental updates to the graph partition.
 * It tracks which cells are affected by changes and maintains cache invalidation.
 */
export class IncrementalManager {
  private partitioner: GraphPartitioner;
  private graph: StreetGraph;
  private pendingChanges: GraphChange[] = [];
  private dirtyCells: Set<string> = new Set();
  private cacheInvalidationCallbacks: Array<(cellIds: Set<string>) => void> = [];

  constructor(partitioner: GraphPartitioner, graph: StreetGraph) {
    this.partitioner = partitioner;
    this.graph = graph;
  }

  /**
   * Register a callback to be notified when cells are invalidated.
   */
  onCacheInvalidation(callback: (cellIds: Set<string>) => void): void {
    this.cacheInvalidationCallbacks.push(callback);
  }

  /**
   * Apply a graph change and mark affected cells as dirty.
   */
  applyChange(change: GraphChange): void {
    this.pendingChanges.push(change);

    // Determine affected cells
    const affectedCells = this.getAffectedCells(change);
    for (const cellId of affectedCells) {
      this.dirtyCells.add(cellId);
      this.partitioner.markCellDirty(cellId);
    }
  }

  /**
   * Apply multiple changes at once.
   */
  applyChanges(changes: GraphChange[]): void {
    for (const change of changes) {
      this.applyChange(change);
    }
  }

  /**
   * Get the set of cells affected by a change.
   */
  private getAffectedCells(change: GraphChange): Set<string> {
    const cells = new Set<string>();

    switch (change.type) {
      case 'add_edge':
      case 'remove_edge': {
        if (change.from && change.to) {
          const fromNode = this.graph.nodes.get(change.from);
          const toNode = this.graph.nodes.get(change.to);

          if (fromNode) {
            cells.add(this.partitioner.getCellId(fromNode.coord));
          }
          if (toNode) {
            cells.add(this.partitioner.getCellId(toNode.coord));
          }
        }
        break;
      }

      case 'add_node':
      case 'remove_node': {
        if (change.coord) {
          cells.add(this.partitioner.getCellId(change.coord));
        } else if (change.nodeId) {
          const node = this.graph.nodes.get(change.nodeId);
          if (node) {
            cells.add(this.partitioner.getCellId(node.coord));
          }
        }
        break;
      }
    }

    return cells;
  }

  /**
   * Check if there are pending changes.
   */
  hasPendingChanges(): boolean {
    return this.pendingChanges.length > 0;
  }

  /**
   * Get the set of dirty cells.
   */
  getDirtyCells(): Set<string> {
    return new Set(this.dirtyCells);
  }

  /**
   * Recompute dirty cells and clear pending changes.
   * Returns the set of cells that were recomputed.
   */
  recomputeDirtyCells(): Set<string> {
    if (this.dirtyCells.size === 0) {
      return new Set();
    }

    const recomputedCells = new Set(this.dirtyCells);

    // Notify listeners before recomputation (so they can invalidate caches)
    for (const callback of this.cacheInvalidationCallbacks) {
      callback(recomputedCells);
    }

    // Recompute boundary paths for dirty cells
    this.partitioner.recomputeDirtyCells();

    // Clear state
    this.pendingChanges = [];
    this.dirtyCells.clear();

    return recomputedCells;
  }

  /**
   * Check if a cached path is still valid given dirty cells.
   */
  isCacheEntryValid(entry: CachedPathEntry): boolean {
    for (const cellId of entry.cellsTraversed) {
      if (this.dirtyCells.has(cellId)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Filter a cache to remove entries that traverse dirty cells.
   * @param cache Map of cache key to cached path entry
   * @returns Number of entries removed
   */
  invalidateCache<K>(cache: Map<K, CachedPathEntry>): number {
    if (this.dirtyCells.size === 0) return 0;

    let removed = 0;
    const keysToRemove: K[] = [];

    for (const [key, entry] of cache.entries()) {
      if (!this.isCacheEntryValid(entry)) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      cache.delete(key);
      removed++;
    }

    return removed;
  }

  /**
   * Create a cache entry with cell tracking.
   */
  createCacheEntry(path: Path, cellsTraversed: string[]): CachedPathEntry {
    return {
      path,
      cellsTraversed: new Set(cellsTraversed),
    };
  }
}

/**
 * LRU Cache with cell-aware invalidation support.
 */
export class CellAwareLRUCache<V extends { cellsTraversed?: Set<string> }> {
  private cache: Map<string, V> = new Map();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: string): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: string, value: V): void {
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

    for (const [key, value] of this.cache.entries()) {
      if (value.cellsTraversed) {
        for (const cellId of value.cellsTraversed) {
          if (dirtyCells.has(cellId)) {
            keysToRemove.push(key);
            break;
          }
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
