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
        onClick={play}
      >
        <img
          src={isRunning ? "/weimar-web/icons/play.svg" : "/weimar-web/icons/play-white.svg"}
          alt=""
          className="w-4 h-4 mr-1.5"
        />
        Simulate
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="flex-1"
        onClick={pause}
      >
        <img src="/weimar-web/icons/pause.svg" alt="" className="w-4 h-4 mr-1.5" />
        Pause
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
