import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { DESTINATION_LAND_USES, LAND_USE_COLORS, LAND_USE_DISPLAY_NAMES } from '@/config/constants';
import { useSimulation } from '@/hooks/useSimulation';

export function LandUseToggles() {
  const { enabledLandUses, toggleLandUse } = useSimulation();

  return (
    <div className="grid grid-cols-2 gap-3">
      {DESTINATION_LAND_USES.map((landUse) => (
        <Label
          key={landUse}
          className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
        >
          <Checkbox
            checked={enabledLandUses.has(landUse)}
            onCheckedChange={(checked) => toggleLandUse(landUse, !!checked)}
          />
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: LAND_USE_COLORS[landUse] }}
          />
          <span className="truncate">{LAND_USE_DISPLAY_NAMES[landUse]}</span>
        </Label>
      ))}
    </div>
  );
}
