"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Radar, Scale, Zap } from "lucide-react";
import { ArcLogoMark } from "@/components/layout/arc-logo-mark";
import { arcNavIconTheme } from "@/components/layout/arc-theme-sync";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { cn } from "@/lib/utils";
import { MobileNav } from "@/components/layout/mobile-nav";
import { BscTestnetStrip } from "@/components/nexus/bsc-testnet-strip";
import { NexusWalletMenu } from "@/components/nexus/nexus-wallet-menu";
import { MERIDIAN_BUILT_FOR, MERIDIAN_MODULES, MERIDIAN_NAME, MERIDIAN_TAGLINE } from "@/lib/meridian-brand";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/gate", label: "Strategy", icon: Scale },
  { href: "/nexus", label: "NEXUS", icon: Zap },
  { href: "/prism", label: "PRISM", icon: Radar },
] as const;

export function Navbar() {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-50 px-4 pt-3 sm:px-6">
      <div className="arc-nav-glass mx-auto grid h-[62px] max-w-5xl grid-cols-[1fr_auto_1fr] items-center rounded-2xl px-3 sm:px-5">
        <Link href="/" className="group flex items-center gap-2.5 justify-self-start">
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

        <nav className="hidden items-center gap-0.5 justify-self-center md:flex">
          {links.map((link) => {
            const Icon = link.icon;
            const iconTheme = arcNavIconTheme(link.href.split("#")[0]);
            const active = pathname === link.href.split("#")[0];
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex min-h-[40px] items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition",
                  active ? "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]" : "text-white/55 hover:bg-white/5 hover:text-white",
                )}
              >
                <ArcIcon3d icon={Icon} theme={iconTheme} size="sm" className="!h-7 !w-7 shrink-0" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center justify-self-end gap-2">
          <NexusWalletMenu />
          <MobileNav />
        </div>
      </div>
    </header>
    <BscTestnetStrip />
    </>
  );
}
