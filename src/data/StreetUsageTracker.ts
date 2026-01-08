import { COORD_PRECISION } from '../config/constants';

export interface SegmentUsage {
  from: [number, number];
  to: [number, number];
  count: number;
  normalized: number;
}

export class StreetUsageTracker {
  private usageCounts: Map<string, number> = new Map();
  private maxCount: number = 0;

  /**
   * Create canonical segment key from two coordinates.
   * Sorts coordinates so both directions map to the same key.
   */
  private getSegmentKey(coord1: [number, number], coord2: [number, number]): string {
    const key1 = `${coord1[0].toFixed(COORD_PRECISION)},${coord1[1].toFixed(COORD_PRECISION)}`;
    const key2 = `${coord2[0].toFixed(COORD_PRECISION)},${coord2[1].toFixed(COORD_PRECISION)}`;
    return key1 < key2 ? `${key1}|${key2}` : `${key2}|${key1}`;
  }

  /**
   * Record usage for all segments in a path.
   */
  recordPath(path: [number, number][]): void {
    for (let i = 0; i < path.length - 1; i++) {
      const segmentKey = this.getSegmentKey(path[i], path[i + 1]);
      const newCount = (this.usageCounts.get(segmentKey) || 0) + 1;
      this.usageCounts.set(segmentKey, newCount);
      if (newCount > this.maxCount) {
        this.maxCount = newCount;
      }
    }
  }

  /**
   * Get all segments with usage data.
   */
  getSegmentUsage(): SegmentUsage[] {
    const segments: SegmentUsage[] = [];

    for (const [key, count] of this.usageCounts) {
      const [key1, key2] = key.split('|');
      const [lng1, lat1] = key1.split(',').map(Number);
      const [lng2, lat2] = key2.split(',').map(Number);

      segments.push({
        from: [lng1, lat1],
        to: [lng2, lat2],
        count,
        normalized: this.maxCount > 0 ? count / this.maxCount : 0,
      });
    }

    return segments;
  }

  getMaxCount(): number {
    return this.maxCount;
  }

  getTotalSegments(): number {
    return this.usageCounts.size;
  }

  reset(): void {
    this.usageCounts.clear();
    this.maxCount = 0;
  }
}
