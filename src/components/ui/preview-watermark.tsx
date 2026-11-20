"use client";

/**
 * Subtle, non-intrusive diagonal watermark overlay for template previews.
 */
export default function PreviewWatermark() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none select-none absolute inset-0 z-40 flex items-center justify-center overflow-hidden"
    >
      <div className="flex flex-col items-center gap-24 -rotate-12">
        <span className="text-3xl sm:text-4xl font-black uppercase tracking-[0.35em] text-white/[0.07]">
          SurpriseQR
        </span>
        <span className="text-2xl sm:text-3xl font-black uppercase tracking-[0.35em] text-white/[0.05] translate-x-12">
          SurpriseQR
        </span>
      </div>
    </div>
  );
}

