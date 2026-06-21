"use client";

/** MERIDIAN M mark — angular M with horizontal cyan→purple gradient and center meridian line */
export function ArcLogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className ?? "h-10 w-10"}
      aria-hidden
    >
      <defs>
        <linearGradient id="arcMarkGrad" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="50%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <filter id="mGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="0.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#mGlow)">
        <path
          d="M8 32 L8 12 L20 24 L32 12 L32 32"
          fill="none"
          stroke="url(#arcMarkGrad)"
          strokeWidth="3.2"
          strokeLinejoin="miter"
          strokeLinecap="butt"
        />
        <line
          x1="20"
          y1="8"
          x2="20"
          y2="32"
          stroke="url(#arcMarkGrad)"
          strokeWidth="0.6"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
