import { useSunPath } from '@/context/SunPathContext';
import { getSunPosition, getSunTimes } from '@/simulation/sunPosition';
import { getCityConfig } from '@/config/cityConfig';

/** Format minutes-since-midnight as HH:MM */
function fmtMin(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const min = Math.floor(m % 60);
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** Format a Date as YYYY-MM-DD for <input type="date"> */
function dateToInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function inputToDate(s: string): Date {
  const [y, mo, day] = s.split('-').map(Number);
  return new Date(y, mo - 1, day);
}

const SPEEDS = [10, 30, 60, 120, 300];

/** Inner controls — rendered inside ControlPanel's collapsible section */
export function SunPathContent() {
  const {
    minuteOfDay, setMinuteOfDay,
    currentDate, setCurrentDate,
    isPlaying, togglePlay,
    animationSpeed, setAnimationSpeed,
    showShadows, toggleShadows,
    shadowOpacity, setShadowOpacity,
    showSunPath, toggleSunPath,
  } = useSunPath();

  const cfg = getCityConfig();
  const lat = cfg.center[1];
  const lng = cfg.center[0];

  const simDate = new Date(currentDate);
  simDate.setHours(0, 0, 0, 0);
  simDate.setMinutes(Math.round(minuteOfDay));

  const sun   = getSunPosition(simDate, lat, lng);
  const times = getSunTimes(currentDate, lat, lng);

  const isDaytime = sun.elevation > 0;
  const sunLabel  = isDaytime
    ? `${sun.elevation.toFixed(1)}° elev · ${sun.azimuth.toFixed(0)}° az`
    : 'Below horizon';

  return (
    <div className="space-y-3">
      {/* Date picker */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground w-10">Date</label>
        <input
          type="date"
          value={dateToInput(currentDate)}
          onChange={e => setCurrentDate(inputToDate(e.target.value))}
          className="flex-1 text-xs bg-background border border-border rounded px-2 py-1 text-foreground"
        />
      </div>

      {/* Time slider */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs text-muted-foreground">Time</label>
          <span className="text-xs font-mono font-semibold text-foreground">{fmtMin(minuteOfDay)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={1439}
          step={1}
          value={Math.round(minuteOfDay)}
          onChange={e => setMinuteOfDay(Number(e.target.value))}
          className="w-full accent-primary"
        />
        {!isNaN(times.sunrise) && (
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>🌅 {fmtMin(times.sunrise)}</span>
            <span>🌇 {fmtMin(times.sunset)}</span>
          </div>
        )}
      </div>

      {/* Playback controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={togglePlay}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          {isPlaying
            ? <rect width="10" height="10" x="7" y="7" fill="currentColor" />
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>}
        </button>
        <div className="flex gap-1 flex-wrap">
          {SPEEDS.map(s => (
            <button
              key={s}
              onClick={() => setAnimationSpeed(s)}
              className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                animationSpeed === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {s >= 60 ? `${s / 60}h` : `${s}m`}/s
            </button>
          ))}
        </div>
      </div>

      {/* Sun info */}
      <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs ${
        isDaytime ? 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-muted text-muted-foreground'
      }`}>
        <span className="text-base">{isDaytime ? '☀️' : '🌙'}</span>
        <span>{sunLabel}</span>
      </div>

      {/* Toggles */}
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showSunPath}
            onChange={toggleSunPath}
            className="accent-primary"
          />
          <span className="text-xs text-foreground">Show sun arc</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showShadows}
            onChange={toggleShadows}
            className="accent-primary"
          />
          <span className="text-xs text-foreground">Show shadows</span>
        </label>

        {showShadows && (
          <div className="flex items-center gap-2 pl-5">
            <label className="text-xs text-muted-foreground w-14">Opacity</label>
            <input
              type="range"
              min={0.1}
              max={0.8}
              step={0.05}
              value={shadowOpacity}
              onChange={e => setShadowOpacity(Number(e.target.value))}
              className="flex-1 accent-primary"
            />
            <span className="text-xs text-muted-foreground w-8 text-right">
              {Math.round(shadowOpacity * 100)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
