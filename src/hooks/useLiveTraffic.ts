import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useFlow } from '../context/FlowContext';
import {
  getTrafficState,
  applyTrafficVariation,
  type TrafficState,
} from '../simulation/trafficSimulator';

/** How often (ms) the simulated clock ticks forward in real time. */
const UPDATE_INTERVAL_MS = 2000;

/** How many simulated minutes advance per tick. */
const TIME_STEP_MINUTES = 15;

export interface UseLiveTrafficReturn {
  isLive: boolean;
  setLive: (live: boolean) => void;
  simulatedMinutes: number;
  setTime: (minutes: number) => void;
  trafficState: TrafficState;
  /** True when no base calculation exists yet — controls are disabled. */
  isDisabled: boolean;
}

export function useLiveTraffic(): UseLiveTrafficReturn {
  const { getMapView, getStreetUsage, hasCalculated } = useFlow();

  const [isLive, setIsLiveState] = useState(false);
  const [simulatedMinutes, setSimulatedMinutes] = useState<number>(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const trafficState: TrafficState = useMemo(
    () => getTrafficState(simulatedMinutes),
    [simulatedMinutes]
  );

  // Keep a stable ref so the interval callback always calls the latest version
  const applyTrafficRef = useRef<(minutes: number) => void>(() => {});

  const applyTraffic = useCallback(
    (minutes: number) => {
      const mapView = getMapView();
      const baseFlows = getStreetUsage();
      if (!mapView || !baseFlows.length) return;
      mapView.updateHeatmapData(applyTrafficVariation(baseFlows, minutes));
    },
    [getMapView, getStreetUsage]
  );

  useEffect(() => {
    applyTrafficRef.current = applyTraffic;
  }, [applyTraffic]);

  const restoreBaseFlows = useCallback(() => {
    const mapView = getMapView();
    const baseFlows = getStreetUsage();
    if (mapView && baseFlows.length) {
      mapView.updateHeatmapData(baseFlows);
    }
  }, [getMapView, getStreetUsage]);

  // Start / stop the ticker
  useEffect(() => {
    if (!isLive || !hasCalculated) return;

    // Apply immediately when the ticker starts
    applyTrafficRef.current(simulatedMinutes);

    intervalRef.current = setInterval(() => {
      setSimulatedMinutes(prev => {
        const next = (prev + TIME_STEP_MINUTES) % 1440;
        applyTrafficRef.current(next);
        return next;
      });
    }, UPDATE_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // Intentionally omit simulatedMinutes — we don't want to restart the
    // interval just because the simulated clock ticked forward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, hasCalculated]);

  // Restore original flows when live mode is turned off
  useEffect(() => {
    if (!isLive) {
      restoreBaseFlows();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive]);

  const setLive = useCallback(
    (live: boolean) => {
      if (live && !hasCalculated) return;
      setIsLiveState(live);
    },
    [hasCalculated]
  );

  const setTime = useCallback(
    (minutes: number) => {
      setSimulatedMinutes(minutes);
      // Always preview when scrubbing, whether live or not
      applyTrafficRef.current(minutes);
    },
    []
  );

  return {
    isLive,
    setLive,
    simulatedMinutes,
    setTime,
    trafficState,
    isDisabled: !hasCalculated,
  };
}
