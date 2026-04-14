import type { TransitStop, TransitDeparture } from '../config/types';

// VBN (Verkehrsverbund Bremen/Niedersachsen) transport.rest API — covers Wolfsburg area, free, no API key
const VBN_API = 'https://v5.vbn.transport.rest';

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
      // Nominatim policy requires a descriptive User-Agent
      'User-Agent': 'WolfsburgFlowModel/1.0 (educational project)',
    },
  });

  if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);

  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;

  return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
}

/**
 * Fetch transit stops near a coordinate within a given radius.
 * Uses VBN transport.rest /stops/nearby endpoint.
 */
export async function getNearbyStops(
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<TransitStop[]> {
  const url =
    `${VBN_API}/stops/nearby?` +
    new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      distance: String(radiusMeters),
      results: '50',
      language: 'de',
    });

  const res = await fetch(url);
  if (!res.ok) throw new Error(`VBN API error: ${res.status}`);

  const data = await res.json();
  if (!Array.isArray(data)) return [];

  return data
    .filter((s: Record<string, unknown>) => s.type === 'stop' || s.type === 'station')
    .map((s: Record<string, unknown>) => {
      const location = s.location as Record<string, number> | undefined;
      return {
        id: String(s.id),
        name: String(s.name),
        lat: location?.latitude ?? 0,
        lng: location?.longitude ?? 0,
        distance: typeof s.distance === 'number' ? s.distance : undefined,
      };
    });
}

/**
 * Fetch departures for a stop in the next 15 minutes.
 * Uses VBN transport.rest /stops/{id}/departures endpoint.
 */
export async function getDepartures(stopId: string): Promise<TransitDeparture[]> {
  const url =
    `${VBN_API}/stops/${encodeURIComponent(stopId)}/departures?` +
    new URLSearchParams({
      when: new Date().toISOString(),
      duration: '15',
      results: '20',
      language: 'de',
    });

  const res = await fetch(url);
  if (!res.ok) throw new Error(`VBN departures error: ${res.status}`);

  const data = await res.json();
  const list: unknown[] = Array.isArray(data) ? data : (data?.departures ?? []);

  return list.map((d: unknown) => {
    const dep = d as Record<string, unknown>;
    const line = dep.line as Record<string, unknown> | undefined;
    return {
      line: String(line?.name ?? line?.fahrtNr ?? '?'),
      direction: String(dep.direction ?? ''),
      when: String(dep.when ?? dep.plannedWhen ?? ''),
      plannedWhen: String(dep.plannedWhen ?? ''),
      delay: typeof dep.delay === 'number' ? dep.delay : null,
      platform: dep.platform != null ? String(dep.platform) : (dep.plannedPlatform != null ? String(dep.plannedPlatform) : null),
    };
  });
}
