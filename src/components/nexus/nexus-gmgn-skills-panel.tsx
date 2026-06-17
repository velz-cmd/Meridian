"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, Loader2, Search, Sparkles } from "lucide-react";
import { NexusCollapsible } from "@/components/nexus/nexus-collapsible";
import { ArcIconBadge } from "@/components/ui/arc-icon-badge";
import { cn } from "@/lib/utils";
import type { GmgnSkill } from "@/lib/gmgn-skills";

const INSTALLED_KEY = "nexus-gmgn-installed-skills";

function loadInstalled(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(INSTALLED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveInstalled(ids: string[]) {
  localStorage.setItem(INSTALLED_KEY, JSON.stringify(ids));
}

export function NexusGmgnSkillsPanel({ defaultQuery = "" }: { defaultQuery?: string }) {
  const [query, setQuery] = useState(defaultQuery);
  const [skills, setSkills] = useState<GmgnSkill[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<GmgnSkill | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stack, setStack] = useState<
    Array<{ tier: string; order: number; why: string; skills: GmgnSkill[] }>
  >([]);
  const [bootstrapping, setBootstrapping] = useState(false);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/nexus/gmgn/skills?q=${encodeURIComponent(q)}&limit=8`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setSkills(data.skills ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
      setSkills([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setInstalled(loadInstalled());
    void search("");
    fetch("/api/nexus/gmgn/recommended")
      .then((r) => r.json())
      .then((d) => setStack(d.stack ?? []))
      .catch(() => setStack([]));
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => void search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  async function enableGmgnOnServer(scope: "analytics" | "monitor" | "all") {
    setBootstrapping(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/nexus/gmgn/bootstrap?scope=${scope}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Bootstrap failed");
      const ids = (data.skills as { id: string }[] | undefined)?.map((s) => s.id) ?? [];
      const next = [...new Set([...installed, ...ids])];
      setInstalled(next);
      saveInstalled(next);
      const probesOk =
        (scope !== "monitor" && data.analyticsProbe?.ok) ||
        (scope !== "analytics" && data.monitorProbe?.ok);
      setMessage(
        probesOk
          ? data.message ?? `${scope} intelligence skills active.`
          : "Skills registered; some data probes are rate limited.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bootstrap failed");
    } finally {
      setBootstrapping(false);
    }
  }

  async function confirmInstall() {
    if (!selected) return;
    setInstalling(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/nexus/gmgn/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId: selected.id, confirmed: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Install failed");
      const next = [...new Set([...installed, selected.id])];
      setInstalled(next);
      saveInstalled(next);
      setMessage(data.message ?? `Installed ${selected.title}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Install failed");
    } finally {
      setInstalling(false);
    }
  }

  return (
    <NexusCollapsible
      label="On-chain intelligence skills"
      hint="Search 40+ on-chain skills · install on demand"
      icon={Sparkles}
      variant="intel"
      defaultOpen={false}
      showCollapseHint
    >
      <div className="space-y-3">
        <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3 text-xs text-emerald-100/90">
          <p className="font-semibold text-emerald-200">Autonomous agent — install in this order</p>
          <p className="mt-1 text-white/70">
            1) <strong>Brain</strong> powers Alpha Scan. 2) <strong>Signals</strong> feed autopilot triggers.{" "}
            3) <strong>Execution</strong> stays behind manual checks. Do not enable every skill at once.
          </p>
        </div>

        {stack.length > 0 && (
          <div className="space-y-2">
            {stack.slice(0, 2).map((tier) => (
              <div key={tier.tier} className="rounded-lg border border-white/10 bg-black/30 p-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-violet-300/80">
                  Tier {tier.order}: {tier.tier}
                </p>
                <p className="mt-0.5 text-[11px] text-white/50">{tier.why}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {tier.skills.slice(0, 6).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelected(s);
                        setQuery(s.title);
                      }}
                      className="rounded-md border border-violet-400/30 bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-100"
                    >
                      {s.title.replace(/ \(bundle\)/, "")}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={bootstrapping}
            onClick={() => void enableGmgnOnServer("all")}
            className="arc-glass-interactive rounded-xl border border-emerald-400/40 bg-emerald-500/15 py-2.5 text-xs font-bold text-emerald-100 sm:text-sm"
          >
            {bootstrapping ? (
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            ) : (
              "Enable Analytics + Monitor on ARC"
            )}
          </button>
          <button
            type="button"
            disabled={bootstrapping}
            onClick={() => void enableGmgnOnServer("monitor")}
            className="arc-glass-interactive rounded-xl border border-violet-400/40 bg-violet-500/15 py-2.5 text-xs font-bold text-violet-100 sm:text-sm"
          >
            Enable 6 Monitor skills
          </button>
        </div>

        <p className="text-xs leading-relaxed text-white/55">
          Curated capability directory. Search when you need a capability — confirm before enabling a skill
          (never installs all at once).
        </p>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. trending, wallet, swap, smart money"
            className="arc-input-glass w-full py-2.5 pl-10 pr-3 text-sm"
          />
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-white/50">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching skills…
          </div>
        )}

        {error && <p className="text-sm text-rose-300">{error}</p>}

        <ul className="space-y-2">
          {skills.map((s) => {
            const active = selected?.id === s.id;
            const done = installed.includes(s.id);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(s);
                    setMessage(null);
                    setError(null);
                  }}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2.5 text-left transition",
                    active
                      ? "border-violet-400/50 bg-violet-500/15"
                      : "border-white/10 bg-black/25 hover:border-white/20",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{s.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-white/55">{s.subtitle}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-wide text-violet-300/70">
                        {s.category}
                        {s.requiresPrivateKey ? " · needs private key" : ""}
                      </p>
                    </div>
                    {done && (
                      <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-emerald-300">
                        <Check className="h-3.5 w-3.5" />
                        On
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        {selected && (
          <div className="arc-glass-card arc-glass-card-nexus space-y-3 p-3">
            <div className="flex items-center gap-2">
              <ArcIconBadge icon={Sparkles} theme="prism" size="sm" />
              <span className="font-semibold text-white">{selected.title}</span>
              <a
                href={selected.detailUrl ?? selected.url}
                target="_blank"
                rel="noreferrer"
                className="ml-auto text-violet-300"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <p className="text-xs text-white/65">{selected.installation}</p>
            <button
              type="button"
              disabled={installing}
              onClick={() => void confirmInstall()}
              className="arc-glass-interactive w-full rounded-xl border border-violet-400/40 bg-violet-500/20 py-2.5 text-sm font-bold text-violet-100"
            >
              {installing ? (
                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
              ) : (
                "Confirm install this skill"
              )}
            </button>
          </div>
        )}

        {message && <p className="text-sm text-emerald-200">{message}</p>}
      </div>
    </NexusCollapsible>
  );
}
