/**
 * MiD 2023 (Mobilität in Deutschland) Multi-Modal Trip Data
 *
 * This module contains calibrated parameters derived from the German
 * national mobility survey for pedestrian, bicycle, and car trips.
 *
 * Data source: Mobilität in Deutschland 2023
 * https://www.mobilitaet-in-deutschland.de/
 */

import type { LandUse, TransportMode } from '../config/types';

/**
 * Duration distribution type: array of 8 percentages for time bins
 * [<5min, 5-10min, 10-15min, 15-20min, 20-30min, 30-45min, 45-60min, 60+min]
 */
type DurationDistribution = readonly number[];

/**
 * Duration distributions by trip purpose
 */
interface DurationDistributions {
  readonly dailyShopping: DurationDistribution;
  readonly otherShopping: DurationDistribution;
  readonly shoppingStroll: DurationDistribution;
  readonly services: DurationDistribution;
  readonly doctorVisit: DurationDistribution;
  readonly governmentBankPost: DurationDistribution;
  readonly culturalVenue: DurationDistribution;
  readonly eventVisit: DurationDistribution;
  readonly activeSports: DurationDistribution;
  readonly restaurantBar: DurationDistribution;
  readonly churchCemetery: DurationDistribution;
  readonly coursesHobbyClub: DurationDistribution;
  readonly accompanyingChildren: DurationDistribution;
}

/**
 * Mode-specific travel speeds in meters per minute.
 * Used to convert trip duration to distance.
 */
export const MODE_SPEEDS: Record<TransportMode, number> = {
  pedestrian: 70,    // 4.2 km/h = 70 m/min
  bicycle: 250,      // 15 km/h = 250 m/min
  car: 667,          // 40 km/h (urban average) = 667 m/min
};

/**
 * Human-readable labels for transport modes.
 */
export const MODE_LABELS: Record<TransportMode, string> = {
  pedestrian: 'Walking',
  bicycle: 'Bicycle',
  car: 'Car',
};

/**
 * Trip purpose to land use mapping with weighted sample sizes from MiD 2023.
 * These represent the number of pedestrian trips recorded for each purpose.
 */
export const MID_TRIP_PURPOSE_DATA = {
  // Retail-related trips
  dailyShopping: { landUse: 'Generic Retail' as LandUse, sampleSize: 14527 },
  otherShopping: { landUse: 'Generic Retail' as LandUse, sampleSize: 1453 },
  shoppingStroll: { landUse: 'Generic Retail' as LandUse, sampleSize: 3151 },

  // Service trips
  services: { landUse: 'Generic Service' as LandUse, sampleSize: 853 },

  // Health trips
  doctorVisit: { landUse: 'Generic Health and Wellbeing' as LandUse, sampleSize: 1329 },

  // Civic function trips
  governmentBankPost: { landUse: 'Generic Civic Function' as LandUse, sampleSize: 1140 },
  churchCemetery: { landUse: 'Generic Civic Function' as LandUse, sampleSize: 792 },

  // Culture trips
  culturalVenue: { landUse: 'Generic Culture' as LandUse, sampleSize: 535 },

  // Entertainment trips
  eventVisit: { landUse: 'Generic Entertainment' as LandUse, sampleSize: 1114 },

  // Sports trips
  activeSports: { landUse: 'Generic Sport Facility' as LandUse, sampleSize: 4297 },

  // Food & Beverage trips
  restaurantBar: { landUse: 'Generic Food and Beverage Service' as LandUse, sampleSize: 3493 },

  // Education-related trips
  coursesHobbyClub: { landUse: 'Generic Education' as LandUse, sampleSize: 1257 },
  accompanyingChildren: { landUse: 'Generic Education' as LandUse, sampleSize: 1341 },
} as const;

/**
 * Aggregated trip frequencies by land use type.
 * Sum of all trip purposes that map to each land use.
 */
export const MID_TRIP_FREQUENCIES: Partial<Record<LandUse, number>> = {
  'Generic Retail': 19131, // 14527 + 1453 + 3151
  'Generic Food and Beverage Service': 3493,
  'Generic Sport Facility': 4297,
  'Generic Education': 2598, // 1257 + 1341
  'Generic Civic Function': 1932, // 1140 + 792
  'Generic Health and Wellbeing': 1329,
  'Generic Entertainment': 1114,
  'Generic Service': 853,
  'Generic Culture': 535,
};

/**
 * Normalized land use weights based on MiD trip frequencies.
 * Retail (highest frequency) is the baseline at 1.0.
 */
