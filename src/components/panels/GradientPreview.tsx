import type { HeatmapGradient } from '@/config/gradientPresets';

interface GradientPreviewProps {
  gradient: HeatmapGradient;
  className?: string;
}

/**
 * Displays a gradient preview bar using CSS linear-gradient.
 * Supports variable number of stops.
 */
export function GradientPreview({ gradient, className = '' }: GradientPreviewProps) {
  const sortedStops = [...gradient.stops].sort((a, b) => a.position - b.position);

  const gradientStyle = {
    background: `linear-gradient(to right, ${sortedStops.map(s => `${s.color} ${s.position * 100}%`).join(', ')})`,
  };

  return (
    <div
      className={`h-3 rounded-full ${className}`}
      style={gradientStyle}
    />
  );
}
