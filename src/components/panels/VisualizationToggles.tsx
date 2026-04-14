import { Button } from '@/components/ui/button';
import { useSimulation } from '@/hooks/useSimulation';
import { GradientEditor } from './GradientEditor';

export function VisualizationToggles() {
  const {
    showUsageHeatmap,
    showPathPreview,
    monochromeBuildings,
    showOpenSpaces,
    setShowUsageHeatmap,
    setShowPathPreview,
    setMonochromeBuildings,
    setShowOpenSpaces,
  } = useSimulation();

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        <Button
          variant={showUsageHeatmap ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowUsageHeatmap(!showUsageHeatmap)}
          className="h-7 flex-1 text-[11px] rounded-full"
        >
          Heatmap
        </Button>
        <Button
          variant={monochromeBuildings ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMonochromeBuildings(!monochromeBuildings)}
          className="h-7 flex-1 text-[11px] rounded-full"
        >
          Mono
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
      <div className="flex gap-1.5">
        <Button
          variant={showOpenSpaces ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowOpenSpaces(!showOpenSpaces)}
          className="h-7 flex-1 text-[11px] rounded-full"
        >
          Open Spaces
        </Button>
      </div>
      {showUsageHeatmap && <GradientEditor />}
    </div>
  );
}
