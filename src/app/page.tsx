import { ArcBackground } from "@/components/layout/arc-background";
import {
  ArcEcosystemHero,
  ArcHomeFooter,
  ArcIntelligenceGrid,
  ArcSystemsShowcase,
} from "@/components/landing/arc-home-sections";
import { MeridianProblemSection } from "@/components/shared/meridian-problem-section";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden text-white max-lg:overflow-y-auto lg:overflow-hidden" data-arc-theme="home">
      <ArcBackground theme="home" />
      <div className="relative">
        <ArcEcosystemHero />
        <ArcIntelligenceGrid />
        <MeridianProblemSection />
        <ArcSystemsShowcase />
        <ArcHomeFooter />
      </div>
    </div>
  );
}
