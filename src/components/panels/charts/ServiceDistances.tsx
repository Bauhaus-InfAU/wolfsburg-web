import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import type { ServiceDistance } from '@/hooks/useUrbanInsights';

interface ServiceDistancesProps {
  distances: ServiceDistance[];
}

export function ServiceDistances({ distances }: ServiceDistancesProps) {
  // Take top 6 furthest services
  const chartData = distances.slice(0, 6);

  if (chartData.length === 0) {
    return (
      <div className="bg-background rounded-md p-3">
        <div className="text-[9px] uppercase tracking-wide text-muted-foreground mb-2">
          Distance to Services
        </div>
        <div className="h-24 flex items-center justify-center text-[10px] text-muted-foreground">
          Enable land uses to see distances
        </div>
      </div>
    );
  }

  const maxDistance = Math.max(...chartData.map(d => d.avgDistance), 500);

  return (
    <div className="bg-background rounded-md p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
          Distance to Services
        </span>
        <span className="text-[10px] text-muted-foreground">
          avg meters
        </span>
      </div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
          >
            <XAxis
              type="number"
              domain={[0, maxDistance]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(v) => `${v}m`}
            />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
              width={55}
            />
            <Tooltip
              content={({ payload }) => {
                if (payload && payload[0]) {
                  const data = payload[0].payload as ServiceDistance;
                  return (
                    <div className="bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded shadow border border-border">
                      <div>{data.name}: {data.avgDistance}m avg</div>
                      <div className="text-muted-foreground">Max walkable: {data.maxWalkable}m</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="avgDistance"
              radius={[0, 3, 3, 0]}
              isAnimationActive={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
