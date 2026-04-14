import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useLiveTraffic } from '@/hooks/useLiveTraffic';
import type { TrafficPhase } from '@/simulation/trafficSimulator';

const PHASE_COLORS: Record<TrafficPhase, string> = {
  'Night':         'text-blue-400',
  'Early Morning': 'text-orange-300',
  'Morning Rush':  'text-amber-500',
  'Mid Morning':   'text-yellow-500',
  'Lunch Peak':    'text-orange-500',
  'Afternoon':     'text-yellow-400',
  'Evening Rush':  'text-red-500',
  'Evening':       'text-purple-400',
  'Late Night':    'text-blue-500',
};

export function LiveTrafficPanel() {
  const {
    isLive,
    setLive,
    simulatedMinutes,
    setTime,
    trafficState,
    isDisabled,
  } = useLiveTraffic();

  const intensityPct = Math.round(trafficState.multiplier * 100);
  const phaseColor = PHASE_COLORS[trafficState.phase];

  return (
    <div className={cn('space-y-3', isDisabled && 'opacity-50 pointer-events-none')}>
      {isDisabled && (
        <p className="text-[10px] text-muted-foreground text-center">
          Calculate flows first to enable live traffic
        </p>
      )}

      {/* Status row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-block w-2 h-2 rounded-full',
              isLive ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/50'
            )}
          />
          <span className="text-[11px] text-muted-foreground">
            {isLive ? 'Running' : 'Stopped'}
          </span>
        </div>
        <Button
          size="sm"
          variant={isLive ? 'default' : 'outline'}
          className="h-7 px-3 text-[11px] rounded-full"
          onClick={() => setLive(!isLive)}
          disabled={isDisabled}
        >
          {isLive ? 'Stop' : 'Start'}
        </Button>
      </div>

      {/* Time + phase */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Simulated Time
          </p>
          <p className="text-xl font-mono font-semibold text-foreground mt-0.5">
            {trafficState.label}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Phase</p>
          <p className={cn('text-[11px] font-medium mt-0.5', phaseColor)}>
            {trafficState.phase}
          </p>
        </div>
      </div>

      {/* Intensity bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Intensity
          </span>
          <span className="text-[11px] font-mono text-foreground">{intensityPct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${intensityPct}%` }}
          />
        </div>
      </div>

      {/* Time scrubber */}
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
          Set Time
        </p>
        <div className="px-1">
          <Slider
            min={0}
            max={1439}
            step={15}
            value={[simulatedMinutes]}
            onValueChange={([v]) => setTime(v)}
            className="w-full"
          />
          <div className="flex justify-between mt-1.5">
            {['00:00', '06:00', '12:00', '18:00', '24:00'].map(label => (
              <span key={label} className="text-[9px] text-muted-foreground">
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
