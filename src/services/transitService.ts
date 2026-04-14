import type { TransitStop } from '../config/types';

// Overpass API (OpenStreetMap) — CORS-enabled, free, no API key required
// Using the openstreetmap.fr instance which sets Access-Control-Allow-Origin: *
const OVERPASS_API = 'https://overpass.openstreetmap.fr/api/interpreter';

// Nominatim (OpenStreetMap) geocoding — free, no API key
const NOMINATIM_API = 'https://nominatim.openstreetmap.org';

/**
 * Geocode a text address to [lng, lat] coordinates using Nominatim.
 * Returns null if the address is not found.
 */
export async function geocodeAddress(address: string): Promise<[number, number] | null> {
  const url =
    `${NOMINATIM_API}/search?` +
    new URLSearchParams({
      q: address,
      format: 'json',
      limit: '1',
      countrycodes: 'de',
    });

  const res = await fetch(url, {
    headers: {
      'Accept-Language': 'de',
      'User-Agent': 'WolfsburgFlowModel/1.0 (educational project)',
    },
  });

  if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);

  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;

  return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
}

/**
 * Fetch bus/tram stops near a coordinate within a given radius using Overpass API.
 * Returns stops from OpenStreetMap data — reliable and CORS-friendly.
 */
export async function getNearbyStops(
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<TransitStop[]> {
  const query = `
    [out:json][timeout:25];
    (
      node["highway"="bus_stop"](around:${radiusMeters},${lat},${lng});
      node["public_transport"="platform"]["bus"="yes"](around:${radiusMeters},${lat},${lng});
      node["public_transport"="platform"]["tram"="yes"](around:${radiusMeters},${lat},${lng});
    );
    out body;
  `.trim();

  const res = await fetch(OVERPASS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) throw new Error(`Overpass API error: ${res.status}`);

  const data = await res.json();
  const elements: OverpassNode[] = data.elements ?? [];

  // Deduplicate by name+position
  const seen = new Set<string>();

  return elements
    .filter((el) => {
      const key = `${el.tags?.name ?? el.id}_${el.lat?.toFixed(4)}_${el.lon?.toFixed(4)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((el) => {
      const distanceM = haversineDistance(lat, lng, el.lat, el.lon);
      const lines = el.tags?.route_ref ?? el.tags?.ref ?? null;
      return {
        id: String(el.id),
        name: el.tags?.name ?? el.tags?.['name:de'] ?? 'Unnamed stop',
        lat: el.lat,
        lng: el.lon,
        distance: Math.round(distanceM),
        lines: lines ? lines.split(/[;,]/).map((l) => l.trim()).filter(Boolean) : [],
      };
    })
    .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface OverpassNode {
  type: string;
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
