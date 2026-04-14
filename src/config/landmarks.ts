/**
 * Iconic landmark buildings in Wolfsburg with their map coordinates.
 * Coordinates sourced from wolfsburg-poi.geojson.
 */

export interface Landmark {
  id: string;
  name: string;
  description: string;
  coordinates: [number, number]; // [lng, lat] WGS84
  iconSvg: string;               // Inline SVG path content
  category: 'museum' | 'culture' | 'automotive';
}

// SVG icon paths for each category
const ICONS = {
  museum: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M2 20h20"/>
    <path d="M12 2L2 7h20L12 2z"/>
    <rect x="4" y="7" width="4" height="13"/>
    <rect x="10" y="7" width="4" height="13"/>
    <rect x="16" y="7" width="4" height="13"/>
  </svg>`,

  culture: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="9" cy="9" r="3"/>
    <circle cx="15" cy="9" r="3"/>
    <path d="M6 18c0-2 1.5-4 3-4h6c1.5 0 3 2 3 4"/>
    <path d="M4 6c0-1 .5-2 2-2s2 1 2 2"/>
    <path d="M16 6c0-1 .5-2 2-2s2 1 2 2"/>
  </svg>`,

  automotive: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2l3-3h8l3 3h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/>
    <circle cx="7" cy="17" r="2"/>
    <circle cx="17" cy="17" r="2"/>
    <path d="M9 17h6"/>
  </svg>`,
};

export const WOLFSBURG_LANDMARKS: Landmark[] = [
  {
    id: 'phaeno',
    name: 'phaeno',
    description: 'Science center by Zaha Hadid',
    coordinates: [10.790576, 52.428716],
    iconSvg: ICONS.museum,
    category: 'museum',
  },
  {
    id: 'aalto-kulturhaus',
    name: 'Aalto-Kulturhaus',
    description: 'Cultural center by Alvar Aalto',
    coordinates: [10.785542, 52.419512],
    iconSvg: ICONS.culture,
    category: 'culture',
  },
  {
    id: 'autostadt',
    name: 'Autostadt',
    description: "Volkswagen's automotive theme park",
    coordinates: [10.7942009, 52.4326641],
    iconSvg: ICONS.automotive,
    category: 'automotive',
  },
];
