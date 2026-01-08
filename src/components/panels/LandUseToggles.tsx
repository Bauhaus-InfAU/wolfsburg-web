import { Checkbox } from '@/components/ui/checkbox';
import { DESTINATION_LAND_USES, LAND_USE_COLORS, LAND_USE_DISPLAY_NAMES } from '@/config/constants';
import { useSimulation } from '@/hooks/useSimulation';

export function LandUseToggles() {
  const { enabledLandUses, toggleLandUse } = useSimulation();

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2">
      {DESTINATION_LAND_USES.map((landUse) => (
        <label
          key={landUse}
          className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors py-0.5"
        >
          <Checkbox
            checked={enabledLandUses.has(landUse)}
            onCheckedChange={(checked) => toggleLandUse(landUse, !!checked)}
            className="h-3.5 w-3.5"
          />
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: LAND_USE_COLORS[landUse] }}
          />
          <span className="truncate">{LAND_USE_DISPLAY_NAMES[landUse]}</span>
        </label>
      ))}
    </div>
  );
}
