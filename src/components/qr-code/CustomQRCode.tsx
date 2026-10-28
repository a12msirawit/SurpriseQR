"use client";

import QRCode from "qrcode";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export type QRShape = "square" | "rounded" | "heart" | "gift" | "cake" | "star" | "coffee";
export type QRFrame = "none" | "rounded" | "heart" | "circle" | "cloud" | "flower" | "star" | "phone" | "shield" | "ticket" | "minimal";

export interface CustomQRCodeProps {
  value: string;
  shape?: QRShape;
  foregroundColor?: string;
  backgroundColor?: string;
  accentColor?: string;
  text?: string;
  logoUrl?: string;
  frameStyle?: QRFrame;
  size?: number;
  className?: string;
}

function modulePath(shape: QRShape, x: number, y: number, size: number): React.ReactNode {
  const inset = size * 0.08;
  const left = x + inset;
  const top = y + inset;
  const width = size - inset * 2;
  const radius = size * 0.22;
  if (shape === "rounded") return <rect x={left} y={top} width={width} height={width} rx={radius} />;
  if (shape === "heart") return <path d={`M ${x + size / 2} ${y + size * 0.9} C ${x - size * 0.1} ${y + size * 0.45}, ${x + size * 0.15} ${y + size * 0.08}, ${x + size / 2} ${y + size * 0.3} C ${x + size * 0.85} ${y + size * 0.08}, ${x + size * 1.1} ${y + size * 0.45}, ${x + size / 2} ${y + size * 0.9} Z`} />;
  if (shape === "star") {
    const points = Array.from({ length: 10 }, (_, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI) / 5;
      const radiusValue = index % 2 === 0 ? size * 0.48 : size * 0.2;
      return `${x + size / 2 + Math.cos(angle) * radiusValue},${y + size / 2 + Math.sin(angle) * radiusValue}`;
    }).join(" ");
    return <polygon points={points} />;
  }
  if (shape === "gift") return <path d={`M ${left} ${top + width * 0.28} H ${left + width} V ${top + width} H ${left} Z M ${x + size * 0.42} ${top} H ${x + size * 0.58} V ${top + width} H ${x + size * 0.42} Z`} />;
  if (shape === "cake") return <path d={`M ${left} ${top + width * 0.38} Q ${x + size / 2} ${top + width * 0.62} ${left + width} ${top + width * 0.38} V ${top + width} H ${left} Z M ${x + size * 0.42} ${top} H ${x + size * 0.58} V ${top + width} H ${x + size * 0.42} Z`} />;
  if (shape === "coffee") return <path d={`M ${left} ${top + width * 0.18} H ${left + width * 0.72} V ${top + width * 0.72} Q ${left + width * 0.72} ${top + width} ${left + width * 0.42} ${top + width} H ${left + width * 0.25} Q ${left} ${top + width} ${left} ${top + width * 0.72} Z M ${left + width * 0.72} ${top + width * 0.35} H ${left + width} Q ${left + width * 1.1} ${top + width * 0.62} ${left + width} ${top + width * 0.78} H ${left + width * 0.72} Z`} />;
  return <rect x={x} y={y} width={size} height={size} />;
}

