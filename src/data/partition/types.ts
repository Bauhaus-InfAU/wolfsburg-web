import type { Path, GraphEdge } from '../../config/types';

/**
 * A grid cell in the spatial partition.
 * Each cell contains a subgraph of the street network.
 */
export interface GridCell {
  /** Unique identifier in format "row,col" */
  id: string;
  /** Row index in the grid */
  row: number;
  /** Column index in the grid */
  col: number;
  /** Geographic bounds of the cell */
  bounds: CellBounds;
  /** Set of graph node IDs within this cell */
  nodes: Set<string>;
  /** Nodes that have edges crossing to other cells */
  boundaryNodes: Set<string>;
  /** Precomputed shortest paths between boundary nodes within this cell */
  boundaryPaths: Map<string, Map<string, PrecomputedPath>>;
  /** Building IDs located within this cell */
  buildingIds: Set<string>;
  /** Whether the cell needs recomputation */
  isDirty: boolean;
}

/**
 * Geographic bounds of a cell in WGS84 coordinates.
 */
export interface CellBounds {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}

/**
 * Precomputed path between two boundary nodes.
 */
export interface PrecomputedPath {
  /** Node IDs along the path (excluding endpoints) */
  intermediateNodes: string[];
  /** Total distance in meters */
  distance: number;
}

/**
 * An edge that crosses cell boundaries.
 */
export interface CrossCellEdge {
  /** Source node ID */
  from: string;
  /** Target node ID */
  to: string;
  /** Cell ID of source node */
  fromCell: string;
  /** Cell ID of target node */
  toCell: string;
  /** Edge weight (distance in meters) */
  weight: number;
}

/**
 * The complete partitioned graph structure.
 */
export interface PartitionedGraph {
  /** All cells in the partition, keyed by cell ID */
  cells: Map<string, GridCell>;
  /** Cell size in degrees (~0.0018° ≈ 200m) */
  cellSize: number;
  /** Edges that cross cell boundaries */
  crossCellEdges: Map<string, CrossCellEdge>;
  /** Grid dimensions */
  gridRows: number;
  gridCols: number;
  /** Grid origin (bottom-left corner) */
  originLng: number;
  originLat: number;
}

/**
 * Describes a change to the graph (for incremental updates).
 */
export interface GraphChange {
  type: 'add_edge' | 'remove_edge' | 'add_node' | 'remove_node';
  /** For edge operations */
  from?: string;
  to?: string;
  weight?: number;
  /** For node operations */
  nodeId?: string;
  coord?: [number, number];
}

/**
 * Cache entry that tracks which cells a cached path traverses.
 */
export interface CachedPathEntry {
  path: Path;
  /** Cell IDs this path traverses */
  cellsTraversed: Set<string>;
}

/**
 * Statistics about the partition.
 */
export interface PartitionStats {
  totalCells: number;
  nonEmptyCells: number;
  totalNodes: number;
  totalBoundaryNodes: number;
  totalCrossCellEdges: number;
  avgNodesPerCell: number;
  avgBoundaryNodesPerCell: number;
  precomputedPathCount: number;
}

/**
 * Result of a hierarchical path search.
 */
export interface HierarchicalPathResult {
  /** Full path coordinates */
  points: [number, number][];
  /** Total distance in meters */
  totalDistance: number;
  /** Cell IDs traversed by this path */
  cellsTraversed: string[];
  /** Whether this was a same-cell (local) or cross-cell (hierarchical) path */
  isLocalPath: boolean;
}

/**
 * Serializable version of PartitionedGraph for Web Worker transfer.
 */
export interface SerializedPartition {
  cells: Array<{
    id: string;
    row: number;
    col: number;
    bounds: CellBounds;
    nodes: string[];
    boundaryNodes: string[];
    boundaryPaths: Array<{
      from: string;
      to: string;
      intermediateNodes: string[];
      distance: number;
    }>;
    buildingIds: string[];
  }>;
  cellSize: number;
  crossCellEdges: Array<CrossCellEdge>;
  gridRows: number;
  gridCols: number;
  originLng: number;
  originLat: number;
}

/**
 * Serializable graph data for Web Worker.
 */
export interface SerializedGraph {
  nodes: Array<{ id: string; coord: [number, number] }>;
  edges: Array<GraphEdge>;
}

/**
 * Message sent to flow worker.
 */
export interface FlowWorkerMessage {
  type: 'init' | 'calculate';
  /** For init */
  partition?: SerializedPartition;
  graph?: SerializedGraph;
  /** For calculate */
  buildings?: Array<{
    id: string;
    centroid: [number, number];
    estimatedResidents: number;
    landUseAreas: Array<[string, number]>;
  }>;
  enabledLandUses?: string[];
  batchId?: number;
}

/**
 * Result from flow worker.
 */
export interface FlowWorkerResult {
  type: 'init_complete' | 'batch_complete' | 'error';
  batchId?: number;
  /** Segment usage counts: segmentKey -> count */
  segmentCounts?: Record<string, number>;
  /** Per-building flows */
  buildingGenerated?: Record<string, number>;
  buildingAttracted?: Record<string, number>;
  totalTrips?: number;
  totalDistance?: number;
  error?: string;
}