export const MID_LAND_USE_WEIGHTS: Record<LandUse, number> = {
  'Generic Retail': 1.0, // 19131 trips (baseline)
  'Generic Sport Facility': 0.22, // 4297 / 19131
  'Generic Food and Beverage Service': 0.18, // 3493 / 19131
  'Generic Education': 0.14, // 2598 / 19131
  'Generic Civic Function': 0.10, // 1932 / 19131
  'Generic Health and Wellbeing': 0.07, // 1329 / 19131
  'Generic Entertainment': 0.06, // 1114 / 19131
  'Generic Service': 0.04, // 853 / 19131
  'Generic Culture': 0.03, // 535 / 19131
  // Land uses not directly represented in MiD data get minimal weights
  'Generic Office Building': 0.02,
  'Generic Accommodation': 0.02,
  'Generic Light Industrial': 0.01,
  'Generic Transportation Service': 0.01,
  'Generic Utilities': 0.01,
  'Undefined Land use': 0.01,
  'Generic Residential': 0.0, // Residential doesn't attract trips
};

/**
 * Duration distribution for each trip purpose (percentages) - PEDESTRIAN.
 * Columns: <5min, 5-10min, 10-15min, 15-20min, 20-30min, 30-45min, 45-60min, 60+min
 */
export const MID_DURATION_DISTRIBUTIONS = {
  dailyShopping: [3, 30, 25, 16, 8, 9, 3, 6],
  otherShopping: [4, 26, 23, 15, 13, 9, 4, 6],
  shoppingStroll: [1, 9, 11, 12, 9, 13, 7, 38],
  services: [3, 26, 28, 15, 14, 8, 2, 5],
  doctorVisit: [3, 20, 26, 23, 11, 11, 1, 6],
  governmentBankPost: [3, 25, 29, 15, 11, 10, 2, 4],
  culturalVenue: [0, 6, 20, 16, 18, 13, 2, 24],
  eventVisit: [1, 13, 20, 20, 11, 13, 4, 18],
  activeSports: [1, 11, 11, 9, 6, 17, 10, 35],
  restaurantBar: [1, 23, 22, 20, 10, 11, 4, 7],
  churchCemetery: [1, 19, 20, 14, 13, 12, 5, 16],
  coursesHobbyClub: [1, 26, 26, 17, 9, 6, 4, 11],
  accompanyingChildren: [2, 20, 13, 11, 8, 12, 6, 27],
} as const;

/**
 * Duration distribution for each trip purpose (percentages) - BICYCLE.
 * From MiD 2023 bicycle data.
 */
export const MID_DURATION_DISTRIBUTIONS_BICYCLE = {
  dailyShopping: [3, 32, 28, 16, 7, 5, 2, 7],
  otherShopping: [1, 26, 21, 19, 13, 12, 3, 4],
  shoppingStroll: [0, 9, 19, 21, 12, 11, 3, 25],
  services: [1, 16, 34, 21, 12, 9, 2, 6],
  doctorVisit: [0, 18, 25, 24, 15, 9, 4, 6],
  governmentBankPost: [2, 27, 22, 16, 7, 9, 4, 12],
  culturalVenue: [0, 12, 13, 32, 17, 20, 1, 5],
  eventVisit: [0, 13, 22, 19, 12, 13, 10, 12],
  activeSports: [0, 15, 22, 16, 9, 8, 4, 26],
  restaurantBar: [1, 12, 21, 22, 12, 11, 4, 17],
  churchCemetery: [6, 21, 23, 19, 9, 15, 1, 6],
  coursesHobbyClub: [0, 23, 27, 20, 10, 11, 1, 7],
  accompanyingChildren: [1, 18, 16, 23, 9, 10, 6, 18],
} as const;

/**
 * Duration distribution for each trip purpose (percentages) - CAR (driver).
 * From MiD 2023 car driver data.
 */
export const MID_DURATION_DISTRIBUTIONS_CAR = {
  dailyShopping: [2, 25, 28, 18, 8, 7, 3, 8],
  otherShopping: [2, 17, 19, 21, 16, 13, 3, 9],
  shoppingStroll: [0, 7, 12, 17, 20, 18, 4, 23],
  services: [1, 16, 20, 22, 18, 14, 4, 6],
  doctorVisit: [0, 10, 20, 19, 18, 19, 4, 9],
  governmentBankPost: [1, 27, 22, 16, 14, 8, 4, 7],
  culturalVenue: [0, 3, 8, 17, 16, 22, 12, 22],
  eventVisit: [1, 7, 16, 11, 17, 18, 7, 22],
  activeSports: [1, 11, 19, 27, 18, 14, 3, 7],
  restaurantBar: [0, 10, 21, 21, 16, 16, 5, 11],
  churchCemetery: [1, 23, 24, 20, 10, 12, 3, 7],
  coursesHobbyClub: [1, 15, 17, 20, 17, 18, 4, 9],
  accompanyingChildren: [0, 22, 15, 15, 21, 15, 4, 8],
} as const;

