import type { Building, Trip } from '../config/types';
import { SIMULATION_DEFAULTS } from '../config/constants';
import { ODMatrix } from './odMatrix';
import { Pathfinder } from './pathfinder';

export class TripGenerator {
  private odMatrix: ODMatrix;
  private pathfinder: Pathfinder;
  private residentialBuildings: Building[];
  private accumulators: Map<string, number> = new Map();
  private spawnMultiplier: number = 1.0;
  private landUseWeightMultiplier: number = 1.0;

  constructor(odMatrix: ODMatrix, pathfinder: Pathfinder, residentialBuildings: Building[]) {
    this.odMatrix = odMatrix;
    this.pathfinder = pathfinder;
    this.residentialBuildings = residentialBuildings;

    // Initialize accumulators
    for (const building of residentialBuildings) {
      this.accumulators.set(building.id, Math.random()); // Start with random phase
    }
  }

  setSpawnMultiplier(multiplier: number): void {
    this.spawnMultiplier = multiplier;
  }

  /**
   * Set the land use weight multiplier.
   * This scales trip generation based on enabled land use weights.
   * @param multiplier - Ratio of enabled weights to total weights (0-1)
   */
  setLandUseWeightMultiplier(multiplier: number): void {
    this.landUseWeightMultiplier = multiplier;
  }

  getLandUseWeightMultiplier(): number {
    return this.landUseWeightMultiplier;
  }

  /**
   * Generate trips based on elapsed time.
   *
   * @param deltaTimeMs - Elapsed real time in milliseconds
   * @param timeScale - Time scaling factor (1 real second = timeScale simulated seconds)
   * @returns Array of new trips to spawn
   */
  generateTrips(deltaTimeMs: number, timeScale: number): Trip[] {
    const trips: Trip[] = [];
    const deltaSeconds = (deltaTimeMs / 1000) * timeScale;

    for (const building of this.residentialBuildings) {
      // Skip if no valid destinations
      if (!this.odMatrix.hasDestinations(building.id)) continue;

      const tripRate = this.getTripRate(building);
      const accumulated = (this.accumulators.get(building.id) || 0) + tripRate * deltaSeconds;

      // Spawn whole trips
      const tripsToSpawn = Math.floor(accumulated);
      this.accumulators.set(building.id, accumulated - tripsToSpawn);

      for (let i = 0; i < tripsToSpawn; i++) {
        const destination = this.odMatrix.sampleDestination(building.id);
        if (!destination) continue;

        // Find path
        const path = this.pathfinder.findPath(building.centroid, destination.centroid);

        // Create return path (reversed)
        const returnPath = [...path.points].reverse();

        trips.push({
          origin: building,
          destination,
          path: path.points,
          returnPath,
        });
      }
    }

    return trips;
  }

  private getTripRate(building: Building): number {
    // Trips per simulated second
    // BASE_TRIPS_PER_RESIDENT is trips per resident per simulated minute
    // estimatedResidents is based on residential area / 40.9 sqm per person
    // landUseWeightMultiplier scales by enabled land use weights (MiD 2023)
    const tripsPerMinute =
      building.estimatedResidents *
      SIMULATION_DEFAULTS.BASE_TRIPS_PER_RESIDENT *
      this.landUseWeightMultiplier;
    return (tripsPerMinute / 60) * this.spawnMultiplier;
  }

  /**
   * Reset all accumulators (for simulation reset).
   */
  reset(): void {
    for (const building of this.residentialBuildings) {
      this.accumulators.set(building.id, Math.random());
    }
  }

  /**
   * Get estimated trips per minute at current settings.
   */
  getEstimatedTripsPerMinute(): number {
    let total = 0;
    for (const building of this.residentialBuildings) {
      if (this.odMatrix.hasDestinations(building.id)) {
        total +=
          building.estimatedResidents *
          SIMULATION_DEFAULTS.BASE_TRIPS_PER_RESIDENT *
          this.landUseWeightMultiplier *
          this.spawnMultiplier;
      }
    }
    return total;
  }

  /**
   * Get total estimated residents across all residential buildings.
   */
  getTotalResidents(): number {
    return this.residentialBuildings.reduce((sum, b) => sum + b.estimatedResidents, 0);
  }
}
