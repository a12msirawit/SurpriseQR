"use client";

import React from "react";

export default function CrtOverlay() {
  return (
    <div
      className="pointer-events-none select-none backface-hidden will-change-transform absolute inset-0 z-10 overflow-hidden"
      aria-hidden="true"
    >
      {/* 90s CRT Scanline lines - stable static gradient */}
      <div
        className="pointer-events-none select-none backface-hidden absolute inset-0 opacity-20"
        style={{
          background:
            "repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.45) 0px, rgba(0, 0, 0, 0.45) 1px, transparent 1px, transparent 3px)",
        }}
      />

      {/* Subtle CRT screen ambient phosphor glow */}
      <div
        className="pointer-events-none select-none backface-hidden absolute inset-0 opacity-10"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(16, 132, 208, 0.25) 0%, rgba(0, 0, 0, 0.75) 100%)",
        }}
      />

      {/* CRT Monitor vignette edge shadow */}
      <div
        className="pointer-events-none select-none backface-hidden absolute inset-0 shadow-[inset_0_0_80px_rgba(0,0,0,0.6)]"
      />
    </div>
  );
}

