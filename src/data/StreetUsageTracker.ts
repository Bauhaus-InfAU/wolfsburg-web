import { COORD_PRECISION } from '../config/constants';

export interface SegmentUsage {
  from: [number, number];
  to: [number, number];
  count: number;
  normalized: number;
}

interface SegmentData {
  from: [number, number];
  to: [number, number];
  count: number;
}

export class StreetUsageTracker {
  // Store parsed coordinates alongside counts to avoid re-parsing strings
  private segments: Map<string, SegmentData> = new Map();
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
    this.recordPathWithWeight(path, 1);
  }

  /**
   * Record usage for all segments in a path with a weight/count multiplier.
   * More efficient than calling recordPath multiple times.
   */
  recordPathWithWeight(path: [number, number][], weight: number): void {
    for (let i = 0; i < path.length - 1; i++) {
      const segmentKey = this.getSegmentKey(path[i], path[i + 1]);
      let segment = this.segments.get(segmentKey);
      if (!segment) {
        // Store coordinates on first use (already parsed, no string splitting needed later)
        segment = { from: path[i], to: path[i + 1], count: 0 };
        this.segments.set(segmentKey, segment);
      }
      segment.count += weight;
      if (segment.count > this.maxCount) {
        this.maxCount = segment.count;
      }
    }
  }

  /**
   * Get all segments with usage data.
   * Uses cached coordinates - no string parsing needed.
   */
  getSegmentUsage(): SegmentUsage[] {
    const result: SegmentUsage[] = [];
    const maxCount = this.maxCount;

    for (const segment of this.segments.values()) {
      result.push({
        from: segment.from,
        to: segment.to,
        count: segment.count,
        normalized: maxCount > 0 ? segment.count / maxCount : 0,
      });
    }

    return result;
  }

  getMaxCount(): number {
    return this.maxCount;
  }

  getTotalSegments(): number {
    return this.segments.size;
  }

  reset(): void {
    this.segments.clear();
    this.maxCount = 0;
  }
}
