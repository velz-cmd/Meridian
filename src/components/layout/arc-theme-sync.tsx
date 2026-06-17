"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export type ArcTheme = "home" | "nexus" | "prism";

export function arcThemeFromPath(pathname: string): ArcTheme {
  if (pathname.startsWith("/nexus") || pathname.startsWith("/gate")) return "nexus";
  if (pathname.startsWith("/prism")) return "prism";
  return "home";
}

/** Route href → 3D icon accent (shared by top + mobile nav) */
export function arcNavIconTheme(href: string): ArcTheme | "neutral" {
  if (href === "/nexus" || href === "/gate") return "nexus";
  if (href === "/prism") return "prism";
  if (href === "/") return "home";
  return "neutral";
}

/** Syncs route → document theme for cursor, glass, and ambient CSS */
export function ArcThemeSync() {
  const pathname = usePathname();
  const theme = arcThemeFromPath(pathname);

  useEffect(() => {
    document.documentElement.setAttribute("data-arc-theme", theme);
    return () => {
      document.documentElement.removeAttribute("data-arc-theme");
    };
  }, [theme]);

  return null;
}
