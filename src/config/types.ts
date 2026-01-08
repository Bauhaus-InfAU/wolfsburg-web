import type { Feature, FeatureCollection, MultiPolygon, LineString } from 'geojson';

// Land use types matching the GeoJSON properties
export type LandUse =
  | 'Generic Residential'
  | 'Generic Retail'
  | 'Generic Food and Beverage Service'
  | 'Generic Entertainment'
  | 'Generic Service'
  | 'Generic Health and Wellbeing'
  | 'Generic Education'
  | 'Generic Office Building'
  | 'Generic Culture'
  | 'Generic Civic Function'
  | 'Generic Sport Facility'
  | 'Generic Light Industrial'
  | 'Generic Accommodation'
  | 'Generic Transportation Service'
  | 'Generic Utilities'
  | 'Undefined Land use';

// Building properties from GeoJSON
export interface BuildingProperties {
  'Building ID': string;
  Height: number;
  Floors: number;
  Detached: boolean;
  Adress: string;
  // Land use boolean fields
  'Generic Residential': number;
  'Generic Light Industrial': number;
  'Generic Service': number;
  'Generic Office Building': number;
  'Generic Education': number;
  'Generic Entertainment': number;
  'Generic Civic Function': number;
  'Generic Transportation Service': number;
  'Generic Culture': number;
  'Generic Utilities': number;
  'Generic Accommodation': number;
  'Generic Health and Wellbeing': number;
  'Generic Retail': number;
  'Generic Sport Facility': number;
  'Generic Food and Beverage Service': number;
  'Undefined Land use': number;
}

export type BuildingFeature = Feature<MultiPolygon, BuildingProperties>;
export type BuildingCollection = FeatureCollection<MultiPolygon, BuildingProperties>;

// Street properties (generic, will adapt to actual data)
export interface StreetProperties {
  id?: string;
  name?: string;
  [key: string]: unknown;
}

export type StreetFeature = Feature<LineString, StreetProperties>;
export type StreetCollection = FeatureCollection<LineString, StreetProperties>;

// Processed building with computed values
export interface Building {
  id: string;
  centroid: [number, number]; // [lng, lat]
  floors: number;
  height: number;
  residentialArea: number; // sqm of residential floor area
  estimatedResidents: number; // based on ~40.9 sqm per person
  landUses: LandUse[];
  primaryLandUse: LandUse;
  feature: BuildingFeature;
}

// Graph structures for pathfinding
export interface GraphNode {
  id: string;
  coord: [number, number]; // [lng, lat]
}

export interface GraphEdge {
  from: string;
  to: string;
  weight: number; // distance in meters
}

// Path result
export interface Path {
  points: [number, number][];
  totalDistance: number;
}

// O-D Matrix entry
export interface ODEntry {
  destination: Building;
  probability: number;
  distance: number;
}

// Trip definition
export interface Trip {
  origin: Building;
  destination: Building;
  path: [number, number][];
  returnPath: [number, number][];
}

// Agent state
export type AgentState = 'toDestination' | 'atDestination' | 'returning' | 'completed';

// Simulation parameters
// Note: decayBeta and maxDistance removed - now using per-land-use
// parameters from MiD 2023 calibration
export interface SimulationParams {
  spawnRate: number;
  speed: number;
  enabledLandUses: Set<LandUse>;
}

// Statistics
export interface SimulationStats {
  activeAgents: number;
  totalTrips: number;
  avgDistance: number;
}

// Spatial index item for RBush
export interface SpatialItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  id: string;
}
