import { cn } from '@/lib/utils';

interface NetworkConcentrationProps {
  concentrationPercent: number;
  totalSegments: number;
}

export function NetworkConcentration({ concentrationPercent, totalSegments }: NetworkConcentrationProps) {
  // Determine status based on concentration
  // < 50% = well distributed, 50-70% = moderate, > 70% = bottlenecked
  const status = concentrationPercent < 50
    ? { label: 'Well Distributed', color: 'text-green-600' }
    : concentrationPercent < 70
      ? { label: 'Moderate', color: 'text-yellow-600' }
      : { label: 'Bottlenecked', color: 'text-red-500' };

  return (
    <div className="bg-background rounded-md p-3">
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground mb-1">
        Network Load
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold tabular-nums text-foreground">
          {totalSegments > 0 ? `${concentrationPercent}%` : '—'}
        </span>
        <span className="text-[10px] text-muted-foreground">
          on top 20%
        </span>
      </div>
      <div className={cn(
        "text-[10px] font-medium mt-1",
        totalSegments > 0 ? status.color : 'text-muted-foreground'
      )}>
        {totalSegments > 0 ? status.label : 'No data'}
      </div>
      <div className="text-[9px] text-muted-foreground mt-2">
        {totalSegments.toLocaleString()} street segments used
      </div>
    </div>
  );
}
