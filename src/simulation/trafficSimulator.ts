import type { SegmentUsage } from '../data/StreetUsageTracker';

export type TrafficPhase =
  | 'Night'
  | 'Early Morning'
  | 'Morning Rush'
  | 'Mid Morning'
  | 'Lunch Peak'
  | 'Afternoon'
  | 'Evening Rush'
  | 'Evening'
  | 'Late Night';

export interface TrafficState {
  minutesSinceMidnight: number;
  multiplier: number;
  phase: TrafficPhase;
  label: string;
}

// Keyframes: [minutesSinceMidnight, multiplier]
// Calibrated to typical German city pedestrian patterns (MiD 2023 reference)
const TRAFFIC_KEYFRAMES: [number, number][] = [
  [0,    0.05],  // 00:00 Night
  [60,   0.04],  // 01:00
  [120,  0.04],  // 02:00
  [180,  0.05],  // 03:00
  [240,  0.06],  // 04:00
  [300,  0.10],  // 05:00 Early Morning starts
  [360,  0.25],  // 06:00
  [420,  0.55],  // 07:00
  [480,  0.85],  // 08:00 Morning Rush
  [510,  0.90],  // 08:30 peak
  [540,  0.70],  // 09:00 Mid Morning
  [600,  0.60],  // 10:00
  [660,  0.72],  // 11:00 Lunch build-up
  [720,  0.95],  // 12:00 Lunch Peak
  [750,  1.00],  // 12:30 daily maximum
  [780,  0.78],  // 13:00 Post Lunch
  [840,  0.65],  // 14:00 Afternoon
  [900,  0.75],  // 15:00 school-out traffic
  [960,  0.80],  // 16:00
  [1020, 1.00],  // 17:00 Evening Rush peak
  [1050, 0.90],  // 17:30
  [1080, 0.72],  // 18:00
  [1140, 0.48],  // 19:00 Evening
  [1200, 0.38],  // 20:00
  [1260, 0.24],  // 21:00
  [1320, 0.14],  // 22:00 Late Night
  [1380, 0.08],  // 23:00
  [1440, 0.05],  // 24:00 (wraps to 00:00)
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function getMultiplier(minutesSinceMidnight: number): number {
  const t = ((minutesSinceMidnight % 1440) + 1440) % 1440;
  for (let i = 0; i < TRAFFIC_KEYFRAMES.length - 1; i++) {
    const [t0, v0] = TRAFFIC_KEYFRAMES[i];
    const [t1, v1] = TRAFFIC_KEYFRAMES[i + 1];
    if (t >= t0 && t < t1) {
      const alpha = (t - t0) / (t1 - t0);
      return lerp(v0, v1, alpha);
    }
  }
  return 0.05;
}

export function getPhase(minutesSinceMidnight: number): TrafficPhase {
  const t = ((minutesSinceMidnight % 1440) + 1440) % 1440;
  if (t < 300) return 'Night';
  if (t < 360) return 'Early Morning';
  if (t < 540) return 'Morning Rush';
  if (t < 660) return 'Mid Morning';
  if (t < 810) return 'Lunch Peak';
  if (t < 960) return 'Afternoon';
  if (t < 1080) return 'Evening Rush';
  if (t < 1320) return 'Evening';
  return 'Late Night';
}

export function formatSimulatedTime(minutesSinceMidnight: number): string {
  const t = ((minutesSinceMidnight % 1440) + 1440) % 1440;
  const h = Math.floor(t / 60).toString().padStart(2, '0');
  const m = Math.floor(t % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function getTrafficState(minutesSinceMidnight: number): TrafficState {
  return {
    minutesSinceMidnight,
    multiplier: getMultiplier(minutesSinceMidnight),
    phase: getPhase(minutesSinceMidnight),
    label: formatSimulatedTime(minutesSinceMidnight),
  };
}

// Deterministic hash per segment so each street has a consistent "character"
function segmentHash(from: [number, number], to: [number, number]): number {
  const str = `${from[0].toFixed(4)},${from[1].toFixed(4)}|${to[0].toFixed(4)},${to[1].toFixed(4)}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return (hash >>> 0) / 0xffffffff; // 0–1
}

/**
 * Apply time-of-day multiplier and per-segment variation to base flows.
 *
 * Each street segment has a deterministic "character" (peak time offset) derived
 * from its coordinates, so different streets activate at different times of day —
 * shopping streets peak at midday, commuter streets peak at rush hour, etc.
 * A small sinusoidal noise term adds micro-variation between updates.
 *
 * Returns a new SegmentUsage[] with updated counts and re-normalised values.
 */
export function applyTrafficVariation(
  baseFlows: SegmentUsage[],
  minutesSinceMidnight: number
): SegmentUsage[] {
  if (!baseFlows.length) return baseFlows;

  const globalMult = getMultiplier(minutesSinceMidnight);

  const varied = baseFlows.map(seg => {
    const hash = segmentHash(seg.from, seg.to);

    // Each segment has its own peak-time offset (±2 hours around the global curve)
    const phaseOffset = (hash - 0.5) * 240;
    const segMult = getMultiplier(minutesSinceMidnight + phaseOffset);

    // Blend 70 % global curve + 30 % segment-specific curve
    const blendedMult = globalMult * 0.7 + segMult * 0.3;

    // Micro-variation: ±10 % sinusoidal noise keyed to time + segment
    const noiseInput = (minutesSinceMidnight * 0.1 + hash * 360) % 360;
    const noise = 0.9 + 0.2 * Math.abs(Math.sin((noiseInput * Math.PI) / 180));

    return { ...seg, count: seg.count * blendedMult * noise };
  });

  // Re-normalise so the colour scale adapts to the current activity level
  const maxCount = Math.max(...varied.map(s => s.count), 1);
  return varied.map(seg => ({ ...seg, normalized: seg.count / maxCount }));
}