const CustomQRCode = forwardRef<SVGSVGElement, CustomQRCodeProps>(function CustomQRCode({
  value,
  shape = "square",
  foregroundColor = "#111827",
  backgroundColor = "#ffffff",
  accentColor = "#fb7185",
  text,
  logoUrl,
  frameStyle = "rounded",
  size = 320,
  className,
}, ref) {
  const innerRef = useRef<SVGSVGElement>(null);
  const [matrix, setMatrix] = useState<number[][] | null>(null);

  useImperativeHandle(ref, () => innerRef.current as SVGSVGElement);

  useEffect(() => {
    let active = true;
    const qr = QRCode.create(value || "https://surpriseqr.local", { errorCorrectionLevel: "H" });
    const modules = qr.modules;
    const next = Array.from({ length: modules.size }, (_, row) =>
      Array.from({ length: modules.size }, (_, column) => modules.get(row, column)),
    );
    if (active) setMatrix(next);
    return () => { active = false; };
  }, [value]);

  if (!matrix) return <div style={{ width: size, height: size }} className={className} aria-label="กำลังสร้าง QR Code" />;

  const count = matrix.length;
  const quiet = 4;
  const cell = size / (count + quiet * 2);
  const offset = quiet * cell;
  const isFinder = (row: number, column: number) =>
    (row < 7 && column < 7) || (row < 7 && column >= count - 7) || (row >= count - 7 && column < 7);
  const modules = matrix.flatMap((row, rowIndex) => row.map((filled, columnIndex) => filled && !isFinder(rowIndex, columnIndex)
    ? <g key={`${rowIndex}-${columnIndex}`} fill={foregroundColor}>{modulePath(shape, offset + columnIndex * cell, offset + rowIndex * cell, cell)}</g>
    : null));
  const finderPatterns = [[0, 0], [count - 7, 0], [0, count - 7]].map(([column, row]) => (
    <g key={`${column}-${row}`} fill={foregroundColor}>
      <rect x={offset + column * cell} y={offset + row * cell} width={cell * 7} height={cell * 7} rx={shape === "rounded" ? cell * 1.2 : 0} />
      <rect x={offset + (column + 1) * cell} y={offset + (row + 1) * cell} width={cell * 5} height={cell * 5} fill={backgroundColor} rx={shape === "rounded" ? cell : 0} />
      <rect x={offset + (column + 2) * cell} y={offset + (row + 2) * cell} width={cell * 3} height={cell * 3} rx={shape === "rounded" ? cell * 0.7 : 0} />
    </g>
  ));
  const labelHeight = text ? 58 : 0;
  const padding = frameStyle === "none" ? 0 : 20;
  const canvasWidth = size + padding * 2;
  const totalHeight = size + labelHeight + padding * 2;
  const frame = frameStyle === "none" ? null : frameStyle === "heart"
    ? <path d={`M ${canvasWidth / 2} ${totalHeight - 8} C 8 ${totalHeight * 0.65}, 4 30, ${canvasWidth / 2} 42 C ${canvasWidth - 4} 30, ${canvasWidth - 8} ${totalHeight * 0.65}, ${canvasWidth / 2} ${totalHeight - 8} Z`} fill="none" stroke={accentColor} strokeWidth="6" />
    : frameStyle === "circle"
      ? <ellipse cx={canvasWidth / 2} cy={totalHeight / 2} rx={canvasWidth / 2 - 8} ry={totalHeight / 2 - 8} fill="none" stroke={accentColor} strokeWidth="6" />
      : frameStyle === "cloud"
        ? <path d={`M 22 ${totalHeight - 25} Q 4 ${totalHeight * 0.55} 28 ${totalHeight * 0.35} Q 22 8 52 20 Q 75 -2 100 18 Q ${canvasWidth / 2} 0 ${canvasWidth / 2 + 25} 18 Q ${canvasWidth - 10} 4 ${canvasWidth - 12} 38 Q ${canvasWidth + 8} ${totalHeight * 0.55} ${canvasWidth - 20} ${totalHeight - 25} Z`} fill="none" stroke={accentColor} strokeWidth="6" />
        : frameStyle === "flower"
          ? <path d={`M ${canvasWidth / 2} 10 C ${canvasWidth * 0.68} -4 ${canvasWidth * 0.72} 18 ${canvasWidth * 0.86} 14} C ${canvasWidth + 8} 10 ${canvasWidth - 2} ${totalHeight * 0.34} ${canvasWidth - 8} ${totalHeight / 2} C ${canvasWidth + 6} ${totalHeight * 0.72} ${canvasWidth * 0.82} ${totalHeight - 2} ${canvasWidth * 0.68} ${totalHeight - 10} C ${canvasWidth / 2} ${totalHeight + 8} ${canvasWidth * 0.38} ${totalHeight - 2} ${canvasWidth * 0.32} ${totalHeight - 10} C ${canvasWidth * 0.08} ${totalHeight - 2} -2 ${totalHeight * 0.72} 8 ${totalHeight / 2} C -2 ${totalHeight * 0.3} ${canvasWidth * 0.08} 10 ${canvasWidth * 0.14} 14 C ${canvasWidth * 0.28} 18 ${canvasWidth * 0.32} -4 ${canvasWidth / 2} 10 Z`} fill="none" stroke={accentColor} strokeWidth="6" />
          : frameStyle === "star"
            ? <polygon points={Array.from({ length: 10 }, (_, index) => { const angle = -Math.PI / 2 + (index * Math.PI) / 5; const radiusValue = index % 2 === 0 ? Math.min(canvasWidth, totalHeight) * 0.51 : Math.min(canvasWidth, totalHeight) * 0.46; return `${canvasWidth / 2 + Math.cos(angle) * radiusValue},${totalHeight / 2 + Math.sin(angle) * radiusValue}`; }).join(" ")} fill="none" stroke={accentColor} strokeWidth="6" />
            : frameStyle === "phone"
              ? <rect x="8" y="8" width={canvasWidth - 16} height={totalHeight - 16} rx="28" fill="none" stroke={accentColor} strokeWidth="7" />
              : frameStyle === "shield"
                ? <path d={`M 10 12 H ${canvasWidth - 10} V ${totalHeight * 0.62} Q ${canvasWidth / 2} ${totalHeight + 10} 10 ${totalHeight * 0.62} Z`} fill="none" stroke={accentColor} strokeWidth="6" />
                : frameStyle === "ticket"
                  ? <path d={`M 12 10 H ${canvasWidth - 12} V ${totalHeight * 0.38} Q ${canvasWidth - 28} ${totalHeight / 2} ${canvasWidth - 12} ${totalHeight * 0.62} V ${totalHeight - 10} H 12 V ${totalHeight * 0.62} Q 28 ${totalHeight / 2} 12 ${totalHeight * 0.38} Z`} fill="none" stroke={accentColor} strokeWidth="6" strokeDasharray="12 7" />
                  : frameStyle === "minimal"
                    ? <path d={`M 12 42 V 12 H 42 M ${canvasWidth - 42} 12 H ${canvasWidth - 12} V 42 M 12 ${totalHeight - 42} V ${totalHeight - 12} H 42 M ${canvasWidth - 42} ${totalHeight - 12} H ${canvasWidth - 12} V ${totalHeight - 42}`} fill="none" stroke={accentColor} strokeWidth="6" strokeLinecap="round" />
                    : <rect x="8" y="8" width={canvasWidth - 16} height={totalHeight - 16} rx="26" fill="none" stroke={accentColor} strokeWidth="6" />;

  return <svg ref={innerRef} width={canvasWidth} height={totalHeight} viewBox={`0 0 ${canvasWidth} ${totalHeight}`} role="img" aria-label={text || "QR Code สำหรับเปิดการ์ด"} className={className} xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="qr-accent" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={accentColor} /><stop offset="1" stopColor={foregroundColor} /></linearGradient></defs>
    <rect width={canvasWidth} height={totalHeight} rx="18" fill={backgroundColor} />
    {frame}
    <g transform={`translate(${padding} ${padding})`}>
    {modules}{finderPatterns}
    {logoUrl && <image href={logoUrl} x={size * 0.4} y={size * 0.4} width={size * 0.2} height={size * 0.2} preserveAspectRatio="xMidYMid slice" />}
    {text && <><rect x="20" y={size + 10} width={size - 40} height="38" rx="19" fill={accentColor} /><text x={size / 2} y={size + 35} fill={backgroundColor} textAnchor="middle" fontFamily="Kanit, sans-serif" fontSize="16" fontWeight="700">{text}</text></>}
    </g>
  </svg>;
});

export default CustomQRCode;
