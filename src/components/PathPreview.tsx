import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { useSimulation } from '@/hooks/useSimulation';
import { SIMULATION_DEFAULTS } from '@/config/constants';

function formatDistance(meters: number | undefined): string {
  if (meters === undefined || meters === null) return '-- m';
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
}

function formatWalkingTime(meters: number | undefined): string {
  if (meters === undefined || meters === null) return '-- min';
  const seconds = meters / SIMULATION_DEFAULTS.WALKING_SPEED;
  const minutes = Math.ceil(seconds / 60);
  return `~${minutes} min`;
}

function createMarkerElement(label: string, color: string): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = `
    width: 28px;
    height: 28px;
    background: ${color};
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Roboto Mono', ui-monospace, monospace;
    font-size: 12px;
    font-weight: 600;
    color: white;
    cursor: grab;
  `;
  el.textContent = label;
  el.addEventListener('mousedown', () => {
    el.style.cursor = 'grabbing';
  });
  el.addEventListener('mouseup', () => {
    el.style.cursor = 'grab';
  });
  return el;
}

export function PathPreview() {
  const {
    showPathPreview,
    pathPreviewStart,
    pathPreviewEnd,
    pathPreviewPath,
    setPathPreviewStart,
    setPathPreviewEnd,
    getMapView,
  } = useSimulation();

  const startMarkerRef = useRef<maplibregl.Marker | null>(null);
  const endMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  // Initialize/cleanup markers when preview mode changes
  useEffect(() => {
    const mapView = getMapView();
    if (!mapView?.map) return;
    const map = mapView.map;

    if (!showPathPreview) {
      // Cleanup markers
      startMarkerRef.current?.remove();
      endMarkerRef.current?.remove();
      startMarkerRef.current = null;
      endMarkerRef.current = null;
      setTooltipPosition(null);
      return;
    }

    // Get default positions near map center
    const center = map.getCenter();
    const defaultStart: [number, number] = pathPreviewStart || [center.lng - 0.003, center.lat];
    const defaultEnd: [number, number] = pathPreviewEnd || [center.lng + 0.003, center.lat];

    // Create start marker (A)
    const startEl = createMarkerElement('A', '#f57f5b');
    const startMarker = new maplibregl.Marker({
      element: startEl,
      draggable: true,
    })
      .setLngLat(defaultStart)
      .addTo(map);

    startMarker.on('dragend', () => {
      const lngLat = startMarker.getLngLat();
      setPathPreviewStart([lngLat.lng, lngLat.lat]);
    });

    // Create end marker (B)
    const endEl = createMarkerElement('B', '#3288bd');
    const endMarker = new maplibregl.Marker({
      element: endEl,
      draggable: true,
    })
      .setLngLat(defaultEnd)
      .addTo(map);

    endMarker.on('dragend', () => {
      const lngLat = endMarker.getLngLat();
      setPathPreviewEnd([lngLat.lng, lngLat.lat]);
    });

    startMarkerRef.current = startMarker;
    endMarkerRef.current = endMarker;

    // Set initial positions in context if not set
    if (!pathPreviewStart) {
      setPathPreviewStart(defaultStart);
    }
    if (!pathPreviewEnd) {
      setPathPreviewEnd(defaultEnd);
    }

    return () => {
      startMarker.remove();
      endMarker.remove();
    };
  }, [showPathPreview, getMapView]);

  // Update tooltip position when path changes or map moves
  useEffect(() => {
    const mapView = getMapView();
    if (!mapView?.map || !showPathPreview || !pathPreviewPath?.points?.length) {
      setTooltipPosition(null);
      return;
    }

    const map = mapView.map;
    const points = pathPreviewPath.points;

    const updateTooltip = () => {
      // Position tooltip at path midpoint
      const midIndex = Math.floor(points.length / 2);
      const midPoint = points[midIndex];
      const projected = map.project(midPoint as maplibregl.LngLatLike);
      setTooltipPosition({ x: projected.x, y: projected.y });
    };

    updateTooltip();

    // Update on map move
    map.on('move', updateTooltip);

    return () => {
      map.off('move', updateTooltip);
    };
  }, [showPathPreview, pathPreviewPath, getMapView]);

  if (!showPathPreview || !tooltipPosition) return null;

  return (
    <div
      className="absolute z-20 pointer-events-none"
      style={{
        left: tooltipPosition.x,
        top: tooltipPosition.y,
        transform: 'translate(-50%, -100%) translateY(-8px)',
      }}
    >
      <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
        <div className="text-xs font-medium text-foreground">
          {formatDistance(pathPreviewPath?.totalDistance)}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {formatWalkingTime(pathPreviewPath?.totalDistance)}
        </div>
      </div>
    </div>
  );
}
