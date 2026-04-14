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
import { AGE_DISTRIBUTION } from '@/data/wolfsburgPopulation';

// Coral-to-muted gradient palette that fits the app's warm accent
const AGE_COLORS = [
  '#93c5fd', // under 18  – blue-300
  '#6ee7b7', // 18-29     – emerald-300
  '#fcd34d', // 30-44     – amber-300
  '#f57f5b', // 45-59     – primary coral
  '#fb923c', // 60-74     – orange-400
  '#f87171', // 75+       – red-400
];

export function PopulationAgeChart() {
  return (
    <div className="bg-background rounded-md p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
          Age Distribution
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
                Share of Wolfsburg's population by age group (2023). Bars show the percentage
                of the total population in each cohort.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={AGE_DISTRIBUTION}
            margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            barCategoryGap="20%"
          >
            <XAxis
              dataKey="label"
              tick={{ fontSize: 7, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fontSize: 7, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              domain={[0, 30]}
            />
            <RechartsTooltip
              cursor={{ fill: 'hsl(var(--accent)/0.4)' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length > 0) {
                  const d = payload[0].payload as (typeof AGE_DISTRIBUTION)[0];
                  return (
                    <div className="bg-popover text-popover-foreground text-[10px] px-2 py-1.5 rounded shadow border border-border">
                      <div className="font-medium">{d.label}</div>
                      <div className="text-muted-foreground">
                        {d.count.toLocaleString('de-DE')} residents ({d.percent}%)
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="percent" radius={[2, 2, 0, 0]}>
              {AGE_DISTRIBUTION.map((_, index) => (
                <Cell key={`cell-${index}`} fill={AGE_COLORS[index % AGE_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Compact legend */}
      <div className="grid grid-cols-3 gap-x-2 gap-y-0.5 mt-1">
        {AGE_DISTRIBUTION.map((group, i) => (
          <div key={group.label} className="flex items-center gap-1 text-[8px] text-muted-foreground">
            <div
              className="w-2 h-2 rounded-sm flex-shrink-0"
              style={{ backgroundColor: AGE_COLORS[i % AGE_COLORS.length] }}
            />
            <span className="truncate">{group.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
