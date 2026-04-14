import type { StreetCollection } from '../config/types';
import { MapView } from './mapView';

export function renderStreets(mapView: MapView, collection: StreetCollection): void {
  const ctx = mapView.ctx;

  // Draw shadow first
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const feature of collection.features) {
    if (feature.geometry.type !== 'LineString') continue;

    const coords = feature.geometry.coordinates;
    if (coords.length < 2) continue;

    ctx.beginPath();
    const first = mapView.dataToCanvas(coords[0][0], coords[0][1]);
    ctx.moveTo(first.x, first.y);

    for (let i = 1; i < coords.length; i++) {
      const pt = mapView.dataToCanvas(coords[i][0], coords[i][1]);
      ctx.lineTo(pt.x, pt.y);
    }

    ctx.stroke();
  }

  // Draw streets on top
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;

  for (const feature of collection.features) {
    if (feature.geometry.type !== 'LineString') continue;

    const coords = feature.geometry.coordinates;
    if (coords.length < 2) continue;

    ctx.beginPath();
    const first = mapView.dataToCanvas(coords[0][0], coords[0][1]);
    ctx.moveTo(first.x, first.y);

    for (let i = 1; i < coords.length; i++) {
      const pt = mapView.dataToCanvas(coords[i][0], coords[i][1]);
      ctx.lineTo(pt.x, pt.y);
    }

    ctx.stroke();
  }
}
