import { LAND_USE_COLORS, SIMULATION_DEFAULTS } from '../config/constants';
import { Agent } from '../agents/agent';
import { MapLibreView } from './mapLibreView';

export class AgentRenderer {
  private mapView: MapLibreView;
  private ctx: CanvasRenderingContext2D;

  constructor(mapView: MapLibreView) {
    this.mapView = mapView;
    this.ctx = mapView.getCanvasContext();
  }

  render(agents: Agent[]): void {
    // Clear canvas
    this.mapView.clearAgentCanvas();

    if (agents.length === 0) return;

    const bounds = this.mapView.getVisibleBounds();
    const radius = SIMULATION_DEFAULTS.AGENT_RADIUS;

    // Add margin to bounds for culling (10% of visible area)
    const marginX = (bounds.maxX - bounds.minX) * 0.1;
    const marginY = (bounds.maxY - bounds.minY) * 0.1;
    const cullBounds = {
      minX: bounds.minX - marginX,
      maxX: bounds.maxX + marginX,
      minY: bounds.minY - marginY,
      maxY: bounds.maxY + marginY,
    };

    // Group agents by destination land use for batch rendering
    const agentsByColor = new Map<string, Agent[]>();

    for (const agent of agents) {
      const [lng, lat] = agent.position;

      // Viewport culling with margin
      if (lng < cullBounds.minX || lng > cullBounds.maxX || lat < cullBounds.minY || lat > cullBounds.maxY) {
        continue;
      }

      const landUse = agent.getDestinationLandUse();
      const color = LAND_USE_COLORS[landUse] || LAND_USE_COLORS['Undefined Land use'];

      if (!agentsByColor.has(color)) {
        agentsByColor.set(color, []);
      }
      agentsByColor.get(color)!.push(agent);
    }

    // Batch render by color
    for (const [color, colorAgents] of agentsByColor) {
      this.ctx.fillStyle = color;
      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();

      for (const agent of colorAgents) {
        const [lng, lat] = agent.position;
        const point = this.mapView.project([lng, lat]);

        this.ctx.moveTo(point.x + radius, point.y);
        this.ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      }

      this.ctx.fill();
      this.ctx.stroke();
    }
  }

  clear(): void {
    this.mapView.clearAgentCanvas();
  }
}
