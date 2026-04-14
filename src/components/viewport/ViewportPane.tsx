import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { useSimulation } from '@/hooks/useSimulation';
import { useDrawing } from '@/context/DrawingContext';
import { LAND_USE_COLORS } from '@/config/constants';
import type { LandUse } from '@/config/types';
import { getCityConfig } from '@/config/cityConfig';

export interface ViewportConfig {
  id: string;
  label: string;
  pitch: number;
  bearing: number;
}

export const VIEWPORT_CONFIGS: ViewportConfig[] = [
  { id: 'top',         label: 'Top',         pitch: 0,  bearing: 0   },
  { id: 'front',       label: 'Front',       pitch: 80, bearing: 0   },
  { id: 'side',        label: 'Side',        pitch: 80, bearing: -90 },
  { id: 'perspective', label: 'Perspective', pitch: 60, bearing: -17 },
];

interface Props {
  config: ViewportConfig;
  /** When true this pane hosts the existing primary MapLibre map — no new instance. */
  isPrimary?: boolean;
  /** Only used when isPrimary — children are the MapCanvas + overlays */
  children?: React.ReactNode;
}

// ─── Expression builders ──────────────────────────────────────────────────────

function colorMatchExpr(): maplibregl.ExpressionSpecification {
  const entries: unknown[] = ['match', ['get', 'primaryLandUse']];
  for (const [lu, color] of Object.entries(LAND_USE_COLORS)) entries.push(lu as LandUse, color);
  entries.push('#d8d4cc');
  return entries as maplibregl.ExpressionSpecification;
}

function customColorMatchExpr(): maplibregl.ExpressionSpecification {
  const entries: unknown[] = ['match', ['get', 'landUse']];
  for (const [lu, color] of Object.entries(LAND_USE_COLORS)) entries.push(lu as LandUse, color);
  entries.push('#f57f5b');
  return entries as maplibregl.ExpressionSpecification;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ViewportPane({ config, isPrimary, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<maplibregl.Map | null>(null);

  const { getEnrichedBuildings, getRawStreetData, getMapView } = useSimulation();
  const { customBuildings } = useDrawing();
  const cityConfig = getCityConfig();

  // ── Secondary: create own fully-interactive MapLibre instance ────────────
  useEffect(() => {
    if (isPrimary || !containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {},
        layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#fafafa' } }],
        light: { anchor: 'viewport', color: '#ffffff', intensity: 0.4 },
      },
      center: cityConfig.center as maplibregl.LngLatLike,
      zoom:   (cityConfig.zoom ?? 15),
      pitch:   config.pitch,
      bearing: config.bearing,
      attributionControl: false,
      maxPitch: 85,
      // fully interactive — pan, zoom, rotate freely
    });

    mapRef.current = map;

    map.on('load', () => {
      const buildings = getEnrichedBuildings();
      const streets   = getRawStreetData();

      if (streets) {
        map.addSource('streets', { type: 'geojson', data: streets });
        map.addLayer({
          id: 'street-base', type: 'line', source: 'streets',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint:  { 'line-color': '#ffffff', 'line-width': 1.5 },
        });
      }

      if (buildings) {
        map.addSource('buildings', {
          type: 'geojson',
          data: buildings as unknown as GeoJSON.FeatureCollection,
        });
        map.addLayer({
          id: 'buildings-fill', type: 'fill-extrusion', source: 'buildings',
          paint: {
            'fill-extrusion-color': colorMatchExpr(),
            'fill-extrusion-height': ['*', ['to-number', ['coalesce', ['get', 'Height'], '5']], 1],
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.9,
          },
        });
      }

      // Drawn buildings
      map.addSource('custom-buildings', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'custom-buildings-fill', type: 'fill-extrusion', source: 'custom-buildings',
        paint: {
          'fill-extrusion-color': customColorMatchExpr(),
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.9,
        },
      });
    });

    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPrimary]);

  // ── Sync custom buildings whenever they change ────────────────────────────
  useEffect(() => {
    if (isPrimary) {
      // Primary map: sync via the main MapLibre instance
      const mv = getMapView();
      if (!mv || !mv.map.getSource('custom-buildings')) return;
      mv.updateCustomBuildings(customBuildings);
      return;
    }

    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource('custom-buildings') as maplibregl.GeoJSONSource | undefined;
    if (!src) return;

    const features = customBuildings.map(b => ({
      type: 'Feature' as const,
      properties: { id: b.id, height: b.height, landUse: b.landUse },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[...b.points, b.points[0]]],
      },
    }));
    src.setData({ type: 'FeatureCollection', features });
  }, [isPrimary, customBuildings, getMapView]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Viewport label badge */}
      <div className="absolute top-2 left-2 z-10 bg-card/80 backdrop-blur-sm border border-border rounded-lg px-2 py-0.5 pointer-events-none select-none">
        <span className="text-[10px] font-semibold text-foreground uppercase tracking-wider">
          {config.label}
        </span>
      </div>

      {/* Secondary map container */}
      {!isPrimary && <div ref={containerRef} className="w-full h-full" />}

      {/* Primary: render existing MapCanvas + overlays */}
      {isPrimary && children}
    </div>
  );
}
