import type { TopStreet } from '@/hooks/useUrbanInsights';
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

interface TopStreetsProps {
  streets: TopStreet[];
  totalSegments: number;
}

export function TopStreets({ streets, totalSegments }: TopStreetsProps) {
  const { showTopStreets, setShowTopStreets, topStreetsRange, setTopStreetsRange } = useSimulation();

  if (totalSegments === 0) {
    return (
      <div className="bg-background rounded-md p-3">
        <div className="text-[9px] uppercase tracking-wide text-muted-foreground mb-2">
          Busiest Streets
        </div>
        <div className="text-[10px] text-muted-foreground text-center py-4">
          Run simulation to collect data
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background rounded-md p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
            Busiest Streets
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
                  Street segments ranked by pedestrian traffic from the simulation.
                  Use the range slider to highlight specific percentiles of busiest streets on the map.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <Checkbox
            checked={showTopStreets}
            onCheckedChange={(checked) => setShowTopStreets(checked === true)}
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
          <span className="text-[10px] font-medium">{topStreetsRange[0]}% – {topStreetsRange[1]}%</span>
        </div>
        <Slider
          value={topStreetsRange}
          min={0}
          max={100}
          step={1}
          onValueChange={(val) => setTopStreetsRange(val as [number, number])}
        />
        <div className="text-[9px] text-muted-foreground text-center">
          {streets.length} of {totalSegments} segments highlighted
        </div>
      </div>
    </div>
  );
}
