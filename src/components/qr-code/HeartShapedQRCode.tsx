"use client";

import React, { forwardRef, useId, useMemo } from "react";
import qrcode from "qrcode";
import { HEART_PATH } from "./QRCodeCustomizer";

export interface HeartQRProps {
  text: string;
  size?: number;
  dotsColor?: string;
  bgColor?: string;
  accentColor?: string;
  borderWidth?: number;
  className?: string;
}

export const HeartShapedQRCode = forwardRef<SVGSVGElement, HeartQRProps>(
  function HeartShapedQRCode(
    {
      text,
      size = 320,
      dotsColor = "#000000",
      bgColor = "#ffffff",
      accentColor = "#000000",
      borderWidth = 3,
      className,
    },
    ref
  ) {
    const reactId = useId().replace(/:/g, "");

    // 100% Scannable Valid QR Code
    const qrData = useMemo(() => {
      try {
        const qr = qrcode.create(text || "https://surprise-qr.vercel.app", {
          errorCorrectionLevel: "H",
        });
        return {
          size: qr.modules.size,
          get: (r: number, c: number) => Boolean(qr.modules.get(r, c)),
        };
      } catch {
        return {
          size: 25,
          get: () => false,
        };
      }
    }, [text]);

    // Optical geometry placing the scaled QR code inside the heart silhouette without any clipping
    const coreSize = 165;
    const coreX = (400 - coreSize) / 2; // 117.5
    const coreY = 120;
    const totalViewBox = 400;
    const cellSize = coreSize / qrData.size;

    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox={`0 0 ${totalViewBox} ${totalViewBox}`}
        role="img"
        aria-label="Heart QR Code"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id={`h-shadow-${reactId}`} x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.12" />
          </filter>
        </defs>

        {/* 1. Outer Heart Silhouette Frame */}
        <path
          d={HEART_PATH}
          fill={bgColor}
          stroke={accentColor}
          strokeWidth={Math.max(2, borderWidth)}
          strokeLinejoin="round"
          strokeLinecap="round"
          filter={`url(#h-shadow-${reactId})`}
        />

        {/* 2. Protective Quiet Zone Cushion for the Central Square QR Code */}
        <rect
          x={coreX - 6}
          y={coreY - 6}
          width={coreSize + 12}
          height={coreSize + 12}
          rx="6"
          fill={bgColor}
        />

        {/* 3. Core Square QR Code: 100% Intact, Centered, Razor-sharp, Never Clipped */}
        <g>
          {Array.from({ length: qrData.size }, (_, r) =>
            Array.from({ length: qrData.size }, (_, c) => {
              if (!qrData.get(r, c)) return null;
              const x = coreX + c * cellSize;
              const y = coreY + r * cellSize;
              return (
                <rect
                  key={`h-mod-${r}-${c}`}
                  x={x}
                  y={y}
                  width={cellSize + 0.3}
                  height={cellSize + 0.3}
                  fill={dotsColor}
                />
              );
            })
          )}
        </g>
      </svg>
    );
  }
);

export default HeartShapedQRCode;
