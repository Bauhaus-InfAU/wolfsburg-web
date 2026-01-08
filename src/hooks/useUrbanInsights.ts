import { useMemo, useState, useEffect } from 'react';
import { useSimulation } from './useSimulation';
import type { LandUse } from '../config/types';
import { LAND_USE_COLORS, LAND_USE_DISPLAY_NAMES } from '../config/constants';
import { MID_MAX_DISTANCE } from '../data/midMobilityData';

const REFRESH_INTERVAL_MS = 1000; // Refresh data every second

export interface TopStreet {
  from: [number, number];
  to: [number, number];
  count: number;
  normalized: number;
}

export interface ServiceDistance {
  landUse: LandUse;
  name: string;
  avgDistance: number;
  maxWalkable: number;
  color: string;
}

export interface UrbanInsights {
  // Infrastructure
  topStreets: TopStreet[];
  networkConcentration: number; // % of traffic on top 20% of streets
  totalSegments: number;
  maxStreetCount: number;

  // Accessibility
  serviceDistances: ServiceDistance[];
  walkabilityScore: number; // 0-100
}

export function useUrbanInsights(): UrbanInsights {
  const {
    getStreetUsage,
    getStreetUsageMax,
    getAverageDistancesByLandUse,
    enabledLandUses,
    isRunning,
  } = useSimulation();

  // Force periodic refresh while simulation is running
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setRefreshTick(t => t + 1);
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isRunning]);

  return useMemo(() => {
    // Get street usage data
    const segments = getStreetUsage();
    const maxCount = getStreetUsageMax();

    // Sort by count descending
    const sortedSegments = [...segments].sort((a, b) => b.count - a.count);

    // Top 5 streets
    const topStreets: TopStreet[] = sortedSegments.slice(0, 5).map(s => ({
      from: s.from,
      to: s.to,
      count: s.count,
      normalized: s.normalized,
    }));

    // Network concentration: what % of total traffic is on top 20% of streets
    let networkConcentration = 0;
    if (sortedSegments.length > 0) {
      const totalTraffic = sortedSegments.reduce((sum, s) => sum + s.count, 0);
      const top20Count = Math.max(1, Math.ceil(sortedSegments.length * 0.2));
      const top20Traffic = sortedSegments.slice(0, top20Count).reduce((sum, s) => sum + s.count, 0);
      networkConcentration = totalTraffic > 0 ? (top20Traffic / totalTraffic) * 100 : 0;
    }

    // Get distance data by land use
    const distancesByLandUse = getAverageDistancesByLandUse();

    // Build service distances array
    const serviceDistances: ServiceDistance[] = [];
    for (const landUse of enabledLandUses) {
      const data = distancesByLandUse.get(landUse);
      if (data && data.avgDistance > 0) {
        serviceDistances.push({
          landUse,
          name: LAND_USE_DISPLAY_NAMES[landUse],
          avgDistance: Math.round(data.avgDistance),
          maxWalkable: MID_MAX_DISTANCE[landUse] || 2000,
          color: LAND_USE_COLORS[landUse],
        });
      }
    }

    // Sort by distance (furthest first)
    serviceDistances.sort((a, b) => b.avgDistance - a.avgDistance);

    // Calculate walkability score (0-100)
    // Higher score = services are closer (better walkability)
    let walkabilityScore = 0;
    if (serviceDistances.length > 0) {
      const scores = serviceDistances.map(sd => {
        // Score is 100 when avgDistance = 0, 0 when avgDistance >= maxWalkable
        const ratio = Math.max(0, 1 - sd.avgDistance / sd.maxWalkable);
        return ratio * 100;
      });
      walkabilityScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }

    return {
      topStreets,
      networkConcentration: Math.round(networkConcentration),
      totalSegments: segments.length,
      maxStreetCount: maxCount,
      serviceDistances,
      walkabilityScore,
    };
  }, [getStreetUsage, getStreetUsageMax, getAverageDistancesByLandUse, enabledLandUses, refreshTick]);
}
