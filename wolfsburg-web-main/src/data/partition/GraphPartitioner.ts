import type { StreetGraph } from '../streetGraph';
import type { BuildingStore } from '../buildingStore';
import type {
  GridCell,
  PartitionedGraph,
  PrecomputedPath,
  PartitionStats,
  SerializedPartition,
} from './types';

// ~200m cell size in degrees at ~52° latitude
const DEFAULT_CELL_SIZE = 0.0018;

// Priority queue for Dijkstra's algorithm
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
 * GraphPartitioner divides the street graph into spatial grid cells
 * and precomputes shortest paths between boundary nodes within each cell.
 */
export class GraphPartitioner {
  private graph: StreetGraph;
  private partition: PartitionedGraph | null = null;

  constructor(graph: StreetGraph) {
    this.graph = graph;
  }

  /**
   * Build the partition from the graph.
   * @param buildingStore Optional building store to assign buildings to cells
   * @param cellSize Cell size in degrees (default ~200m)
   */
  buildPartition(buildingStore?: BuildingStore, cellSize: number = DEFAULT_CELL_SIZE): PartitionedGraph {
    console.log('GraphPartitioner: Building partition...');
    const startTime = performance.now();

    // Calculate grid bounds from graph nodes
    let minLng = Infinity, maxLng = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;

    for (const node of this.graph.nodes.values()) {
      const [lng, lat] = node.coord;
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }

    // Add small padding
    const padding = cellSize * 0.5;
    minLng -= padding;
    minLat -= padding;
    maxLng += padding;
    maxLat += padding;

    // Calculate grid dimensions
    const gridCols = Math.ceil((maxLng - minLng) / cellSize);
    const gridRows = Math.ceil((maxLat - minLat) / cellSize);

    console.log(`  Grid size: ${gridRows} rows × ${gridCols} cols = ${gridRows * gridCols} cells`);

    // Initialize partition
    this.partition = {
      cells: new Map(),
      cellSize,
      crossCellEdges: new Map(),
      gridRows,
      gridCols,
      originLng: minLng,
      originLat: minLat,
    };

    // Assign nodes to cells
    const nodeToCellMap = new Map<string, string>();

    for (const node of this.graph.nodes.values()) {
      const cellId = this.getCellId(node.coord);
      nodeToCellMap.set(node.id, cellId);

      let cell = this.partition.cells.get(cellId);
      if (!cell) {
        const [row, col] = cellId.split(',').map(Number);
        cell = this.createCell(cellId, row, col);
        this.partition.cells.set(cellId, cell);
      }
      cell.nodes.add(node.id);
    }

    // Identify boundary nodes and cross-cell edges
    for (const [nodeId, edges] of this.graph.edges.entries()) {
      const fromCell = nodeToCellMap.get(nodeId);
      if (!fromCell) continue;

      for (const edge of edges) {
        const toCell = nodeToCellMap.get(edge.to);
        if (!toCell) continue;

        if (fromCell !== toCell) {
          // This is a cross-cell edge
          const cell = this.partition.cells.get(fromCell)!;
          cell.boundaryNodes.add(nodeId);

          const targetCell = this.partition.cells.get(toCell);
          if (targetCell) {
            targetCell.boundaryNodes.add(edge.to);
          }

          // Store cross-cell edge
          const edgeKey = `${nodeId}->${edge.to}`;
          if (!this.partition.crossCellEdges.has(edgeKey)) {
            this.partition.crossCellEdges.set(edgeKey, {
              from: nodeId,
              to: edge.to,
              fromCell,
              toCell,
              weight: edge.weight,
            });
          }
        }
      }
    }

    // Assign buildings to cells
    if (buildingStore) {
      for (const building of buildingStore.buildings.values()) {
        const cellId = this.getCellId(building.centroid);
        const cell = this.partition.cells.get(cellId);
        if (cell) {
          cell.buildingIds.add(building.id);
        }
      }
    }

    // Precompute boundary paths for each cell
    let totalPaths = 0;
    for (const cell of this.partition.cells.values()) {
      if (cell.boundaryNodes.size > 1) {
        this.precomputeBoundaryPaths(cell);
        totalPaths += cell.boundaryPaths.size;
      }
    }

    const elapsed = performance.now() - startTime;
    console.log(`  Precomputed ${totalPaths} boundary path sets`);
    console.log(`GraphPartitioner: Partition built in ${elapsed.toFixed(1)}ms`);

    return this.partition;
  }

