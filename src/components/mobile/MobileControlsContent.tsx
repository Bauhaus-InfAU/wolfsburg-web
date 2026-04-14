import { LandUseToggles } from '@/components/panels/LandUseToggles';
import { VisualizationToggles } from '@/components/panels/VisualizationToggles';
import { StatsDisplay } from '@/components/panels/StatsDisplay';
import { CalculateButton } from '@/components/panels/CalculateButton';
import { TransportModeSelector } from '@/components/panels/TransportModeSelector';
import { LiveTrafficPanel } from '@/components/panels/LiveTrafficPanel';

export function MobileControlsContent() {
  return (
    <div className="p-4 space-y-4">
      {/* Flow Statistics */}
      <section>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Flow Statistics
        </h3>
        <div className="space-y-3">
          <div>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Transport Mode</span>
            <div className="mt-1.5">
              <TransportModeSelector />
            </div>
          </div>
          <CalculateButton />
        </div>
        <div className="mt-3 pt-3 border-t border-border">
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

      {/* Live Traffic */}
      <section>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Live Traffic
        </h3>
        <LiveTrafficPanel />
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
