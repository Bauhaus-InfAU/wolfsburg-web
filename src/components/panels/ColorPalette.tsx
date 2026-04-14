import { useRef, useCallback, useState, useEffect } from 'react';

interface ColorPaletteProps {
  color: string;
  onChange: (color: string) => void;
}

/**
 * HSL to RGB conversion.
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

/**
 * RGB to hex conversion.
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Hex to HSL conversion.
 */
function hexToHsl(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0.5, 0.5];

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, l];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;

  return [h, s, l];
}

/**
 * Color palette with hue slider and saturation/lightness area.
 */
export function ColorPalette({ color, onChange }: ColorPaletteProps) {
  const [hsl, setHsl] = useState<[number, number, number]>(() => hexToHsl(color));
  const slAreaRef = useRef<HTMLDivElement>(null);
  const hueBarRef = useRef<HTMLDivElement>(null);
  const [isDraggingSL, setIsDraggingSL] = useState(false);
  const [isDraggingHue, setIsDraggingHue] = useState(false);

  // Update internal state when external color changes
  useEffect(() => {
    const newHsl = hexToHsl(color);
    // Only update if significantly different to avoid fighting with drag
    if (Math.abs(newHsl[0] - hsl[0]) > 5 || Math.abs(newHsl[1] - hsl[1]) > 0.05 || Math.abs(newHsl[2] - hsl[2]) > 0.05) {
      setHsl(newHsl);
    }
  }, [color]);

  const updateColor = useCallback((h: number, s: number, l: number) => {
    setHsl([h, s, l]);
    const [r, g, b] = hslToRgb(h, s, l);
    onChange(rgbToHex(r, g, b));
  }, [onChange]);

  const handleSLChange = useCallback((clientX: number, clientY: number) => {
    if (!slAreaRef.current) return;
    const rect = slAreaRef.current.getBoundingClientRect();
    const s = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const l = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
    updateColor(hsl[0], s, l);
  }, [hsl, updateColor]);

  const handleHueChange = useCallback((clientX: number) => {
    if (!hueBarRef.current) return;
    const rect = hueBarRef.current.getBoundingClientRect();
    const h = Math.max(0, Math.min(360, ((clientX - rect.left) / rect.width) * 360));
    updateColor(h, hsl[1], hsl[2]);
  }, [hsl, updateColor]);

  const handleSLMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSL(true);
    handleSLChange(e.clientX, e.clientY);
  }, [handleSLChange]);

  const handleHueMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingHue(true);
    handleHueChange(e.clientX);
  }, [handleHueChange]);

  useEffect(() => {
    if (!isDraggingSL && !isDraggingHue) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSL) handleSLChange(e.clientX, e.clientY);
      if (isDraggingHue) handleHueChange(e.clientX);
    };

    const handleMouseUp = () => {
      setIsDraggingSL(false);
      setIsDraggingHue(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSL, isDraggingHue, handleSLChange, handleHueChange]);

  const [h, s, l] = hsl;

  return (
    <div className="space-y-2">
      {/* Saturation/Lightness area */}
      <div
        ref={slAreaRef}
        className="relative h-24 rounded cursor-crosshair select-none"
        style={{
          background: `
            linear-gradient(to top, #000, transparent),
            linear-gradient(to right, #fff, hsl(${h}, 100%, 50%))
          `,
        }}
        onMouseDown={handleSLMouseDown}
      >
        {/* Picker indicator */}
        <div
          className="absolute w-3 h-3 border-2 border-white rounded-full shadow-md pointer-events-none"
          style={{
            left: `calc(${s * 100}% - 6px)`,
            top: `calc(${(1 - l) * 100}% - 6px)`,
            boxShadow: '0 0 0 1px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.3)',
          }}
        />
      </div>

      {/* Hue bar */}
      <div
        ref={hueBarRef}
        className="relative h-3 rounded-full cursor-crosshair select-none"
        style={{
          background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
        }}
        onMouseDown={handleHueMouseDown}
      >
        {/* Hue indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-white rounded-full shadow-md pointer-events-none"
          style={{
            left: `calc(${(h / 360) * 100}% - 6px)`,
            backgroundColor: `hsl(${h}, 100%, 50%)`,
            boxShadow: '0 0 0 1px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.3)',
          }}
        />
      </div>
    </div>
  );
}
