import { useSimulation } from '@/hooks/useSimulation';

export function StatsDisplay() {
  const { stats, hasCalculated } = useSimulation();

  if (!hasCalculated) {
    return (
      <div className="text-center text-muted-foreground text-sm py-2">
        Click "Calculate Flows" to analyze
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <StatCard label="Total Trips" value={stats.totalTrips} />
      <StatCard label="Avg Distance" value={stats.avgDistance} suffix="m" />
    </div>
  );
}

function StatCard({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="bg-background rounded-md p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </div>
      <div className="text-xl font-semibold tabular-nums">
        {value.toLocaleString()}{suffix && <span className="text-sm ml-0.5">{suffix}</span>}
      </div>
    </div>
  );
}
