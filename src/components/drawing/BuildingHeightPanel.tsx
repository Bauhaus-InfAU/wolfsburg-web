import { useState } from 'react';
import { useDrawing } from '@/context/DrawingContext';
import { Check, X, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';
import { LAND_USE_COLORS, LAND_USE_DISPLAY_NAMES } from '@/config/constants';
import type { LandUse } from '@/config/types';

const LAND_USES = Object.keys(LAND_USE_COLORS) as LandUse[];

// ─── New-building panel (shown when isPolygonComplete) ────────────────────────

export function BuildingHeightPanel() {
  const {
    isPolygonComplete,
    pendingFloors, pendingFloorHeight, pendingHeight,
    pendingLandUse,
    setPendingFloors, setPendingFloorHeight, setPendingHeight,
    setPendingLandUse,
    confirmBuilding, cancelDrawing,
    selectedBuildingId,
  } = useDrawing();

  const showNewPanel = isPolygonComplete;
  const showEditPanel = !isPolygonComplete && selectedBuildingId !== null;

  if (!showNewPanel && !showEditPanel) return null;

  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-60 bg-card border border-border rounded-xl shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
      {showNewPanel && (
        <NewBuildingPanel
          floors={pendingFloors}
          floorHeight={pendingFloorHeight}
          totalHeight={pendingHeight}
          landUse={pendingLandUse}
          setFloors={setPendingFloors}
          setFloorHeight={setPendingFloorHeight}
          setTotalHeight={setPendingHeight}
          setLandUse={setPendingLandUse}
          onConfirm={confirmBuilding}
          onCancel={cancelDrawing}
        />
      )}
      {showEditPanel && <EditBuildingPanel />}
    </div>
  );
}

// ─── New building ─────────────────────────────────────────────────────────────

