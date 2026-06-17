"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Radar, Zap } from "lucide-react";
import { ArcLogoMark } from "@/components/layout/arc-logo-mark";
import { arcNavIconTheme } from "@/components/layout/arc-theme-sync";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { cn } from "@/lib/utils";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NexusWalletMenu } from "@/components/nexus/nexus-wallet-menu";
import { MERIDIAN_BUILT_FOR, MERIDIAN_MODULES, MERIDIAN_NAME, MERIDIAN_TAGLINE } from "@/lib/meridian-brand";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/nexus", label: "NEXUS", icon: Zap },
  { href: "/prism", label: "PRISM", icon: Radar },
] as const;

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 px-4 pt-3 sm:px-6">
      <div className="arc-nav-glass mx-auto flex h-[62px] max-w-5xl items-center justify-between rounded-2xl px-3 sm:px-5">
        <Link href="/" className="group flex items-center gap-2.5">
          <ArcLogoMark className="h-10 w-10" />
          <div className="min-w-0">
            <p className="text-sm font-bold tracking-[0.12em] text-white">{MERIDIAN_NAME}</p>
            <p className="hidden text-[10px] font-medium uppercase tracking-[0.2em] text-white/45 sm:block">
              {MERIDIAN_TAGLINE} · {MERIDIAN_MODULES}
            </p>
            <p className="text-[9px] text-white/30 sm:hidden">{MERIDIAN_BUILT_FOR}</p>
            <p className="hidden text-[9px] text-white/30 lg:block">{MERIDIAN_BUILT_FOR}</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex">
          {links.map((link) => {
            const Icon = link.icon;
            const iconTheme = arcNavIconTheme(link.href.split("#")[0]);
            const active = pathname === link.href.split("#")[0];
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-2 text-sm transition",
                  active ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/5 hover:text-white",
                )}
              >
                <ArcIcon3d icon={Icon} theme={iconTheme} size="sm" className="!h-7 !w-7" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <NexusWalletMenu />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
