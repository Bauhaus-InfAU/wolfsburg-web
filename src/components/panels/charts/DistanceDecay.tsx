import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useState } from 'react';
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
  const [hoverDistance, setHoverDistance] = useState<number | null>(null);

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
            onMouseMove={(state) => {
              if (state.isTooltipActive && state.activeLabel !== undefined) {
                setHoverDistance(Number(state.activeLabel));
              }
            }}
            onMouseLeave={() => setHoverDistance(null)}
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
            {MID_LAND_USES.map((landUse) => {
              const avgDist = avgDistanceMap.get(landUse);
              if (avgDist === undefined) return null;
              return (
                <ReferenceLine
                  key={`ref-${landUse}`}
                  x={avgDist}
                  stroke={LAND_USE_COLORS[landUse]}
                  strokeWidth={1}
                  strokeOpacity={0.5}
                  strokeDasharray="2 2"
                />
              );
            })}
            {hoverDistance !== null && (
              <ReferenceLine
                x={hoverDistance}
                stroke="hsl(var(--foreground))"
                strokeWidth={1}
                strokeOpacity={0.6}
                label={{
                  value: `${hoverDistance}m`,
                  position: 'insideBottomLeft',
                  fontSize: 8,
                  fill: 'hsl(var(--foreground))',
                  dy: 10,
                }}
              />
            )}
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
      {/* Compact legend — updates live as cursor moves over chart */}
      <div className="flex flex-col gap-y-0.5 mt-2">
        {MID_LAND_USES.map((landUse) => {
          const beta = MID_DECAY_BETA[landUse];
          const avgDist = avgDistanceMap.get(landUse);
          const activeDist = hoverDistance ?? avgDist;
          const pct = activeDist !== undefined ? Math.round(Math.exp(-beta * activeDist) * 100) : null;
          return (
            <div key={landUse} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: LAND_USE_COLORS[landUse] }}
              />
              <span className="text-[8px] text-muted-foreground flex-1">
                {LAND_USE_DISPLAY_NAMES[landUse]}
              </span>
              {pct !== null && (
                <span
                  className="text-[8px] tabular-nums font-medium transition-colors"
                  style={{ color: LAND_USE_COLORS[landUse] }}
                >
                  {pct}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
