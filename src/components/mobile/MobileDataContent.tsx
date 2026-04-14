import { useSimulation } from '@/hooks/useSimulation';
import { useUrbanInsights } from '@/hooks/useUrbanInsights';
import { TopStreets } from '@/components/panels/charts/TopStreets';
import { WalkabilityScore } from '@/components/panels/charts/WalkabilityScore';
import { LowWalkability } from '@/components/panels/charts/LowWalkability';
import { DistanceDecay } from '@/components/panels/charts/DistanceDecay';
import { LandUseDonut } from '@/components/panels/charts/LandUseDonut';

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
    </div>
  );
}
