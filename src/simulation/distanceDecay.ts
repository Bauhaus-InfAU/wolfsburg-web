import type { LandUse, TransportMode } from '../config/types';
import { MODE_DECAY_BETA, MODE_MAX_DISTANCE, MID_DECAY_BETA, MID_MAX_DISTANCE } from '../data/midMobilityData';

export type DistanceDecayFn = (distance: number) => number;

/**
 * Creates an exponential distance decay function.
 * P(d) = e^(-beta * d)
 *
 * @param beta - Decay rate (higher = faster decay)
 * @param maxDistance - Maximum distance in meters (beyond this, returns 0)
 */
export function createExponentialDecay(beta: number, maxDistance: number): DistanceDecayFn {
  return (distance: number): number => {
    if (distance > maxDistance) return 0;
    if (distance < 0) return 0;
    return Math.exp(-beta * distance);
  };
}

/**
 * Creates a power (gravity model) distance decay function.
 * P(d) = 1 / d^alpha
 *
 * @param alpha - Power exponent (typically 1-3)
 * @param minDistance - Minimum distance to avoid division by zero
 * @param maxDistance - Maximum distance in meters
 */
export function createPowerDecay(
  alpha: number,
  minDistance: number,
  maxDistance: number
): DistanceDecayFn {
  return (distance: number): number => {
    if (distance > maxDistance) return 0;
    if (distance < minDistance) distance = minDistance;
    return 1 / Math.pow(distance, alpha);
  };
}

/**
 * Creates a Gaussian distance decay function.
 * P(d) = e^(-(d^2)/(2*sigma^2))
 *
 * @param sigma - Standard deviation (controls spread)
 * @param maxDistance - Maximum distance in meters
 */
export function createGaussianDecay(sigma: number, maxDistance: number): DistanceDecayFn {
  const twoSigmaSquared = 2 * sigma * sigma;
  return (distance: number): number => {
    if (distance > maxDistance) return 0;
    if (distance < 0) return 0;
    return Math.exp(-(distance * distance) / twoSigmaSquared);
  };
}

/**
 * Creates a land-use-specific exponential decay function for a given transport mode.
 * Uses MiD 2023 calibrated parameters for beta and max distance.
 *
 * @param landUse - The destination land use type
 * @param mode - The transport mode (default: pedestrian)
 * @returns Distance decay function calibrated for that land use and mode
 */
export function createLandUseDecay(landUse: LandUse, mode: TransportMode = 'pedestrian'): DistanceDecayFn {
  const beta = MODE_DECAY_BETA[mode][landUse];
  const maxDist = MODE_MAX_DISTANCE[mode][landUse];
  return (distance: number): number => {
    if (distance > maxDist || distance < 0) return 0;
    return Math.exp(-beta * distance);
  };
}

/**
 * Get the decay beta for a specific land use.
 * Useful for UI display or debugging.
 * @deprecated Use getDecayBeta from midMobilityData.ts instead
 */
export function getDecayBeta(landUse: LandUse): number {
  return MID_DECAY_BETA[landUse];
}

/**
 * Get the max distance for a specific land use.
 * Useful for UI display or debugging.
 * @deprecated Use getMaxDistance from midMobilityData.ts instead
 */
export function getMaxDistance(landUse: LandUse): number {
  return MID_MAX_DISTANCE[landUse];
}
