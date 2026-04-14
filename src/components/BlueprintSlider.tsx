import { X } from 'lucide-react';
import type { Building } from '@/config/types';

interface Props {
  building: Building;
  isOpen: boolean;
  onClose: () => void;
}

interface SvgResult {
  paths: { d: string; isHole: boolean }[];
  viewBox: string;
}

/** Project the building's MultiPolygon rings into a square SVG canvas. */
function buildingToSvg(building: Building, size = 260, padding = 28): SvgResult {
  const geometry = building.feature.geometry;
  // Collect every coordinate across all polygons / rings
  const allCoords = geometry.coordinates.flatMap(poly => poly.flat());
  if (allCoords.length === 0) return { paths: [], viewBox: `0 0 ${size} ${size}` };

  const lngs = allCoords.map(c => c[0]);
  const lats = allCoords.map(c => c[1]);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const rangeW = maxLng - minLng || 1e-6;
  const rangeH = maxLat - minLat || 1e-6;

  // Uniform scale to keep shape proportions
  const drawArea = size - padding * 2;
  const scale = Math.min(drawArea / rangeW, drawArea / rangeH);
  const offsetX = padding + (drawArea - rangeW * scale) / 2;
  const offsetY = padding + (drawArea - rangeH * scale) / 2;

  const project = ([lng, lat]: number[]) => [
    offsetX + (lng - minLng) * scale,
    offsetY + (maxLat - lat) * scale, // flip Y axis
  ];

  const paths: { d: string; isHole: boolean }[] = [];

  geometry.coordinates.forEach(polygon => {
    polygon.forEach((ring, ringIdx) => {
      const pts = ring.map(project);
      const d = 'M ' + pts.map(p => p.map(v => v.toFixed(2)).join(' ')).join(' L ') + ' Z';
      paths.push({ d, isHole: ringIdx > 0 });
    });
  });

  return { paths, viewBox: `0 0 ${size} ${size}` };
}

export function BlueprintSlider({ building, isOpen, onClose }: Props) {
  const { paths, viewBox } = buildingToSvg(building);
  const totalArea = Array.from(building.landUseAreas.values()).reduce((s, a) => s + a, 0);

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 z-30 transition-transform duration-300 ease-out ${
        isOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'
      }`}
    >
      <div
        style={{ background: '#0a1628', borderTop: '1px solid rgba(0,200,255,0.25)' }}
        className="rounded-t-2xl shadow-2xl select-none"
      >
        {/* Drag handle / close strip */}
        <div
          className="flex justify-center items-center gap-3 py-3 cursor-pointer group"
          onClick={onClose}
        >
          <div className="w-10 h-1 rounded-full bg-[#00c8ff]/30 group-hover:bg-[#00c8ff]/60 transition-colors" />
        </div>

        {/* Header row */}
        <div className="flex items-center justify-between px-5 pb-3">
          <div>
            <p className="text-[9px] font-mono tracking-[0.2em] text-[#00c8ff]/50 uppercase mb-0.5">
              Floor Plan
            </p>
            <p className="text-[11px] font-mono font-semibold text-[#00c8ff] tracking-widest uppercase">
              {building.id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full border border-[#00c8ff]/20 hover:border-[#00c8ff]/50 text-[#00c8ff]/50 hover:text-[#00c8ff] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Blueprint SVG */}
        <div className="flex justify-center px-5 pb-3">
          <svg
            viewBox={viewBox}
            className="w-full max-w-xs"
            style={{ maxHeight: 200 }}
          >
            {/* Grid background */}
            <defs>
              <pattern id="bp-grid" width="16" height="16" patternUnits="userSpaceOnUse">
                <path
                  d="M 16 0 L 0 0 0 16"
                  fill="none"
                  stroke="#00c8ff"
                  strokeWidth="0.25"
                  opacity="0.18"
                />
              </pattern>
              <filter id="bp-glow">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <rect width="100%" height="100%" fill="url(#bp-grid)" />

            {/* Building footprint — outer shells */}
            {paths
              .filter(p => !p.isHole)
              .map((p, i) => (
                <path
                  key={`outer-${i}`}
                  d={p.d}
                  fill="#00c8ff"
                  fillOpacity="0.08"
                  stroke="#00c8ff"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                  filter="url(#bp-glow)"
                />
              ))}

            {/* Holes / courtyards */}
            {paths
              .filter(p => p.isHole)
              .map((p, i) => (
                <path
                  key={`hole-${i}`}
                  d={p.d}
                  fill="#0a1628"
                  stroke="#00c8ff"
                  strokeWidth="0.8"
                  strokeDasharray="3 2"
                  strokeOpacity="0.5"
                />
              ))}

            {/* North arrow */}
            <g transform="translate(14,14)">
              <line x1="0" y1="6" x2="0" y2="-6" stroke="#00c8ff" strokeWidth="1" opacity="0.5" />
              <polygon points="0,-8 -2.5,-3 2.5,-3" fill="#00c8ff" opacity="0.6" />
              <text x="0" y="14" textAnchor="middle" fontSize="5" fill="#00c8ff" opacity="0.5" fontFamily="monospace">N</text>
            </g>
          </svg>
        </div>

        {/* Stats strip */}
        <div
          style={{ borderTop: '1px solid rgba(0,200,255,0.12)' }}
          className="flex items-center justify-around px-5 py-3 pb-5"
        >
          {[
            { label: 'Height', value: `${building.height} m` },
            { label: 'Floors', value: String(building.floors) },
            { label: 'Floor Area', value: `${Math.round(totalArea).toLocaleString()} m²` },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-[8px] font-mono tracking-[0.15em] text-[#00c8ff]/40 uppercase mb-0.5">
                {label}
              </p>
              <p className="text-[12px] font-mono font-semibold text-[#00c8ff]">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
