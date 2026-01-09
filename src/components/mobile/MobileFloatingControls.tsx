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
            className="flex-1 h-12 flex-col gap-0.5 py-1"
            onClick={() => onOpenPanel('controls')}
          >
            <img src="/weimar-web/icons/settings.svg" alt="" className="w-5 h-5" />
            <span className="text-[10px]">Settings</span>
          </Button>

          {/* Data panel toggle */}
          <Button
            variant="ghost"
            className="flex-1 h-12 flex-col gap-0.5 py-1"
            onClick={() => onOpenPanel('data')}
          >
            <img src="/weimar-web/icons/insights.svg" alt="" className="w-5 h-5" />
            <span className="text-[10px]">Insights</span>
          </Button>

          {/* Play/Pause - primary action */}
          <Button
            variant={isRunning ? "outline" : "default"}
            className="flex-1 h-12 flex-col gap-0.5 py-1"
            onClick={isRunning ? pause : play}
          >
            {isRunning ? (
              <>
                <img src="/weimar-web/icons/pause.svg" alt="" className="w-5 h-5" />
                <span className="text-[10px]">Pause</span>
              </>
            ) : (
              <>
                <img src="/weimar-web/icons/play-white.svg" alt="" className="w-5 h-5" />
                <span className="text-[10px]">Play</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
