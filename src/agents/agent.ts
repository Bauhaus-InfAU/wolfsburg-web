import type { Trip, AgentState, Building, LandUse } from '../config/types';
import { SIMULATION_DEFAULTS } from '../config/constants';

// Conversion factor: meters to degrees
const METERS_TO_DEGREES = 1 / 111000;

export class Agent {
  public id: number;
  public position: [number, number] = [0, 0];
  public state: AgentState = 'toDestination';

  private path: [number, number][] = [];
  private returnPath: [number, number][] = [];
  private pathIndex: number = 0;
  private speed: number = SIMULATION_DEFAULTS.WALKING_SPEED;
  private dwellTimeRemaining: number = 0;

  private origin: Building | null = null;
  private destination: Building | null = null;

  constructor(id: number) {
    this.id = id;
  }

  initialize(trip: Trip): void {
    this.origin = trip.origin;
    this.destination = trip.destination;
    this.path = trip.path;
    this.returnPath = trip.returnPath;
    this.pathIndex = 0;
    this.state = 'toDestination';
    this.dwellTimeRemaining = SIMULATION_DEFAULTS.DWELL_TIME_MS;

    if (this.path.length > 0) {
      this.position = [...this.path[0]];
    }
  }

  reset(): void {
    this.position = [0, 0];
    this.path = [];
    this.returnPath = [];
    this.pathIndex = 0;
    this.state = 'toDestination';
    this.origin = null;
    this.destination = null;
    this.dwellTimeRemaining = 0;
  }

  /**
   * Update agent position and state.
   *
   * @param deltaMs - Elapsed real time in milliseconds
   * @param speedMultiplier - Speed multiplier from simulation
   * @returns true if agent is still active, false if completed
   */
  update(deltaMs: number, speedMultiplier: number): boolean {
    if (this.state === 'completed') {
      return false;
    }

    if (this.state === 'atDestination') {
      this.dwellTimeRemaining -= deltaMs * speedMultiplier;
      if (this.dwellTimeRemaining <= 0) {
        // Start return journey
        this.state = 'returning';
        this.path = this.returnPath;
        this.pathIndex = 0;
        if (this.path.length > 0) {
          this.position = [...this.path[0]];
        }
      }
      return true;
    }

    // Moving along path
    const currentPath = this.path;
    if (!currentPath || this.pathIndex >= currentPath.length - 1) {
      // Reached end of path
      if (this.state === 'toDestination') {
        this.state = 'atDestination';
      } else if (this.state === 'returning') {
        this.state = 'completed';
        return false;
      }
      return true;
    }

    const target = currentPath[this.pathIndex + 1];
    if (!target) {
      return true; // Still active, will handle state transition next frame
    }

    // Calculate movement: speed is m/s, convert to degrees for position update
    const effectiveSpeed = this.speed * speedMultiplier * SIMULATION_DEFAULTS.TIME_SCALE;
    const moveDistanceMeters = effectiveSpeed * (deltaMs / 1000);
    const moveDistanceDegrees = moveDistanceMeters * METERS_TO_DEGREES;

    const dx = target[0] - this.position[0];
    const dy = target[1] - this.position[1];
    const distToTarget = Math.sqrt(dx * dx + dy * dy); // in degrees

    if (distToTarget <= moveDistanceDegrees) {
      // Reached waypoint
      this.position = [...target];
      this.pathIndex++;

      // Check if we've reached the final point
      if (this.pathIndex >= currentPath.length - 1) {
        if (this.state === 'toDestination') {
          this.state = 'atDestination';
        } else if (this.state === 'returning') {
          this.state = 'completed';
          return false;
        }
      }
    } else {
      // Move toward waypoint
      const ratio = moveDistanceDegrees / distToTarget;
      this.position[0] += dx * ratio;
      this.position[1] += dy * ratio;
    }

    return true;
  }

  getDestinationLandUse(): LandUse {
    return this.destination?.primaryLandUse || 'Undefined Land use';
  }

  getOrigin(): Building | null {
    return this.origin;
  }

  getDestination(): Building | null {
    return this.destination;
  }
}
