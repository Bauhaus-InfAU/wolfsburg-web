import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface WalkabilityScoreProps {
  score: number;
}

export function WalkabilityScore({ score }: WalkabilityScoreProps) {
  // Determine color based on score
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-green-600';
    if (s >= 60) return 'text-lime-600';
    if (s >= 40) return 'text-yellow-600';
    if (s >= 20) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreLabel = (s: number) => {
    if (s >= 80) return 'Excellent';
    if (s >= 60) return 'Good';
    if (s >= 40) return 'Fair';
    if (s >= 20) return 'Poor';
    return 'Very Poor';
  };

  const getScoreDescription = (s: number) => {
    if (s >= 80) return 'Most services within easy walking distance';
    if (s >= 60) return 'Services generally accessible on foot';
    if (s >= 40) return 'Some services require longer walks';
    if (s >= 20) return 'Many services beyond comfortable walking';
    return 'Most services too far to walk';
  };

  return (
    <div className="bg-background rounded-md p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
          Walkability Score
        </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <Info className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-56 text-[10px]">
              <p className="font-medium mb-1">How it's calculated</p>
              <p className="text-muted-foreground leading-relaxed">
                For each land use type, we measure the average distance from residential buildings.
                The score reflects how close services are relative to their maximum walkable distance.
                Final score is the average across all enabled land uses.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="flex items-center gap-3">
        <div className={cn(
          "text-3xl font-bold tabular-nums",
          score > 0 ? getScoreColor(score) : 'text-muted-foreground'
        )}>
          {score > 0 ? score : '—'}
        </div>
        <div className="flex-1">
          <div className={cn(
            "text-xs font-medium",
            score > 0 ? getScoreColor(score) : 'text-muted-foreground'
          )}>
            {score > 0 ? getScoreLabel(score) : 'No data'}
          </div>
          <div className="text-[9px] text-muted-foreground leading-tight mt-0.5">
            {score > 0 ? getScoreDescription(score) : 'Enable land uses to calculate'}
          </div>
        </div>
      </div>
      {/* Score bar */}
      {score > 0 && (
        <div className="mt-2 h-1.5 bg-accent/30 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              score >= 80 ? 'bg-green-500' :
              score >= 60 ? 'bg-lime-500' :
              score >= 40 ? 'bg-yellow-500' :
              score >= 20 ? 'bg-orange-500' :
              'bg-red-500'
            )}
            style={{ width: `${score}%` }}
          />
        </div>
      )}
    </div>
  );
}
