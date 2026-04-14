import { useMemo } from 'react';
import { useSunPath } from '@/context/SunPathContext';
import { getSunArc, getSunPosition, getSunTimes } from '@/simulation/sunPosition';
import { getCityConfig } from '@/config/cityConfig';

// Diagram geometry
const R   = 70;   // horizon circle radius
const CX  = 92;   // centre x (leaves room for W label)
const CY  = 90;   // centre y (leaves room for N label)
const SVG_W = 184;
const SVG_H = 184;

/** Stereographic projection: zenith → centre, horizon → edge */
function toXY(azimuth: number, elevation: number): [number, number] {
  const r = (1 - Math.max(0, elevation) / 90) * R;
  const a = (azimuth * Math.PI) / 180;
  return [CX + r * Math.sin(a), CY - r * Math.cos(a)];
}

function fmtMin(m: number) {
  const h   = Math.floor(m / 60) % 24;
  const min = Math.floor(m % 60);
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

const COMPASS = [
  { az: 0,   label: 'N' },
  { az: 90,  label: 'E' },
  { az: 180, label: 'S' },
  { az: 270, label: 'W' },
];

export function SunArcOverlay() {
  const { minuteOfDay, currentDate, showSunPath } = useSunPath();

  const cfg = getCityConfig();
  const lat = cfg.center[1];
  const lng = cfg.center[0];

  // Full-day arc (every 5 min), memoised on date
  const arc = useMemo(
    () => getSunArc(currentDate, lat, lng, 5),
    [currentDate, lat, lng],
  );

  // Hour tick positions (every 2 h, above-horizon only)
  const hourTicks = useMemo(() => {
    const ticks: { x: number; y: number; label: string }[] = [];
    for (let h = 0; h < 24; h += 2) {
      const d = new Date(currentDate);
      d.setHours(0, 0, 0, 0);
      d.setMinutes(h * 60);
      const pos = getSunPosition(d, lat, lng);
      if (pos.elevation < 3) continue;
      const [x, y] = toXY(pos.azimuth, pos.elevation);
      ticks.push({ x, y, label: String(h) });
    }
    return ticks;
  }, [currentDate, lat, lng]);

  const simDate = useMemo(() => {
    const d = new Date(currentDate);
    d.setHours(0, 0, 0, 0);
    d.setMinutes(Math.round(minuteOfDay));
    return d;
  }, [currentDate, minuteOfDay]);

  const sun   = getSunPosition(simDate, lat, lng);
  const times = getSunTimes(currentDate, lat, lng);

  if (!showSunPath) return null;

  // Build SVG path for above-horizon portion of the arc
  const pathParts: string[] = [];
  let cmd = 'M';
  for (const p of arc) {
    if (p.elevation < 0) { cmd = 'M'; continue; }
    const [x, y] = toXY(p.azimuth, p.elevation);
    pathParts.push(`${cmd}${x.toFixed(1)},${y.toFixed(1)}`);
    cmd = 'L';
  }
  const arcPath = pathParts.join(' ');

  // Current sun screen position (null when below horizon)
  const [sx, sy] = sun.elevation > 0
    ? toXY(sun.azimuth, sun.elevation)
    : [null, null];

  return (
    <div className="absolute top-4 right-4 z-20 pointer-events-none select-none">
      <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border shadow-lg p-1">
        <svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`}>

          {/* Altitude rings at 30° and 60° */}
          {[30, 60].map(e => (
            <circle
              key={e}
              cx={CX} cy={CY}
              r={((1 - e / 90) * R)}
              fill="none"
              stroke="currentColor"
              strokeWidth={0.5}
              strokeDasharray="2,3"
              opacity={0.2}
            />
          ))}

          {/* Horizon circle */}
          <circle cx={CX} cy={CY} r={R}
            fill="none" stroke="currentColor" strokeWidth={1} opacity={0.35} />

          {/* Cardinal tick marks */}
          {COMPASS.map(({ az }) => {
            const a = (az * Math.PI) / 180;
            return (
              <line key={az}
                x1={CX + (R - 7) * Math.sin(a)} y1={CY - (R - 7) * Math.cos(a)}
                x2={CX +  R      * Math.sin(a)} y2={CY -  R      * Math.cos(a)}
                stroke="currentColor" strokeWidth={1} opacity={0.4}
              />
            );
          })}

          {/* Compass labels */}
          {COMPASS.map(({ az, label }) => {
            const a   = (az * Math.PI) / 180;
            const pad = 12;
            return (
              <text
                key={label}
                x={CX + (R + pad) * Math.sin(a)}
                y={CY - (R + pad) * Math.cos(a)}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={8}
                fill="currentColor"
                opacity={0.5}
                fontFamily="monospace"
              >
                {label}
              </text>
            );
          })}

          {/* Sun arc (above horizon) */}
          {arcPath && (
            <path
              d={arcPath}
              fill="none"
              stroke="#f97316"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.85}
            />
          )}

          {/* Hour tick dots + labels */}
          {hourTicks.map(({ x, y, label }) => (
            <g key={label}>
              <circle cx={x} cy={y} r={1.8} fill="#f97316" opacity={0.65} />
              <text
                x={x + 4} y={y - 3}
                fontSize={6}
                fill="#f97316"
                opacity={0.75}
                fontFamily="monospace"
              >
                {label}h
              </text>
            </g>
          ))}

          {/* Current sun position */}
          {sx != null && sy != null && (
            <>
              {/* Outer glow */}
              <circle cx={sx} cy={sy} r={9}  fill="#fbbf24" opacity={0.15} />
              <circle cx={sx} cy={sy} r={6}  fill="#fbbf24" opacity={0.25} />
              {/* Sun disc */}
              <circle cx={sx} cy={sy} r={4.5} fill="#fbbf24" opacity={0.95} />
              {/* Bright core */}
              <circle cx={sx} cy={sy} r={1.8} fill="white"   opacity={0.9}  />
            </>
          )}

          {/* Night indicator */}
          {(sx == null) && (
            <text
              x={CX} y={CY + 5}
              textAnchor="middle"
              fontSize={22}
              opacity={0.25}
            >
              🌙
            </text>
          )}
        </svg>

        {/* Sunrise / sunset row */}
        {!isNaN(times.sunrise) && (
          <div className="flex justify-between px-2 pb-1 text-[9px] text-muted-foreground font-mono">
            <span>↑ {fmtMin(times.sunrise)}</span>
            <span>↓ {fmtMin(times.sunset)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