function NewBuildingPanel({
  floors, floorHeight, totalHeight, landUse,
  setFloors, setFloorHeight, setTotalHeight, setLandUse,
  onConfirm, onCancel,
}: {
  floors: number;
  floorHeight: number;
  totalHeight: number;
  landUse: LandUse;
  setFloors: (n: number) => void;
  setFloorHeight: (h: number) => void;
  setTotalHeight: (h: number) => void;
  setLandUse: (lu: LandUse) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [exactEnabled, setExactEnabled] = useState(false);
  const [exactVal, setExactVal] = useState('');

  const handleExactToggle = (on: boolean) => {
    setExactEnabled(on);
    if (on) setExactVal(String(totalHeight));
  };

  const handleExactChange = (v: string) => {
    setExactVal(v);
    const n = parseInt(v, 10);
    if (!isNaN(n) && n >= 1) setTotalHeight(n);
  };

  return (
    <>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <h3 className="text-xs font-semibold text-foreground">New Building</h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">Set properties then confirm</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Height breakdown */}
        <HeightControls
          floors={floors}
          floorHeight={floorHeight}
          totalHeight={totalHeight}
          setFloors={setFloors}
          setFloorHeight={setFloorHeight}
        />

        {/* Exact height override */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={exactEnabled} onChange={handleExactToggle} />
            <span className="text-[11px] text-foreground select-none">
              Enter exact total height
            </span>
          </label>
          {exactEnabled && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number" min={1} max={999}
                value={exactVal}
                onChange={e => handleExactChange(e.target.value)}
                className="flex-1 text-sm bg-accent/40 border border-border rounded-lg px-3 py-1.5 text-foreground outline-none focus:border-primary transition-colors"
                placeholder="Height (m)"
                autoFocus
              />
              <span className="text-xs text-muted-foreground">m</span>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Hold <Kbd>Ctrl</Kbd> + drag ↕ on map to set height
          </p>
        </div>

        {/* Land use */}
        <LandUsePicker selected={landUse} onChange={setLandUse} />
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 pt-2 flex gap-2 shrink-0 border-t border-border">
        <button onClick={onCancel}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-accent transition-colors">
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
        <button onClick={onConfirm}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
          <Check className="w-3.5 h-3.5" /> Add Building
        </button>
      </div>
    </>
  );
}

// ─── Edit existing building ───────────────────────────────────────────────────

function EditBuildingPanel() {
  const {
    selectedBuildingId, customBuildings,
    updateCustomBuilding, deleteCustomBuilding, selectBuilding,
  } = useDrawing();

  const building = customBuildings.find(b => b.id === selectedBuildingId);
  if (!building) return null;

  const totalHeight = building.floors * building.floorHeight;

  return (
    <>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border shrink-0 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Pencil className="w-3 h-3" /> Edit Building
          </h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">Drag vertices on map to reshape</p>
        </div>
        <button onClick={() => selectBuilding(null)}
          className="p-1 rounded-lg text-muted-foreground hover:bg-accent transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <HeightControls
          floors={building.floors}
          floorHeight={building.floorHeight}
          totalHeight={totalHeight}
          setFloors={n => updateCustomBuilding(building.id, { floors: n, height: n * building.floorHeight })}
          setFloorHeight={h => updateCustomBuilding(building.id, { floorHeight: h, height: building.floors * h })}
        />

        <LandUsePicker
          selected={building.landUse}
          onChange={lu => updateCustomBuilding(building.id, { landUse: lu })}
        />
      </div>

      {/* Delete */}
      <div className="px-4 pb-4 pt-2 shrink-0 border-t border-border">
        <button
          onClick={() => deleteCustomBuilding(building.id)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-red-200 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete Building
        </button>
      </div>
    </>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function HeightControls({
  floors, floorHeight, totalHeight,
  setFloors, setFloorHeight,
}: {
  floors: number;
  floorHeight: number;
  totalHeight: number;
  setFloors: (n: number) => void;
  setFloorHeight: (h: number) => void;
}) {
  return (
    <div className="space-y-3">
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
        Height
      </span>

      {/* Total height badge */}
      <div className="bg-accent/40 rounded-lg px-3 py-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Total</span>
        <span className="text-sm font-bold text-foreground tabular-nums">{totalHeight} m</span>
      </div>

      {/* Floor height input */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground w-24 shrink-0">Floor height</span>
        <div className="flex-1 flex items-center gap-1 bg-accent/30 border border-border rounded-lg px-2 py-1.5">
          <input
            type="number" min={1} max={20} step={0.5}
            value={floorHeight}
            onChange={e => {
              const n = parseFloat(e.target.value);
              if (!isNaN(n) && n >= 0.5) setFloorHeight(n);
            }}
            className="flex-1 bg-transparent text-xs font-medium text-foreground outline-none w-10 tabular-nums"
          />
          <span className="text-[10px] text-muted-foreground">m</span>
        </div>
      </div>

      {/* Number of floors with stepper */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground w-24 shrink-0">Floors</span>
        <div className="flex-1 flex items-center justify-between bg-accent/30 border border-border rounded-lg px-2 py-1">
          <button onClick={() => setFloors(Math.max(1, floors - 1))}
            className="text-muted-foreground hover:text-foreground transition-colors p-0.5">
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-semibold text-foreground tabular-nums">{floors}</span>
          <button onClick={() => setFloors(floors + 1)}
            className="text-muted-foreground hover:text-foreground transition-colors p-0.5">
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function LandUsePicker({
  selected, onChange,
}: {
  selected: LandUse;
  onChange: (lu: LandUse) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button
        className="flex items-center justify-between w-full text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2"
        onClick={() => setOpen(o => !o)}
      >
        <span>Land Use / Color</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Current swatch */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-5 h-5 rounded"
          style={{ background: LAND_USE_COLORS[selected] }}
        />
        <span className="text-[11px] text-foreground font-medium">
          {LAND_USE_DISPLAY_NAMES[selected]}
        </span>
      </div>

      {open && (
        <div className="grid grid-cols-4 gap-1">
          {LAND_USES.map(lu => (
            <button
              key={lu}
              onClick={() => onChange(lu)}
              title={LAND_USE_DISPLAY_NAMES[lu]}
              className={`relative w-full aspect-square rounded-md transition-all ${
                lu === selected
                  ? 'ring-2 ring-primary ring-offset-1 scale-110'
                  : 'hover:scale-105 opacity-80 hover:opacity-100'
              }`}
              style={{ background: LAND_USE_COLORS[lu] }}
            >
              {lu === selected && (
                <Check className="w-2.5 h-2.5 text-white absolute inset-0 m-auto drop-shadow" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
        checked ? 'bg-primary border-primary' : 'border-border bg-background'
      }`}
    >
      {checked && <Check className="w-2.5 h-2.5 text-primary-foreground" strokeWidth={3} />}
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-block bg-accent border border-border rounded px-1 py-0 text-[9px] font-mono">
      {children}
    </kbd>
  );
}
