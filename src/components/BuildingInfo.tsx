import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useSimulation } from '@/hooks/useSimulation';
import { LAND_USE_COLORS, LAND_USE_DISPLAY_NAMES } from '@/config/constants';
import type { LandUse } from '@/config/types';

export function BuildingInfo() {
  const { selectedBuildingStats, clearSelectedBuilding, getMapView } = useSimulation();
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  // Update position when map moves (like PathPreview pattern)
  useEffect(() => {
    const mapView = getMapView();
    if (!mapView?.map || !selectedBuildingStats) {
      setPosition(null);
      return;
    }

    const map = mapView.map;
    const updatePosition = () => {
      const projected = map.project(selectedBuildingStats.clickPosition);
      setPosition({ x: projected.x, y: projected.y });
    };

    updatePosition();
    map.on('move', updatePosition);

    return () => {
      map.off('move', updatePosition);
    };
  }, [selectedBuildingStats, getMapView]);

  if (!selectedBuildingStats || !position) return null;

  const { building, tripsGenerated, tripsAttracted } = selectedBuildingStats;
  const isResidential = building.residentialArea > 0;

  // Sort land uses by area (descending)
  const sortedLandUses = Array.from(building.landUseAreas.entries())
    .filter(([, area]) => area > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div
      className="absolute z-20"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -100%) translateY(-12px)',
      }}
    >
      <div className="bg-card border border-border rounded-lg shadow-lg min-w-[200px] max-w-[280px]">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-xs font-medium text-foreground">Building Info</span>
          <button
            onClick={clearSelectedBuilding}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-3 py-2 space-y-3">
          {/* Land Uses */}
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
              Land Uses
            </div>
            <div className="space-y-1">
              {sortedLandUses.map(([landUse, area]) => (
                <div key={landUse} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: LAND_USE_COLORS[landUse as LandUse] }}
                  />
                  <span className="text-foreground">
                    {LAND_USE_DISPLAY_NAMES[landUse as LandUse]}
                  </span>
                  <span className="text-muted-foreground ml-auto tabular-nums">
                    {Math.round(area)} sqm
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Trip Stats */}
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
              Trips
            </div>
            <div className="space-y-0.5 text-xs">
              {isResidential && (
                <div className="flex justify-between">
                  <span className="text-foreground">Generated</span>
                  <span className="text-muted-foreground tabular-nums">
                    {tripsGenerated.toLocaleString()}
                  </span>
                </div>
              )}
              {!isResidential && (
                <div className="flex justify-between">
                  <span className="text-foreground">Attracted</span>
                  <span className="text-muted-foreground tabular-nums">
                    {tripsAttracted.toLocaleString()}
                  </span>
                </div>
              )}
              {isResidential && tripsAttracted > 0 && (
                <div className="flex justify-between">
                  <span className="text-foreground">Attracted</span>
                  <span className="text-muted-foreground tabular-nums">
                    {tripsAttracted.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Residential Info */}
          {isResidential && (
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                Residents
              </div>
              <div className="text-xs">
                <div className="flex justify-between">
                  <span className="text-foreground">Estimated</span>
                  <span className="text-muted-foreground tabular-nums">
                    {Math.round(building.estimatedResidents)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground">Floors</span>
                  <span className="text-muted-foreground tabular-nums">
                    {building.floors}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
