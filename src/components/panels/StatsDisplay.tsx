import { useSimulation } from '@/hooks/useSimulation';

export function StatsDisplay() {
  const { stats } = useSimulation();

  return (
    <div className="flex gap-6">
      <StatCard label="Agents" value={stats.activeAgents} />
      <StatCard label="Trips" value={stats.totalTrips} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-2xl font-medium tracking-tight">
        {value.toLocaleString()}
      </span>
    </div>
  );
}
