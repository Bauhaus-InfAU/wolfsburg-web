import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useSimulation } from '@/hooks/useSimulation';

export function SimulationParams() {
  const { speed, spawnRate, setSpeed, setSpawnRate } = useSimulation();

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex justify-between items-baseline">
          <Label className="text-muted-foreground text-xs">Speed</Label>
          <span className="font-mono text-sm font-medium">{speed}x</span>
        </div>
        <Slider
          value={[speed]}
          min={1}
          max={10}
          step={1}
          onValueChange={([val]) => setSpeed(val)}
        />
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-baseline">
          <Label className="text-muted-foreground text-xs">Spawn Rate</Label>
          <span className="font-mono text-sm font-medium">{spawnRate.toFixed(1)}</span>
        </div>
        <Slider
          value={[spawnRate]}
          min={0.1}
          max={5}
          step={0.1}
          onValueChange={([val]) => setSpawnRate(val)}
        />
      </div>
    </div>
  );
}
