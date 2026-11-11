"use client";

import { useMemo } from "react";

/**
 * Ambient 35mm cinema dust particles and projector light beam.
 * No emojis, purely minimal cinematic atmosphere.
 */
export default function CinematicDust() {
  const particles = useMemo(() => {
    return Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      left: `${15 + (i * 3.2) % 70}%`,
      top: `${10 + (i * 4.7) % 80}%`,
      size: `${1.5 + (i % 3) * 1}px`,
      duration: `${14 + (i % 8) * 3}s`,
      delay: `${-(i * 0.9)}s`,
      opacity: 0.15 + (i % 4) * 0.1,
    }));
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
      {/* Cinematic Spotlight Beam from top center */}
      <div
        className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] sm:w-[900px] h-[750px] opacity-40 blur-3xl pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(255, 235, 190, 0.22) 0%, rgba(255, 220, 160, 0.08) 40%, rgba(200, 180, 255, 0.02) 65%, transparent 80%)",
        }}
      />

      {/* Vintage 35mm Vignette Overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, transparent 35%, rgba(4, 5, 8, 0.7) 75%, rgba(2, 3, 5, 0.95) 100%)",
        }}
      />

      {/* 35mm Fine Noise / Grain SVG Filter */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.035] mix-blend-overlay pointer-events-none">
        <filter id="cinema-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#cinema-grain)" />
      </svg>

      {/* Floating Dust Particles */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full bg-amber-100 animate-pulse pointer-events-none"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            animationDuration: p.duration,
            animationDelay: p.delay,
            filter: "blur(0.5px)",
          }}
        />
      ))}
    </div>
  );
}

