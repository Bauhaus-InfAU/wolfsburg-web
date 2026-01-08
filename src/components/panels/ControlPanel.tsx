import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PlaybackControls } from './PlaybackControls';
import { SimulationParams } from './SimulationParams';
import { LandUseToggles } from './LandUseToggles';
import { VisualizationToggles } from './VisualizationToggles';
import { StatsDisplay } from './StatsDisplay';
import { Legend } from './Legend';

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
      className="h-full p-3 max-md:p-2 max-md:w-full max-md:h-[45vh]"
      style={{ width: `${width}px` }}
    >
      <div className="relative h-full bg-card rounded-xl border border-border shadow-sm overflow-hidden flex">
        {/* Resize Handle */}
        <div
          className={cn(
            "absolute right-0 top-0 bottom-0 w-3 cursor-col-resize z-20 flex items-center justify-center group max-md:hidden",
            isResizing && "bg-primary/10"
          )}
          onMouseDown={handleMouseDown}
        >
          <div className={cn(
            "w-1 h-12 rounded-full bg-border group-hover:bg-primary/50 transition-colors",
            isResizing && "bg-primary"
          )} />
        </div>

        {/* Content - direction:rtl moves scrollbar to left */}
        <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ direction: 'rtl' }}>
          <div style={{ direction: 'ltr' }}>
          {/* Header */}
          <div className="sticky top-0 bg-card/95 backdrop-blur-sm z-10 px-5 py-4 border-b border-border">
            <h1 className="text-sm font-semibold text-foreground">
              Pedestrian Flow
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Weimar Urban Simulation
            </p>
          </div>

          <div className="p-4 space-y-1">
            {/* Playback & Stats */}
            <CollapsibleSection title="Playback" defaultOpen>
              <PlaybackControls />
              <div className="mt-3 pt-3 border-t border-border">
                <StatsDisplay />
              </div>
            </CollapsibleSection>

            {/* Display Options */}
            <CollapsibleSection title="Display Options" defaultOpen>
              <VisualizationToggles />
            </CollapsibleSection>

            {/* Parameters */}
            <CollapsibleSection title="Parameters" defaultOpen>
              <SimulationParams />
            </CollapsibleSection>

            {/* Filters */}
            <CollapsibleSection title="Land Use Types" defaultOpen>
              <LandUseToggles />
            </CollapsibleSection>

            {/* Legend */}
            <CollapsibleSection title="Legend" defaultOpen={false}>
              <Legend />
            </CollapsibleSection>

            {/* About */}
            <CollapsibleSection title="About" defaultOpen={false}>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                This simulation models pedestrian flows in Weimar using an origin-destination gravity model calibrated with MiD 2023 mobility data. Residents generate trips to nearby services based on distance decay functions, with agents following A* pathfinding through the street network.
              </p>
            </CollapsibleSection>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="px-2 py-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </h2>
      </div>
      <div className="space-y-0.5">
        {children}
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
