import { useSimulation } from '@/hooks/useSimulation';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface LowWalkabilityProps {
  totalResidential: number;
  highlightedCount: number;
}

export function LowWalkability({ totalResidential, highlightedCount }: LowWalkabilityProps) {
  const {
    showLowWalkability,
    setShowLowWalkability,
    lowWalkabilityRange,
    setLowWalkabilityRange,
  } = useSimulation();

  if (totalResidential === 0) {
    return (
      <div className="bg-background rounded-md p-3">
        <div className="text-[9px] uppercase tracking-wide text-muted-foreground mb-2">
          Low Walkability Buildings
        </div>
        <div className="text-[10px] text-muted-foreground text-center py-4">
          No residential buildings found
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background rounded-md p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
            Low Walkability Buildings
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <Info className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-56 text-[10px]">
                <p className="font-medium mb-1">What this shows</p>
                <p className="text-muted-foreground leading-relaxed">
                  Highlights residential buildings with walkability scores in the selected range.
                  Lower scores mean services are farther away, indicating areas with poor pedestrian access.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <Checkbox
            checked={showLowWalkability}
            onCheckedChange={(checked) => setShowLowWalkability(checked === true)}
            className="h-3 w-3"
          />
          <span className="text-[9px] text-muted-foreground">
            Highlight
          </span>
        </label>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
          <span className="text-[9px] text-muted-foreground">Range</span>
          <span className="text-[10px] font-medium">{lowWalkabilityRange[0]}% – {lowWalkabilityRange[1]}%</span>
        </div>
        <Slider
          value={lowWalkabilityRange}
          min={0}
          max={100}
          step={1}
          onValueChange={(val) => setLowWalkabilityRange(val as [number, number])}
        />
        <div className="text-[9px] text-muted-foreground text-center">
          {highlightedCount} of {totalResidential} buildings by walkability score
        </div>
      </div>
    </div>
  );
}
