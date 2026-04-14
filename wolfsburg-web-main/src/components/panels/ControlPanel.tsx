import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LandUseToggles } from './LandUseToggles';
import { VisualizationToggles } from './VisualizationToggles';
import { StatsDisplay } from './StatsDisplay';
import { CalculateButton } from './CalculateButton';
import { TransportModeSelector } from './TransportModeSelector';
import { PublicTransportPanel } from './PublicTransportPanel';

const MIN_WIDTH = 300;
const MAX_WIDTH = 500;
const DEFAULT_WIDTH = 360;

export function ControlPanel() {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
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

  return (
    <div
      className="h-full p-3"
      style={{ width: `${width}px` }}
    >
      <div className="relative h-full bg-card rounded-xl border border-border shadow-sm overflow-hidden flex">
        {/* Resize Handle */}
        <div
          className={cn(
            "absolute right-0 top-0 bottom-0 w-3 cursor-col-resize z-20 flex items-center justify-center group",
            isResizing && "bg-primary/10"
          )}
          onMouseDown={handleMouseDown}
        >
          <div className={cn(
            "w-1 h-12 rounded-full bg-border group-hover:bg-primary/50 transition-colors",
            isResizing && "bg-primary"
          )} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hidden">
          <div>
          {/* Header */}
          <div className="sticky top-0 bg-card/95 backdrop-blur-sm z-10 px-5 py-4 border-b border-border">
            <h1 className="text-sm font-semibold text-foreground text-center">
              Wolfsburg Flow Model
            </h1>
          </div>

          <div className="p-4 space-y-1">
            {/* Flow Statistics */}
            <CollapsibleSection title="Flow Statistics" defaultOpen>
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Transport Mode</span>
                  <div className="mt-1.5">
                    <TransportModeSelector />
                  </div>
                </div>
                <CalculateButton />
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <StatsDisplay />
              </div>
            </CollapsibleSection>

            {/* Display Options */}
            <CollapsibleSection title="Display Options" defaultOpen>
              <VisualizationToggles />
            </CollapsibleSection>

            {/* Land Use Filters */}
            <CollapsibleSection title="Land Use Types" defaultOpen>
              <LandUseToggles />
            </CollapsibleSection>

            {/* Public Transport */}
            <CollapsibleSection title="Public Transport" defaultOpen={false}>
              <PublicTransportPanel />
            </CollapsibleSection>
          </div>

          {/* About - always visible footer */}
          <div className="px-5 py-4 border-t border-border mt-auto">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              This tool models trip distribution in Wolfsburg using an origin-destination gravity model calibrated with MiD 2023 mobility data. Select transport mode to compare pedestrian, bicycle, and car flows. Toggle land use types to see how flows change.
            </p>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors group">
        <span className="text-xs font-medium text-foreground">{title}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapse data-[state=open]:animate-expand">
        <div className="px-3 py-3 bg-accent/30 rounded-lg mx-1 mb-1">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
