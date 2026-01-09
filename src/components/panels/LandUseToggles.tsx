import { DESTINATION_LAND_USES, LAND_USE_COLORS, LAND_USE_DISPLAY_NAMES } from '@/config/constants';
import { useSimulation } from '@/hooks/useSimulation';
import { cn } from '@/lib/utils';

export function LandUseToggles() {
  const { enabledLandUses, toggleLandUse, setEnabledLandUses } = useSimulation();

  const handleSelectAll = () => {
    setEnabledLandUses(new Set(DESTINATION_LAND_USES));
  };

  const handleSelectNone = () => {
    setEnabledLandUses(new Set());
  };

  return (
    <div className="space-y-2">
      {/* Quick actions */}
      <div className="flex gap-2 text-[10px]">
        <button
          onClick={handleSelectAll}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          All
        </button>
        <span className="text-border">|</span>
        <button
          onClick={handleSelectNone}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          None
        </button>
      </div>

      {/* Chips */}
      <div className="flex flex-wrap gap-1.5">
        {DESTINATION_LAND_USES.map((landUse) => {
          const isEnabled = enabledLandUses.has(landUse);
          return (
            <button
              key={landUse}
              onClick={() => toggleLandUse(landUse, !isEnabled)}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] transition-all border",
                isEnabled
                  ? "bg-accent text-foreground border-transparent"
                  : "bg-transparent text-muted-foreground/50 border-border/50"
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  !isEnabled && "opacity-40"
                )}
                style={{ backgroundColor: LAND_USE_COLORS[landUse] }}
              />
              <span>{LAND_USE_DISPLAY_NAMES[landUse]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
