import { useSimulation } from '@/hooks/useSimulation';

export function LoadingOverlay() {
  const { isLoading, loadingStatus } = useSimulation();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-[1000]">
      <div className="text-center">
        <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin-slow mx-auto mb-4" />
        <p className="text-muted-foreground text-sm">{loadingStatus}</p>
      </div>
    </div>
  );
}