/**
 * Mode-specific duration distributions per trip purpose.
 */
export const MODE_DURATION_DISTRIBUTIONS: Record<TransportMode, DurationDistributions> = {
  pedestrian: MID_DURATION_DISTRIBUTIONS,
  bicycle: MID_DURATION_DISTRIBUTIONS_BICYCLE,
  car: MID_DURATION_DISTRIBUTIONS_CAR,
};

/**
 * Calculate median trip duration in minutes from duration distribution.
 * Uses bin midpoints: 2.5, 7.5, 12.5, 17.5, 25, 37.5, 52.5, 75 minutes
 */
function calculateMedianDuration(distribution: readonly number[]): number {
  const binMidpoints = [2.5, 7.5, 12.5, 17.5, 25, 37.5, 52.5, 75];
  let cumulative = 0;
  for (let i = 0; i < distribution.length; i++) {
    cumulative += distribution[i];
    if (cumulative >= 50) {
      return binMidpoints[i];
    }
  }
  return binMidpoints[binMidpoints.length - 1];
}

/**
 * Calculate decay beta from median trip duration and mode speed.
 * Beta is calibrated so that 50% of trips occur within median distance.
 * P(d) = e^(-beta * d) = 0.5 at median distance
 * beta = ln(2) / medianDistance
 */
function calculateDecayBeta(medianDurationMinutes: number, speedMPerMin: number): number {
  const medianDistanceM = medianDurationMinutes * speedMPerMin;
  return Math.log(2) / medianDistanceM;
}

/**
 * Calculate per-land-use decay beta values for a given transport mode.
 */
function calculateModeDecayBetas(
  mode: TransportMode,
  durationDistributions: DurationDistributions
): Record<LandUse, number> {
  const speed = MODE_SPEEDS[mode];

  // Calculate weighted average duration per land use
  const landUseDurations: Partial<Record<LandUse, { totalDuration: number; totalWeight: number }>> = {};

  const purposeMap: Record<keyof DurationDistributions, LandUse> = {
    dailyShopping: 'Generic Retail',
    otherShopping: 'Generic Retail',
    shoppingStroll: 'Generic Retail',
    services: 'Generic Service',
    doctorVisit: 'Generic Health and Wellbeing',
    governmentBankPost: 'Generic Civic Function',
    culturalVenue: 'Generic Culture',
    eventVisit: 'Generic Entertainment',
    activeSports: 'Generic Sport Facility',
    restaurantBar: 'Generic Food and Beverage Service',
    churchCemetery: 'Generic Civic Function',
    coursesHobbyClub: 'Generic Education',
    accompanyingChildren: 'Generic Education',
  };

  for (const [purpose, dist] of Object.entries(durationDistributions)) {
    const landUse = purposeMap[purpose as keyof DurationDistributions];
    const weight = MID_TRIP_PURPOSE_DATA[purpose as keyof typeof MID_TRIP_PURPOSE_DATA].sampleSize;
    const medianDuration = calculateMedianDuration(dist as DurationDistribution);

    if (!landUseDurations[landUse]) {
      landUseDurations[landUse] = { totalDuration: 0, totalWeight: 0 };
    }
    landUseDurations[landUse]!.totalDuration += medianDuration * weight;
    landUseDurations[landUse]!.totalWeight += weight;
  }

  // Calculate beta for each land use
  const betas: Partial<Record<LandUse, number>> = {};
  for (const [landUse, data] of Object.entries(landUseDurations)) {
    const avgDuration = data!.totalDuration / data!.totalWeight;
    betas[landUse as LandUse] = calculateDecayBeta(avgDuration, speed);
  }

  // Default beta (based on median retail trip duration)
  const defaultBeta = betas['Generic Retail'] ?? 0.002 / (speed / 70); // Scale with speed

  return {
    'Generic Retail': betas['Generic Retail'] ?? defaultBeta,
    'Generic Food and Beverage Service': betas['Generic Food and Beverage Service'] ?? defaultBeta,
    'Generic Sport Facility': betas['Generic Sport Facility'] ?? defaultBeta,
    'Generic Education': betas['Generic Education'] ?? defaultBeta,
    'Generic Civic Function': betas['Generic Civic Function'] ?? defaultBeta,
    'Generic Health and Wellbeing': betas['Generic Health and Wellbeing'] ?? defaultBeta,
    'Generic Entertainment': betas['Generic Entertainment'] ?? defaultBeta,
    'Generic Service': betas['Generic Service'] ?? defaultBeta,
    'Generic Culture': betas['Generic Culture'] ?? defaultBeta,
    'Generic Office Building': defaultBeta,
    'Generic Accommodation': defaultBeta,
    'Generic Light Industrial': defaultBeta,
    'Generic Transportation Service': defaultBeta,
    'Generic Utilities': defaultBeta,
    'Undefined Land use': defaultBeta,
    'Generic Residential': defaultBeta,
  };
}

