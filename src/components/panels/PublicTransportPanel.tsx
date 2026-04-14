import { useState, useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFlow } from '@/context/FlowContext';
import { geocodeAddress, getNearbyStops, getDepartures } from '@/services/transitService';
import type { TransitStop, TransitDeparture } from '@/config/types';

// MapLibre source/layer IDs for the search radius circle
const CIRCLE_SOURCE = 'transit-radius-circle';
const CIRCLE_FILL = 'transit-radius-fill';
const CIRCLE_OUTLINE = 'transit-radius-outline';

/** Approximate circle as a GeoJSON polygon (64-point ring). */
function makeCircle(
  center: [number, number],
  radiusMeters: number
): GeoJSON.FeatureCollection {
  const [lng, lat] = center;
  const points = 64;
  const coords: [number, number][] = [];

  for (let i = 0; i < points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = radiusMeters * Math.cos(angle);
    const dy = radiusMeters * Math.sin(angle);
    const dLat = dy / 111320;
    const dLng = dx / (111320 * Math.cos((lat * Math.PI) / 180));
    coords.push([lng + dLng, lat + dLat]);
  }
  coords.push(coords[0]); // close ring

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [coords] },
        properties: {},
      },
    ],
  };
}

/** Format ISO time string as HH:MM, append delay in minutes if present. */
function formatTime(isoString: string, delay: number | null): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  const time = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  if (delay && delay > 0) {
    const delayMin = Math.round(delay / 60);
    return `${time} +${delayMin}'`;
  }
  return time;
}

/** Inline HTML for the MapLibre popup — shown when clicking a stop marker. */
function buildPopupHTML(stop: TransitStop): string {
  const deps = stop.departures ?? [];
  const distanceRow = stop.distance
    ? `<p style="margin:0 0 6px 0;color:#9ca3af;font-size:10px">${stop.distance} m away</p>`
    : '';

  const rows = deps
    .slice(0, 8)
    .map((d) => {
      const time = formatTime(d.when, d.delay);
      const delayColor = d.delay && d.delay > 0 ? '#ef4444' : '#d1d5db';
      return `
        <tr>
          <td style="padding:2px 8px 2px 0;font-weight:700;color:#60a5fa;white-space:nowrap">${d.line}</td>
          <td style="padding:2px 8px 2px 0;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#f3f4f6">${d.direction}</td>
          <td style="padding:2px 0;white-space:nowrap;color:${delayColor};font-family:monospace">${time}</td>
        </tr>`;
    })
    .join('');

  const body =
    deps.length > 0
      ? `<table style="width:100%;border-collapse:collapse;font-size:11px">${rows}</table>`
      : `<p style="color:#9ca3af;font-size:11px;margin:4px 0 0">No departures in next 15 min</p>`;

  return `
    <div style="font-family:'Roboto Mono',monospace;padding:4px 2px;min-width:200px">
      <p style="margin:0 0 2px 0;font-weight:700;font-size:13px;color:#f9fafb">${stop.name}</p>
      ${distanceRow}
      ${body}
    </div>`;
}

// ---------------------------------------------------------------------------

