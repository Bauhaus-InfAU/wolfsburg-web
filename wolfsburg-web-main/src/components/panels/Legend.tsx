import { DESTINATION_LAND_USES, LAND_USE_COLORS, LAND_USE_DISPLAY_NAMES } from '@/config/constants';

export function Legend() {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
      {DESTINATION_LAND_USES.map((landUse) => (
        <div key={landUse} className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span
            className="w-2 h-2 rounded-sm shrink-0"
            style={{ backgroundColor: LAND_USE_COLORS[landUse] }}
          />
          <span className="truncate">{LAND_USE_DISPLAY_NAMES[landUse]}</span>
        </div>
      ))}
    </div>
  );
}
