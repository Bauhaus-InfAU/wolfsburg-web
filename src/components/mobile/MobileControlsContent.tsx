import { PlaybackControls } from '@/components/panels/PlaybackControls';
import { SimulationParams } from '@/components/panels/SimulationParams';
import { LandUseToggles } from '@/components/panels/LandUseToggles';
import { VisualizationToggles } from '@/components/panels/VisualizationToggles';
import { StatsDisplay } from '@/components/panels/StatsDisplay';

export function MobileControlsContent() {
  return (
    <div className="p-4 space-y-4">
      {/* Playback */}
      <section>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Playback
        </h3>
        <PlaybackControls />
        <div className="mt-3">
          <StatsDisplay />
        </div>
      </section>

      {/* Display Options */}
      <section>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Display
        </h3>
        <VisualizationToggles />
      </section>

      {/* Parameters */}
      <section>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Parameters
        </h3>
        <SimulationParams />
      </section>

      {/* Land Use Filters */}
      <section>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Land Use Types
        </h3>
        <LandUseToggles />
      </section>
    </div>
  );
}
