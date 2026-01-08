import type { BuildingCollection, LandUse } from '../config/types';
import { LAND_USE_COLORS, LAND_USE_DISPLAY_NAMES } from '../config/constants';
import { BuildingStore } from '../data/buildingStore';
import { MapView } from './mapView';

export function renderBuildings(
  mapView: MapView,
  collection: BuildingCollection,
  store: BuildingStore,
  enabledLandUses?: Set<LandUse>
): void {
  const ctx = mapView.ctx;

  for (const feature of collection.features) {
    const buildingId = feature.properties['Building ID'];
    const building = store.getBuildingById(buildingId);
    const primaryLandUse = building?.primaryLandUse || 'Undefined Land use';

    // Filter by enabled land uses if provided
    // Always show residential buildings (they are origins)
    if (enabledLandUses && primaryLandUse !== 'Generic Residential') {
      const hasEnabledUse = building?.landUses.some(lu => enabledLandUses.has(lu));
      if (!hasEnabledUse) continue;
    }

    const color = LAND_USE_COLORS[primaryLandUse];

    // Draw each polygon in the MultiPolygon
    for (const polygon of feature.geometry.coordinates) {
      const exteriorRing = polygon[0];
      if (!exteriorRing || exteriorRing.length < 3) continue;

      ctx.beginPath();
      const first = mapView.dataToCanvas(exteriorRing[0][0], exteriorRing[0][1]);
      ctx.moveTo(first.x, first.y);

      for (let i = 1; i < exteriorRing.length; i++) {
        const pt = mapView.dataToCanvas(exteriorRing[i][0], exteriorRing[i][1]);
        ctx.lineTo(pt.x, pt.y);
      }

      ctx.closePath();
      ctx.fillStyle = color + 'cc'; // Slightly more opaque for light theme
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }
}

export function createLegend(): void {
  const container = document.getElementById('legend-content');
  if (!container) return;

  const landUses: LandUse[] = [
    'Generic Residential',
    'Generic Retail',
    'Generic Food and Beverage Service',
    'Generic Office Building',
    'Generic Education',
    'Generic Health and Wellbeing',
    'Generic Entertainment',
    'Generic Culture',
    'Generic Service',
    'Generic Civic Function',
    'Generic Sport Facility',
    'Generic Light Industrial',
  ];

  container.innerHTML = landUses
    .map((lu) => {
      const color = LAND_USE_COLORS[lu];
      const name = LAND_USE_DISPLAY_NAMES[lu];
      return `
        <div class="legend-item">
          <div class="legend-color" style="background: ${color}"></div>
          <span>${name}</span>
        </div>
      `;
    })
    .join('');
}
