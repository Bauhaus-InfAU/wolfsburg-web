import { useState, useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { cn } from '@/lib/utils';
import { useFlow } from '@/context/FlowContext';
import { geocodeAddress, getNearbyStops } from '@/services/transitService';
import type { TransitStop } from '@/config/types';

const CIRCLE_SOURCE = 'transit-radius-circle';
const CIRCLE_FILL = 'transit-radius-fill';
const CIRCLE_OUTLINE = 'transit-radius-outline';

function makeCircle(center: [number, number], radiusMeters: number): GeoJSON.FeatureCollection {
  const [lng, lat] = center;
  const coords: [number, number][] = [];
  for (let i = 0; i < 64; i++) {
    const angle = (i / 64) * 2 * Math.PI;
    const dx = radiusMeters * Math.cos(angle);
    const dy = radiusMeters * Math.sin(angle);
    const dLat = dy / 111320;
    const dLng = dx / (111320 * Math.cos((lat * Math.PI) / 180));
    coords.push([lng + dLng, lat + dLat]);
  }
  coords.push(coords[0]);
  return {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} }],
  };
}

export function PublicTransportPanel() {
  const { getMapView } = useFlow();

  const [addressInput, setAddressInput] = useState('');
  const [radius, setRadius] = useState(500);
  const [isPickMode, setIsPickMode] = useState(false);
  const [searchLocation, setSearchLocation] = useState<[number, number] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stops, setStops] = useState<TransitStop[]>([]);

  const stopMarkersRef = useRef<maplibregl.Marker[]>([]);
  const centerMarkerRef = useRef<maplibregl.Marker | null>(null);
  const clickHandlerRef = useRef<((e: maplibregl.MapMouseEvent) => void) | null>(null);

  const drawCircle = useCallback((center: [number, number], r: number) => {
    const mapView = getMapView();
    if (!mapView) return;
    const { map } = mapView;
    const data = makeCircle(center, r);
    if (map.getSource(CIRCLE_SOURCE)) {
      (map.getSource(CIRCLE_SOURCE) as maplibregl.GeoJSONSource).setData(data);
    } else {
      map.addSource(CIRCLE_SOURCE, { type: 'geojson', data });
      map.addLayer({ id: CIRCLE_FILL, type: 'fill', source: CIRCLE_SOURCE, paint: { 'fill-color': '#f57f5b', 'fill-opacity': 0.08 } });
      map.addLayer({ id: CIRCLE_OUTLINE, type: 'line', source: CIRCLE_SOURCE, paint: { 'line-color': '#f57f5b', 'line-width': 2, 'line-opacity': 0.7, 'line-dasharray': [5, 3] } });
    }
  }, [getMapView]);

  const placeCenterMarker = useCallback((coords: [number, number]) => {
    const mapView = getMapView();
    if (!mapView) return;
    if (centerMarkerRef.current) {
      centerMarkerRef.current.setLngLat(coords);
    } else {
      centerMarkerRef.current = new maplibregl.Marker({ color: '#f57f5b' }).setLngLat(coords).addTo(mapView.map);
    }
  }, [getMapView]);

  const clearMap = useCallback(() => {
    const mapView = getMapView();
    stopMarkersRef.current.forEach((m: maplibregl.Marker) => m.remove());
    stopMarkersRef.current = [];
    centerMarkerRef.current?.remove();
    centerMarkerRef.current = null;
    if (mapView) {
      const { map } = mapView;
      if (map.getLayer(CIRCLE_FILL)) map.removeLayer(CIRCLE_FILL);
      if (map.getLayer(CIRCLE_OUTLINE)) map.removeLayer(CIRCLE_OUTLINE);
      if (map.getSource(CIRCLE_SOURCE)) map.removeSource(CIRCLE_SOURCE);
    }
  }, [getMapView]);

  const exitPickMode = useCallback(() => {
    const mapView = getMapView();
    if (mapView && clickHandlerRef.current) {
      mapView.map.off('click', clickHandlerRef.current);
      mapView.map.getCanvas().style.cursor = '';
      clickHandlerRef.current = null;
    }
    setIsPickMode(false);
  }, [getMapView]);

  useEffect(() => () => { clearMap(); exitPickMode(); }, [clearMap, exitPickMode]);

  const applyLocation = useCallback((coords: [number, number]) => {
    setSearchLocation(coords);
    placeCenterMarker(coords);
    drawCircle(coords, radius);
  }, [radius, placeCenterMarker, drawCircle]);

  const handleAddressLookup = async () => {
    if (!addressInput.trim()) return;
    setError(null);
    try {
      const coords = await geocodeAddress(addressInput);
      if (!coords) { setError('Address not found.'); return; }
      applyLocation(coords);
      const mapView = getMapView();
      mapView?.map.flyTo({ center: coords, zoom: Math.max(14, mapView.map.getZoom()) });
    } catch {
      setError('Geocoding failed. Check your connection.');
    }
  };

  const togglePickMode = () => {
    if (isPickMode) { exitPickMode(); return; }
    const mapView = getMapView();
    if (!mapView) return;
    setIsPickMode(true);
    mapView.map.getCanvas().style.cursor = 'crosshair';
    const handler = (e: maplibregl.MapMouseEvent) => {
      applyLocation([e.lngLat.lng, e.lngLat.lat]);
      exitPickMode();
    };
    clickHandlerRef.current = handler;
    mapView.map.once('click', handler);
  };

  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
    if (searchLocation) drawCircle(searchLocation, newRadius);
  };

  const handleSearch = async () => {
    if (!searchLocation) { setError('Set a location first.'); return; }
    setIsSearching(true);
    setError(null);
    setStops([]);
    stopMarkersRef.current.forEach((m: maplibregl.Marker) => m.remove());
    stopMarkersRef.current = [];

    try {
      const [lng, lat] = searchLocation;
      const found = await getNearbyStops(lat, lng, radius);

      if (found.length === 0) {
        setError('No stops found in this area.');
        setIsSearching(false);
        return;
      }

      setStops(found);

      const mapView = getMapView();
      if (mapView) {
        found.forEach((stop) => {
          const el = document.createElement('div');
          el.style.cssText = [
            'width:18px', 'height:18px', 'border-radius:50%',
            'background:#3b82f6', 'border:2px solid white',
            'box-shadow:0 2px 5px rgba(0,0,0,0.4)', 'cursor:pointer',
          ].join(';');

          const linesText = stop.lines && stop.lines.length > 0
            ? `<div style="margin-top:4px;color:#93c5fd;font-size:10px">Lines: ${stop.lines.join(', ')}</div>`
            : '';

          const popup = new maplibregl.Popup({ offset: 12, maxWidth: '220px' }).setHTML(`
            <div style="font-family:'Roboto Mono',monospace;padding:2px">
              <div style="font-weight:700;font-size:12px;color:#f9fafb">${stop.name}</div>
              ${stop.distance != null ? `<div style="color:#9ca3af;font-size:10px;margin-top:2px">${stop.distance} m</div>` : ''}
              ${linesText}
            </div>`);

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([stop.lng, stop.lat])
            .setPopup(popup)
            .addTo(mapView.map);
          stopMarkersRef.current.push(marker);
        });
      }
    } catch {
      setError('Failed to load stops. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleReset = () => {
    clearMap(); exitPickMode();
    setSearchLocation(null); setAddressInput(''); setStops([]); setError(null);
  };

  return (
    <div className="space-y-3">
      {/* Location */}
      <div className="space-y-2">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Location</span>
        <div className="flex gap-1">
          <input
            type="text"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddressLookup()}
            placeholder="Enter address…"
            className="flex-1 text-xs px-2 py-1.5 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button onClick={handleAddressLookup} className="px-2.5 py-1.5 text-xs rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors font-medium" title="Search">↵</button>
        </div>
        <button
          onClick={togglePickMode}
          className={cn('w-full text-xs py-1.5 px-2 rounded-md border transition-colors text-left', isPickMode ? 'border-primary bg-primary/10 text-primary animate-pulse' : 'border-border hover:bg-accent/50 text-muted-foreground')}
        >
          {isPickMode ? '⊕  Click anywhere on the map…' : '📍  Pick location on map'}
        </button>
        {searchLocation && (
          <p className="text-[10px] text-muted-foreground font-mono">
            {searchLocation[1].toFixed(5)}, {searchLocation[0].toFixed(5)}
          </p>
        )}
      </div>

      {/* Radius */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Radius</span>
          <span className="text-[10px] font-mono text-foreground">{radius} m</span>
        </div>
        <input type="range" min={100} max={2000} step={50} value={radius} onChange={(e) => handleRadiusChange(Number(e.target.value))} className="w-full h-1.5 accent-primary cursor-pointer" />
        <div className="flex justify-between text-[9px] text-muted-foreground"><span>100 m</span><span>2 km</span></div>
      </div>

      {/* Actions */}
      <div className="flex gap-1.5">
        <button
          onClick={handleSearch}
          disabled={!searchLocation || isSearching}
          className="flex-1 text-xs py-1.5 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isSearching ? 'Searching…' : 'Search Stops'}
        </button>
        {(stops.length > 0 || searchLocation) && (
          <button onClick={handleReset} className="px-2.5 py-1.5 text-xs rounded-md border border-border hover:bg-accent/50 text-muted-foreground transition-colors" title="Clear">✕</button>
        )}
      </div>

      {error && <p className="text-[11px] text-destructive">{error}</p>}

      {/* Results list */}
      {stops.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {stops.length} stop{stops.length !== 1 ? 's' : ''} found
          </span>
          <div className="space-y-0.5 max-h-64 overflow-y-auto scrollbar-hidden">
            {stops.map((stop) => (
              <div key={stop.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-accent/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground truncate">{stop.name}</p>
                  {stop.lines && stop.lines.length > 0 && (
                    <p className="text-[10px] text-blue-500 truncate">Lines: {stop.lines.join(', ')}</p>
                  )}
                </div>
                {stop.distance != null && (
                  <span className="text-[10px] text-muted-foreground font-mono ml-2 shrink-0">{stop.distance} m</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
