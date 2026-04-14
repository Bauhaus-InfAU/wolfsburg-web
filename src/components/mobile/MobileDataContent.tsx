import { useSimulation } from '@/hooks/useSimulation';
import { useUrbanInsights } from '@/hooks/useUrbanInsights';
import { TopStreets } from '@/components/panels/charts/TopStreets';
import { WalkabilityScore } from '@/components/panels/charts/WalkabilityScore';
import { LowWalkability } from '@/components/panels/charts/LowWalkability';
import { DistanceDecay } from '@/components/panels/charts/DistanceDecay';
import { LandUseDonut } from '@/components/panels/charts/LandUseDonut';
import { PopulationStats } from '@/components/panels/charts/PopulationStats';
import { PopulationAgeChart } from '@/components/panels/charts/PopulationAgeChart';
import { PopulationDistrictChart } from '@/components/panels/charts/PopulationDistrictChart';
import { PopulationTrend } from '@/components/panels/charts/PopulationTrend';

export function MobileDataContent() {
  const { getResidentialCount, getLowWalkabilityCount } = useSimulation();
  const {
    topStreets,
    totalSegments,
    serviceDistances,
    walkabilityScore,
  } = useUrbanInsights();

  return (
    <div className="p-4 space-y-4">
      <LandUseDonut />
      <WalkabilityScore score={walkabilityScore} />
      <LowWalkability
        totalResidential={getResidentialCount()}
        highlightedCount={getLowWalkabilityCount()}
      />
      <DistanceDecay serviceDistances={serviceDistances} />
      <TopStreets streets={topStreets} totalSegments={totalSegments} />

      {/* Population & Distribution */}
      <div className="border-t border-border pt-4 space-y-4">
        <PopulationStats />
        <PopulationTrend />
        <PopulationAgeChart />
        <PopulationDistrictChart />
      </div>
    </div>
  );
}
