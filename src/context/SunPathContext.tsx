import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface SunPathContextValue {
  minuteOfDay: number;
  setMinuteOfDay: (m: number) => void;
  currentDate: Date;
  setCurrentDate: (d: Date) => void;
  isPlaying: boolean;
  togglePlay: () => void;
  animationSpeed: number;  // simulated minutes per real second
  setAnimationSpeed: (s: number) => void;
  showShadows: boolean;
  toggleShadows: () => void;
  shadowOpacity: number;
  setShadowOpacity: (o: number) => void;
  showSunPath: boolean;
  toggleSunPath: () => void;
}

const SunPathContext = createContext<SunPathContextValue | null>(null);

export function SunPathProvider({ children }: { children: React.ReactNode }) {
  const now = new Date();

  const [minuteOfDay, setMinuteOfDayState] = useState<number>(
    now.getHours() * 60 + now.getMinutes()
  );
  const [currentDate, setCurrentDate] = useState<Date>(now);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(60); // 60 sim-min / real-sec
  const [showShadows, setShowShadows] = useState(true);
  const [shadowOpacity, setShadowOpacity] = useState(0.35);
  const [showSunPath, setShowSunPath] = useState(true);

  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef  = useRef<number>(0);
  const minuteRef    = useRef<number>(minuteOfDay);

  // Keep minuteRef in sync so animation closure always has latest value
  useEffect(() => { minuteRef.current = minuteOfDay; }, [minuteOfDay]);

  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current != null) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const tick = (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const dtSec = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      const next = (minuteRef.current + dtSec * animationSpeed) % 1440;
      minuteRef.current = next;
      setMinuteOfDayState(next);

      animFrameRef.current = requestAnimationFrame(tick);
    };

    lastTimeRef.current = 0;
    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current != null) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, animationSpeed]);

  const setMinuteOfDay = useCallback((m: number) => {
    minuteRef.current = m;
    setMinuteOfDayState(m);
  }, []);

  const togglePlay     = useCallback(() => setIsPlaying(p => !p), []);
  const toggleShadows  = useCallback(() => setShowShadows(p => !p), []);
  const toggleSunPath  = useCallback(() => setShowSunPath(p => !p), []);

  return (
    <SunPathContext.Provider value={{
      minuteOfDay, setMinuteOfDay,
      currentDate, setCurrentDate,
      isPlaying, togglePlay,
      animationSpeed, setAnimationSpeed,
      showShadows, toggleShadows,
      shadowOpacity, setShadowOpacity,
      showSunPath, toggleSunPath,
    }}>
      {children}
    </SunPathContext.Provider>
  );
}

export function useSunPath(): SunPathContextValue {
  const ctx = useContext(SunPathContext);
  if (!ctx) throw new Error('useSunPath must be used within SunPathProvider');
  return ctx;
}
