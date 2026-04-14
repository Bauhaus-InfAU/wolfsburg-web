import { useEffect, useState } from 'react';
import { useDrawing, type DrawingTool } from '@/context/DrawingContext';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export function DrawingToolbox() {
  const {
    activeTool, setActiveTool, cancelDrawing,
    drawingPoints, isPolygonComplete,
  } = useDrawing();

  const [shiftHeld, setShiftHeld] = useState(false);
  const isDrawing = activeTool !== 'none';

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Shift') setShiftHeld(true); };
    const up   = (e: KeyboardEvent) => { if (e.key === 'Shift') setShiftHeld(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const canShift = (activeTool === 'line' || activeTool === 'rectangle') &&
    !isPolygonComplete && drawingPoints.length > 0;

  const statusHint = (() => {
    if (isPolygonComplete) return null;
    switch (activeTool) {
      case 'line':
      case 'curve':
        if (drawingPoints.length === 0) return 'Click to place points';
        if (drawingPoints.length < 3)   return `${drawingPoints.length} pt${drawingPoints.length > 1 ? 's' : ''} — need ≥ 3`;
        return 'Double-click to close';
      case 'rectangle':
        return drawingPoints.length === 0 ? 'Click first corner' : 'Click opposite corner';
      case 'circle':
        return drawingPoints.length === 0 ? 'Click center' : 'Click to set radius';
      default: return null;
    }
  })();

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-0.5 bg-card border border-border rounded-xl shadow-lg px-2 py-1.5 select-none">
      <span className="text-[10px] font-semibold text-muted-foreground px-1.5 uppercase tracking-wider whitespace-nowrap">
        Draw
      </span>

      <div className="w-px h-5 bg-border mx-1" />

      <ToolBtn tool="line"      label="Line"      active={activeTool} disabled={isPolygonComplete} setActive={setActiveTool}>
        <LineIcon />
      </ToolBtn>
      <ToolBtn tool="curve"     label="Curve"     active={activeTool} disabled={isPolygonComplete} setActive={setActiveTool}>
        <CurveIcon />
      </ToolBtn>
      <ToolBtn tool="rectangle" label="Rect"      active={activeTool} disabled={isPolygonComplete} setActive={setActiveTool}>
        <RectIcon />
      </ToolBtn>
      <ToolBtn tool="circle"    label="Circle"    active={activeTool} disabled={isPolygonComplete} setActive={setActiveTool}>
        <CircleIcon />
      </ToolBtn>

      {/* Shift snapping indicator */}
      {canShift && (
        <>
          <div className="w-px h-5 bg-border mx-1" />
          <div className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono transition-colors',
            shiftHeld ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
          )}>
            <ShiftIcon active={shiftHeld} />
            <span>{shiftHeld ? '45° snap ON' : 'Hold Shift to snap'}</span>
          </div>
        </>
      )}

      {/* Status hint */}
      {statusHint && !isPolygonComplete && (
        <>
          <div className="w-px h-5 bg-border mx-1" />
          <span className="text-[10px] text-muted-foreground whitespace-nowrap px-1">
            {statusHint}
          </span>
        </>
      )}

      {/* Cancel */}
      {isDrawing && (
        <>
          <div className="w-px h-5 bg-border mx-1" />
          <button
            onClick={cancelDrawing}
            title="Cancel drawing (Esc)"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

// ─── Tool button ──────────────────────────────────────────────────────────────

function ToolBtn({
  tool, label, active, disabled, setActive, children,
}: {
  tool: DrawingTool;
  label: string;
  active: DrawingTool;
  disabled?: boolean;
  setActive: (t: DrawingTool) => void;
  children: React.ReactNode;
}) {
  const isActive = active === tool;
  return (
    <button
      onClick={() => setActive(isActive ? 'none' : tool)}
      disabled={disabled}
      title={label}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-foreground hover:bg-accent',
        disabled && 'opacity-40 pointer-events-none',
      )}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

// ─── SVG icons ────────────────────────────────────────────────────────────────

function LineIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <circle cx="1.5" cy="11.5" r="1.5" fill="currentColor" />
      <circle cx="11.5" cy="1.5"  r="1.5" fill="currentColor" />
      <line x1="2.5" y1="10.5" x2="10.5" y2="2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CurveIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M1.5 11.5 C 3 3, 10 3, 11.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <circle cx="1.5"  cy="11.5" r="1.5" fill="currentColor" />
      <circle cx="11.5" cy="11.5" r="1.5" fill="currentColor" />
    </svg>
  );
}

function RectIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="1.5" y="2.5" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="1.5"  cy="2.5"  r="1" fill="currentColor" />
      <circle cx="11.5" cy="10.5" r="1" fill="currentColor" />
    </svg>
  );
}

function CircleIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="6.5" cy="1.5" r="1" fill="currentColor" />
    </svg>
  );
}

function ShiftIcon({ active }: { active: boolean }) {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
      <path d="M5.5 1 L10 6 H7 V10 H4 V6 H1 Z"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor" strokeWidth="1" strokeLinejoin="round"
      />
    </svg>
  );
}
