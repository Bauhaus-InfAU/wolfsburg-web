import { Checkbox } from '@/components/ui/checkbox';
import { useSimulation } from '@/hooks/useSimulation';

export function VisualizationToggles() {
  const { showAgents, showUsageHeatmap, setShowAgents, setShowUsageHeatmap } = useSimulation();

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
    </div>
  );
}