  /**
   * Get the cell ID for a coordinate.
   */
  getCellId(coord: [number, number]): string {
    if (!this.partition) {
      throw new Error('Partition not built');
    }
    const [lng, lat] = coord;
    const col = Math.floor((lng - this.partition.originLng) / this.partition.cellSize);
    const row = Math.floor((lat - this.partition.originLat) / this.partition.cellSize);
    return `${row},${col}`;
  }

  /**
   * Get the cell containing a coordinate.
   */
  getCell(coord: [number, number]): GridCell | undefined {
    const cellId = this.getCellId(coord);
    return this.partition?.cells.get(cellId);
  }

  /**
   * Get cell by ID.
   */
  getCellById(cellId: string): GridCell | undefined {
    return this.partition?.cells.get(cellId);
  }

  /**
   * Get the partition.
   */
  getPartition(): PartitionedGraph | null {
    return this.partition;
  }

  /**
   * Get neighbors of a cell (8-directional).
   */
  getCellNeighbors(cellId: string): string[] {
    if (!this.partition) return [];

    const [row, col] = cellId.split(',').map(Number);
    const neighbors: string[] = [];

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < this.partition.gridRows && nc >= 0 && nc < this.partition.gridCols) {
          const neighborId = `${nr},${nc}`;
          if (this.partition.cells.has(neighborId)) {
            neighbors.push(neighborId);
          }
        }
      }
    }

    return neighbors;
  }

  /**
   * Get statistics about the partition.
   */
  getStats(): PartitionStats {
    if (!this.partition) {
      return {
        totalCells: 0,
        nonEmptyCells: 0,
        totalNodes: 0,
        totalBoundaryNodes: 0,
        totalCrossCellEdges: 0,
        avgNodesPerCell: 0,
        avgBoundaryNodesPerCell: 0,
        precomputedPathCount: 0,
      };
    }

    let totalNodes = 0;
    let totalBoundaryNodes = 0;
    let precomputedPathCount = 0;
    let nonEmptyCells = 0;

    for (const cell of this.partition.cells.values()) {
      if (cell.nodes.size > 0) {
        nonEmptyCells++;
        totalNodes += cell.nodes.size;
        totalBoundaryNodes += cell.boundaryNodes.size;
        precomputedPathCount += cell.boundaryPaths.size;
      }
    }

    return {
      totalCells: this.partition.cells.size,
      nonEmptyCells,
      totalNodes,
      totalBoundaryNodes,
      totalCrossCellEdges: this.partition.crossCellEdges.size,
      avgNodesPerCell: nonEmptyCells > 0 ? totalNodes / nonEmptyCells : 0,
      avgBoundaryNodesPerCell: nonEmptyCells > 0 ? totalBoundaryNodes / nonEmptyCells : 0,
      precomputedPathCount,
    };
  }

  /**
   * Serialize the partition for Web Worker transfer.
   */
  serialize(): SerializedPartition | null {
    if (!this.partition) return null;

    const cells: SerializedPartition['cells'] = [];

    for (const cell of this.partition.cells.values()) {
      const boundaryPaths: SerializedPartition['cells'][0]['boundaryPaths'] = [];

      for (const [from, toMap] of cell.boundaryPaths.entries()) {
        for (const [to, path] of toMap.entries()) {
          boundaryPaths.push({
            from,
            to,
            intermediateNodes: path.intermediateNodes,
            distance: path.distance,
          });
        }
      }

      cells.push({
        id: cell.id,
        row: cell.row,
        col: cell.col,
        bounds: cell.bounds,
        nodes: Array.from(cell.nodes),
        boundaryNodes: Array.from(cell.boundaryNodes),
        boundaryPaths,
        buildingIds: Array.from(cell.buildingIds),
      });
    }

    return {
      cells,
      cellSize: this.partition.cellSize,
      crossCellEdges: Array.from(this.partition.crossCellEdges.values()),
      gridRows: this.partition.gridRows,
      gridCols: this.partition.gridCols,
      originLng: this.partition.originLng,
      originLat: this.partition.originLat,
    };
  }

  /**
   * Mark a cell as dirty (needs recomputation).
   */
  markCellDirty(cellId: string): void {
    const cell = this.partition?.cells.get(cellId);
    if (cell) {
      cell.isDirty = true;
    }
  }

  /**
   * Recompute boundary paths for dirty cells.
   */
  recomputeDirtyCells(): void {
    if (!this.partition) return;

    for (const cell of this.partition.cells.values()) {
      if (cell.isDirty) {
        this.precomputeBoundaryPaths(cell);
        cell.isDirty = false;
      }
    }
  }

  /**
   * Create a new grid cell.
   */
  private createCell(id: string, row: number, col: number): GridCell {
    const cellSize = this.partition!.cellSize;
    const originLng = this.partition!.originLng;
    const originLat = this.partition!.originLat;

    return {
      id,
      row,
      col,
      bounds: {
        minLng: originLng + col * cellSize,
        maxLng: originLng + (col + 1) * cellSize,
        minLat: originLat + row * cellSize,
        maxLat: originLat + (row + 1) * cellSize,
      },
      nodes: new Set(),
      boundaryNodes: new Set(),
      boundaryPaths: new Map(),
      buildingIds: new Set(),
      isDirty: false,
    };
  }

  /**
   * Precompute all-pairs shortest paths between boundary nodes within a cell.
   * Uses Dijkstra's algorithm for each boundary node.
   */
  private precomputeBoundaryPaths(cell: GridCell): void {
    cell.boundaryPaths.clear();

    const boundaryArray = Array.from(cell.boundaryNodes);
    if (boundaryArray.length < 2) return;

    // Build cell subgraph (only edges within the cell)
    const cellEdges = new Map<string, Array<{ to: string; weight: number }>>();

    for (const nodeId of cell.nodes) {
      const edges = this.graph.edges.get(nodeId);
      if (!edges) continue;

      const filteredEdges = edges.filter(e => cell.nodes.has(e.to));
      if (filteredEdges.length > 0) {
        cellEdges.set(nodeId, filteredEdges.map(e => ({ to: e.to, weight: e.weight })));
      }
    }

    // Run Dijkstra from each boundary node
    for (const source of boundaryArray) {
      const distances = new Map<string, number>();
      const previous = new Map<string, string>();
      const visited = new Set<string>();
      const queue = new PriorityQueue<string>();

      distances.set(source, 0);
      queue.enqueue(source, 0);

      while (!queue.isEmpty()) {
        const current = queue.dequeue()!;

        if (visited.has(current)) continue;
        visited.add(current);

        const edges = cellEdges.get(current);
        if (!edges) continue;

        const currentDist = distances.get(current)!;

        for (const edge of edges) {
          if (visited.has(edge.to)) continue;

          const newDist = currentDist + edge.weight;
          const oldDist = distances.get(edge.to) ?? Infinity;

          if (newDist < oldDist) {
            distances.set(edge.to, newDist);
            previous.set(edge.to, current);
            queue.enqueue(edge.to, newDist);
          }
        }
      }

      // Extract paths to other boundary nodes
      const pathsFromSource = new Map<string, PrecomputedPath>();

      for (const target of boundaryArray) {
        if (target === source) continue;

        const dist = distances.get(target);
        if (dist === undefined) continue; // No path exists

        // Reconstruct path
        const intermediateNodes: string[] = [];
        let current = target;

        while (previous.has(current)) {
          const prev = previous.get(current)!;
          if (prev !== source) {
            intermediateNodes.unshift(prev);
          }
          current = prev;
        }

        pathsFromSource.set(target, {
          intermediateNodes,
          distance: dist,
        });
      }

      if (pathsFromSource.size > 0) {
        cell.boundaryPaths.set(source, pathsFromSource);
      }
    }
  }
}
