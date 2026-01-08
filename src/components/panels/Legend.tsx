import { DESTINATION_LAND_USES, LAND_USE_COLORS, LAND_USE_DISPLAY_NAMES } from '@/config/constants';

export function Legend() {
  return (
    <div id="legend-content" className="grid grid-cols-2 gap-2.5">
      {DESTINATION_LAND_USES.map((landUse) => (
        <div key={landUse} className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span
            className="w-2.5 h-2.5 rounded-sm shrink-0"
            style={{ backgroundColor: LAND_USE_COLORS[landUse] }}
          />
          {LAND_USE_DISPLAY_NAMES[landUse]}
        </div>
      ))}
    </div>
  );
}
