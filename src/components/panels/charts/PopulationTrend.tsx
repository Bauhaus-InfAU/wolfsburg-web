import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  ReferenceLine,
} from 'recharts';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { POPULATION_TREND } from '@/data/wolfsburgPopulation';

export function PopulationTrend() {
  return (
    <div className="bg-background rounded-md p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
          Population Trend
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
                Wolfsburg's registered population from 1945 to 2023. The city grew
                rapidly after Volkswagen's post-war expansion, stabilising around
                120,000–126,000 since the 1970s.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={POPULATION_TREND}
            margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
          >
            <XAxis
              dataKey="year"
              tick={{ fontSize: 7, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              interval={2}
            />
            <YAxis
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 7, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              domain={[0, 140000]}
            />
            {/* Mark city founding */}
            <ReferenceLine
              x={1945}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="3 3"
              strokeWidth={0.8}
            />
            <RechartsTooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length > 0) {
                  const d = payload[0].payload as (typeof POPULATION_TREND)[0];
                  return (
                    <div className="bg-popover text-popover-foreground text-[10px] px-2 py-1.5 rounded shadow border border-border">
                      <div className="font-medium">{d.year}</div>
                      <div className="text-muted-foreground">
                        {d.population.toLocaleString('de-DE')} residents
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="population"
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
              dot={{ r: 2, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
              activeDot={{ r: 3, fill: 'hsl(var(--primary))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="text-[8px] text-muted-foreground text-center mt-1">
        Rapid post-war growth · Stable since 1970s
      </div>
    </div>
  );
}