export function PublicTransportPanel() {
  const { getMapView } = useFlow();

  // Form state
  const [addressInput, setAddressInput] = useState('');
  const [radius, setRadius] = useState(500);
  const [isPickMode, setIsPickMode] = useState(false); // waiting for map click
  const [searchLocation, setSearchLocation] = useState<[number, number] | null>(null); // [lng, lat]

  // Result state
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stops, setStops] = useState<TransitStop[]>([]);
  const [expandedStopId, setExpandedStopId] = useState<string | null>(null);

  // Refs for map objects (cleaned up on unmount / reset)
  const stopMarkersRef = useRef<maplibregl.Marker[]>([]);
  const centerMarkerRef = useRef<maplibregl.Marker | null>(null);
  const clickHandlerRef = useRef<((e: maplibregl.MapMouseEvent) => void) | null>(null);

  // ------------------------------------------------------------------
  // Map helpers
  // ------------------------------------------------------------------

  const drawCircle = useCallback(
    (center: [number, number], r: number) => {
      const mapView = getMapView();
      if (!mapView) return;
      const { map } = mapView;
      const data = makeCircle(center, r);

      if (map.getSource(CIRCLE_SOURCE)) {
        (map.getSource(CIRCLE_SOURCE) as maplibregl.GeoJSONSource).setData(data);
      } else {
        map.addSource(CIRCLE_SOURCE, { type: 'geojson', data });
        map.addLayer({
          id: CIRCLE_FILL,
          type: 'fill',
          source: CIRCLE_SOURCE,
          paint: { 'fill-color': '#f57f5b', 'fill-opacity': 0.08 },
        });
        map.addLayer({
          id: CIRCLE_OUTLINE,
          type: 'line',
          source: CIRCLE_SOURCE,
          paint: {
            'line-color': '#f57f5b',
            'line-width': 2,
            'line-opacity': 0.7,
            'line-dasharray': [5, 3],
          },
        });
      }
    },
    [getMapView]
  );

  const placeCenterMarker = useCallback(
    (coords: [number, number]) => {
      const mapView = getMapView();
      if (!mapView) return;
      if (centerMarkerRef.current) {
        centerMarkerRef.current.setLngLat(coords);
      } else {
        centerMarkerRef.current = new maplibregl.Marker({ color: '#f57f5b' })
          .setLngLat(coords)
          .addTo(mapView.map);
      }
    },
    [getMapView]
  );

  const clearMap = useCallback(() => {
    const mapView = getMapView();
    stopMarkersRef.current.forEach((m) => m.remove());
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

  // Remove click listener and reset cursor when leaving pick-mode
  const exitPickMode = useCallback(() => {
    const mapView = getMapView();
    if (mapView && clickHandlerRef.current) {
      mapView.map.off('click', clickHandlerRef.current);
      mapView.map.getCanvas().style.cursor = '';
      clickHandlerRef.current = null;
    }
    setIsPickMode(false);
  }, [getMapView]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearMap();
      exitPickMode();
    };
  }, [clearMap, exitPickMode]);

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------

  const handleAddressLookup = async () => {
    if (!addressInput.trim()) return;
    setError(null);
    try {
      const coords = await geocodeAddress(addressInput);
      if (!coords) {
        setError('Address not found. Try a more specific address.');
        return;
      }
      setSearchLocation(coords);
      placeCenterMarker(coords);
      drawCircle(coords, radius);
      const mapView = getMapView();
      mapView?.map.flyTo({ center: coords, zoom: Math.max(14, mapView.map.getZoom()) });
    } catch {
      setError('Geocoding failed. Check your connection.');
    }
  };

  const togglePickMode = () => {
    if (isPickMode) {
      exitPickMode();
      return;
    }

    const mapView = getMapView();
    if (!mapView) return;

    setIsPickMode(true);
    mapView.map.getCanvas().style.cursor = 'crosshair';

    const handler = (e: maplibregl.MapMouseEvent) => {
      const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      setSearchLocation(coords);
      placeCenterMarker(coords);
      drawCircle(coords, radius);
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
    if (!searchLocation) {
      setError('Set a location first (address or map click).');
      return;
    }
    setIsSearching(true);
    setError(null);
    setStops([]);
    setExpandedStopId(null);
    stopMarkersRef.current.forEach((m) => m.remove());
    stopMarkersRef.current = [];

    try {
      const [lng, lat] = searchLocation;
      const nearby = await getNearbyStops(lat, lng, radius);

      if (nearby.length === 0) {
        setError('No public transport stops found in this area.');
        setIsSearching(false);
        return;
      }

      // Fetch departures for every stop in parallel
      const withDepartures = await Promise.all(
        nearby.map(async (stop) => {
          try {
            const departures = await getDepartures(stop.id);
            return { ...stop, departures };
          } catch {
            return { ...stop, departures: [] as TransitDeparture[] };
          }
        })
      );

      setStops(withDepartures);

      // Add a marker on the map for each stop
      const mapView = getMapView();
      if (mapView) {
        withDepartures.forEach((stop) => {
          const el = document.createElement('div');
          el.style.cssText = [
            'width:20px',
            'height:20px',
            'border-radius:50%',
            'background:#3b82f6',
            'border:2px solid white',
            'box-shadow:0 2px 6px rgba(0,0,0,0.4)',
            'cursor:pointer',
            'display:flex',
            'align-items:center',
            'justify-content:center',
          ].join(';');
          el.innerHTML =
            '<svg width="10" height="10" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="6"/></svg>';

          const popup = new maplibregl.Popup({ offset: 14, maxWidth: '300px' }).setHTML(
            buildPopupHTML(stop)
          );

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([stop.lng, stop.lat])
            .setPopup(popup)
            .addTo(mapView.map);

          stopMarkersRef.current.push(marker);
        });
      }
    } catch {
      setError('Failed to load transit data. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleReset = () => {
    clearMap();
    exitPickMode();
    setSearchLocation(null);
    setAddressInput('');
    setStops([]);
    setError(null);
    setExpandedStopId(null);
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className="space-y-3">
      {/* ---- Location ---- */}
      <div className="space-y-2">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Location
        </span>

        {/* Address input row */}
        <div className="flex gap-1">
          <input
            type="text"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddressLookup()}
            placeholder="Enter address in Wolfsburg…"
            className="flex-1 text-xs px-2 py-1.5 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleAddressLookup}
            className="px-2.5 py-1.5 text-xs rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors font-medium"
            title="Search"
          >
            ↵
          </button>
        </div>

        {/* Map pick button */}
        <button
          onClick={togglePickMode}
          className={cn(
            'w-full text-xs py-1.5 px-2 rounded-md border transition-colors text-left',
            isPickMode
              ? 'border-primary bg-primary/10 text-primary animate-pulse'
              : 'border-border hover:bg-accent/50 text-muted-foreground'
          )}
        >
          {isPickMode ? '⊕  Click anywhere on the map…' : '📍  Pick location on map'}
        </button>

        {/* Confirmed location */}
        {searchLocation && (
          <p className="text-[10px] text-muted-foreground font-mono">
            {searchLocation[1].toFixed(5)}, {searchLocation[0].toFixed(5)}
          </p>
        )}
      </div>

      {/* ---- Radius ---- */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Radius
          </span>
          <span className="text-[10px] font-mono text-foreground">{radius} m</span>
        </div>
        <input
          type="range"
          min={100}
          max={2000}
          step={50}
          value={radius}
          onChange={(e) => handleRadiusChange(Number(e.target.value))}
          className="w-full h-1.5 accent-primary cursor-pointer"
        />
        <div className="flex justify-between text-[9px] text-muted-foreground">
          <span>100 m</span>
          <span>2 km</span>
        </div>
      </div>

      {/* ---- Search / Reset ---- */}
      <div className="flex gap-1.5">
        <button
          onClick={handleSearch}
          disabled={!searchLocation || isSearching}
          className="flex-1 text-xs py-1.5 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isSearching ? 'Loading…' : 'Search Stops'}
        </button>
        {(stops.length > 0 || searchLocation) && (
          <button
            onClick={handleReset}
            className="px-2.5 py-1.5 text-xs rounded-md border border-border hover:bg-accent/50 text-muted-foreground transition-colors"
            title="Clear results"
          >
            ✕
          </button>
        )}
      </div>

      {/* ---- Error ---- */}
      {error && <p className="text-[11px] text-destructive">{error}</p>}

      {/* ---- Results ---- */}
      {stops.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {stops.length} stop{stops.length !== 1 ? 's' : ''} found
          </span>

          <div className="space-y-1 max-h-64 overflow-y-auto scrollbar-hidden pr-0.5">
            {stops.map((stop) => (
              <StopCard
                key={stop.id}
                stop={stop}
                isExpanded={expandedStopId === stop.id}
                onToggle={() =>
                  setExpandedStopId(expandedStopId === stop.id ? null : stop.id)
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StopCard sub-component
// ---------------------------------------------------------------------------

function StopCard({
  stop,
  isExpanded,
  onToggle,
}: {
  stop: TransitStop;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const deps = stop.departures ?? [];

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-accent/50 transition-colors text-left gap-2"
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground truncate">{stop.name}</p>
          <p className="text-[10px] text-muted-foreground">
            {stop.distance != null ? `${stop.distance} m · ` : ''}
            {deps.length} departure{deps.length !== 1 ? 's' : ''}
          </p>
        </div>
        <ChevronDown
          className={cn(
            'h-3 w-3 text-muted-foreground shrink-0 transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {/* Expanded departure list */}
      {isExpanded && (
        <div className="border-t border-border px-2.5 py-2 bg-accent/20">
          {deps.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">
              No departures in the next 15 min
            </p>
          ) : (
            <div className="space-y-1">
              {deps.slice(0, 10).map((dep, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  {/* Line badge */}
                  <span className="font-bold text-blue-500 w-14 shrink-0 truncate">
                    {dep.line}
                  </span>
                  {/* Direction */}
                  <span className="flex-1 text-foreground truncate">{dep.direction}</span>
                  {/* Time */}
                  <span
                    className={cn(
                      'font-mono shrink-0 tabular-nums',
                      dep.delay && dep.delay > 0 ? 'text-red-500' : 'text-foreground'
                    )}
                  >
                    {formatTime(dep.when, dep.delay)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
