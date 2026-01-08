import { useEffect, useRef } from 'react';
import { useSimulation } from '@/hooks/useSimulation';

export function MapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { initializeMap, resizeMap } = useSimulation();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (containerRef.current && !initializedRef.current) {
      initializedRef.current = true;
      initializeMap('map');
    }
  }, [initializeMap]);

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
      className="flex-1 h-full bg-background relative"
    />
  );
}
