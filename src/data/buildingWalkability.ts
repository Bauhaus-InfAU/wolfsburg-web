/**
 * Per-building walkability score calculation.
 *
 * Computes a walkability score (0-100) for each residential building
 * based on its distance to various service types.
 */

import type { Building, LandUse } from '../config/types';
import { haversineDistance } from './streetGraph';
import { MID_MAX_DISTANCE } from './midMobilityData';
import { DESTINATION_LAND_USES } from '../config/constants';

export interface BuildingWalkabilityScore {
  buildingId: string;
  score: number; // 0-100, higher = better walkability
  serviceDistances: Map<LandUse, number>; // distance to nearest service of each type
}

/**
 * Calculate per-building walkability scores for all residential buildings.
 *
 * For each residential building, calculates the distance to the nearest
 * destination of each enabled land use type, then computes a walkability
 * score based on how close those services are relative to max walkable distance.
 *
 * @param residentialBuildings - Array of residential buildings
 * @param destinations - Array of all destination buildings
 * @param enabledLandUses - Set of land uses to consider for walkability
 * @returns Map of building ID to walkability score
 */
export function calculateBuildingWalkability(
  residentialBuildings: Building[],
  destinations: Building[],
  enabledLandUses: Set<LandUse>
): Map<string, BuildingWalkabilityScore> {
  const results = new Map<string, BuildingWalkabilityScore>();

  // Index destinations by land use for efficient lookup
  const destinationsByLandUse = new Map<LandUse, Building[]>();
  for (const dest of destinations) {
    for (const lu of dest.landUses) {
      if (!enabledLandUses.has(lu) || !DESTINATION_LAND_USES.includes(lu)) continue;
      if (!destinationsByLandUse.has(lu)) {
        destinationsByLandUse.set(lu, []);
      }
      destinationsByLandUse.get(lu)!.push(dest);
    }
  }

  // Calculate walkability for each residential building
  for (const building of residentialBuildings) {
    const serviceDistances = new Map<LandUse, number>();
    let totalScore = 0;
    let count = 0;

    // For each enabled land use, find the nearest destination
    for (const landUse of enabledLandUses) {
      if (!DESTINATION_LAND_USES.includes(landUse)) continue;

      const dests = destinationsByLandUse.get(landUse) || [];
      if (dests.length === 0) continue;

      let minDist = Infinity;
      for (const dest of dests) {
        const dist = haversineDistance(building.centroid, dest.centroid);
        if (dist < minDist) {
          minDist = dist;
        }
      }

      if (minDist < Infinity) {
        serviceDistances.set(landUse, minDist);
        const maxWalkable = MID_MAX_DISTANCE[landUse] || 2000;
        // Score: 100 when distance = 0, 0 when distance >= maxWalkable
        const ratio = Math.max(0, 1 - minDist / maxWalkable);
        totalScore += ratio * 100;
        count++;
      }
    }

    const avgScore = count > 0 ? Math.round(totalScore / count) : 0;
    results.set(building.id, {
      buildingId: building.id,
      score: avgScore,
      serviceDistances,
    });
  }

  return results;
}

/**
 * Get the building IDs with the lowest walkability scores.
 *
 * @param scores - Map of building ID to walkability score
 * @param percent - Percentage of buildings to return (0-100)
 * @returns Array of building IDs sorted by score (lowest first)
 */
export function getLowestWalkabilityBuildings(
  scores: Map<string, BuildingWalkabilityScore>,
  percent: number
): string[] {
  // Sort by score ascending (lowest = worst walkability)
  const sorted = [...scores.entries()]
    .sort((a, b) => a[1].score - b[1].score);

  const count = Math.max(1, Math.ceil(sorted.length * percent / 100));
  return sorted.slice(0, count).map(([id]) => id);
}

/**
 * Get the building IDs within a walkability percentile range.
 *
 * @param scores - Map of building ID to walkability score
 * @param range - [minPercent, maxPercent] percentile range (0-100)
 * @returns Array of building IDs within the range, sorted by score (lowest first)
 */
export function getWalkabilityBuildingsInRange(
  scores: Map<string, BuildingWalkabilityScore>,
  range: [number, number]
): string[] {
  const [minPercent, maxPercent] = range;

  // Sort by score ascending (lowest = worst walkability)
  const sorted = [...scores.entries()]
    .sort((a, b) => a[1].score - b[1].score);

  const minIndex = Math.floor(sorted.length * minPercent / 100);
  const maxIndex = Math.ceil(sorted.length * maxPercent / 100);

  return sorted.slice(minIndex, maxIndex).map(([id]) => id);
}
