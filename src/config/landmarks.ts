/**
 * Iconic landmark buildings in Wolfsburg with their map coordinates.
 * Coordinates sourced from wolfsburg-poi.geojson.
 *
 * Photos: place images at /public/images/landmarks/<id>.jpg
 * Suggested sources (Wikimedia Commons, CC-licensed):
 *   phaeno        — search "Phaeno Wolfsburg" on commons.wikimedia.org
 *   aalto-kulturhaus — search "Kulturhaus Wolfsburg Aalto"
 *   autostadt     — search "Autostadt Wolfsburg"
 */

export interface Landmark {
  id: string;
  name: string;
  description: string;
  architect: string;
  year: number;
  coordinates: [number, number]; // [lng, lat] WGS84
  iconSvg: string;               // Inline SVG path content
  category: 'museum' | 'culture' | 'automotive';
  /** Accent color used for the photo fallback card */
  accentColor: string;
  /** Path relative to /public — place your photo here */
  photoUrl: string;
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
    description: 'A gravity-defying science centre that floats above the ground on ten concrete cones.',
    architect: 'Zaha Hadid',
    year: 2005,
    coordinates: [10.790576, 52.428716],
    iconSvg: ICONS.museum,
    category: 'museum',
    accentColor: '#f57f5b',
    photoUrl: '/images/landmarks/phaeno.jpg',
  },
  {
    id: 'aalto-kulturhaus',
    name: 'Aalto-Kulturhaus',
    description: 'A cultural centre designed with flowing organic forms and humanist warmth.',
    architect: 'Alvar Aalto',
    year: 1962,
    coordinates: [10.785542, 52.419512],
    iconSvg: ICONS.culture,
    category: 'culture',
    accentColor: '#5b9bd5',
    photoUrl: '/images/landmarks/aalto-kulturhaus.jpg',
  },
  {
    id: 'autostadt',
    name: 'Autostadt',
    description: "Volkswagen's landmark automotive theme park beside the main factory canal.",
    architect: 'Various (Henn, others)',
    year: 2000,
    coordinates: [10.7942009, 52.4326641],
    iconSvg: ICONS.automotive,
    category: 'automotive',
    accentColor: '#4a90a4',
    photoUrl: '/images/landmarks/autostadt.jpg',
  },
];

/** Haversine distance in metres between two WGS84 points */
export function haversineMetres(
  [lng1, lat1]: [number, number],
  [lng2, lat2]: [number, number]
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Return the closest landmark if it is within `thresholdM` metres, else null */
export function findNearestLandmark(
  centroid: [number, number],
  thresholdM = 200
): Landmark | null {
  let nearest: Landmark | null = null;
  let best = Infinity;
  for (const lm of WOLFSBURG_LANDMARKS) {
    const d = haversineMetres(centroid, lm.coordinates);
    if (d < best) {
      best = d;
      nearest = lm;
    }
  }
  return best <= thresholdM ? nearest : null;
}
