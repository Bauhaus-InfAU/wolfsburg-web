import { Button } from '@/components/ui/button';
import { useSimulation } from '@/hooks/useSimulation';
import type { MobilePanel } from '@/hooks/useMobileLayout';

interface MobileFloatingControlsProps {
  onOpenPanel: (panel: Exclude<MobilePanel, 'none'>) => void;
}

export function MobileFloatingControls({ onOpenPanel }: MobileFloatingControlsProps) {
  const { isRunning, play, pause } = useSimulation();

  return (
    <div className="fixed bottom-4 left-4 right-4 z-30">
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-2xl shadow-lg p-2">
        <div className="flex items-center gap-2">
          {/* Settings panel toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 rounded-full"
            onClick={() => onOpenPanel('controls')}
          >
            <img src="/weimar-web/icons/settings.svg" alt="" className="w-4 h-4 mr-1.5" />
            Settings
          </Button>

          {/* Play/Pause toggle - primary action (center) */}
          <Button
            variant={isRunning ? "outline" : "default"}
            size="sm"
            className="flex-1 rounded-full"
            onClick={isRunning ? pause : play}
          >
            <img
              src={isRunning ? "/weimar-web/icons/pause.svg" : "/weimar-web/icons/play-white.svg"}
              alt=""
              className="w-4 h-4 mr-1.5"
            />
            {isRunning ? "Pause" : "Simulate"}
          </Button>

          {/* Data panel toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 rounded-full"
            onClick={() => onOpenPanel('data')}
          >
            <img src="/weimar-web/icons/insights.svg" alt="" className="w-4 h-4 mr-1.5" />
            Insights
          </Button>
        </div>
      </div>
    </div>
  );
}
