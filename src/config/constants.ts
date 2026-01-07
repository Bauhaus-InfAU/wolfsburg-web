import type { LandUse } from './types';

// Land use attraction weights (higher = more attractive as destination)
export const LAND_USE_WEIGHTS: Record<LandUse, number> = {
  'Generic Retail': 1.0,
  'Generic Food and Beverage Service': 0.9,
  'Generic Entertainment': 0.8,
  'Generic Service': 0.7,
  'Generic Health and Wellbeing': 0.6,
  'Generic Education': 0.6,
  'Generic Office Building': 0.5,
  'Generic Culture': 0.5,
  'Generic Civic Function': 0.4,
  'Generic Sport Facility': 0.4,
  'Generic Light Industrial': 0.3,
  'Generic Accommodation': 0.3,
  'Generic Transportation Service': 0.2,
  'Generic Utilities': 0.1,
  'Undefined Land use': 0.1,
  'Generic Residential': 0.0, // Residential doesn't attract trips
};

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

// Simulation defaults
// Note: Coordinates are in degrees (Heron GeoJSON export converts to WGS84)
// Distance calculations convert to meters internally (1 degree ≈ 111km)
export const SIMULATION_DEFAULTS = {
  // Agent movement: 1.4 m/s walking speed
  WALKING_SPEED: 1.4, // meters per simulated second

  // Trip generation
  MIN_TRIP_DISTANCE: 50, // 50 meters minimum
  MAX_TRIP_DISTANCE: 2000, // 2000 meters maximum
  BASE_TRIPS_PER_FLOOR: 0.3, // trips per floor per simulation minute
  DWELL_TIME_MS: 2000, // time at destination (2 seconds real time)

  // Distance decay: exp(-beta * distance_in_meters)
  // beta = 0.002 means: at 500m, probability = 0.37; at 1000m = 0.14
  DECAY_BETA: 0.002,

  // Time scaling
  TIME_SCALE: 5, // 1 real second = 5 simulated seconds

  // Performance limits
  MAX_ACTIVE_AGENTS: 5000,
  PATH_CACHE_SIZE: 1000,

  // Rendering
  AGENT_RADIUS: 6, // pixels
};

// Precision for coordinate rounding (for graph node merging)
// For degree coordinates, 6 decimal places = ~10cm precision
export const COORD_PRECISION = 6;

// Minimum weight threshold for O-D probability
export const MIN_OD_WEIGHT = 0.001;
