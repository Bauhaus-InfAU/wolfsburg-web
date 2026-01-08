import { cn } from '@/lib/utils';
import { PlaybackControls } from './PlaybackControls';
import { SimulationParams } from './SimulationParams';
import { LandUseToggles } from './LandUseToggles';
import { VisualizationToggles } from './VisualizationToggles';
import { StatsDisplay } from './StatsDisplay';
import { Legend } from './Legend';

export function ControlPanel() {
  return (
    <aside className="w-[300px] h-full bg-card border-l border-border overflow-y-auto custom-scrollbar p-8 max-md:w-full max-md:h-[45vh] max-md:border-l-0 max-md:border-t">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-9">
        Pedestrian Flow
      </h2>

      <Section title="Playback">
        <PlaybackControls />
      </Section>

      <Section title="Simulation Parameters">
        <SimulationParams />
      </Section>

      <Section title="Land Use Destinations">
        <LandUseToggles />
      </Section>

      <Section title="Visualization">
        <VisualizationToggles />
      </Section>

      <Section title="Statistics">
        <StatsDisplay />
      </Section>

      <Section title="Legend" className="pt-7 border-t border-border">
        <Legend />
      </Section>
    </aside>
  );
}

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-9", className)}>
      <h3 className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground mb-4">
        {title}
      </h3>
      {children}
    </div>
  );
}
