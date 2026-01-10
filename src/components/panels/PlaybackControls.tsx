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
        onClick={isRunning ? pause : play}
      >
        <img
          src={isRunning ? "/weimar-web/icons/pause.svg" : "/weimar-web/icons/play-white.svg"}
          alt=""
          className="w-4 h-4 mr-1.5"
        />
        {isRunning ? "Pause" : "Simulate"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="flex-1"
        onClick={reset}
      >
        <img src="/weimar-web/icons/reset.svg" alt="" className="w-4 h-4 mr-1.5" />
        Reset
      </Button>
    </div>
  );
}
