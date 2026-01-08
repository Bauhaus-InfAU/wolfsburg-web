import { Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSimulation } from '@/hooks/useSimulation';

export function PlaybackControls() {
  const { isRunning, play, pause, reset } = useSimulation();

  return (
    <div className="flex gap-2">
      <Button
        variant={isRunning ? "outline" : "default"}
        size="sm"
        className="flex-1"
        disabled={isRunning}
        onClick={play}
      >
        <Play className="w-3.5 h-3.5 mr-1.5" />
        Play
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="flex-1"
        disabled={!isRunning}
        onClick={pause}
      >
        <Pause className="w-3.5 h-3.5 mr-1.5" />
        Pause
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="flex-1"
        onClick={reset}
      >
        <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
        Reset
      </Button>
    </div>
  );
}
