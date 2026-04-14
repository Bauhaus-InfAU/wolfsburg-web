import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { useSimulation } from '@/hooks/useSimulation';
import { useUrbanInsights } from '@/hooks/useUrbanInsights';
import { TopStreets } from './charts/TopStreets';
import { WalkabilityScore } from './charts/WalkabilityScore';
import { LowWalkability } from './charts/LowWalkability';
import { DistanceDecay } from './charts/DistanceDecay';
import { LandUseDonut } from './charts/LandUseDonut';

const MIN_WIDTH = 240;
const MAX_WIDTH = 420;
const DEFAULT_WIDTH = 360;

export function DataPanel() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);

  const { isLoading, getResidentialCount, getLowWalkabilityCount } = useSimulation();
  const {
    topStreets,
    totalSegments,
    serviceDistances,
    walkabilityScore,
  } = useUrbanInsights();

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = startX - e.clientX;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [width]);

  if (isLoading) {
    return null;
  }

  return (
    <div className="relative h-full flex-shrink-0 flex">
      {/* Toggle Button - outside collapsible area */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-1/2 -translate-y-1/2 left-0 -translate-x-full z-30 bg-card border border-border rounded-l-lg p-1.5 shadow-sm hover:bg-accent/50 transition-colors"
        title={isCollapsed ? "Show insights" : "Hide insights"}
      >
        <ChevronRight
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            isCollapsed && "rotate-180"
          )}
        />
      </button>

      {/* Collapsible Panel Area */}
      <div
        className="h-full overflow-hidden transition-[width] duration-300 ease-in-out"
        style={{ width: isCollapsed ? '0px' : `${width}px` }}
      >
        <div className="p-3 h-full" style={{ minWidth: `${width}px` }}>
        <div className="relative h-full bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
        {/* Resize Handle */}
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-3 cursor-col-resize z-20 flex items-center justify-center group",
            isResizing && "bg-primary/10"
          )}
          onMouseDown={handleMouseDown}
        >
          <div className={cn(
            "w-1 h-12 rounded-full bg-border group-hover:bg-primary/50 transition-colors",
            isResizing && "bg-primary"
          )} />
        </div>

        {/* Header */}
        <div className="px-4 py-3 border-b border-border bg-card/95 backdrop-blur-sm">
          <h2 className="text-sm font-semibold text-foreground text-center">Urban Insights</h2>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hidden p-3 space-y-3">
          {/* Land Use Distribution */}
          <LandUseDonut />

          {/* Walkability Score - Main KPI */}
          <WalkabilityScore score={walkabilityScore} />

          {/* Low Walkability Buildings */}
          <LowWalkability
            totalResidential={getResidentialCount()}
            highlightedCount={getLowWalkabilityCount()}
          />

          {/* Travel Behavior Section */}
          <div className="pt-2">
            <div className="space-y-2">
              <DistanceDecay serviceDistances={serviceDistances} />
            </div>
          </div>

          {/* Busiest Streets Section */}
          <div className="pt-2">
            <div className="space-y-2">
              <TopStreets
                streets={topStreets}
                totalSegments={totalSegments}
              />
            </div>
          </div>
        </div>
        </div>
      </div>
      </div>
    </div>
  );
}