/**
 * Per-land-use decay beta values derived from MiD duration distributions.
 * Lower beta = people willing to travel farther.
 * Kept for backward compatibility - use MODE_DECAY_BETA[mode] instead.
 */
export const MID_DECAY_BETA: Record<LandUse, number> = calculateModeDecayBetas('pedestrian', MID_DURATION_DISTRIBUTIONS);

/**
 * Mode-specific decay beta values per land use.
 * Lower beta = people willing to travel farther.
 */
export const MODE_DECAY_BETA: Record<TransportMode, Record<LandUse, number>> = {
  pedestrian: calculateModeDecayBetas('pedestrian', MID_DURATION_DISTRIBUTIONS),
  bicycle: calculateModeDecayBetas('bicycle', MID_DURATION_DISTRIBUTIONS_BICYCLE),
  car: calculateModeDecayBetas('car', MID_DURATION_DISTRIBUTIONS_CAR),
};

/**
 * Per-land-use maximum trip distance in meters (PEDESTRIAN).
 * Derived from 95th percentile of trip durations in MiD data.
 * Walking at 4.2 km/h = 70 m/min.
 * Kept for backward compatibility - use MODE_MAX_DISTANCE[mode] instead.
 */
export const MID_MAX_DISTANCE: Record<LandUse, number> = {
  // Sports and culture have many long trips (60+ min common)
  'Generic Sport Facility': 5000,
  'Generic Culture': 4000,
  'Generic Entertainment': 3000,
  'Generic Education': 3000,

  // Medium-distance trips
  'Generic Civic Function': 2500,
  'Generic Health and Wellbeing': 2500,
  'Generic Accommodation': 2500,

  // Shorter trips (daily activities)
  'Generic Retail': 2000,
  'Generic Food and Beverage Service': 2000,
  'Generic Service': 2000,

  // Defaults for others
  'Generic Office Building': 2000,
  'Generic Light Industrial': 2000,
  'Generic Transportation Service': 2000,
  'Generic Utilities': 2000,
  'Undefined Land use': 2000,
  'Generic Residential': 0,
};

/**
 * Mode-specific maximum trip distances in meters.
 * Scaled based on mode speed ratios.
 */
export const MODE_MAX_DISTANCE: Record<TransportMode, Record<LandUse, number>> = {
  pedestrian: MID_MAX_DISTANCE,
  bicycle: {
    // Bicycle can travel ~3.5x pedestrian distance in same time
    'Generic Sport Facility': 18000,
    'Generic Culture': 14000,
    'Generic Entertainment': 10000,
    'Generic Education': 10000,
    'Generic Civic Function': 9000,
    'Generic Health and Wellbeing': 9000,
    'Generic Accommodation': 9000,
    'Generic Retail': 7000,
    'Generic Food and Beverage Service': 7000,
    'Generic Service': 7000,
    'Generic Office Building': 7000,
    'Generic Light Industrial': 7000,
    'Generic Transportation Service': 7000,
    'Generic Utilities': 7000,
    'Undefined Land use': 7000,
    'Generic Residential': 0,
  },
  car: {
    // Car can travel ~9.5x pedestrian distance in same time
    'Generic Sport Facility': 50000,
    'Generic Culture': 40000,
    'Generic Entertainment': 30000,
    'Generic Education': 30000,
    'Generic Civic Function': 25000,
    'Generic Health and Wellbeing': 25000,
    'Generic Accommodation': 25000,
    'Generic Retail': 20000,
    'Generic Food and Beverage Service': 20000,
    'Generic Service': 20000,
    'Generic Office Building': 20000,
    'Generic Light Industrial': 20000,
    'Generic Transportation Service': 20000,
    'Generic Utilities': 20000,
    'Undefined Land use': 20000,
    'Generic Residential': 0,
  },
};

/**
 * Get decay beta for a specific land use and transport mode.
 */
export function getDecayBeta(landUse: LandUse, mode: TransportMode = 'pedestrian'): number {
  return MODE_DECAY_BETA[mode][landUse];
}

/**
 * Get max distance for a specific land use and transport mode.
 */
export function getMaxDistance(landUse: LandUse, mode: TransportMode = 'pedestrian'): number {
  return MODE_MAX_DISTANCE[mode][landUse];
}
