import { MapCanvas } from './canvas/MapCanvas';
import { ControlPanel } from './panels/ControlPanel';
import { DataPanel } from './panels/DataPanel';
import { LoadingOverlay } from './LoadingOverlay';
import { PathPreview } from './PathPreview';

export function App() {
  return (
    <div className="flex h-screen w-screen max-md:flex-col">
      <DataPanel />
      <div className="flex-1 h-full relative">
        <MapCanvas />
        <PathPreview />
      </div>
      <ControlPanel />
      <LoadingOverlay />
    </div>
  );
}
