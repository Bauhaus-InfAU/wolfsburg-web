import type { SimulationParams, SimulationStats, LandUse } from '../config/types';
import { SIMULATION_DEFAULTS, DESTINATION_LAND_USES } from '../config/constants';
import { MID_LAND_USE_WEIGHTS } from '../data/midMobilityData';
import { BuildingStore } from '../data/buildingStore';
import { StreetGraph } from '../data/streetGraph';
import { StreetUsageTracker } from '../data/StreetUsageTracker';
import { ODMatrix } from './odMatrix';
import { Pathfinder } from './pathfinder';
import { TripGenerator } from './tripGenerator';
import { Agent } from '../agents/agent';
import { AgentPool } from '../agents/agentPool';

export class SimulationEngine {
  private buildingStore: BuildingStore;
  private odMatrix: ODMatrix;
  private pathfinder: Pathfinder;
  private tripGenerator: TripGenerator;
  private agentPool: AgentPool;
  private usageTracker: StreetUsageTracker;

  private isRunning: boolean = false;
  private speed: number = 1;
  private lastTimestamp: number = 0;
  private animationFrameId: number | null = null;

  private params: SimulationParams;
  private stats: SimulationStats = {
    activeAgents: 0,
    totalTrips: 0,
    avgDistance: 0,
  };

  private totalDistanceSum: number = 0;
  private maxActiveAgents: number;
  private baselineWeight: number; // Sum of all destination land use weights
  private effectiveMaxAgents: number; // Scaled by enabled land uses

  // Callbacks
  public onUpdate: ((agents: Agent[], stats: SimulationStats) => void) | null = null;
  public onStatsUpdate: ((stats: SimulationStats) => void) | null = null;
  public onLandUseToggle: ((enabledLandUses: Set<LandUse>) => void) | null = null;

  constructor(buildingStore: BuildingStore, streetGraph: StreetGraph) {
    this.buildingStore = buildingStore;
    this.odMatrix = new ODMatrix();
    this.pathfinder = new Pathfinder(streetGraph);
    this.usageTracker = new StreetUsageTracker();

    // Calculate max agents based on total residents
    const totalResidents = buildingStore.getTotalResidents();
    this.maxActiveAgents = Math.max(
      SIMULATION_DEFAULTS.MIN_ACTIVE_AGENTS,
      Math.round(totalResidents * SIMULATION_DEFAULTS.ACTIVE_AGENT_RATIO)
    );

    // Calculate baseline weight (sum of all destination land use weights)
    this.baselineWeight = this.calculateLandUseWeight(DESTINATION_LAND_USES);
    this.effectiveMaxAgents = this.maxActiveAgents;

    this.agentPool = new AgentPool(this.maxActiveAgents);

    // Initialize default params
    // Note: decay and maxDistance now handled per-land-use via MiD data
    this.params = {
      spawnRate: 1.0,
      speed: 1,
      enabledLandUses: new Set(DESTINATION_LAND_USES),
    };

    // Calculate O-D matrix
    this.recalculateODMatrix();

    // Create trip generator
    this.tripGenerator = new TripGenerator(
      this.odMatrix,
      this.pathfinder,
      this.buildingStore.residential
    );
  }

  /**
   * Calculate the sum of MiD weights for given land uses.
   */
  private calculateLandUseWeight(landUses: Iterable<LandUse>): number {
    let total = 0;
    for (const landUse of landUses) {
      total += MID_LAND_USE_WEIGHTS[landUse] || 0;
    }
    return total;
  }

  /**
   * Update trip generation rate and max agents based on enabled land uses.
   */
  private updateLandUseWeightMultiplier(): void {
    const enabledWeight = this.calculateLandUseWeight(this.params.enabledLandUses);
    const multiplier = this.baselineWeight > 0 ? enabledWeight / this.baselineWeight : 0;

    // Update trip generator
    this.tripGenerator.setLandUseWeightMultiplier(multiplier);

    // Update effective max agents
    this.effectiveMaxAgents = Math.max(
      SIMULATION_DEFAULTS.MIN_ACTIVE_AGENTS,
      Math.round(this.maxActiveAgents * multiplier)
    );
  }

  recalculateODMatrix(): void {
    // Uses per-land-use decay calibrated from MiD 2023 data
    this.odMatrix.calculate(
      this.buildingStore.residential,
      this.buildingStore.destinations,
      this.params.enabledLandUses
    );
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTimestamp = performance.now();
    this.animationFrameId = requestAnimationFrame((t) => this.update(t));
  }

