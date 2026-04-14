import { X } from 'lucide-react';
import type { Building } from '@/config/types';
import { LAND_USE_COLORS, LAND_USE_DISPLAY_NAMES } from '@/config/constants';
import type { LandUse } from '@/config/types';

interface Props {
  building: Building;
  isOpen: boolean;
  onClose: () => void;
}

// ── Plan view (top-down) ──────────────────────────────────────────────────────

function buildingToSvg(building: Building, size = 180, padding = 18) {
  const geometry = building.feature.geometry;
  const allCoords = geometry.coordinates.flatMap(poly => poly.flat());
  if (allCoords.length === 0) return { paths: [] as { d: string; isHole: boolean }[], viewBox: `0 0 ${size} ${size}` };

  const lngs = allCoords.map(c => c[0]);
  const lats = allCoords.map(c => c[1]);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const rangeW = maxLng - minLng || 1e-6;
  const rangeH = maxLat - minLat || 1e-6;

  const drawArea = size - padding * 2;
  const scale = Math.min(drawArea / rangeW, drawArea / rangeH);
  const offsetX = padding + (drawArea - rangeW * scale) / 2;
  const offsetY = padding + (drawArea - rangeH * scale) / 2;

  const project = ([lng, lat]: number[]) => [
    offsetX + (lng - minLng) * scale,
    offsetY + (maxLat - lat) * scale,
  ];

  const paths: { d: string; isHole: boolean }[] = [];
  geometry.coordinates.forEach(polygon => {
    polygon.forEach((ring, ringIdx) => {
      const pts = ring.map(project);
      const d = 'M ' + pts.map(p => p.map(v => v.toFixed(2)).join(',').replace(',', ' ')).join(' L ') + ' Z';
      paths.push({ d, isHole: ringIdx > 0 });
    });
  });

  return { paths, viewBox: `0 0 ${size} ${size}` };
}

// ── Isometric view ────────────────────────────────────────────────────────────

interface WallFace { d: string; facing: 'right' | 'left' }
interface IsoResult { walls: WallFace[]; roofPath: string; groundPath: string; viewBox: string }

