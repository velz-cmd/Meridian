import { ArcBackground } from "@/components/layout/arc-background";
import {
  ArcEcosystemHero,
  ArcHomeFooter,
  ArcSystemsShowcase,
} from "@/components/landing/arc-home-sections";
import { MeridianIntelligencePipeline } from "@/components/shared/meridian-intelligence-pipeline";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden text-white max-lg:overflow-y-auto lg:overflow-hidden" data-arc-theme="home">
      <ArcBackground theme="home" />
      <div className="relative">
        <ArcEcosystemHero />
        <MeridianIntelligencePipeline />
        <ArcSystemsShowcase />
        <ArcHomeFooter />
      </div>
    </div>
  );
}
