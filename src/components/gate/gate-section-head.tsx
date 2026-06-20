"use client";

import { cn } from "@/lib/utils";

/** Shared MERIDIAN section headline — title + question + optional kicker (Design V2). */
export function GateSectionHead({
  title,
  question,
  kicker,
  icon: Icon,
  size = "default",
  className,
}: {
  title: string;
  question?: string;
  kicker?: string;
  icon?: React.ComponentType<{ className?: string }>;
  size?: "default" | "lg";
  className?: string;
}) {
  return (
    <header className={cn("gate-section-head", className)}>
      {kicker && <p className="gate-section-kicker">{kicker}</p>}
      <div className="flex items-start gap-2.5">
        {Icon && <Icon className="gate-section-icon mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
        <div className="min-w-0 flex-1">
          <h3 className={cn("gate-section-title", size === "lg" && "gate-section-title--lg")}>{title}</h3>
          {question && <p className="gate-section-question">{question}</p>}
        </div>
      </div>
    </header>
  );
}

export function GateSectionCard({
  title,
  question,
  kicker,
  icon,
  accent = "border-white/[0.10]",
  children,
  className,
}: {
  title: string;
  question?: string;
  kicker?: string;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("gate-section-card rounded-2xl border bg-black/30 p-4 sm:p-5", accent, className)}>
      <GateSectionHead title={title} question={question} kicker={kicker} icon={icon} />
      <div className="gate-section-body mt-4">{children}</div>
    </section>
  );
}
