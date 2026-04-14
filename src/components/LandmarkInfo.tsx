import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useSimulation } from '@/hooks/useSimulation';
import { LANDMARK_CATEGORY_COLORS } from '@/config/landmarks';

export function LandmarkInfo() {
  const { selectedLandmark, clearSelectedLandmark, getMapView } = useSimulation();
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const mapView = getMapView();
    if (!mapView?.map || !selectedLandmark) {
      setPosition(null);
      return;
    }

    const map = mapView.map;
    const updatePosition = () => {
      const projected = map.project(selectedLandmark.coordinates);
      setPosition({ x: projected.x, y: projected.y });
    };

    updatePosition();
    map.on('move', updatePosition);
    return () => { map.off('move', updatePosition); };
  }, [selectedLandmark, getMapView]);

  if (!selectedLandmark || !position) return null;

  const color = LANDMARK_CATEGORY_COLORS[selectedLandmark.category] ?? '#f57f5b';

  return (
    <div
      className="absolute z-20"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -100%) translateY(-20px)',
      }}
    >
      <div className="bg-card border border-border rounded-lg shadow-lg min-w-[220px] max-w-[300px]">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs font-medium text-foreground leading-tight">
              {selectedLandmark.name}
            </span>
          </div>
          <button
            onClick={clearSelectedLandmark}
            className="text-muted-foreground hover:text-foreground transition-colors ml-2 flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-3 py-2 space-y-2.5">
          {/* Category */}
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {selectedLandmark.category}
          </div>

          {/* Description */}
          <p className="text-[11px] text-foreground leading-relaxed">
            {selectedLandmark.description}
          </p>

          {/* Details */}
          {selectedLandmark.details.length > 0 && (
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                Facts
              </div>
              <div className="space-y-0.5">
                {selectedLandmark.details.map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-xs gap-3">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-foreground tabular-nums text-right">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
