"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";

interface ScratchFoilProps {
  imageUrl: string;
  caption?: string;
}

export default function ScratchFoil({ imageUrl, caption = "ภาพความทรงจำสุดพิเศษ" }: ScratchFoilProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const strokeCountRef = useRef(0);
  const [revealed, setRevealed] = useState(false);

  const paintGoldFoil = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = Math.max(240, Math.round(rect.width));
    const height = Math.max(180, Math.round(rect.height));
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.globalCompositeOperation = "source-over";
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, "#b45309");
    grad.addColorStop(0.28, "#fcd34d");
    grad.addColorStop(0.52, "#f59e0b");
    grad.addColorStop(0.76, "#fef08a");
    grad.addColorStop(1, "#92400e");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Subtle metallic diagonal sheen & sparkle flecks
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    for (let i = -height; i < width + height; i += 22) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 8, 0);
      ctx.lineTo(i - height + 8, height);
      ctx.lineTo(i - height, height);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = "rgba(120, 53, 15, 0.85)";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ใช้นิ้วขูดฟอยล์สีทองเพื่อเปิดดูภาพลับ", width / 2, height / 2 - 4);
    ctx.font = "12px sans-serif";
    ctx.fillText("Scratch Gold Foil to Reveal", width / 2, height / 2 + 16);
  }, []);

  useEffect(() => {
    setRevealed(false);
    strokeCountRef.current = 0;
    paintGoldFoil();
  }, [imageUrl, paintGoldFoil]);

  const checkScratchedPercent = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = 0;
    const step = 16; // sample every 4th pixel for speed
    let sampled = 0;
    for (let i = 3; i < pixels.length; i += step) {
      sampled += 1;
      if (pixels[i] < 40) transparent += 1;
    }
    if (sampled > 0 && transparent / sampled > 0.44) {
      setRevealed(true);
    }
  };

  const scratchAt = (clientX: number, clientY: number) => {
    if (revealed) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.fill();

    strokeCountRef.current += 1;
    if (strokeCountRef.current % 8 === 0) {
      checkScratchedPercent();
    }
  };

  return (
    <div className="w-full space-y-2">
      <div
        ref={containerRef}
        className="relative h-56 w-full overflow-hidden rounded-xl border border-amber-300/35 bg-black/40 shadow-inner"
      >
        {/* Hidden Photo Layer */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={caption}
          className="h-full w-full object-cover"
        />

        {/* Scratchable Gold Foil Canvas */}
        <canvas
          ref={canvasRef}
          onPointerDown={(e) => {
            isDrawingRef.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            scratchAt(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (!isDrawingRef.current) return;
            scratchAt(e.clientX, e.clientY);
          }}
          onPointerUp={() => {
            isDrawingRef.current = false;
            checkScratchedPercent();
          }}
          onPointerCancel={() => {
            isDrawingRef.current = false;
          }}
          className={`absolute inset-0 h-full w-full touch-none cursor-crosshair transition-opacity duration-500 ${
            revealed ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        />
      </div>

      {!revealed && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 hover:text-amber-200"
          >
            <Sparkles className="h-3 w-3" />
            เปิดดูภาพทันที
          </button>
        </div>
      )}
    </div>
  );
}

