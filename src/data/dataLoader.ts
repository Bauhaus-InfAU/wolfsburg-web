import type { BuildingCollection, StreetCollection } from '../config/types';

const BASE_PATH = import.meta.env.BASE_URL || '/';

export async function loadBuildings(): Promise<BuildingCollection> {
  const response = await fetch(`${BASE_PATH}data/weimar-buildings.geojson`);
  if (!response.ok) {
    throw new Error(`Failed to load buildings: ${response.statusText}`);
  }
  return response.json();
}

export async function loadStreets(): Promise<StreetCollection> {
  const response = await fetch(`${BASE_PATH}data/weimar-streets.geojson`);
  if (!response.ok) {
    throw new Error(`Failed to load streets: ${response.statusText}`);
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
