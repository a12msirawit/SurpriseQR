"use client";

import React from "react";

/** Ornate Victorian filigree corner flourish rendered in antique brass gold. */
export function BaroqueCornerFiligree({
  className = "h-8 w-8",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 54 V18 C6 10, 10 6, 18 6 H54"
        stroke="#d4af37"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 46 V20 C12 14, 14 12, 20 12 H46"
        stroke="#f59e0b"
        strokeOpacity="0.6"
        strokeWidth="1"
      />
      <path
        d="M12 28 C18 28, 22 22, 18 18 C15 15, 11 19, 14 23"
        stroke="#fde047"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M28 12 C28 18, 22 22, 18 18"
        stroke="#fde047"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle cx="9" cy="9" r="2.2" fill="#fde047" />
    </svg>
  );
}

/** Refined symmetrical royal crest ornament divider. */
export function RoyalCrestDivider({
  className = "h-6 w-44",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 220 28"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <line x1="12" y1="14" x2="86" y2="14" stroke="#d4af37" strokeOpacity="0.55" strokeWidth="1" />
      <line x1="134" y1="14" x2="208" y2="14" stroke="#d4af37" strokeOpacity="0.55" strokeWidth="1" />
      <polygon points="110,4 117,14 110,24 103,14" stroke="#d4af37" strokeWidth="1.4" fill="#d4af37" fillOpacity="0.22" />
      <circle cx="94" cy="14" r="2.2" fill="#d4af37" />
      <circle cx="126" cy="14" r="2.2" fill="#d4af37" />
      <circle cx="110" cy="14" r="2" fill="#fef08a" />
    </svg>
  );
}

/** Exposed antique brass clockwork gear & steel comb music-box overlay SVG. */
export function ClockworkGearsSvg({
  spinning = true,
}: {
  spinning?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      className="pointer-events-none h-24 w-24 opacity-85"
      aria-hidden="true"
    >
      {/* Outer Brass Ring */}
      <circle
        cx="60"
        cy="60"
        r="52"
        fill="none"
        stroke="#d4af37"
        strokeOpacity="0.4"
        strokeWidth="1.2"
        strokeDasharray="3 3"
      />
      {/* Rotating Intricate Brass Escapement Gear */}
      <g
        style={{
          transformOrigin: "60px 60px",
          animation: spinning ? "spin 14s linear infinite" : undefined,
        }}
      >
        <circle cx="60" cy="60" r="28" fill="none" stroke="#d4af37" strokeWidth="2.5" />
        <circle cx="60" cy="60" r="10" fill="#d4af37" fillOpacity="0.25" stroke="#fde047" strokeWidth="1.5" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <g key={deg} transform={`rotate(${deg} 60 60)`}>
            <rect x="57.5" y="25" width="5" height="9" rx="1" fill="#d4af37" />
            <line x1="60" y1="33" x2="60" y2="50" stroke="#fde047" strokeWidth="1.5" strokeOpacity="0.7" />
          </g>
        ))}
      </g>
      <circle cx="60" cy="60" r="4" fill="#16050b" stroke="#fde047" strokeWidth="1.5" />
    </svg>
  );
}

