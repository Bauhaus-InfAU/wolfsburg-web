import { useEffect, useRef } from 'react';
import { useSimulation } from '@/hooks/useSimulation';

export function MapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { initializeMap } = useSimulation();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (containerRef.current && !initializedRef.current) {
      initializedRef.current = true;
      initializeMap('map');
    }
  }, [initializeMap]);

  return (
    <div
      id="map"
      ref={containerRef}
      className="flex-1 h-full bg-background relative"
    />
  );
}
