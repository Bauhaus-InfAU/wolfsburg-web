import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Cell,
} from 'recharts';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DISTRICT_POPULATION } from '@/data/wolfsburgPopulation';

// Sorted largest-first
const sorted = [...DISTRICT_POPULATION].sort((a, b) => b.population - a.population);

export function PopulationDistrictChart() {
  return (
    <div className="bg-background rounded-md p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
          Population by District
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
                Resident count for the 10 largest Wolfsburg districts (Ortsteile), sorted
                by population. Hover a bar to see density.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 0, right: 8, left: 4, bottom: 0 }}
            barCategoryGap="15%"
          >
            <XAxis
              type="number"
              tickFormatter={(v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
              }
              tick={{ fontSize: 7, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={58}
              tick={{ fontSize: 7, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <RechartsTooltip
              cursor={{ fill: 'hsl(var(--accent)/0.4)' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length > 0) {
                  const d = payload[0].payload as (typeof DISTRICT_POPULATION)[0];
                  const density = Math.round(d.population / d.area_km2);
                  return (
                    <div className="bg-popover text-popover-foreground text-[10px] px-2 py-1.5 rounded shadow border border-border">
                      <div className="font-medium">{d.name}</div>
                      <div className="text-muted-foreground">
                        {d.population.toLocaleString('de-DE')} residents
                      </div>
                      <div className="text-muted-foreground">
                        {density.toLocaleString('de-DE')} /km² · {d.area_km2} km²
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="population" radius={[0, 2, 2, 0]}>
              {sorted.map((_, index) => {
                // Fade from primary coral to a lighter tint
                const opacity = 1 - (index / sorted.length) * 0.55;
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={`hsl(14 89% 66% / ${opacity})`}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
