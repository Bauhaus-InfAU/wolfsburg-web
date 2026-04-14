import { Button } from '@/components/ui/button';
import { useSimulation } from '@/hooks/useSimulation';
import type { MobilePanel } from '@/hooks/useMobileLayout';
import { ThemeToggle } from '@/components/ThemeToggle';

interface MobileFloatingControlsProps {
  onOpenPanel: (panel: Exclude<MobilePanel, 'none'>) => void;
}

export function MobileFloatingControls({ onOpenPanel }: MobileFloatingControlsProps) {
  const { isCalculating, calculationProgress, hasCalculated, startCalculation } = useSimulation();

  return (
    <div className="fixed bottom-4 left-4 right-4 z-30">
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-2xl shadow-lg p-2">
        <div className="flex items-center gap-2">
          {/* Calculate button */}
          <Button
            variant={isCalculating ? "outline" : hasCalculated ? "ghost" : "default"}
            size="sm"
            className="flex-1 rounded-full"
            onClick={startCalculation}
            disabled={isCalculating}
          >
            <img
              src={isCalculating ? "/wolfsburg-web/icons/pause.svg" : "/wolfsburg-web/icons/play-white.svg"}
              alt=""
              className="w-4 h-4 mr-1.5"
            />
            {isCalculating ? `${calculationProgress}%` : hasCalculated ? "Recalc" : "Calculate"}
          </Button>

          {/* Settings panel toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 rounded-full"
            onClick={() => onOpenPanel('controls')}
          >
            <img src="/wolfsburg-web/icons/settings.svg" alt="" className="w-4 h-4 mr-1.5" />
            Settings
          </Button>

          {/* Data panel toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 rounded-full"
            onClick={() => onOpenPanel('data')}
          >
            <img src="/wolfsburg-web/icons/insights.svg" alt="" className="w-4 h-4 mr-1.5" />
            Insights
          </Button>

          {/* Theme toggle */}
          <ThemeToggle className="rounded-full shrink-0" />
        </div>
      </div>
    </div>
  );
}
