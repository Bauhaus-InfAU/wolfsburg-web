import { Checkbox } from '@/components/ui/checkbox';
import { useSimulation } from '@/hooks/useSimulation';
import { SIMULATION_DEFAULTS } from '@/config/constants';

function formatDistance(meters: number | undefined): string {
  if (meters === undefined || meters === null) return '-- m';
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
}

function formatWalkingTime(meters: number | undefined): string {
  if (meters === undefined || meters === null) return '-- min';
  const seconds = meters / SIMULATION_DEFAULTS.WALKING_SPEED;
  const minutes = Math.ceil(seconds / 60);
  return `~${minutes} min`;
}

export function VisualizationToggles() {
  const {
    showAgents,
    showUsageHeatmap,
    showPathPreview,
    pathPreviewPath,
    setShowAgents,
    setShowUsageHeatmap,
    setShowPathPreview,
  } = useSimulation();

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors py-0.5">
        <Checkbox
          checked={showAgents}
          onCheckedChange={(checked) => setShowAgents(!!checked)}
          className="h-3.5 w-3.5"
        />
        Show Agents
      </label>
      <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors py-0.5">
        <Checkbox
          checked={showUsageHeatmap}
          onCheckedChange={(checked) => setShowUsageHeatmap(!!checked)}
          className="h-3.5 w-3.5"
        />
        Show Street Usage Heatmap
      </label>
      <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors py-0.5">
        <Checkbox
          checked={showPathPreview}
          onCheckedChange={(checked) => setShowPathPreview(!!checked)}
          className="h-3.5 w-3.5"
        />
        Path Preview Mode
      </label>

      {showPathPreview && pathPreviewPath && (
        <div className="ml-5 mt-1 p-2 bg-accent/50 rounded text-[10px] space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Distance:</span>
            <span className="font-medium text-foreground">
              {formatDistance(pathPreviewPath.totalDistance)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Walking time:</span>
            <span className="font-medium text-foreground">
              {formatWalkingTime(pathPreviewPath.totalDistance)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
