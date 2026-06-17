"use client";

import { useCallback, useState } from "react";
import type { ConstitutionPermitPayload } from "@/hooks/use-constitution-permit";

export function useConstitutionCompare() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, ConstitutionPermitPayload | null>>({});
  const [error, setError] = useState<string | null>(null);

  const compare = useCallback(async (symbols: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const rows = await Promise.all(
        symbols.map(async (sym) => {
          const res = await fetch("/api/constitution/permit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              symbol: sym.toUpperCase(),
              agent: { action: "BUY", confidence: 85, reasoning: "Constitution compare" },
            }),
          });
          if (!res.ok) throw new Error((await res.json()).error ?? `${sym} permit failed`);
          return [sym.toUpperCase(), (await res.json()) as ConstitutionPermitPayload] as const;
        }),
      );
      setResults(Object.fromEntries(rows));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compare failed");
    } finally {
      setLoading(false);
    }
  }, []);

  return { compare, loading, results, error };
};
