import { Pause } from 'lucide-react';
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
            className="flex-1 h-12"
            onClick={() => onOpenPanel('controls')}
          >
            <img src="/weimar-web/icons/settings.svg" alt="Settings" className="w-6 h-6" />
          </Button>

          {/* Data panel toggle */}
          <Button
            variant="ghost"
            className="flex-1 h-12"
            onClick={() => onOpenPanel('data')}
          >
            <img src="/weimar-web/icons/insights.svg" alt="Insights" className="w-6 h-6" />
          </Button>

          {/* Play/Pause - primary action */}
          <Button
            variant={isRunning ? "outline" : "ghost"}
            className="flex-1 h-12"
            onClick={isRunning ? pause : play}
          >
            {isRunning ? (
              <Pause className="w-6 h-6" />
            ) : (
              <img src="/weimar-web/icons/main.svg" alt="Play" className="w-8 h-8" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
