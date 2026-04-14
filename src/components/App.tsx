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
    </div>
  );
}
