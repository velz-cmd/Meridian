"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LineChart, Menu, Shield, Sparkles, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { MERIDIAN_BUILT_FOR } from "@/lib/meridian-brand";

const links = [
  { href: "/", label: "Home", icon: Home, desc: "Overview" },
  { href: "/prism", label: "PRISM", icon: LineChart, desc: "Macro forecasts" },
  { href: "/nexus", label: "NEXUS", icon: Zap, desc: "AI trading agent" },
  { href: "/nexus#nexus-constitution-desk", label: "Constitution", icon: Shield, desc: "CMC permit gate" },
] as const;

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border-2 border-amber-400/50 bg-gradient-to-br from-amber-500/25 to-emerald-500/15 text-amber-50 shadow-[0_0_24px_rgba(251,191,36,0.35)]"
      >
        <Menu className="h-6 w-6" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[130] flex flex-col bg-[#050508]/95 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-300" />
              <span className="text-base font-bold tracking-wide text-white">Menu</span>
            </div>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
            {links.map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href.split("#")[0];
              const className = cn(
                "flex min-h-[64px] items-center gap-4 rounded-2xl border px-4 py-3 transition active:scale-[0.98]",
                active
                  ? "border-amber-400/45 bg-amber-500/20 text-white"
                  : "border-white/12 bg-white/[0.04] text-white/90",
              );
              return (
                <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className={className}>
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                      active ? "bg-amber-400/25" : "bg-white/10",
                    )}
                  >
                    <Icon className={cn("h-6 w-6", active ? "text-amber-200" : "text-white/70")} />
                  </div>
                  <div>
                    <p className="text-base font-bold">{link.label}</p>
                    <p className="text-xs text-white/50">{link.desc}</p>
                  </div>
                </Link>
              );
            })}
          </nav>

          <p className="border-t border-white/10 px-5 py-4 text-center text-[11px] text-white/40">
            MERIDIAN · NEXUS + PRISM · {MERIDIAN_BUILT_FOR}
          </p>
        </div>
      )}
    </div>
  );
}
