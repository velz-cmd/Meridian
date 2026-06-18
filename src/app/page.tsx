import { ArcBackground } from "@/components/layout/arc-background";
import {
  ArcEcosystemHero,
  ArcHomeFooter,
  ArcIntelligenceGrid,
  ArcSystemsShowcase,
} from "@/components/landing/arc-home-sections";
import { MeridianProblemSection } from "@/components/shared/meridian-problem-section";
import { MeridianSkillArchitectureHero } from "@/components/shared/meridian-skill-architecture-hero";
import { BscTestnetTradingBanner } from "@/components/shared/bsc-testnet-trading-banner";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden text-white max-lg:overflow-y-auto lg:overflow-hidden" data-arc-theme="home">
      <ArcBackground theme="home" />
      <div className="relative">
        <ArcEcosystemHero />
        <MeridianSkillArchitectureHero />
        <BscTestnetTradingBanner />
        <ArcIntelligenceGrid />
        <MeridianProblemSection />
        <ArcSystemsShowcase />
        <ArcHomeFooter />
      </div>
    </div>
  );
}
