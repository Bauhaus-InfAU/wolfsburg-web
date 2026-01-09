import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { MID_DECAY_BETA } from '@/data/midMobilityData';
import { LAND_USE_COLORS, LAND_USE_DISPLAY_NAMES } from '@/config/constants';
import type { LandUse } from '@/config/types';
import type { ServiceDistance } from '@/hooks/useUrbanInsights';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DistanceDecayProps {
  serviceDistances: ServiceDistance[];
}

// Land uses with MiD calibration data (non-default beta values)
const MID_LAND_USES: LandUse[] = [
  'Generic Retail',
  'Generic Sport Facility',
  'Generic Food and Beverage Service',
  'Generic Education',
  'Generic Civic Function',
  'Generic Health and Wellbeing',
  'Generic Entertainment',
  'Generic Service',
  'Generic Culture',
];

interface DataPoint {
  distance: number;
  [key: string]: number;
}

// Generate decay curve data points
function generateDecayData(): DataPoint[] {
  const data: DataPoint[] = [];

  for (let d = 0; d <= 5000; d += 50) {
    const point: DataPoint = { distance: d };
    for (const landUse of MID_LAND_USES) {
      const beta = MID_DECAY_BETA[landUse];
      point[landUse] = Math.exp(-beta * d);
    }
    data.push(point);
  }

  return data;
}

const decayData = generateDecayData();

export function DistanceDecay({ serviceDistances }: DistanceDecayProps) {
  // Create a map for quick lookup of avg distances by land use
  const avgDistanceMap = new Map<LandUse, number>(
    serviceDistances.map(sd => [sd.landUse, sd.avgDistance])
  );

  return (
    <div className="bg-background rounded-md p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
            Distance Decay
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
                  Trip probability decreases with distance based on MiD 2023 survey data.
                  Each land use has a different decay rate - retail trips are shorter while sports trips can be longer.
                  Values in parentheses show current average distances.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="text-[10px] text-muted-foreground">
          trip probability
        </span>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={decayData}
            margin={{ top: 5, right: 5, left: -15, bottom: 0 }}
          >
            <XAxis
              dataKey="distance"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(v) => `${v}m`}
              ticks={[0, 1000, 2000, 3000, 4000, 5000]}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(v) => `${Math.round(v * 100)}%`}
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
            />
            <RechartsTooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length > 0) {
                  return (
                    <div className="bg-popover text-popover-foreground text-[10px] px-2 py-1.5 rounded shadow border border-border">
                      <div className="font-medium mb-1">{label}m distance</div>
                      <div className="space-y-0.5">
                        {[...payload]
                          .sort((a, b) => (b.value as number) - (a.value as number))
                          .map((entry: { dataKey?: string; color?: string; value?: number }) => {
                            const landUse = entry.dataKey as LandUse;
                            const value = entry.value ?? 0;
                            const avgDist = avgDistanceMap.get(landUse);
                            return (
                              <div key={entry.dataKey} className="flex items-center gap-1.5">
                                <div
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: entry.color }}
                                />
                                <span className="truncate">
                                  {LAND_USE_DISPLAY_NAMES[landUse]}
                                </span>
                                <span className="ml-auto tabular-nums">
                                  {Math.round(value * 100)}%
                                </span>
                                {avgDist !== undefined && (
                                  <span className="text-muted-foreground tabular-nums">
                                    ({avgDist}m)
                                  </span>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            {MID_LAND_USES.map((landUse) => (
              <Line
                key={landUse}
                type="monotone"
                dataKey={landUse}
                stroke={LAND_USE_COLORS[landUse]}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* Compact legend */}
      <div className="flex flex-wrap gap-x-2 gap-y-1 mt-2">
        {MID_LAND_USES.map((landUse) => (
          <div key={landUse} className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: LAND_USE_COLORS[landUse] }}
            />
            <span className="text-[8px] text-muted-foreground">
              {LAND_USE_DISPLAY_NAMES[landUse]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
