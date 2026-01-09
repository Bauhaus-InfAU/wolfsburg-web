import { Play, Pause, Settings, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSimulation } from '@/hooks/useSimulation';
import type { MobilePanel } from '@/hooks/useMobileLayout';

interface MobileFloatingControlsProps {
  onOpenPanel: (panel: Exclude<MobilePanel, 'none'>) => void;
}

export function MobileFloatingControls({ onOpenPanel }: MobileFloatingControlsProps) {
  const { isRunning, play, pause, stats } = useSimulation();

  return (
    <div className="fixed bottom-4 left-4 right-4 z-30">
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-2xl shadow-lg p-3">
        <div className="flex items-center justify-between gap-3">
          {/* Stats - compact */}
          <div className="flex gap-3 text-xs min-w-0 flex-shrink">
            <div className="truncate">
              <span className="text-muted-foreground">Agents </span>
              <span className="font-medium tabular-nums">{stats.activeAgents}</span>
            </div>
            <div className="truncate">
              <span className="text-muted-foreground">Trips </span>
              <span className="font-medium tabular-nums">{stats.totalTrips.toLocaleString()}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-shrink-0">
            {/* Settings panel toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={() => onOpenPanel('controls')}
            >
              <Settings className="w-5 h-5" />
            </Button>

            {/* Data panel toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={() => onOpenPanel('data')}
            >
              <BarChart3 className="w-5 h-5" />
            </Button>

            {/* Play/Pause - primary action */}
            <Button
              variant="default"
              size="icon"
              className="h-10 w-10"
              onClick={isRunning ? pause : play}
            >
              {isRunning ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
