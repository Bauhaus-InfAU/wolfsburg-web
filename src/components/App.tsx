import { MapCanvas } from './canvas/MapCanvas';
import { ControlPanel } from './panels/ControlPanel';
import { DataPanel } from './panels/DataPanel';
import { LoadingOverlay } from './LoadingOverlay';
import { PathPreview } from './PathPreview';
import { BuildingInfo } from './BuildingInfo';
import { BottomSheet } from './ui/bottom-sheet';
import { MobileFloatingControls } from './mobile/MobileFloatingControls';
import { MobileControlsContent } from './mobile/MobileControlsContent';
import { MobileDataContent } from './mobile/MobileDataContent';
import { useMobileLayout } from '@/hooks/useMobileLayout';
import { CursorOverlay } from './CursorOverlay';

export function App() {
  const { isMobile, activePanel, openPanel, closePanel } = useMobileLayout();

  return (
    <div className="h-screen w-screen overflow-hidden flex">
      {/* Desktop: Left panel */}
      {!isMobile && <ControlPanel />}

      {/* Map container - always mounted, takes remaining space */}
      <div className="flex-1 h-full relative">
        <MapCanvas />
        <PathPreview />
        <BuildingInfo />

        {/* Mobile: Floating controls overlay */}
        {isMobile && <MobileFloatingControls onOpenPanel={openPanel} />}
      </div>

      {/* Desktop: Right panel */}
      {!isMobile && <DataPanel />}

      {/* Mobile: Bottom sheets */}
      {isMobile && (
        <>
          <BottomSheet
            isOpen={activePanel === 'controls'}
            onClose={closePanel}
            title="Settings"
          >
            <MobileControlsContent />
          </BottomSheet>

          <BottomSheet
            isOpen={activePanel === 'data'}
            onClose={closePanel}
            title="Insights"
          >
            <MobileDataContent />
          </BottomSheet>
        </>
      )}

      <LoadingOverlay />
      <CursorOverlay />

      {/* Warning banner */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none select-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-yellow-400/60 bg-yellow-300/10 backdrop-blur-sm text-yellow-500 font-mono text-xs tracking-widest uppercase shadow-lg">
          <span className="animate-pulse text-base">⚠️</span>
          <span className="font-semibold">Warning</span>
          <span className="text-yellow-400/60">·</span>
          <span>Ongoing Experiment</span>
          <span className="animate-pulse text-base">🧪</span>
        </div>
      </div>
    </div>
  );
}