  pause(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  reset(): void {
    this.pause();

    // Release all agents
    for (const agent of this.agentPool.getActiveAgents()) {
      this.agentPool.release(agent);
    }

    // Reset stats
    this.stats = {
      activeAgents: 0,
      totalTrips: 0,
      avgDistance: 0,
    };
    this.totalDistanceSum = 0;

    // Reset trip generator
    this.tripGenerator.reset();

    // Reset usage tracker
    this.usageTracker.reset();

    // Notify
    if (this.onStatsUpdate) {
      this.onStatsUpdate(this.stats);
    }
  }

  setSpeed(speed: number): void {
    this.speed = speed;
    this.params.speed = speed;
  }

  setSpawnRate(rate: number): void {
    this.params.spawnRate = rate;
    this.tripGenerator.setSpawnMultiplier(rate);
  }

  // Note: setDecayBeta and setMaxDistance removed - decay is now per-land-use
  // based on MiD 2023 calibrated parameters

  toggleLandUse(landUse: LandUse, enabled: boolean): void {
    if (enabled) {
      this.params.enabledLandUses.add(landUse);
    } else {
      this.params.enabledLandUses.delete(landUse);
    }
    this.recalculateODMatrix();
    this.updateLandUseWeightMultiplier();
    this.onLandUseToggle?.(this.params.enabledLandUses);
  }

  getEnabledLandUses(): Set<LandUse> {
    return this.params.enabledLandUses;
  }

  private update(timestamp: number): void {
    if (!this.isRunning) return;

    const deltaMs = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;

    // Cap delta to avoid huge jumps
    const cappedDelta = Math.min(deltaMs, 100);

    // Generate new trips (use effectiveMaxAgents which scales with enabled land uses)
    // Use O(1) activeCount instead of creating an array
    if (this.agentPool.activeCount < this.effectiveMaxAgents) {
      const trips = this.tripGenerator.generateTrips(
        cappedDelta,
        SIMULATION_DEFAULTS.TIME_SCALE * this.speed
      );

      for (const trip of trips) {
        const agent = this.agentPool.acquire();
        if (agent) {
          agent.initialize(trip);
          this.stats.totalTrips++;
          this.totalDistanceSum += trip.path.reduce((sum, _, i, arr) => {
            if (i === 0) return 0;
            const [lng1, lat1] = arr[i - 1];
            const [lng2, lat2] = arr[i];
            const dx = lng2 - lng1;
            const dy = lat2 - lat1;
            return sum + Math.sqrt(dx * dx + dy * dy) * 111000; // Rough conversion to meters
          }, 0);

          // Record path usage for heatmap
          this.usageTracker.recordPath(trip.path);
          this.usageTracker.recordPath(trip.returnPath);
        }
      }
    }

    // Get active agents once per frame to avoid repeated Array.from() allocations
    const activeAgents = this.agentPool.getActiveAgents();
    const agentsToRelease: Agent[] = [];

    for (const agent of activeAgents) {
      const stillActive = agent.update(cappedDelta, this.speed);
      if (!stillActive) {
        agentsToRelease.push(agent);
      }
    }

    // Release completed agents
    for (const agent of agentsToRelease) {
      this.agentPool.release(agent);
    }

    // Update stats using cached array length
    this.stats.activeAgents = activeAgents.length - agentsToRelease.length;
    this.stats.avgDistance =
      this.stats.totalTrips > 0 ? Math.round(this.totalDistanceSum / this.stats.totalTrips) : 0;

    // Notify callbacks with cached array
    if (this.onUpdate) {
      this.onUpdate(activeAgents, this.stats);
    }
    if (this.onStatsUpdate) {
      this.onStatsUpdate(this.stats);
    }

    // Continue loop
    this.animationFrameId = requestAnimationFrame((t) => this.update(t));
  }

  getAgents(): Agent[] {
    return this.agentPool.getActiveAgents();
  }

  getStats(): SimulationStats {
    return { ...this.stats };
  }

  getParams(): SimulationParams {
    return { ...this.params };
  }

  get running(): boolean {
    return this.isRunning;
  }

  getMaxActiveAgents(): number {
    return this.maxActiveAgents;
  }

  getEffectiveMaxAgents(): number {
    return this.effectiveMaxAgents;
  }

  getTotalResidents(): number {
    return this.buildingStore.getTotalResidents();
  }

  getUsageTracker(): StreetUsageTracker {
    return this.usageTracker;
  }

  getAverageDistancesByLandUse(): Map<LandUse, { avgDistance: number; count: number }> {
    return this.odMatrix.getAverageDistancesByLandUse();
  }
}
