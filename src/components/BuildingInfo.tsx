import { useEffect, useState } from 'react';
import { X, ScanLine } from 'lucide-react';
import { useSimulation } from '@/hooks/useSimulation';
import { LAND_USE_COLORS, LAND_USE_DISPLAY_NAMES } from '@/config/constants';
import { findNearestLandmark } from '@/config/landmarks';
import type { LandUse } from '@/config/types';
import { BlueprintSlider } from './BlueprintSlider';

/** Returns a deterministic, consistent real-photo URL for any building ID via picsum.photos */
function getBuildingPhotoUrl(buildingId: string): string {
  const seed = encodeURIComponent(buildingId || 'building');
  return `https://picsum.photos/seed/${seed}/800/500`;
}

export function BuildingInfo() {
  const { selectedBuildingStats, clearSelectedBuilding, getMapView } = useSimulation();
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [landmarkImgError, setLandmarkImgError] = useState(false);
  const [buildingImgError, setBuildingImgError] = useState(false);
  const [showBlueprint, setShowBlueprint] = useState(false);

  // Reset image error / blueprint state when a new building is selected
  useEffect(() => {
    setLandmarkImgError(false);
    setBuildingImgError(false);
    setShowBlueprint(false);
  }, [selectedBuildingStats?.building.id]);

  // Track map position so the popup follows pan/zoom
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
    return () => { map.off('move', updatePosition); };
  }, [selectedBuildingStats, getMapView]);

  if (!selectedBuildingStats || !position) return null;

  const { building, tripsGenerated, tripsAttracted } = selectedBuildingStats;
  const isResidential = building.residentialArea > 0;
  const landmark = findNearestLandmark(building.centroid);

  const sortedLandUses = Array.from(building.landUseAreas.entries())
    .filter(([, area]) => area > 0)
    .sort((a, b) => b[1] - a[1]);

  const primaryColor = sortedLandUses.length > 0
    ? LAND_USE_COLORS[sortedLandUses[0][0] as LandUse]
    : '#888';

  return (
    <>
      {/* ── Floating popup ─────────────────────────────────────────── */}
      <div
        key={building.id}
        className="absolute z-20 building-popup-enter"
        style={{
          left: position.x,
          top: position.y,
          transform: 'translate(-50%, -100%) translateY(-14px)',
        }}
      >
        <div className="bg-card border border-border rounded-xl shadow-xl overflow-hidden"
             style={{ width: 272 }}>

          {/* ── Accent top stripe ───────────────────────────────── */}
          <div style={{ height: 3, background: primaryColor, opacity: 0.85 }} />

          {/* ── Photo header ────────────────────────────────────── */}
          <div className="relative overflow-hidden" style={{ height: 160 }}>
            {/* Landmark photo (local file) takes priority if it loads */}
            {landmark && !landmarkImgError ? (
              <img
                src={landmark.photoUrl}
                alt={landmark.name}
                onError={() => setLandmarkImgError(true)}
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : !buildingImgError ? (
              /* Real per-building photo via picsum (deterministic seed = building ID) */
              <img
                src={getBuildingPhotoUrl(building.id)}
                alt={building.id}
                onError={() => setBuildingImgError(true)}
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              /* Last-resort solid color if both photos fail */
              <div
                className="w-full h-full"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}25 0%, ${primaryColor}50 100%)`,
                }}
              />
            )}

            {/* Gradient overlay for text legibility */}
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 55%)' }}
            />

            {/* Close button */}
            <button
              onClick={clearSelectedBuilding}
              className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Name / landmark label at bottom of photo */}
            <div className="absolute bottom-0 left-0 right-0 px-3 pb-2">
              {landmark ? (
                <>
                  <p className="text-[10px] font-mono tracking-widest uppercase text-white/60 leading-none mb-0.5">
                    {landmark.architect}, {landmark.year}
                  </p>
                  <p className="text-sm font-semibold text-white leading-tight">{landmark.name}</p>
                </>
              ) : (
                <p className="text-xs font-mono text-white/70 truncate">
                  {building.id}
                </p>
              )}
            </div>
          </div>

          {/* ── Description row (landmark only) ────────────────── */}
          {landmark && (
            <div className="px-3 pt-2 pb-1">
              <p className="text-[11px] text-muted-foreground leading-snug">
                {landmark.description}
              </p>
            </div>
          )}

          {/* ── Land Uses ──────────────────────────────────────── */}
          <div className="px-3 pt-2 pb-1">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1.5">
              Land Uses
            </p>
            <div className="space-y-1">
              {sortedLandUses.map(([landUse, area]) => (
                <div key={landUse} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: LAND_USE_COLORS[landUse as LandUse] }}
                  />
                  <span className="text-foreground truncate">
                    {LAND_USE_DISPLAY_NAMES[landUse as LandUse]}
                  </span>
                  <span className="text-muted-foreground ml-auto tabular-nums flex-shrink-0">
                    {Math.round(area).toLocaleString()} m²
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Trip Stats ─────────────────────────────────────── */}
          <div className="px-3 pt-1 pb-2">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1.5">
              Trips
            </p>
            <div className="space-y-0.5 text-xs">
              {isResidential && (
                <div className="flex justify-between">
                  <span className="text-foreground">Generated</span>
                  <span className="text-muted-foreground tabular-nums">{tripsGenerated.toLocaleString()}</span>
                </div>
              )}
              {(!isResidential || tripsAttracted > 0) && (
                <div className="flex justify-between">
                  <span className="text-foreground">Attracted</span>
                  <span className="text-muted-foreground tabular-nums">{tripsAttracted.toLocaleString()}</span>
                </div>
              )}
              {isResidential && (
                <div className="flex justify-between">
                  <span className="text-foreground">Est. Residents</span>
                  <span className="text-muted-foreground tabular-nums">{Math.round(building.estimatedResidents)}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── View Blueprint button ───────────────────────────── */}
          <div className="px-3 pb-3">
            <button
              onClick={() => setShowBlueprint(v => !v)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-mono font-medium tracking-wide transition-colors"
              style={{
                background: showBlueprint ? 'rgba(0,200,255,0.12)' : 'rgba(0,200,255,0.06)',
                border: '1px solid rgba(0,200,255,0.25)',
                color: '#00c8ff',
              }}
            >
              <ScanLine className="w-3.5 h-3.5" />
              {showBlueprint ? 'Close Blueprint' : 'View Blueprint'}
            </button>
          </div>

        </div>

        {/* ── Pin pointer triangle ─────────────────────────────── */}
        <div className="flex justify-center">
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: `8px solid ${primaryColor}`,
              opacity: 0.85,
            }}
          />
        </div>
      </div>

      {/* ── Blueprint slider (anchored to bottom of map container) ── */}
      <BlueprintSlider
        building={building}
        isOpen={showBlueprint}
        onClose={() => setShowBlueprint(false)}
      />
    </>
  );
}

