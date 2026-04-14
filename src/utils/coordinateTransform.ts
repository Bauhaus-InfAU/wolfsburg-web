/**
 * Coordinate transformation utilities
 * Converts between UTM Zone 32N (EPSG:25832) and WGS84 (EPSG:4326)
 */

// WGS84 ellipsoid parameters
const WGS84_A = 6378137.0; // Semi-major axis
const WGS84_F = 1 / 298.257223563; // Flattening
const WGS84_E2 = 2 * WGS84_F - WGS84_F * WGS84_F; // First eccentricity squared
const WGS84_E_PRIME2 = WGS84_E2 / (1 - WGS84_E2); // Second eccentricity squared

// UTM parameters
const UTM_K0 = 0.9996; // Scale factor
const UTM_ZONE_32_CENTRAL_MERIDIAN = 9; // degrees (for UTM Zone 32N)
const UTM_FALSE_EASTING = 500000;
const UTM_FALSE_NORTHING = 0; // 0 for northern hemisphere

/**
 * Convert UTM Zone 32N coordinates to WGS84
 * @param easting UTM easting in meters
 * @param northing UTM northing in meters
 * @returns [longitude, latitude] in degrees
 */
export function utm32nToWgs84(easting: number, northing: number): [number, number] {
  const x = easting - UTM_FALSE_EASTING;
  const y = northing - UTM_FALSE_NORTHING;

  // Footpoint latitude
  const m = y / UTM_K0;
  const mu = m / (WGS84_A * (1 - WGS84_E2 / 4 - 3 * WGS84_E2 * WGS84_E2 / 64 - 5 * Math.pow(WGS84_E2, 3) / 256));

  const e1 = (1 - Math.sqrt(1 - WGS84_E2)) / (1 + Math.sqrt(1 - WGS84_E2));

  const phi1 = mu +
    (3 * e1 / 2 - 27 * Math.pow(e1, 3) / 32) * Math.sin(2 * mu) +
    (21 * e1 * e1 / 16 - 55 * Math.pow(e1, 4) / 32) * Math.sin(4 * mu) +
    (151 * Math.pow(e1, 3) / 96) * Math.sin(6 * mu) +
    (1097 * Math.pow(e1, 4) / 512) * Math.sin(8 * mu);

  const sinPhi1 = Math.sin(phi1);
  const cosPhi1 = Math.cos(phi1);
  const tanPhi1 = Math.tan(phi1);

  const n1 = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinPhi1 * sinPhi1);
  const t1 = tanPhi1 * tanPhi1;
  const c1 = WGS84_E_PRIME2 * cosPhi1 * cosPhi1;
  const r1 = WGS84_A * (1 - WGS84_E2) / Math.pow(1 - WGS84_E2 * sinPhi1 * sinPhi1, 1.5);
  const d = x / (n1 * UTM_K0);

  // Calculate latitude
  const lat = phi1 - (n1 * tanPhi1 / r1) * (
    d * d / 2 -
    (5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * WGS84_E_PRIME2) * Math.pow(d, 4) / 24 +
    (61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * WGS84_E_PRIME2 - 3 * c1 * c1) * Math.pow(d, 6) / 720
  );

  // Calculate longitude
  const lon = UTM_ZONE_32_CENTRAL_MERIDIAN * Math.PI / 180 + (
    d -
    (1 + 2 * t1 + c1) * Math.pow(d, 3) / 6 +
    (5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * WGS84_E_PRIME2 + 24 * t1 * t1) * Math.pow(d, 5) / 120
  ) / cosPhi1;

  // Convert to degrees
  const latDeg = lat * 180 / Math.PI;
  const lonDeg = lon * 180 / Math.PI;

  return [lonDeg, latDeg];
}

/**
 * Convert WGS84 coordinates to UTM Zone 32N
 * @param longitude Longitude in degrees
 * @param latitude Latitude in degrees
 * @returns [easting, northing] in meters
 */
