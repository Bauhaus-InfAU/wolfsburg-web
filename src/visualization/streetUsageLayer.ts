import type { MapView } from './mapView';
import type { StreetUsageTracker } from '../data/StreetUsageTracker';

/**
 * Interpolate color based on normalized value (0-1).
 * Blue (#3288bd) -> Yellow (#fee08b) -> Red (#d53e4f)
 */
function interpolateColor(normalized: number): string {
  if (normalized <= 0.5) {
    // Blue to Yellow (0.0 - 0.5)
    const t = normalized * 2;
    const r = Math.round(50 + t * 204); // 50 -> 254
    const g = Math.round(136 + t * 88); // 136 -> 224
    const b = Math.round(189 - t * 50); // 189 -> 139
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Yellow to Red (0.5 - 1.0)
    const t = (normalized - 0.5) * 2;
    const r = Math.round(254 - t * 41); // 254 -> 213
    const g = Math.round(224 - t * 162); // 224 -> 62
    const b = Math.round(139 - t * 60); // 139 -> 79
    return `rgb(${r}, ${g}, ${b})`;
  }
}

/**
 * Calculate line width based on usage (2px min, 8px max).
 */
function getLineWidth(normalized: number): number {
  return 2 + normalized * 6;
}

/**
 * Render street usage heatmap on the map.
 */
export function renderStreetUsage(
  mapView: MapView,
  tracker: StreetUsageTracker,
  minThreshold: number = 0.01
): void {
  const ctx = mapView.ctx;
  const segments = tracker.getSegmentUsage();

  if (segments.length === 0) return;

  // Sort by count (ascending) so high-usage segments render on top
  segments.sort((a, b) => a.count - b.count);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const segment of segments) {
    // Skip very low usage segments
    if (segment.normalized < minThreshold) continue;

    const from = mapView.dataToCanvas(segment.from[0], segment.from[1]);
    const to = mapView.dataToCanvas(segment.to[0], segment.to[1]);

    ctx.strokeStyle = interpolateColor(segment.normalized);
    ctx.lineWidth = getLineWidth(segment.normalized);

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }
}
