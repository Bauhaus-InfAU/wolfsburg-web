import { Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSimulation } from '@/hooks/useSimulation';

export function PlaybackControls() {
  const { isRunning, play, pause, reset } = useSimulation();

  return (
    <div className="flex gap-2.5">
      <Button
        variant="outline"
        className="flex-1 hover:bg-primary hover:text-primary-foreground hover:border-primary"
        disabled={isRunning}
        onClick={play}
      >
        <Play className="w-4 h-4 mr-2" />
        Play
      </Button>
      <Button
        variant="outline"
        className="flex-1"
        disabled={!isRunning}
        onClick={pause}
      >
        <Pause className="w-4 h-4 mr-2" />
        Pause
      </Button>
      <Button
        variant="outline"
        className="flex-1"
        onClick={reset}
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        Reset
      </Button>
    </div>
  );
}
