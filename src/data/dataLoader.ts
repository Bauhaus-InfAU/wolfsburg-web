import type { BuildingCollection, StreetCollection } from '../config/types';
import { getCityConfig } from '../config/cityConfig';

const BASE_PATH = import.meta.env.BASE_URL || '/';

// POI collection type for Wolfsburg
export interface PoiProperties {
  fid: number;
  id: string;
  'names.primary': string;
  'categories.primary': string;
  'categories.alternate'?: string;
  basic_category: string;
  'taxonomy.primary': string;
  'taxonomy.hierarchy': string;
  operating_status: string;
  type: string;
}

export type PoiFeature = GeoJSON.Feature<GeoJSON.Point, PoiProperties>;
export type PoiCollection = GeoJSON.FeatureCollection<GeoJSON.Point, PoiProperties>;

// Block collection type for Wolfsburg
export interface BlockProperties {
  fid: number;
  objid: string;
  tn: string;
  tn__bez: string;
}

export type BlockFeature = GeoJSON.Feature<GeoJSON.MultiPolygon, BlockProperties>;
export type BlockCollection = GeoJSON.FeatureCollection<GeoJSON.MultiPolygon, BlockProperties>;

export async function loadBuildings(): Promise<BuildingCollection> {
  const cityConfig = getCityConfig();
  const response = await fetch(`${BASE_PATH}${cityConfig.buildingsFile.replace(/^\//, '')}`);
  if (!response.ok) {
    throw new Error(`Failed to load buildings: ${response.statusText}`);
  }
  return response.json();
}

export async function loadStreets(): Promise<StreetCollection> {
  const cityConfig = getCityConfig();
  const response = await fetch(`${BASE_PATH}${cityConfig.streetsFile.replace(/^\//, '')}`);
  if (!response.ok) {
    throw new Error(`Failed to load streets: ${response.statusText}`);
  }
  return response.json();
}

export async function loadPoi(): Promise<PoiCollection | null> {
  const cityConfig = getCityConfig();
  if (!cityConfig.poiFile) {
    return null;
  }
  const response = await fetch(`${BASE_PATH}${cityConfig.poiFile.replace(/^\//, '')}`);
  if (!response.ok) {
    console.warn(`Failed to load POI data: ${response.statusText}`);
    return null;
  }
  return response.json();
}

export async function loadBlocks(): Promise<BlockCollection | null> {
  const cityConfig = getCityConfig();
  if (!cityConfig.blocksFile) {
    return null;
  }
  const response = await fetch(`${BASE_PATH}${cityConfig.blocksFile.replace(/^\//, '')}`);
  if (!response.ok) {
    console.warn(`Failed to load blocks data: ${response.statusText}`);
    return null;
  }
  return response.json();
}

export function updateLoadingStatus(message: string): void {
  const el = document.getElementById('loading-text');
  if (el) {
    el.textContent = message;
  }
}

export function hideLoading(): void {
  const el = document.getElementById('loading');
  if (el) {
    el.classList.add('hidden');
  }
}

export function showLoading(): void {
  const el = document.getElementById('loading');
  if (el) {
    el.classList.remove('hidden');
  }
}
