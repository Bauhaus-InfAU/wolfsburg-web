/**
 * City configuration system
 * Allows switching between different cities (Weimar, Wolfsburg)
 */

export type CityId = 'weimar' | 'wolfsburg';

export interface CityConfig {
  id: CityId;
  name: string;
  // Data files
  buildingsFile: string;
  streetsFile: string;
  poiFile?: string;       // Optional POI data (Wolfsburg only)
  blocksFile?: string;    // Optional blocks data (Wolfsburg only)
  // Map settings
  center: [number, number]; // [lng, lat]
  zoom: number;
  bounds?: [[number, number], [number, number]]; // [[sw_lng, sw_lat], [ne_lng, ne_lat]]
  // Data format
  dataFormat: 'weimar' | 'wolfsburg';
  // Coordinate system of source data
  coordinateSystem: 'wgs84' | 'utm32n'; // UTM32N = EPSG:25832
}

export const CITY_CONFIGS: Record<CityId, CityConfig> = {
  weimar: {
    id: 'weimar',
    name: 'Weimar',
    buildingsFile: '/data/weimar-buildings.geojson',
    streetsFile: '/data/weimar-streets.geojson',
    center: [11.3295, 50.9795],
    zoom: 15,
    dataFormat: 'weimar',
    coordinateSystem: 'wgs84',
  },
  wolfsburg: {
    id: 'wolfsburg',
    name: 'Wolfsburg',
    buildingsFile: '/data/wolfsburg-buildings.geojson',
    streetsFile: '/data/wolfsburg-streets.geojson',
    poiFile: '/data/wolfsburg-poi.geojson',
    blocksFile: '/data/wolfsburg-blocks.geojson',
    center: [10.7865, 52.4227], // Wolfsburg city center
    zoom: 14,
    dataFormat: 'wolfsburg',
    coordinateSystem: 'utm32n', // Buildings use UTM, streets use WGS84
  },
};

// Current active city - change this to switch cities
export const ACTIVE_CITY: CityId = 'wolfsburg';

export function getCityConfig(): CityConfig {
  return CITY_CONFIGS[ACTIVE_CITY];
}

export function getCityConfigById(cityId: CityId): CityConfig {
  return CITY_CONFIGS[cityId];
}
