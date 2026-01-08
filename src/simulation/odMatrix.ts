import type { Building, ODEntry, LandUse } from '../config/types';
import { createLandUseDecay } from './distanceDecay';
import { LAND_USE_WEIGHTS, MIN_OD_WEIGHT } from '../config/constants';
import { haversineDistance } from '../data/streetGraph';

export class ODMatrix {
  private matrix: Map<string, ODEntry[]> = new Map();

  /**
   * Calculate the O-D probability matrix.
   * Uses per-land-use distance decay calibrated from MiD 2023 data.
   *
   * @param origins - Residential buildings (trip origins)
   * @param destinations - Non-residential buildings (trip destinations)
   * @param enabledLandUses - Set of enabled land use types
   */
  calculate(
    origins: Building[],
    destinations: Building[],
    enabledLandUses: Set<LandUse>
  ): void {
    this.matrix.clear();

    for (const origin of origins) {
      const entries: ODEntry[] = [];
      let totalWeight = 0;

      for (const dest of destinations) {
        // Skip if destination has no enabled land uses
        const hasEnabledUse = dest.landUses.some((lu) => enabledLandUses.has(lu));
        if (!hasEnabledUse) continue;

        // Calculate distance
        const distance = haversineDistance(origin.centroid, dest.centroid);

        // Get the primary land use for decay calculation
        const primaryLandUse = this.getPrimaryLandUse(dest, enabledLandUses);

        // Apply land-use-specific distance decay (MiD calibrated)
        const decayFn = createLandUseDecay(primaryLandUse);
        const decay = decayFn(distance);
        if (decay <= 0) continue;

        // Calculate attraction based on land uses and building size
        const attraction = this.calculateAttraction(dest, enabledLandUses);

        const weight = attraction * decay;
        if (weight < MIN_OD_WEIGHT) continue;

        entries.push({
          destination: dest,
          probability: weight, // Will be normalized later
          distance,
        });
        totalWeight += weight;
      }

      // Normalize probabilities
      if (totalWeight > 0) {
        for (const entry of entries) {
          entry.probability /= totalWeight;
        }
      }

      // Sort by probability descending for efficient sampling
      entries.sort((a, b) => b.probability - a.probability);

      if (entries.length > 0) {
        this.matrix.set(origin.id, entries);
      }
    }
  }

  /**
   * Get the primary (highest weighted) land use for a building.
   */
  private getPrimaryLandUse(building: Building, enabledLandUses: Set<LandUse>): LandUse {
    let bestLandUse: LandUse = building.primaryLandUse;
    let bestWeight = 0;

    for (const landUse of building.landUses) {
      if (!enabledLandUses.has(landUse)) continue;
      const weight = LAND_USE_WEIGHTS[landUse];
      if (weight > bestWeight) {
        bestWeight = weight;
        bestLandUse = landUse;
      }
    }

    return bestLandUse;
  }

  private calculateAttraction(building: Building, enabledLandUses: Set<LandUse>): number {
    let maxWeight = 0;

    for (const landUse of building.landUses) {
      if (!enabledLandUses.has(landUse)) continue;
      const weight = LAND_USE_WEIGHTS[landUse];
      if (weight > maxWeight) {
        maxWeight = weight;
      }
    }

    // Scale by building size (floors as proxy)
    const sizeFactor = Math.sqrt(building.floors);

    return maxWeight * sizeFactor;
  }

  /**
   * Sample a destination from the O-D matrix using weighted random selection.
   */
  sampleDestination(originId: string): Building | null {
    const entries = this.matrix.get(originId);
    if (!entries || entries.length === 0) return null;

    const rand = Math.random();
    let cumulative = 0;

    for (const entry of entries) {
      cumulative += entry.probability;
      if (rand <= cumulative) {
        return entry.destination;
      }
    }

    // Fallback to last entry (handles floating point errors)
    return entries[entries.length - 1].destination;
  }

  /**
   * Get average trip distance for a given origin.
   */
  getAverageDistance(originId: string): number {
    const entries = this.matrix.get(originId);
    if (!entries || entries.length === 0) return 0;

    let totalDistance = 0;
    let totalWeight = 0;

    for (const entry of entries) {
      totalDistance += entry.distance * entry.probability;
      totalWeight += entry.probability;
    }

    return totalWeight > 0 ? totalDistance / totalWeight : 0;
  }

  /**
   * Check if origin has any valid destinations.
   */
  hasDestinations(originId: string): boolean {
    const entries = this.matrix.get(originId);
    return entries !== undefined && entries.length > 0;
  }

  /**
   * Get number of origins in the matrix.
   */
  get originCount(): number {
    return this.matrix.size;
  }
}
