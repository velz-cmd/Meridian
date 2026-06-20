import type { Metadata } from "next";
import { ArcBackground } from "@/components/layout/arc-background";

export const metadata: Metadata = {
  title: "MERIDIAN · PRISM",
  description: "PRISM macro intelligence — currently under development.",
};

export default function PrismPage() {
  return (
    <div className="relative min-h-screen text-white" data-arc-theme="prism">
      <ArcBackground theme="prism" />
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-8rem)] max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-amber-300/80">PRISM</p>
        <h1 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">Under development</h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-white/55">
          PRISM is currently under development. More capabilities will arrive in future updates.
        </p>
      </div>
    </div>
  );
}
