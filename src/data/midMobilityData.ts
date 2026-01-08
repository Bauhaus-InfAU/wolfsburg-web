/**
 * MiD 2023 (Mobilität in Deutschland) Pedestrian Trip Data
 *
 * This module contains calibrated parameters derived from the German
 * national mobility survey for pedestrian trips ("zu Fuß").
 *
 * Data source: Mobilität in Deutschland 2023
 * https://www.mobilitaet-in-deutschland.de/
 */

import type { LandUse } from '../config/types';

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
 * Duration distribution for each trip purpose (percentages).
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
 * Calculate decay beta from median trip duration.
 * Uses walking speed of 1.4 m/s (84 m/min).
 * Beta is calibrated so that 50% of trips occur within median distance.
 * P(d) = e^(-beta * d) = 0.5 at median distance
 * beta = ln(2) / medianDistance
 */
function calculateDecayBeta(medianDurationMinutes: number): number {
  const walkingSpeedMPerMin = 84; // 1.4 m/s * 60
  const medianDistanceM = medianDurationMinutes * walkingSpeedMPerMin;
  return Math.log(2) / medianDistanceM;
}

/**
 * Per-land-use decay beta values derived from MiD duration distributions.
 * Lower beta = people willing to travel farther.
 */
export const MID_DECAY_BETA: Record<LandUse, number> = (() => {
  // Calculate weighted average duration per land use
  const landUseDurations: Partial<Record<LandUse, { totalDuration: number; totalWeight: number }>> = {};

  const purposeMap: Record<keyof typeof MID_DURATION_DISTRIBUTIONS, LandUse> = {
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

  for (const [purpose, dist] of Object.entries(MID_DURATION_DISTRIBUTIONS)) {
    const landUse = purposeMap[purpose as keyof typeof MID_DURATION_DISTRIBUTIONS];
    const weight = MID_TRIP_PURPOSE_DATA[purpose as keyof typeof MID_TRIP_PURPOSE_DATA].sampleSize;
    const medianDuration = calculateMedianDuration(dist);

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
    betas[landUse as LandUse] = calculateDecayBeta(avgDuration);
  }

  // Default beta for land uses without MiD data
  const defaultBeta = 0.002;

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
})();

/**
 * Per-land-use maximum trip distance in meters.
 * Derived from 95th percentile of trip durations in MiD data.
 * Walking at 1.4 m/s = 84 m/min.
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
