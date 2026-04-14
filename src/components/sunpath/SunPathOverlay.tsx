import { useEffect, useRef } from 'react';
import { useSunPath } from '@/context/SunPathContext';
import { useSimulation } from '@/hooks/useSimulation';
import { useDrawing } from '@/context/DrawingContext';
import { getSunPosition, shadowVector, shadowPolygon } from '@/simulation/sunPosition';
import { getCityConfig } from '@/config/cityConfig';
import type { Feature } from 'geojson';

const UPDATE_INTERVAL_MS = 500; // throttle shadow updates to 2/sec during playback

/**
 * Headless component — bridges SunPathContext to the MapLibre map.
 * Renders nothing; drives shadow layer + directional lighting.
 */
export function SunPathOverlay() {
  const {
    minuteOfDay,
    currentDate,
    showShadows,
    shadowOpacity,
  } = useSunPath();

  const { getMapView, getEnrichedBuildings } = useSimulation();
  const { customBuildings } = useDrawing();

  const cfg = getCityConfig();
  const lat = cfg.center[1];
  const lng = cfg.center[0];

  const lastUpdateRef = useRef<number>(0);
  const rafRef        = useRef<number | null>(null);

  // Initialize shadow layer once map is ready
  useEffect(() => {
    const mv = getMapView();
    if (!mv) return;

    const init = () => {
      mv.addShadowLayer();
    };

    if (mv.map.loaded()) {
      init();
    } else {
      mv.map.once('load', init);
    }
  }, [getMapView]);

  // Update shadows and lighting whenever time / settings change
  useEffect(() => {
    const mv = getMapView();
    if (!mv || !mv.map.loaded()) return;

    // Throttle rapid updates (animation)
    const now = performance.now();
    if (now - lastUpdateRef.current < UPDATE_INTERVAL_MS) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        lastUpdateRef.current = performance.now();
        applyUpdate();
      });
      return;
    }
    lastUpdateRef.current = now;
    applyUpdate();

    function applyUpdate() {
      if (!mv) return;

      // Build the simulated Date at current minute of day
      const simDate = new Date(currentDate);
      simDate.setHours(0, 0, 0, 0);
      simDate.setMinutes(Math.round(minuteOfDay));

      const sun = getSunPosition(simDate, lat, lng);

      // Update directional light regardless of shadows
      mv.setSunLight(sun.azimuth, sun.elevation);

      // Toggle shadow layer visibility
      mv.setShadowVisibility(showShadows && sun.elevation > 0.5);

      if (!showShadows || sun.elevation <= 0.5) {
        mv.updateShadows([]);
        return;
      }

      // Update shadow opacity
      mv.setShadowOpacity(shadowOpacity);

      // Compute shadow polygons
      const features: Feature[] = [];

      // --- Existing buildings from OSM/city data ---
      const enriched = getEnrichedBuildings();
      if (enriched) {
        const bounds = mv.map.getBounds();
        for (const feature of enriched.features) {
          if (feature.properties?.['ofl__bez'] === 'Unter der Erdoberfläche') continue;

          const heightRaw = feature.properties?.Height ?? 5;
          const height = typeof heightRaw === 'string' ? parseFloat(heightRaw) : heightRaw;
          if (height < 3) continue;

          // MultiPolygon — take the outer ring of each polygon
          const coords = feature.geometry?.coordinates;
          if (!coords) continue;

          for (const polygon of coords) {
            const outer = polygon[0] as [number, number][];
            if (!outer?.length) continue;

            // Quick viewport cull
            const sample = outer[0];
            if (!bounds.contains([sample[0], sample[1]])) continue;

            const sv = shadowVector(sun.azimuth, sun.elevation, height, lat);
            if (sv.lengthM < 1) continue;

            const poly = shadowPolygon(outer, sv.dLng, sv.dLat);
            features.push({
              type: 'Feature',
              properties: {},
              geometry: { type: 'Polygon', coordinates: [poly] },
            });
          }
        }
      }

      // --- User-drawn custom buildings ---
      for (const b of customBuildings) {
        if (b.points.length < 3) continue;
        const sv = shadowVector(sun.azimuth, sun.elevation, b.height, lat);
        if (sv.lengthM < 1) continue;
        const ring: [number, number][] = b.points.map(([bLng, bLat]) => [bLng, bLat]);
        const poly = shadowPolygon(ring, sv.dLng, sv.dLat);
        features.push({
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: [poly] },
        });
      }

      mv.updateShadows(features);
    }

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [minuteOfDay, currentDate, showShadows, shadowOpacity, getMapView, getEnrichedBuildings, customBuildings, lat, lng]);

  return null;
}
