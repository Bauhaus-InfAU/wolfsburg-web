import { useFlow } from '@/context/FlowContext';
import { cn } from '@/lib/utils';
import type { TransportMode } from '@/config/types';
import { MODE_LABELS } from '@/data/midMobilityData';

const MODES: TransportMode[] = ['pedestrian', 'bicycle', 'car'];

export function TransportModeSelector() {
  const { transportMode, setTransportMode, isCalculating } = useFlow();

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {MODES.map((mode) => (
          <button
            key={mode}
            onClick={() => setTransportMode(mode)}
            disabled={isCalculating}
            className={cn(
              "flex-1 px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
              "border border-border",
              transportMode === mode
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-accent hover:text-accent-foreground",
              isCalculating && "opacity-50 cursor-not-allowed"
            )}
          >
            {MODE_LABELS[mode]}
          </button>
        ))}
      </div>
    </div>
  );
}
