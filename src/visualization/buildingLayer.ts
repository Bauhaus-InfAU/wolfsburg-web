import type { LandUse } from '../config/types';
import { LAND_USE_COLORS, LAND_USE_DISPLAY_NAMES } from '../config/constants';

/**
 * Create the legend content for land use colors.
 * Note: Building rendering is now handled by MapLibre GL JS.
 */
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
