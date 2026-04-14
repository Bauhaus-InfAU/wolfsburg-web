import { ViewportPane, VIEWPORT_CONFIGS } from './ViewportPane';

interface Props {
  /** The primary map content (MapCanvas + overlays) */
  children: React.ReactNode;
}

export function MultiViewportLayout({ children }: Props) {
  const [topCfg, frontCfg, sideCfg, perspCfg] = VIEWPORT_CONFIGS;

  return (
    <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-px bg-border">
      {/* Top-left: Top view */}
      <ViewportPane config={topCfg} />

      {/* Top-right: Front view */}
      <ViewportPane config={frontCfg} />

      {/* Bottom-left: Side view */}
      <ViewportPane config={sideCfg} />

      {/* Bottom-right: Perspective — hosts the primary MapLibre instance */}
      <ViewportPane config={perspCfg} isPrimary>
        {children}
      </ViewportPane>
    </div>
  );
}
