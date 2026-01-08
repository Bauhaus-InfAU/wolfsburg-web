import type { LandUse } from './types';
import { MID_LAND_USE_WEIGHTS } from '../data/midMobilityData';

// Land use attraction weights (higher = more attractive as destination)
// Calibrated from MiD 2023 (Mobilität in Deutschland) pedestrian trip data
export const LAND_USE_WEIGHTS: Record<LandUse, number> = MID_LAND_USE_WEIGHTS;

// Colors for land use visualization (warm, earthy palette for light theme)
export const LAND_USE_COLORS: Record<LandUse, string> = {
  'Generic Residential': '#d4a574',
  'Generic Retail': '#c96b5a',
  'Generic Food and Beverage Service': '#e8a668',
  'Generic Entertainment': '#d47a8c',
  'Generic Service': '#a8b4a8',
  'Generic Health and Wellbeing': '#7cb89a',
  'Generic Education': '#e8c468',
  'Generic Office Building': '#8aaccc',
  'Generic Culture': '#7ab8c8',
  'Generic Civic Function': '#b8a888',
  'Generic Sport Facility': '#98c878',
  'Generic Light Industrial': '#b8b0a8',
  'Generic Accommodation': '#e8986a',
  'Generic Transportation Service': '#98a8b8',
  'Generic Utilities': '#a8a8a0',
  'Undefined Land use': '#d8d4cc',
};

// Short display names for UI
export const LAND_USE_DISPLAY_NAMES: Record<LandUse, string> = {
  'Generic Residential': 'Residential',
  'Generic Retail': 'Retail',
  'Generic Food and Beverage Service': 'Food & Bev',
  'Generic Entertainment': 'Entertainment',
  'Generic Service': 'Service',
  'Generic Health and Wellbeing': 'Health',
  'Generic Education': 'Education',
  'Generic Office Building': 'Office',
  'Generic Culture': 'Culture',
  'Generic Civic Function': 'Civic',
  'Generic Sport Facility': 'Sports',
  'Generic Light Industrial': 'Industrial',
  'Generic Accommodation': 'Accommodation',
  'Generic Transportation Service': 'Transport',
  'Generic Utilities': 'Utilities',
  'Undefined Land use': 'Undefined',
};

// List of land uses that can be destinations (excludes residential)
export const DESTINATION_LAND_USES: LandUse[] = [
  'Generic Retail',
  'Generic Food and Beverage Service',
  'Generic Entertainment',
  'Generic Service',
  'Generic Health and Wellbeing',
  'Generic Education',
  'Generic Office Building',
  'Generic Culture',
  'Generic Civic Function',
  'Generic Sport Facility',
  'Generic Light Industrial',
  'Generic Accommodation',
  'Generic Transportation Service',
  'Generic Utilities',
];

// Residential density: German cities average ~40.9 sqm per person
export const SQM_PER_PERSON = 40.9;

// Simulation defaults
// Note: Coordinates are in degrees (Heron GeoJSON export converts to WGS84)
// Distance calculations convert to meters internally (1 degree ≈ 111km)
export const SIMULATION_DEFAULTS = {
  // Agent movement: 1.4 m/s walking speed
  WALKING_SPEED: 1.4, // meters per simulated second

  // Trip generation
  MIN_TRIP_DISTANCE: 50, // 50 meters minimum
  MAX_TRIP_DISTANCE: 2000, // 2000 meters maximum
  // MiD 2023: ~0.68 walking trips per person per day = 0.00047 per minute
  // Scaled up for visible simulation activity
  BASE_TRIPS_PER_RESIDENT: 0.02, // trips per resident per simulation minute
  DWELL_TIME_MS: 2000, // time at destination (2 seconds real time)

  // Distance decay: exp(-beta * distance_in_meters)
  // beta = 0.002 means: at 500m, probability = 0.37; at 1000m = 0.14
  DECAY_BETA: 0.002,

  // Time scaling
  TIME_SCALE: 5, // 1 real second = 5 simulated seconds

  // Performance limits
  // Max active agents = total residents × ACTIVE_AGENT_RATIO
  // ~10% of population walking at any given time during peak
  ACTIVE_AGENT_RATIO: 0.1,
  MIN_ACTIVE_AGENTS: 100, // minimum for small areas
  PATH_CACHE_SIZE: 1000,

  // Rendering
  AGENT_RADIUS: 6, // pixels
};

// Precision for coordinate rounding (for graph node merging)
// For degree coordinates, 6 decimal places = ~10cm precision
export const COORD_PRECISION = 6;

// Minimum weight threshold for O-D probability
export const MIN_OD_WEIGHT = 0.001;
