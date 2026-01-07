import type { SimulationStats } from '../config/types';

export class StatsPanel {
  private agentsEl: HTMLSpanElement | null;
  private tripsEl: HTMLSpanElement | null;

  constructor() {
    this.agentsEl = document.getElementById('stat-agents') as HTMLSpanElement;
    this.tripsEl = document.getElementById('stat-trips') as HTMLSpanElement;
  }

  update(stats: SimulationStats): void {
    if (this.agentsEl) {
      this.agentsEl.textContent = stats.activeAgents.toLocaleString();
    }
    if (this.tripsEl) {
      this.tripsEl.textContent = stats.totalTrips.toLocaleString();
    }
  }
}
