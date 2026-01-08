import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useSimulation } from '@/hooks/useSimulation';

export function VisualizationToggles() {
  const { showAgents, showUsageHeatmap, setShowAgents, setShowUsageHeatmap } = useSimulation();

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
        <Checkbox
          checked={showAgents}
          onCheckedChange={(checked) => setShowAgents(!!checked)}
        />
        Show Agents
      </Label>
      <Label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
        <Checkbox
          checked={showUsageHeatmap}
          onCheckedChange={(checked) => setShowUsageHeatmap(!!checked)}
        />
        Show Street Usage
      </Label>
    </div>
  );
}
