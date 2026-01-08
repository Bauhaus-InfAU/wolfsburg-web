import type { TopStreet } from '@/hooks/useUrbanInsights';
import { useSimulation } from '@/hooks/useSimulation';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';

interface TopStreetsProps {
  streets: TopStreet[];
  maxCount: number;
  totalSegments: number;
}

export function TopStreets({ streets, maxCount, totalSegments }: TopStreetsProps) {
  const { showTopStreets, setShowTopStreets, topStreetsPercent, setTopStreetsPercent } = useSimulation();

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
        <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
          Busiest Streets
        </span>
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

      <div className="space-y-2 mb-3">
        <div className="flex justify-between items-baseline">
          <span className="text-[9px] text-muted-foreground">Coverage</span>
          <span className="text-[10px] font-medium">{topStreetsPercent}%</span>
        </div>
        <Slider
          value={[topStreetsPercent]}
          min={5}
          max={50}
          step={5}
          onValueChange={([val]) => setTopStreetsPercent(val)}
        />
        <div className="text-[9px] text-muted-foreground text-center">
          {streets.length} of {totalSegments} segments
        </div>
      </div>

      {streets.length > 0 && (
        <>
          <div className="space-y-1.5">
            {streets.slice(0, 5).map((street, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-muted-foreground w-4">
                  {index + 1}.
                </span>
                <div className="flex-1 h-4 bg-accent/30 rounded overflow-hidden">
                  <div
                    className="h-full bg-primary/70 rounded transition-all duration-300"
                    style={{ width: `${(street.count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] tabular-nums font-medium text-foreground w-12 text-right">
                  {street.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
          <div className="text-[9px] text-muted-foreground mt-2 text-center">
            Top 5 by pedestrian passes
          </div>
        </>
      )}
    </div>
  );
}
