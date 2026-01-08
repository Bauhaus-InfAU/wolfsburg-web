import { MapCanvas } from './canvas/MapCanvas';
import { ControlPanel } from './panels/ControlPanel';
import { DataPanel } from './panels/DataPanel';
import { LoadingOverlay } from './LoadingOverlay';

export function App() {
  return (
    <div className="flex h-screen w-screen max-md:flex-col">
      <DataPanel />
      <MapCanvas />
      <ControlPanel />
      <LoadingOverlay />
    </div>
  );
}
