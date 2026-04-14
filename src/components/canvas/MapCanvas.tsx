import { useEffect, useRef } from 'react';
import { useSimulation } from '@/hooks/useSimulation';
import { useTheme } from '@/context/ThemeContext';

export function MapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { initializeMap, resizeMap, getMapView, isLoading } = useSimulation();
  const { theme } = useTheme();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (containerRef.current && !initializedRef.current) {
      initializedRef.current = true;
      initializeMap('map');
    }
  }, [initializeMap]);

  // Apply dark/light mode to the MapLibre map whenever theme or loading state changes
  useEffect(() => {
    if (isLoading) return;
    getMapView()?.setDarkMode(theme === 'dark');
  }, [theme, isLoading, getMapView]);

  // Handle container resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      resizeMap();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [resizeMap]);

  return (
    <div
      id="map"
      ref={containerRef}
      className="w-full h-full bg-background"
    />
  );
}
