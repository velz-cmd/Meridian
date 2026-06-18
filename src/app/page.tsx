import { ArcBackground } from "@/components/layout/arc-background";
import {
  ArcEcosystemHero,
  ArcHomeFooter,
  ArcSystemsShowcase,
} from "@/components/landing/arc-home-sections";
import { MeridianSkillArchitectureHero } from "@/components/shared/meridian-skill-architecture-hero";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden text-white max-lg:overflow-y-auto lg:overflow-hidden" data-arc-theme="home">
      <ArcBackground theme="home" />
      <div className="relative">
        <ArcEcosystemHero />
        <MeridianSkillArchitectureHero />
        <ArcSystemsShowcase />
        <ArcHomeFooter />
      </div>
    </div>
  );
}
