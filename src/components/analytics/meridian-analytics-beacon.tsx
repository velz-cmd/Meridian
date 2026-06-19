"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackMeridianEvent } from "@/lib/product-analytics-client";

/** Tracks page views on every route change — powers /analytics live dashboard. */
export function MeridianAnalyticsBeacon() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || last.current === pathname) return;
    last.current = pathname;
    trackMeridianEvent({ kind: "page_view", path: pathname });
  }, [pathname]);

  return null;
}
