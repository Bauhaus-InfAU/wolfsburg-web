import { Button } from '@/components/ui/button';
import { useSimulation } from '@/hooks/useSimulation';

export function CalculateButton() {
  const { isCalculating, calculationProgress, calculationStatus, hasCalculated, startCalculation } = useSimulation();

  return (
    <div className="space-y-2">
      <Button
        variant={hasCalculated ? "outline" : "default"}
        size="sm"
        className="w-full rounded-full"
        onClick={startCalculation}
        disabled={isCalculating}
      >
        <img
          src={isCalculating ? "/wolfsburg-web/icons/pause.svg" : "/wolfsburg-web/icons/play-white.svg"}
          alt=""
          className="w-4 h-4 mr-1.5"
        />
        {isCalculating ? "Calculating..." : hasCalculated ? "Recalculate" : "Calculate Flows"}
      </Button>

      {/* Progress info - only show during calculation */}
      {isCalculating && (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground truncate">
            {calculationStatus}
          </div>
          <div className="w-full bg-border rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-150"
              style={{ width: `${calculationProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
