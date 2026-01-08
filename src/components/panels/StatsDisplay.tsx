import { useSimulation } from '@/hooks/useSimulation';

export function StatsDisplay() {
  const { stats } = useSimulation();

  return (
    <div className="grid grid-cols-2 gap-4">
      <StatCard label="Active Agents" value={stats.activeAgents} />
      <StatCard label="Total Trips" value={stats.totalTrips} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-background rounded-md p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </div>
      <div className="text-xl font-semibold tabular-nums">
        {value.toLocaleString()}
      </div>
    </div>
  );
}
