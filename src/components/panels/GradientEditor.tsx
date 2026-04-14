import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useSimulation } from '@/hooks/useSimulation';
import {
  MIN_STOPS,
  MAX_STOPS,
  generateStopId,
  type GradientStop,
} from '@/config/gradientPresets';
import { ColorPalette } from './ColorPalette';

/**
 * Gradient editor with draggable handles for customizing heatmap colors.
 */
export function GradientEditor() {
  const { heatmapGradient, setHeatmapGradient, resetGradientToDefault } = useSimulation();
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [draggingStopId, setDraggingStopId] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const sortedStops = [...heatmapGradient.stops].sort((a, b) => a.position - b.position);
  const selectedStop = selectedStopId
    ? heatmapGradient.stops.find(s => s.id === selectedStopId)
    : null;

  const gradientStyle = {
    background: `linear-gradient(to right, ${sortedStops.map(s => `${s.color} ${s.position * 100}%`).join(', ')})`,
  };

  const getPositionFromEvent = useCallback((clientX: number): number => {
    if (!barRef.current) return 0;
    const rect = barRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    return Math.max(0, Math.min(1, x / rect.width));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, stopId: string) => {
    e.preventDefault();
    setDraggingStopId(stopId);
    setSelectedStopId(stopId);
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent, stopId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (heatmapGradient.stops.length <= MIN_STOPS) return;

    const newStops = heatmapGradient.stops.filter(s => s.id !== stopId);
    setHeatmapGradient({ stops: newStops });

    if (selectedStopId === stopId) {
      setSelectedStopId(null);
    }
  }, [heatmapGradient.stops, selectedStopId, setHeatmapGradient]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingStopId) return;

    const newPosition = getPositionFromEvent(e.clientX);
    const newStops = heatmapGradient.stops.map(stop =>
      stop.id === draggingStopId ? { ...stop, position: newPosition } : stop
    );
    setHeatmapGradient({ stops: newStops });
  }, [draggingStopId, getPositionFromEvent, heatmapGradient.stops, setHeatmapGradient]);

  const handleMouseUp = useCallback(() => {
    setDraggingStopId(null);
  }, []);

  const handleBarClick = useCallback((e: React.MouseEvent) => {
    // Only add if clicking on the bar itself, not a handle
    if ((e.target as HTMLElement).dataset.handle) return;
    if (heatmapGradient.stops.length >= MAX_STOPS) return;

    const position = getPositionFromEvent(e.clientX);

    // Find the nearest stop to use its color
    const sorted = [...heatmapGradient.stops].sort((a, b) => a.position - b.position);
    let nearestStop = sorted[0];
    let minDistance = Math.abs(sorted[0].position - position);

    for (const stop of sorted) {
      const distance = Math.abs(stop.position - position);
      if (distance < minDistance) {
        minDistance = distance;
        nearestStop = stop;
      }
    }

    const newStop: GradientStop = {
      id: generateStopId(),
      position,
      color: nearestStop.color,
    };

    setHeatmapGradient({ stops: [...heatmapGradient.stops, newStop] });
    setSelectedStopId(newStop.id);
  }, [getPositionFromEvent, heatmapGradient.stops, setHeatmapGradient]);

  const handleColorChange = useCallback((color: string) => {
    if (!selectedStopId) return;

    const newStops = heatmapGradient.stops.map(stop =>
      stop.id === selectedStopId ? { ...stop, color } : stop
    );
    setHeatmapGradient({ stops: newStops });
  }, [selectedStopId, heatmapGradient.stops, setHeatmapGradient]);

  const handleReset = useCallback(() => {
    resetGradientToDefault();
    setSelectedStopId(null);
  }, [resetGradientToDefault]);

  return (
    <div className="space-y-2 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Gradient</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
        >
          Reset
        </Button>
      </div>

      {/* Gradient bar with handles */}
      <div
        ref={barRef}
        className="relative h-6 rounded-full cursor-crosshair select-none"
        style={gradientStyle}
        onClick={handleBarClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {heatmapGradient.stops.map(stop => (
          <div
            key={stop.id}
            data-handle="true"
            className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 cursor-grab active:cursor-grabbing transition-shadow ${
              selectedStopId === stop.id
                ? 'border-foreground shadow-lg ring-2 ring-foreground/20'
                : 'border-white shadow-md hover:border-foreground/50'
            }`}
            style={{
              left: `calc(${stop.position * 100}% - 8px)`,
              backgroundColor: stop.color,
            }}
            onMouseDown={(e) => handleMouseDown(e, stop.id)}
            onDoubleClick={(e) => handleDoubleClick(e, stop.id)}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedStopId(stop.id);
            }}
          />
        ))}
      </div>

      {/* Help text */}
      <p className="text-[10px] text-muted-foreground">
        Click to add. Drag to move. Double-click to remove.
      </p>

      {/* Selected stop editor */}
      {selectedStop && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded border border-border"
              style={{ backgroundColor: selectedStop.color }}
            />
            <span className="text-xs text-muted-foreground">
              {Math.round(selectedStop.position * 100)}%
            </span>
          </div>

          {/* Color palette */}
          <ColorPalette
            color={selectedStop.color}
            onChange={handleColorChange}
          />
        </div>
      )}
    </div>
  );
}
