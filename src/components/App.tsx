import { MapCanvas } from './canvas/MapCanvas';
import { ControlPanel } from './panels/ControlPanel';
import { LoadingOverlay } from './LoadingOverlay';

export function App() {
  return (
    <div className="flex h-screen w-screen max-md:flex-col">
      <MapCanvas />
      <ControlPanel />
      <LoadingOverlay />
    </div>
  );
}
