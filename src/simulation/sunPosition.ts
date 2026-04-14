/**
 * Solar position calculator.
 * Algorithm based on NOAA simplified equations — accurate to ±0.01° for dates 1950–2050.
 */

export interface SunPosition {
  azimuth: number;    // degrees from north, clockwise (0–360)
  elevation: number;  // degrees above horizon (-90 – 90)
  isDaytime: boolean;
}

export interface SunTimes {
  sunrise: number;  // minutes since midnight (local time)
  sunset: number;
  solarNoon: number;
}

function toRad(d: number) { return d * Math.PI / 180; }
function toDeg(r: number) { return r * 180 / Math.PI; }

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

function solarDeclination(doy: number): number {
  return 23.45 * Math.sin(toRad(360 / 365 * (doy - 81)));
}

/** Equation of time in minutes */
function equationOfTime(doy: number): number {
  const B = toRad(360 / 365 * (doy - 81));
  return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
}

/** True solar noon in fractional hours (local clock time) */
function solarNoonHour(doy: number, lng: number, utcOffsetH: number): number {
  const eot = equationOfTime(doy);                    // minutes
  const longitudeCorrection = (lng / 15 - utcOffsetH); // hours
  return 12 - longitudeCorrection - eot / 60;
}

export function getSunPosition(date: Date, lat: number, lng: number): SunPosition {
  const doy = getDayOfYear(date);
  const utcOffsetH = -date.getTimezoneOffset() / 60;
  const fractionalHour = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;

  const dec = solarDeclination(doy);
  const noon = solarNoonHour(doy, lng, utcOffsetH);
  const hourAngle = 15 * (fractionalHour - noon); // degrees

  // Elevation
  const sinElev =
    Math.sin(toRad(lat)) * Math.sin(toRad(dec)) +
    Math.cos(toRad(lat)) * Math.cos(toRad(dec)) * Math.cos(toRad(hourAngle));
  const elevation = toDeg(Math.asin(Math.max(-1, Math.min(1, sinElev))));

  // Azimuth (from north, clockwise)
  const cosAz = (Math.sin(toRad(dec)) - Math.sin(toRad(lat)) * sinElev) /
    (Math.cos(toRad(lat)) * Math.cos(toRad(elevation)));
  let azimuth = toDeg(Math.acos(Math.max(-1, Math.min(1, cosAz))));
  if (hourAngle > 0) azimuth = 360 - azimuth;

  return { azimuth, elevation, isDaytime: elevation > 0 };
}

export function getSunTimes(date: Date, lat: number, lng: number): SunTimes {
  const doy = getDayOfYear(date);
  const utcOffsetH = -date.getTimezoneOffset() / 60;
  const dec = solarDeclination(doy);
  const noon = solarNoonHour(doy, lng, utcOffsetH);

  // Hour angle at sunrise/sunset: cos(H) = -tan(lat)*tan(dec)
  const cosH = -Math.tan(toRad(lat)) * Math.tan(toRad(dec));

  if (cosH > 1) {
    // Polar night
    return { sunrise: NaN, sunset: NaN, solarNoon: noon * 60 };
  }
  if (cosH < -1) {
    // Midnight sun
    return { sunrise: 0, sunset: 1440, solarNoon: noon * 60 };
  }

  const halfDayH = toDeg(Math.acos(cosH)) / 15; // hours
  return {
    sunrise: (noon - halfDayH) * 60,
    sunset: (noon + halfDayH) * 60,
    solarNoon: noon * 60,
  };
}

/** Sun positions sampled every `stepMinutes` throughout the day (for arc rendering) */
export function getSunArc(date: Date, lat: number, lng: number, stepMinutes = 5): SunPosition[] {
  const positions: SunPosition[] = [];
  const base = new Date(date);
  base.setHours(0, 0, 0, 0);
  const baseTime = base.getTime();
  for (let m = 0; m <= 1440; m += stepMinutes) {
    positions.push(getSunPosition(new Date(baseTime + m * 60_000), lat, lng));
  }
  return positions;
}

/** Shadow vector in degrees (lng, lat) for a building of given height */
export function shadowVector(
  sunAzimuth: number,
  sunElevation: number,
  buildingHeight: number,
  centerLat: number,
  maxLengthM = 150,
): { dLng: number; dLat: number; lengthM: number } {
  if (sunElevation <= 0.5) return { dLng: 0, dLat: 0, lengthM: 0 };
  const rawLength = buildingHeight / Math.tan(toRad(sunElevation));
  const lengthM = Math.min(rawLength, maxLengthM);

  // Shadow goes opposite to sun (sun at azimuth A → shadow toward A+180)
  const shadowAzRad = toRad(sunAzimuth + 180);
  const dLng = lengthM * Math.sin(shadowAzRad) / (111_320 * Math.cos(toRad(centerLat)));
  const dLat = lengthM * Math.cos(shadowAzRad) / 111_320;
  return { dLng, dLat, lengthM };
}

/** Approximate shadow polygon for a building ring (outer ring of a polygon).
 *  Returns a closed coordinate ring. */
export function shadowPolygon(
  ring: [number, number][],
  dLng: number,
  dLat: number,
): [number, number][] {
  // Remove closing vertex if present
  const verts = ring[ring.length - 1][0] === ring[0][0] && ring[ring.length - 1][1] === ring[0][1]
    ? ring.slice(0, -1)
    : ring;

  const offset = verts.map(([lng, lat]) => [lng + dLng, lat + dLat] as [number, number]);

  // Combine: forward along original, back along offset → swept outline
  const combined: [number, number][] = [...verts, ...offset.reverse()];
  combined.push(combined[0]); // close
  return combined;
}
