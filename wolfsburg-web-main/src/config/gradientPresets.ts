/**
 * Heatmap gradient configuration with variable color stops.
 */

export interface GradientStop {
  id: string;
  position: number; // 0 to 1
  color: string;
}

export interface HeatmapGradient {
  stops: GradientStop[];
}

/**
 * Generate a unique ID for a gradient stop.
 */
export function generateStopId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Default gradient (blue to yellow to red).
 */
export const DEFAULT_GRADIENT: HeatmapGradient = {
  stops: [
    { id: 'default-0', position: 0, color: '#3288bd' },
    { id: 'default-1', position: 0.5, color: '#fee08b' },
    { id: 'default-2', position: 1, color: '#d53e4f' },
  ],
};

/**
 * Storage key for persisting gradient preference.
 */
export const GRADIENT_STORAGE_KEY = 'heatmap-gradient';

/**
 * Minimum number of stops allowed.
 */
export const MIN_STOPS = 2;

/**
 * Maximum number of stops allowed.
 */
export const MAX_STOPS = 8;
