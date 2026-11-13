"use client";

import QRCode from "qrcode";
import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";

export type QRLayout = "square" | "heart";
export type QRDotStyle = "square" | "rounded" | "dots";

// Legacy type aliases for backward compatibility
export type QRShape = "square" | "rounded" | "dots" | "heart" | "gift" | "cake" | "star" | "coffee";
export type QRFrame = "none" | "rounded" | "heart" | "circle" | "cloud" | "flower" | "star" | "phone" | "shield" | "ticket" | "minimal";

export interface CustomQRCodeProps {
  value: string;
  layout?: QRLayout;
  dotStyle?: QRDotStyle;
  shape?: QRShape;
  foregroundColor?: string;
  backgroundColor?: string;
  accentColor?: string;
  borderWidth?: number;
  text?: string;
  logoUrl?: string;
  frameStyle?: QRFrame;
  size?: number;
  className?: string;
}

const CustomQRCode = forwardRef<SVGSVGElement, CustomQRCodeProps>(function CustomQRCode(
  {
    value,
    dotStyle = "square",
    shape,
    foregroundColor = "#000000",
    backgroundColor = "#ffffff",
    accentColor = "#000000",
    borderWidth = 0,
    text,
    logoUrl,
    size = 320,
    className,
  },
  ref
) {
  const innerRef = useRef<SVGSVGElement>(null);

  const effectiveDotStyle: QRDotStyle =
    dotStyle ||
    (shape === "rounded" ? "rounded" : shape === "dots" ? "dots" : "square");

  useImperativeHandle(ref, () => innerRef.current as SVGSVGElement);

  // Generate 100% Valid, Intact QR Matrix
  const qrData = useMemo(() => {
    try {
      const qr = QRCode.create(value || "https://surprise-qr.vercel.app/c/9Kj1Mit0", {
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
  }, [value]);

  const totalViewBox = 400;
  const coreSize = 300;
  const coreX = (totalViewBox - coreSize) / 2; // 50
  const coreY = (totalViewBox - coreSize) / 2; // 50
  const cellSize = coreSize / qrData.size;
  const labelHeight = text ? 54 : 0;
  const totalHeight = totalViewBox + labelHeight;

  // Render individual QR code module
  const renderModule = (r: number, c: number) => {
    if (!qrData.get(r, c)) return null;

    const x = coreX + c * cellSize;
    const y = coreY + r * cellSize;

    if (effectiveDotStyle === "dots") {
      return (
        <circle
          key={`dot-${r}-${c}`}
          cx={x + cellSize / 2}
          cy={y + cellSize / 2}
          r={cellSize * 0.44}
          fill={foregroundColor}
        />
      );
    }

    if (effectiveDotStyle === "rounded") {
      return (
        <rect
          key={`rect-round-${r}-${c}`}
          x={x}
          y={y}
          width={cellSize * 0.92}
          height={cellSize * 0.92}
          rx={cellSize * 0.28}
          ry={cellSize * 0.28}
          fill={foregroundColor}
        />
      );
    }

    // Crisp sharp rect with +0.3px anti-gap overlap
    return (
      <rect
        key={`rect-${r}-${c}`}
        x={x}
        y={y}
        width={cellSize + 0.3}
        height={cellSize + 0.3}
        fill={foregroundColor}
      />
    );
  };

  return (
    <svg
      ref={innerRef}
      width={size}
      height={text ? (size * totalHeight) / totalViewBox : size}
      viewBox={`0 0 ${totalViewBox} ${totalHeight}`}
      role="img"
      aria-label={text || "QR Code สำหรับเปิดการ์ด"}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 1. Base Card Shape with Background */}
      <rect
        x="18"
        y="18"
        width="364"
        height="364"
        rx="28"
        fill={backgroundColor}
        stroke={borderWidth > 0 ? accentColor : "none"}
        strokeWidth={borderWidth}
      />

      {/* 2. Quiet Zone Cushion */}
      <rect
        x={coreX - 6}
        y={coreY - 6}
        width={coreSize + 12}
        height={coreSize + 12}
        rx="8"
        fill={backgroundColor}
      />

      {/* 3. Core QR Code Modules */}
      <g>
        {Array.from({ length: qrData.size }, (_, r) =>
          Array.from({ length: qrData.size }, (_, c) => renderModule(r, c))
        )}
      </g>

      {/* 4. Center Logo if provided */}
      {logoUrl && (
        <g transform={`translate(${totalViewBox / 2 - 25}, ${totalViewBox / 2 - 25})`}>
          <rect
            x="-2"
            y="-2"
            width="54"
            height="54"
            rx="10"
            fill={backgroundColor}
            stroke={accentColor}
            strokeWidth="2"
          />
          <image
            href={logoUrl}
            x="0"
            y="0"
            width="50"
            height="50"
            preserveAspectRatio="xMidYMid slice"
          />
        </g>
      )}

      {/* 5. Text Banner underneath QR code */}
      {text && (
        <g transform={`translate(0, ${totalViewBox + 10})`}>
          <rect
            x={Math.max(12, (totalViewBox - 240) / 2)}
            y="0"
            width={Math.min(totalViewBox - 24, 240)}
            height="34"
            rx="17"
            fill={accentColor}
          />
          <text
            x={totalViewBox / 2}
            y="22"
            fill={backgroundColor}
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, 'Prompt', 'Kanit', sans-serif"
            fontSize="13"
            fontWeight="700"
          >
            {text}
          </text>
        </g>
      )}
    </svg>
  );
});

export default CustomQRCode;
