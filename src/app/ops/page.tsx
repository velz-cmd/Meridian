"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type StatusPayload = Record<string, unknown>;

function OpsPageInner() {
  const params = useSearchParams();
  const key = params.get("key") ?? "";
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [constitution, setConstitution] = useState<StatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!key) {
      setError("Missing ?key= — private ops link only.");
      return;
    }
    setError(null);
    try {
      const [s, c] = await Promise.all([
        fetch(`/api/status?key=${encodeURIComponent(key)}`).then((r) => r.json()),
        fetch("/api/constitution/status").then((r) => r.json()),
      ]);
      setStatus(s);
      setConstitution(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    }
  }, [key]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen bg-[#050508] px-4 py-10 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Private · MERIDIAN ops</p>
          <h1 className="mt-1 text-2xl font-semibold">Integration health</h1>
          <p className="mt-2 text-sm text-white/55">
            Not linked in public nav. Bookmark this URL — judges see the product, not provider plumbing.
          </p>
        </div>

        {error && (
          <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </p>
        )}

        <section className="rounded-xl border border-white/10 bg-black/40 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Constitution / CMC</h2>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-lg border border-white/15 px-3 py-1 text-xs text-white/70 hover:bg-white/5"
            >
              Refresh
            </button>
          </div>
          <pre className="max-h-48 overflow-auto text-[11px] text-white/70">
            {constitution ? JSON.stringify(constitution, null, 2) : "Loading…"}
          </pre>
        </section>

        <section className="rounded-xl border border-white/10 bg-black/40 p-4">
          <h2 className="mb-3 text-sm font-semibold">Full API status</h2>
          <pre className="max-h-[60vh] overflow-auto text-[11px] text-white/70">
            {status ? JSON.stringify(status, null, 2) : key ? "Loading…" : "Add ?key= to URL"}
          </pre>
        </section>
      </div>
    </div>
  );
}

export default function OpsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#050508] text-sm text-white/50">
          Loading ops…
        </div>
      }
    >
      <OpsPageInner />
    </Suspense>
  );
}
