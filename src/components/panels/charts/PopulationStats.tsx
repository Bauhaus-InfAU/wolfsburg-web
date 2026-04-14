import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { POPULATION_SUMMARY } from '@/data/wolfsburgPopulation';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  tooltip: string;
}

function StatCard({ label, value, sub, tooltip }: StatCardProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1">
        <span className="text-[8px] uppercase tracking-wide text-muted-foreground leading-none">
          {label}
        </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <Info className="h-2.5 w-2.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-48 text-[10px]">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <span className="text-sm font-semibold tabular-nums text-foreground leading-none">
        {value}
      </span>
      {sub && (
        <span className="text-[8px] text-muted-foreground leading-none">{sub}</span>
      )}
    </div>
  );
}

export function PopulationStats() {
  const s = POPULATION_SUMMARY;

  return (
    <div className="bg-background rounded-md p-3">
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
          Population Overview
        </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <Info className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-56 text-[10px]">
              <p className="font-medium mb-1">Data source</p>
              <p className="text-muted-foreground leading-relaxed">
                Stadt Wolfsburg Statistikbericht {s.referenceYear}. Population figures are
                based on official municipal registry data.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Main figure */}
      <div className="flex items-baseline gap-1.5 mb-3">
        <span className="text-2xl font-bold tabular-nums text-foreground">
          {s.totalPopulation.toLocaleString('de-DE')}
        </span>
        <span className="text-[9px] text-muted-foreground">residents ({s.referenceYear})</span>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <StatCard
          label="Area"
          value={`${s.areaKm2} km²`}
          tooltip="Total municipal area of Wolfsburg."
        />
        <StatCard
          label="Density"
          value={`${s.populationDensity.toLocaleString('de-DE')}/km²`}
          tooltip="Population per square kilometre."
        />
        <StatCard
          label="Avg. household"
          value={s.avgHouseholdSize.toFixed(2)}
          sub="persons per household"
          tooltip="Average number of persons per registered household."
        />
        <StatCard
          label="Foreign nationals"
          value={`${s.foreignNationalsPct}%`}
          sub="of total population"
          tooltip="Share of residents without German citizenship."
        />
        <StatCard
          label="Growth 2015–2023"
          value={`+${s.growthRate2015_2023}%`}
          sub="cumulative"
          tooltip="Total population change between 2015 and 2023."
        />
      </div>
    </div>
  );
}
