import { Button } from '@/components/ui/button';
import { useSimulation } from '@/hooks/useSimulation';

export function VisualizationToggles() {
  const {
    showAgents,
    showUsageHeatmap,
    showPathPreview,
    setShowAgents,
    setShowUsageHeatmap,
    setShowPathPreview,
  } = useSimulation();

  return (
    <div className="flex gap-1.5">
      <Button
        variant={showAgents ? 'default' : 'outline'}
        size="sm"
        onClick={() => setShowAgents(!showAgents)}
        className="h-7 flex-1 text-[11px] rounded-full"
      >
        Agents
      </Button>
      <Button
        variant={showUsageHeatmap ? 'default' : 'outline'}
        size="sm"
        onClick={() => setShowUsageHeatmap(!showUsageHeatmap)}
        className="h-7 flex-1 text-[11px] rounded-full"
      >
        Heatmap
      </Button>
      <Button
        variant={showPathPreview ? 'default' : 'outline'}
        size="sm"
        onClick={() => setShowPathPreview(!showPathPreview)}
        className="h-7 flex-1 text-[11px] rounded-full"
      >
        A-B Path
      </Button>
    </div>
  );
}