export function wgs84ToUtm32n(longitude: number, latitude: number): [number, number] {
  const latRad = latitude * Math.PI / 180;
  const lonRad = longitude * Math.PI / 180;
  const lon0Rad = UTM_ZONE_32_CENTRAL_MERIDIAN * Math.PI / 180;

  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const tanLat = Math.tan(latRad);

  const n = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);
  const t = tanLat * tanLat;
  const c = WGS84_E_PRIME2 * cosLat * cosLat;
  const a = cosLat * (lonRad - lon0Rad);

  const m = WGS84_A * (
    (1 - WGS84_E2 / 4 - 3 * WGS84_E2 * WGS84_E2 / 64 - 5 * Math.pow(WGS84_E2, 3) / 256) * latRad -
    (3 * WGS84_E2 / 8 + 3 * WGS84_E2 * WGS84_E2 / 32 + 45 * Math.pow(WGS84_E2, 3) / 1024) * Math.sin(2 * latRad) +
    (15 * WGS84_E2 * WGS84_E2 / 256 + 45 * Math.pow(WGS84_E2, 3) / 1024) * Math.sin(4 * latRad) -
    (35 * Math.pow(WGS84_E2, 3) / 3072) * Math.sin(6 * latRad)
  );

  const easting = UTM_FALSE_EASTING + UTM_K0 * n * (
    a +
    (1 - t + c) * Math.pow(a, 3) / 6 +
    (5 - 18 * t + t * t + 72 * c - 58 * WGS84_E_PRIME2) * Math.pow(a, 5) / 120
  );

  const northing = UTM_FALSE_NORTHING + UTM_K0 * (
    m + n * tanLat * (
      a * a / 2 +
      (5 - t + 9 * c + 4 * c * c) * Math.pow(a, 4) / 24 +
      (61 - 58 * t + t * t + 600 * c - 330 * WGS84_E_PRIME2) * Math.pow(a, 6) / 720
    )
  );

  return [easting, northing];
}

/**
 * Transform a GeoJSON coordinate array from UTM to WGS84
 * Handles nested arrays (for polygons and multipolygons)
 */
export function transformCoordinates(coords: unknown, fromUtm: boolean = true): unknown {
  if (!Array.isArray(coords)) return coords;

  // Check if this is a coordinate pair [x, y] or [x, y, z]
  if (coords.length >= 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    if (fromUtm) {
      const [lng, lat] = utm32nToWgs84(coords[0], coords[1]);
      return coords.length > 2 ? [lng, lat, coords[2]] : [lng, lat];
    } else {
      const [easting, northing] = wgs84ToUtm32n(coords[0], coords[1]);
      return coords.length > 2 ? [easting, northing, coords[2]] : [easting, northing];
    }
  }

  // Recursively transform nested arrays
  return coords.map(c => transformCoordinates(c, fromUtm));
}

/**
 * Transform an entire GeoJSON feature from UTM to WGS84
 */
export function transformFeature<T extends GeoJSON.Feature>(feature: T, fromUtm: boolean = true): T {
  return {
    ...feature,
    geometry: {
      ...feature.geometry,
      coordinates: transformCoordinates(
        (feature.geometry as GeoJSON.Geometry & { coordinates: unknown }).coordinates,
        fromUtm
      ),
    },
  } as T;
}

/**
 * Transform an entire GeoJSON FeatureCollection from UTM to WGS84
 */
export function transformFeatureCollection<T extends GeoJSON.FeatureCollection>(
  collection: T,
  fromUtm: boolean = true
): T {
  return {
    ...collection,
    features: collection.features.map(f => transformFeature(f, fromUtm)),
  } as T;
}

/**
 * Calculate distance between two WGS84 coordinates using Haversine formula
 * @returns Distance in meters
 */
export function haversineDistance(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const R = 6371000; // Earth's radius in meters
  const lat1 = coord1[1] * Math.PI / 180;
  const lat2 = coord2[1] * Math.PI / 180;
  const deltaLat = (coord2[1] - coord1[1]) * Math.PI / 180;
  const deltaLng = (coord2[0] - coord1[0]) * Math.PI / 180;

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
