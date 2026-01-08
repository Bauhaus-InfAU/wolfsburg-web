import type { LandUse } from '../config/types';
import { MID_DECAY_BETA, MID_MAX_DISTANCE } from '../data/midMobilityData';

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
 * Creates a land-use-specific exponential decay function.
 * Uses MiD 2023 calibrated parameters for beta and max distance.
 *
 * @param landUse - The destination land use type
 * @returns Distance decay function calibrated for that land use
 */
export function createLandUseDecay(landUse: LandUse): DistanceDecayFn {
  const beta = MID_DECAY_BETA[landUse];
  const maxDist = MID_MAX_DISTANCE[landUse];
  return (distance: number): number => {
    if (distance > maxDist || distance < 0) return 0;
    return Math.exp(-beta * distance);
  };
}

/**
 * Get the decay beta for a specific land use.
 * Useful for UI display or debugging.
 */
export function getDecayBeta(landUse: LandUse): number {
  return MID_DECAY_BETA[landUse];
}

/**
 * Get the max distance for a specific land use.
 * Useful for UI display or debugging.
 */
export function getMaxDistance(landUse: LandUse): number {
  return MID_MAX_DISTANCE[landUse];
}
