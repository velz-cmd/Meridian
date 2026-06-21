"use client";

/** MERIDIAN M mark — stylized upward chevron with center line */
export function ArcLogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className ?? "h-10 w-10"}
      aria-hidden
    >
      <defs>
        <linearGradient id="arcMarkGrad" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="50%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <filter id="mGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#mGlow)">
        {/* Left arm */}
        <path d="M8 33 L20 7 L20 14 L13 33 Z" fill="url(#arcMarkGrad)" />
        {/* Right arm */}
        <path d="M32 33 L20 7 L20 14 L27 33 Z" fill="url(#arcMarkGrad)" />
      </g>
      {/* Center line */}
      <line x1="20" y1="5" x2="20" y2="35" stroke="#22d3ee" strokeWidth="0.75" strokeOpacity="0.85" />
    </svg>
  );
}