function buildingToIsometric(building: Building, svgW = 220, svgH = 180): IsoResult {
  const geometry = building.feature.geometry;
  const allCoords = geometry.coordinates.flatMap(poly => poly.flat());

  const empty: IsoResult = { walls: [], roofPath: '', groundPath: '', viewBox: `0 0 ${svgW} ${svgH}` };
  if (allCoords.length === 0) return empty;

  const lngs = allCoords.map(c => c[0]);
  const lats = allCoords.map(c => c[1]);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const rangeW = maxLng - minLng || 1e-6;
  const rangeH = maxLat - minLat || 1e-6;

  // Normalize footprint to [0..N] space
  const N = 80;
  const scale = Math.min(N / rangeW, N / rangeH);
  const ox = (N - rangeW * scale) / 2;
  const oy = (N - rangeH * scale) / 2;
  const norm = ([lng, lat]: number[]): [number, number] => [
    ox + (lng - minLng) * scale,
    oy + (maxLat - lat) * scale,   // Y flip
  ];

  // Height in normalized units (proportional to footprint size)
  const footMeters = Math.max(rangeW, rangeH) * 111_000;
  const hNorm = Math.min(Math.max((building.height / footMeters) * N, 7), 52);

  // Isometric projection: viewer looks from front-right (SE)
  const COS30 = Math.cos(Math.PI / 6); // ≈ 0.866
  const toIso = (nx: number, ny: number, nz = 0) => ({
    x: (nx - ny) * COS30,
    y: (nx + ny) * 0.5 - nz,
  });

  // Compute projected bounding box for centering
  const normAll = allCoords.map(norm);
  const allIso = normAll.flatMap(([nx, ny]) => [toIso(nx, ny, 0), toIso(nx, ny, hNorm)]);
  const minIsoX = Math.min(...allIso.map(p => p.x));
  const maxIsoX = Math.max(...allIso.map(p => p.x));
  const minIsoY = Math.min(...allIso.map(p => p.y));
  const maxIsoY = Math.max(...allIso.map(p => p.y));
  const isoRangeX = maxIsoX - minIsoX || 1;
  const isoRangeY = maxIsoY - minIsoY || 1;

  const pad = 14;
  const isoScale = Math.min((svgW - pad * 2) / isoRangeX, (svgH - pad * 2) / isoRangeY);

  const project = (nx: number, ny: number, nz = 0) => {
    const p = toIso(nx, ny, nz);
    return {
      x: pad + (p.x - minIsoX) * isoScale,
      y: pad + (p.y - minIsoY) * isoScale,
    };
  };
  const ps = (nx: number, ny: number, nz = 0) => {
    const p = project(nx, ny, nz);
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  };

  const walls: WallFace[] = [];
  const roofParts: string[] = [];

  geometry.coordinates.forEach(polygon => {
    polygon.forEach((ring, _ringIdx) => {
      const pts = ring.map(norm);

      // Roof: each polygon ring contributes a sub-path (evenodd handles holes)
      roofParts.push('M ' + pts.map(([nx, ny]) => ps(nx, ny, hNorm)).join(' L ') + ' Z');

      // Wall faces per edge
      for (let i = 0; i < pts.length - 1; i++) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[i + 1];

        const pBL = project(x1, y1, 0);
        const pBR = project(x2, y2, 0);
        const pTR = project(x2, y2, hNorm);
        const pTL = project(x1, y1, hNorm);

        // Signed area of the projected quad (2× actual).
        // Positive → CCW in screen space → facing viewer → visible.
        const sa =
          (pBL.x * pBR.y - pBR.x * pBL.y) +
          (pBR.x * pTR.y - pTR.x * pBR.y) +
          (pTR.x * pTL.y - pTL.x * pTR.y) +
          (pTL.x * pBL.y - pBL.x * pTL.y);

        if (sa <= 0) continue; // back face, skip

        const d = `M ${ps(x1,y1,0)} L ${ps(x2,y2,0)} L ${ps(x2,y2,hNorm)} L ${ps(x1,y1,hNorm)} Z`;
        // Bottom edge going right-to-left in screen → "right face" (lighter)
        const facing: 'right' | 'left' = pBR.x < pBL.x ? 'right' : 'left';
        walls.push({ d, facing });
      }
    });
  });

  // Ground shadow — outer ring of first polygon at z=0
  const groundRing = geometry.coordinates[0]?.[0] ?? [];
  const groundPath = groundRing.length
    ? 'M ' + groundRing.map(norm).map(([nx, ny]) => ps(nx, ny, 0)).join(' L ') + ' Z'
    : '';

  return { walls, roofPath: roofParts.join(' '), groundPath, viewBox: `0 0 ${svgW} ${svgH}` };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BlueprintSlider({ building, isOpen, onClose }: Props) {
  const plan = buildingToSvg(building);
  const iso  = buildingToIsometric(building);

  const totalArea = Array.from(building.landUseAreas.values()).reduce((s, a) => s + a, 0);
  const sortedLandUses = Array.from(building.landUseAreas.entries())
    .filter(([, area]) => area > 0)
    .sort((a, b) => b[1] - a[1]);

  const stats = [
    { label: 'Height',    value: `${building.height} m` },
    { label: 'Floors',    value: String(building.floors) },
    { label: 'Floor Area', value: `${Math.round(totalArea).toLocaleString()} m²` },
    { label: 'Residents', value: building.estimatedResidents > 0 ? Math.round(building.estimatedResidents).toLocaleString() : '—' },
  ];

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
        {/* Drag handle */}
        <div className="flex justify-center py-3 cursor-pointer group" onClick={onClose}>
          <div className="w-10 h-1 rounded-full bg-[#00c8ff]/30 group-hover:bg-[#00c8ff]/60 transition-colors" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <div>
            <p className="text-[9px] font-mono tracking-[0.2em] text-[#00c8ff]/50 uppercase mb-0.5">Blueprint</p>
            <p className="text-[11px] font-mono font-semibold text-[#00c8ff] tracking-widest uppercase truncate max-w-[180px]">
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

        {/* Scrollable body */}
        <div className="overflow-y-auto" style={{ maxHeight: '65vh' }}>

          {/* ── Plan + Isometric side by side ── */}
          <div className="flex gap-2 px-4 pb-2">

            {/* Plan view */}
            <div className="flex-1 flex flex-col">
              <p className="text-[8px] font-mono tracking-[0.18em] text-[#00c8ff]/40 uppercase mb-1 text-center">
                Floor Plan
              </p>
              <svg viewBox={plan.viewBox} style={{ width: '100%', display: 'block' }}>
                <defs>
                  <pattern id="plan-grid" width="14" height="14" patternUnits="userSpaceOnUse">
                    <path d="M 14 0 L 0 0 0 14" fill="none" stroke="#00c8ff" strokeWidth="0.2" opacity="0.18" />
                  </pattern>
                  <filter id="plan-glow">
                    <feGaussianBlur stdDeviation="1.2" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <rect width="100%" height="100%" fill="url(#plan-grid)" />

                {/* Outer shells */}
                {plan.paths.filter(p => !p.isHole).map((p, i) => (
                  <path key={`po-${i}`} d={p.d}
                    fill="#00c8ff" fillOpacity="0.08"
                    stroke="#00c8ff" strokeWidth="1.3" strokeLinejoin="round"
                    filter="url(#plan-glow)" />
                ))}
                {/* Courtyards */}
                {plan.paths.filter(p => p.isHole).map((p, i) => (
                  <path key={`ph-${i}`} d={p.d}
                    fill="#0a1628" stroke="#00c8ff"
                    strokeWidth="0.8" strokeDasharray="3 2" strokeOpacity="0.45" />
                ))}
                {/* North arrow */}
                <g transform="translate(13,13)">
                  <line x1="0" y1="5" x2="0" y2="-5" stroke="#00c8ff" strokeWidth="1" opacity="0.45" />
                  <polygon points="0,-7 -2,-3 2,-3" fill="#00c8ff" opacity="0.55" />
                  <text x="0" y="13" textAnchor="middle" fontSize="4.5" fill="#00c8ff" opacity="0.45" fontFamily="monospace">N</text>
                </g>
              </svg>
            </div>

            {/* Isometric view */}
            <div className="flex-1 flex flex-col">
              <p className="text-[8px] font-mono tracking-[0.18em] text-[#00c8ff]/40 uppercase mb-1 text-center">
                Isometric
              </p>
              <svg viewBox={iso.viewBox} style={{ width: '100%', display: 'block' }}>
                <defs>
                  <filter id="iso-glow">
                    <feGaussianBlur stdDeviation="1.4" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>

                {/* Ground shadow */}
                {iso.groundPath && (
                  <path d={iso.groundPath} fill="#00c8ff" fillOpacity="0.05" stroke="none" />
                )}

                {/* Left-facing walls — darker */}
                {iso.walls.filter(w => w.facing === 'left').map((w, i) => (
                  <path key={`wl-${i}`} d={w.d}
                    fill="#00c8ff" fillOpacity="0.06"
                    stroke="#00c8ff" strokeWidth="0.75" strokeOpacity="0.35"
                    strokeLinejoin="round" />
                ))}

                {/* Right-facing walls — lighter */}
                {iso.walls.filter(w => w.facing === 'right').map((w, i) => (
                  <path key={`wr-${i}`} d={w.d}
                    fill="#00c8ff" fillOpacity="0.12"
                    stroke="#00c8ff" strokeWidth="0.75" strokeOpacity="0.6"
                    strokeLinejoin="round" />
                ))}

                {/* Roof */}
                {iso.roofPath && (
                  <path d={iso.roofPath} fillRule="evenodd"
                    fill="#00c8ff" fillOpacity="0.18"
                    stroke="#00c8ff" strokeWidth="1.1" strokeOpacity="0.85"
                    strokeLinejoin="round" filter="url(#iso-glow)" />
                )}
              </svg>
            </div>
          </div>

          {/* ── Stats row ── */}
          <div style={{ borderTop: '1px solid rgba(0,200,255,0.12)' }}
               className="grid grid-cols-4 divide-x divide-[#00c8ff]/10 py-3">
            {stats.map(({ label, value }) => (
              <div key={label} className="text-center px-1">
                <p className="text-[7.5px] font-mono tracking-[0.15em] text-[#00c8ff]/40 uppercase mb-0.5 leading-none">
                  {label}
                </p>
                <p className="text-[11px] font-mono font-semibold text-[#00c8ff] leading-tight">
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* ── Land Use breakdown ── */}
          {sortedLandUses.length > 0 && (
            <div style={{ borderTop: '1px solid rgba(0,200,255,0.12)' }}
                 className="px-5 py-3 pb-6">
              <p className="text-[8px] font-mono tracking-[0.18em] text-[#00c8ff]/40 uppercase mb-2.5">
                Land Use Breakdown
              </p>
              <div className="space-y-2">
                {sortedLandUses.map(([landUse, area]) => {
                  const pct = totalArea > 0 ? (area / totalArea) * 100 : 0;
                  const color = LAND_USE_COLORS[landUse as LandUse];
                  return (
                    <div key={landUse}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }} />
                        <span className="text-[9.5px] font-mono text-[#00c8ff]/65 truncate flex-1">
                          {LAND_USE_DISPLAY_NAMES[landUse as LandUse]}
                        </span>
                        <span className="text-[9px] font-mono text-[#00c8ff]/45 tabular-nums flex-shrink-0">
                          {Math.round(area).toLocaleString()} m²
                        </span>
                        <span className="text-[9px] font-mono text-[#00c8ff]/30 tabular-nums flex-shrink-0 w-7 text-right">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="h-[3px] rounded-full" style={{ background: 'rgba(0,200,255,0.08)' }}>
                        <div className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.65 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
