import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useSimulation } from '@/hooks/useSimulation';
import { LAND_USE_COLORS, LAND_USE_DISPLAY_NAMES } from '@/config/constants';
import type { LandUse } from '@/config/types';
import { Info } from 'lucide-react';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DonutDataItem {
  name: string;
  value: number;
  landUse: LandUse;
  color: string;
  [key: string]: string | number;
}

export function LandUseDonut() {
  const { getLandUseAreas } = useSimulation();

  const { data, total } = useMemo(() => {
    const areas = getLandUseAreas();
    const items: DonutDataItem[] = [];
    let totalArea = 0;

    for (const [landUse, area] of areas) {
      if (area > 0) {
        items.push({
          name: LAND_USE_DISPLAY_NAMES[landUse],
          value: area,
          landUse,
          color: LAND_USE_COLORS[landUse],
        });
        totalArea += area;
      }
    }

    // Sort by area descending
    items.sort((a, b) => b.value - a.value);

    return { data: items, total: totalArea };
  }, [getLandUseAreas]);

  if (data.length === 0) {
    return (
      <div className="bg-background rounded-md p-3">
        <div className="text-[9px] uppercase tracking-wide text-muted-foreground mb-2">
          Land Use Distribution
        </div>
        <div className="text-[10px] text-muted-foreground text-center py-4">
          No building data available
        </div>
      </div>
    );
  }

  const formatArea = (area: number) => {
    if (area >= 1000000) {
      return `${(area / 1000000).toFixed(1)}M`;
    }
    if (area >= 1000) {
      return `${(area / 1000).toFixed(0)}K`;
    }
    return area.toFixed(0);
  };

  return (
    <div className="bg-background rounded-md p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
          Land Use Distribution
        </span>
        <TooltipProvider>
          <UITooltip>
            <TooltipTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <Info className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-56 text-[10px]">
              <p className="font-medium mb-1">What this shows</p>
              <p className="text-muted-foreground leading-relaxed">
                Total floor area by land use type across all buildings in the study area.
                Values are in square meters.
              </p>
            </TooltipContent>
          </UITooltip>
        </TooltipProvider>
      </div>

      <div className="flex items-center gap-2">
        {/* Donut Chart */}
        <div className="h-24 w-24 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={25}
                outerRadius={40}
                dataKey="value"
                strokeWidth={1}
                stroke="hsl(var(--background))"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const item = payload[0].payload as DonutDataItem;
                    const percent = ((item.value / total) * 100).toFixed(1);
                    return (
                      <div className="bg-popover text-popover-foreground text-[10px] px-2 py-1.5 rounded shadow border border-border">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <div className="text-muted-foreground mt-0.5">
                          {formatArea(item.value)} m² ({percent}%)
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend - show top 5 */}
        <div className="flex-1 space-y-1">
          {data.slice(0, 5).map((item) => {
            const percent = ((item.value / total) * 100).toFixed(0);
            return (
              <div key={item.landUse} className="flex items-center gap-1.5 text-[9px]">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate text-muted-foreground flex-1">
                  {item.name}
                </span>
                <span className="tabular-nums text-foreground">{percent}%</span>
              </div>
            );
          })}
          {data.length > 5 && (
            <div className="text-[8px] text-muted-foreground">
              +{data.length - 5} more
            </div>
          )}
        </div>
      </div>

      {/* Total */}
      <div className="text-[9px] text-muted-foreground text-center mt-2 pt-2 border-t border-border">
        Total: {formatArea(total)} m²
      </div>
    </div>
  );
}
