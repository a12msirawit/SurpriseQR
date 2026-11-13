"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  Download,
  Copy,
  Share2,
  Check,
  Palette,
  Layers,
  Sliders,
  ArrowLeftRight,
  RotateCcw,
  Link2,
  Save,
  ExternalLink,
  Heart,
  Star,
  Triangle,
} from "lucide-react";
import QRCode from "qrcode";
import {
  exportSvgToPngBlob,
  exportSvgToSvgBlob,
  triggerDownload,
  shareQrBlob,
} from "@/lib/qr-export";

// High-precision SVG Path for Heart Silhouette (Kept for backwards compatibility)
export const HEART_PATH =
  "M 200,108 C 175,52 105,36 58,78 C 12,120 18,198 72,262 C 118,316 172,358 200,382 C 228,358 282,316 328,262 C 382,198 388,120 342,78 C 295,36 225,52 200,108 Z";

// Preset Palettes matching the user's dashboard UI
export const PRESET_PALETTES = [
  { id: "classic", name: "คลาสสิก", qr: "#111827", bg: "#ffffff", border: "#4b5563" },
  { id: "rose", name: "หวานซึ้ง (Rose)", qr: "#e11d48", bg: "#fff1f2", border: "#fb7185" },
  { id: "cosmic", name: "อวกาศ (Cosmic)", qr: "#6d28d9", bg: "#faf5ff", border: "#a855f7" },
  { id: "cyber", name: "ดาร์กโหมด (Cyber)", qr: "#06b6d4", bg: "#0f172a", border: "#38bdf8" },
  { id: "emerald", name: "ธรรมชาติ (Emerald)", qr: "#047857", bg: "#f0fdf4", border: "#34d399" },
  { id: "gold", name: "ทองหรู (Gold)", qr: "#b45309", bg: "#fffbeb", border: "#f59e0b" },
];

// Quick Pick Colors for instant selection
const QUICK_DOT_COLORS = [
  "#000000",
  "#6d28d9",
  "#e11d48",
  "#2563eb",
  "#059669",
  "#d97706",
  "#db2777",
  "#0f172a",
];

const QUICK_BG_COLORS = [
  "#ffffff",
  "#faf5ff",
  "#fff1f2",
  "#f0fdf4",
  "#fffbeb",
  "#f8fafc",
  "#0f172a",
  "#1e1533",
];

type DotStyle = "sharp" | "rounded" | "dots" | "heart" | "star" | "triangle";

const DOT_STYLE_OPTIONS: Array<{ id: DotStyle; label: string }> = [
  { id: "sharp", label: "เหลี่ยมคมชัด" },
  { id: "rounded", label: "ทรงมนโมเดิร์น" },
  { id: "dots", label: "จุดวงกลม" },
  { id: "heart", label: "ทรงหัวใจ" },
  { id: "star", label: "ทรงดาว" },
  { id: "triangle", label: "ทรงสามเหลี่ยม" },
];

export interface QRCodeCustomizerProps {
  value: string;
  cardSlug?: string;
  svgRef?: React.RefObject<SVGSVGElement | null>;
  showActionButtons?: boolean;
  customUrlBase?: string;
  customSlug?: string;
  isCustomSlugLocked?: boolean;
  onSaveCustomSlug?: (slug: string) => Promise<{ ok: boolean; error?: string; customSlug?: string }>;
}

export default function QRCodeCustomizer({
  value,
  cardSlug = "card",
  svgRef: externalSvgRef,
  showActionButtons = true,
  customUrlBase,
  customSlug = "",
  isCustomSlugLocked = false,
  onSaveCustomSlug,
}: QRCodeCustomizerProps) {
  const localSvgRef = useRef<SVGSVGElement>(null);
  const effectiveSvgRef = externalSvgRef || localSvgRef;

  const targetUrl = value || "https://surprise-qr.vercel.app/c/9Kj1Mit0";
  const [slugInput, setSlugInput] = useState(customSlug);
  const [slugSaving, setSlugSaving] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [slugCopied, setSlugCopied] = useState(false);

  useEffect(() => {
    setSlugInput(customSlug);
  }, [customSlug]);
  const [dotStyle, setDotStyle] = useState<DotStyle>("sharp");
  const [activePalette, setActivePalette] = useState<string>("cosmic");

  const [qrColor, setQrColor] = useState("#6d28d9");
  const [bgColor, setBgColor] = useState("#faf5ff");
  const [borderColor, setBorderColor] = useState("#a855f7");
  const [borderWidth, setBorderWidth] = useState(3);
  const [copied, setCopied] = useState(false);
  const [notification, setNotification] = useState("");

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  const applyPreset = (preset: typeof PRESET_PALETTES[number]) => {
    setActivePalette(preset.id);
    setQrColor(preset.qr);
    setBgColor(preset.bg);
    setBorderColor(preset.border);
    showNotice(`เลือกธีมสี "${preset.name}" แล้ว`);
  };

  // Custom Color Change Handlers (switch activePalette to "custom")
  const handleQrColorChange = (color: string) => {
    setQrColor(color);
    setActivePalette("custom");
  };

  const handleBgColorChange = (color: string) => {
    setBgColor(color);
    setActivePalette("custom");
  };

  const handleBorderColorChange = (color: string) => {
    setBorderColor(color);
    setActivePalette("custom");
  };

  // Swap QR color and Background color
  const handleSwapColors = () => {
    const tempQr = qrColor;
    setQrColor(bgColor);
    setBgColor(tempQr);
    setActivePalette("custom");
    showNotice("สลับสีจุดและสีพื้นหลังเรียบร้อย");
  };

  // Reset to default crisp black & white
  const handleResetClassic = () => {
    setActivePalette("classic");
    setQrColor("#111827");
    setBgColor("#ffffff");
    setBorderColor("#4b5563");
    setBorderWidth(3);
    showNotice("รีเซ็ตเป็นสีคลาสสิกเริ่มต้น");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    showNotice("คัดลอกลิงก์สำเร็จแล้ว");
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate 100% Valid, Intact, Non-Clipped QR Matrix
  const qrData = useMemo(() => {
    try {
      const qr = QRCode.create(targetUrl, { errorCorrectionLevel: "H" });
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
  }, [targetUrl]);

  // Standard Center Geometry for crisp scanning
  const totalViewBox = 400;
  const coreSize = 300;
  const coreX = (totalViewBox - coreSize) / 2; // 50
  const coreY = (totalViewBox - coreSize) / 2; // 50
  const cellSize = coreSize / qrData.size;

  // Render individual QR code module
  const renderModule = (r: number, c: number) => {
    if (!qrData.get(r, c)) return null;

    const x = coreX + c * cellSize;
    const y = coreY + r * cellSize;

    if (dotStyle === "dots") {
      return (
        <circle
          key={`dot-${r}-${c}`}
          cx={x + cellSize / 2}
          cy={y + cellSize / 2}
          r={cellSize * 0.44}
          fill={qrColor}
        />
      );
    }

    if (dotStyle === "rounded") {
      return (
        <rect
          key={`rect-round-${r}-${c}`}
          x={x}
          y={y}
          width={cellSize * 0.92}
          height={cellSize * 0.92}
          rx={cellSize * 0.28}
          ry={cellSize * 0.28}
          fill={qrColor}
        />
      );
    }

    if (dotStyle === "heart") {
      const s = cellSize;
      const d = `M ${x + s * 0.5},${y + s * 0.92} C ${x + s * 0.12},${y + s * 0.68} ${x + s * 0.04},${y + s * 0.42} ${x + s * 0.04},${y + s * 0.28} C ${x + s * 0.04},${y + s * 0.12} ${x + s * 0.18},${y + s * 0.05} ${x + s * 0.32},${y + s * 0.05} C ${x + s * 0.42},${y + s * 0.05} ${x + s * 0.48},${y + s * 0.12} ${x + s * 0.5},${y + s * 0.2} C ${x + s * 0.52},${y + s * 0.12} ${x + s * 0.58},${y + s * 0.05} ${x + s * 0.68},${y + s * 0.05} C ${x + s * 0.82},${y + s * 0.05} ${x + s * 0.96},${y + s * 0.12} ${x + s * 0.96},${y + s * 0.28} C ${x + s * 0.96},${y + s * 0.42} ${x + s * 0.88},${y + s * 0.68} ${x + s * 0.5},${y + s * 0.92} Z`;
      return <path key={`heart-${r}-${c}`} d={d} fill={qrColor} />;
    }

    if (dotStyle === "star") {
      const cx = x + cellSize / 2;
      const cy = y + cellSize / 2;
      const outer = cellSize * 0.5;
      const inner = cellSize * 0.24;
      const points = Array.from({ length: 10 }, (_, idx) => {
        const angle = -Math.PI / 2 + (idx * Math.PI) / 5;
        const radius = idx % 2 === 0 ? outer : inner;
        return `${(cx + Math.cos(angle) * radius).toFixed(2)},${(cy + Math.sin(angle) * radius).toFixed(2)}`;
      }).join(" ");
      return <polygon key={`star-${r}-${c}`} points={points} fill={qrColor} />;
    }

    if (dotStyle === "triangle") {
      const s = cellSize;
      const points = `${(x + s * 0.5).toFixed(2)},${(y + s * 0.04).toFixed(2)} ${(x + s * 0.96).toFixed(2)},${(y + s * 0.94).toFixed(2)} ${(x + s * 0.04).toFixed(2)},${(y + s * 0.94).toFixed(2)}`;
      return <polygon key={`tri-${r}-${c}`} points={points} fill={qrColor} />;
    }

    // Crisp Sharp Modules (slight +0.3px overlap prevents subpixel hairline gaps)
    return (
      <rect
        key={`rect-${r}-${c}`}
        x={x}
        y={y}
        width={cellSize + 0.3}
        height={cellSize + 0.3}
        fill={qrColor}
      />
    );
  };

  // Export handling: Download Canvas as PNG
  const handleDownloadPNG = async () => {
    const svgElement = effectiveSvgRef.current;
    if (!svgElement) return;
    try {
      const blob = await exportSvgToPngBlob(svgElement, 1200);
      triggerDownload(blob, `surpriseqr-${cardSlug}.png`);
      showNotice("ดาวน์โหลดรูปภาพ PNG สำเร็จแล้ว");
    } catch (e) {
      console.error(e);
      showNotice("เกิดข้อผิดพลาดในการดาวน์โหลด PNG");
    }
  };

  // Export SVG directly
  const handleDownloadSVG = () => {
    const svgElement = effectiveSvgRef.current;
    if (!svgElement) return;
    try {
      const blob = exportSvgToSvgBlob(svgElement);
      triggerDownload(blob, `surpriseqr-${cardSlug}.svg`);
      showNotice("ดาวน์โหลดรูปภาพ SVG สำเร็จแล้ว");
    } catch (e) {
      console.error(e);
      showNotice("เกิดข้อผิดพลาดในการดาวน์โหลด SVG");
    }
  };

  const handleShare = async () => {
    const svgElement = effectiveSvgRef.current;
    if (!svgElement) return;
    try {
      const blob = await exportSvgToPngBlob(svgElement, 1000);
      const shared = await shareQrBlob(blob, `surpriseqr-${cardSlug}.png`, "SurpriseQR Code", targetUrl);
      if (!shared) {
        triggerDownload(blob, `surpriseqr-${cardSlug}.png`);
        showNotice("ดาวน์โหลดรูปลงเครื่องแล้ว");
      }
    } catch {
      showNotice("เกิดข้อผิดพลาดในการแชร์");
    }
  };

  const activeCustomUrl = slugInput.trim()
    ? `${customUrlBase || (typeof window !== "undefined" ? window.location.origin : "")}/c/${slugInput.trim()}`
    : targetUrl;

  const handleCopyCustomUrl = () => {
    navigator.clipboard.writeText(activeCustomUrl);
    setSlugCopied(true);
    showNotice("คัดลอกลิงก์สำเร็จแล้ว");
    setTimeout(() => setSlugCopied(false), 2000);
  };

  const handleSaveSlug = async () => {
    if (!onSaveCustomSlug || isCustomSlugLocked || slugSaving) return;
    setSlugSaving(true);
    setSlugError(null);
    const result = await onSaveCustomSlug(slugInput);
    setSlugSaving(false);
    if (!result.ok) {
      setSlugError(result.error || "ไม่สามารถบันทึก Custom URL ได้");
      return;
    }
    if (result.customSlug) {
      setSlugInput(result.customSlug);
    }
    showNotice("บันทึก Custom URL สำเร็จแล้ว");
  };

  return (
    <div className="w-full text-white font-sans antialiased">
      {/* Outer Modal Container */}
      <div className="w-full bg-[#140e21] border border-purple-900/40 rounded-2xl shadow-2xl p-6 relative overflow-hidden backdrop-blur-xl">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Notification Toast */}
        {notification && (
          <div className="mb-4 py-2.5 px-4 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 rounded-lg flex items-center justify-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-200">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{notification}</span>
          </div>
        )}

        {/* Main Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: QR Code Preview & Action Buttons */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full max-w-[340px] aspect-square rounded-2xl bg-[#130d22] border border-purple-900/40 p-4 flex items-center justify-center shadow-inner relative group">
              {/* Scaled-down 100% Scannable Standard QR Code */}
              <svg
                ref={effectiveSvgRef}
                width={totalViewBox}
                height={totalViewBox}
                viewBox={`0 0 ${totalViewBox} ${totalViewBox}`}
                className="w-full h-full select-none transition-all duration-300"
                role="img"
                aria-label="SurpriseQR Code"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* 1. Base Card Shape with Custom Background & Border */}
                <rect
                  x="18"
                  y="18"
                  width="364"
                  height="364"
                  rx="28"
                  fill={bgColor}
                  stroke={borderWidth > 0 ? borderColor : "none"}
                  strokeWidth={borderWidth}
                />

                {/* 2. Quiet Zone Cushion around Core QR Code */}
                <rect
                  x={coreX - 6}
                  y={coreY - 6}
                  width={coreSize + 12}
                  height={coreSize + 12}
                  rx="8"
                  fill={bgColor}
                />

                {/* 3. Core QR Code: 100% Intact, Centered, Razor-sharp, Never Clipped */}
                <g>
                  {Array.from({ length: qrData.size }, (_, r) =>
                    Array.from({ length: qrData.size }, (_, c) => renderModule(r, c))
                  )}
                </g>

                {/* 4. Outer Border on Top if configured */}
                {borderWidth > 0 && (
                  <rect
                    x="18"
                    y="18"
                    width="364"
                    height="364"
                    rx="28"
                    fill="none"
                    stroke={borderColor}
                    strokeWidth={borderWidth}
                  />
                )}
              </svg>
            </div>

            {/* Bottom Floating Pill & Subtext */}
            <div className="w-full max-w-[340px] mt-3 flex flex-col items-center gap-2">
              <span className="w-full py-1.5 px-3 bg-[#1e1533] border border-purple-800/40 text-purple-200 text-xs rounded-full font-medium text-center shadow-sm">
                สแกนเพื่อเปิดการ์ด
              </span>
              <p className="text-[11px] text-gray-400 text-center">
                ปรับแต่งรูปแบบและสีได้แบบอิสระเรียลไทม์ พร้อมสแกนใช้งานจริง 100%
              </p>
            </div>

            {/* Action Download Buttons */}
            {showActionButtons && (
              <div className="w-full max-w-[340px] mt-4 space-y-2">
                <button
                  type="button"
                  onClick={handleDownloadPNG}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-medium flex items-center justify-center gap-2 shadow-lg shadow-pink-500/25 transition-all duration-200 active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" />
                  <span>ดาวน์โหลดรูป QR Code (PNG)</span>
                </button>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadSVG}
                    className="py-2 px-3 rounded-lg bg-[#1c152e] hover:bg-[#281e42] border border-purple-900/40 text-gray-300 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                    <span>SVG</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="py-2 px-3 rounded-lg bg-[#1c152e] hover:bg-[#281e42] border border-purple-900/40 text-gray-300 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-blue-400" />
                    <span>คัดลอก</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="py-2 px-3 rounded-lg bg-[#1c152e] hover:bg-[#281e42] border border-purple-900/40 text-gray-300 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5 text-pink-400" />
                    <span>แชร์</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Customization Controls */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Dots & Lines Customization */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sliders className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-gray-200">
                  1. ทรงเส้น / รูปแบบจุด QR CODE
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {DOT_STYLE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setDotStyle(option.id)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                      dotStyle === option.id
                        ? "border-purple-500 bg-purple-500/20 text-white shadow-md shadow-purple-500/10"
                        : "border-purple-900/40 bg-[#160f27] text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    {option.id === "sharp" && <div className="w-3.5 h-3.5 bg-current rounded-none" />}
                    {option.id === "rounded" && <div className="w-3.5 h-3.5 bg-current rounded-[3px]" />}
                    {option.id === "dots" && <div className="w-3.5 h-3.5 bg-current rounded-full" />}
                    {option.id === "heart" && <Heart className="w-3.5 h-3.5 fill-current" />}
                    {option.id === "star" && <Star className="w-3.5 h-3.5 fill-current" />}
                    {option.id === "triangle" && <Triangle className="w-3.5 h-3.5 fill-current" />}
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Color Customization (Free & Flexible) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-gray-200">
                    2. ปรับแต่งสี (COLOR CUSTOMIZATION) อิสระ
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSwapColors}
                    className="px-2.5 py-1 rounded-lg bg-[#1f1638] hover:bg-[#2c204d] border border-purple-800/40 text-[11px] text-purple-300 hover:text-purple-100 flex items-center gap-1 transition-colors"
                    title="สลับสีจุด QR Code และ สีพื้นหลัง"
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                    <span>สลับสี</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetClassic}
                    className="px-2.5 py-1 rounded-lg bg-[#1f1638] hover:bg-[#2c204d] border border-purple-800/40 text-[11px] text-gray-300 hover:text-white flex items-center gap-1 transition-colors"
                    title="รีเซ็ตเป็นสีเริ่มต้น"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>รีเซ็ต</span>
                  </button>
                </div>
              </div>

              {/* Theme Palettes */}
              <div className="flex items-center justify-between text-[11px] text-gray-400 mb-2">
                <span>ธีมสีแนะนำยอดนิยม:</span>
                <span className="text-xs text-purple-300 font-mono">
                  {activePalette === "custom"
                    ? "สถานะ: สีอิสระ (Custom)"
                    : `สถานะ: ${PRESET_PALETTES.find((p) => p.id === activePalette)?.name || "ธีมสี"}`}
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
                {PRESET_PALETTES.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`py-1.5 px-2 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 justify-center transition-colors ${
                      activePalette === preset.id
                        ? "border-purple-400 bg-purple-900/40 text-white shadow-sm"
                        : "border-purple-900/30 bg-[#160f27] text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: preset.qr }}
                    />
                    <span className="truncate">{preset.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>

              {/* Individual Custom Color Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. QR Dot Color */}
                <div className="p-3 rounded-xl bg-[#160f27] border border-purple-900/40 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-gray-300 font-medium">สีจุด QR Code</label>
                    <span className="text-[10px] text-purple-400 font-mono">{qrColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={qrColor}
                      onChange={(e) => handleQrColorChange(e.target.value)}
                      className="w-8 h-8 rounded-lg border border-gray-700 bg-transparent cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={qrColor}
                      onChange={(e) => handleQrColorChange(e.target.value)}
                      className="bg-[#100a1d] px-2 py-1 rounded border border-purple-900/40 text-xs font-mono text-gray-200 w-full outline-none focus:border-purple-500"
                      placeholder="#000000"
                    />
                  </div>
                  {/* Quick Pick Swatches */}
                  <div className="flex items-center gap-1 mt-1 pt-1 border-t border-purple-900/30 overflow-x-auto">
                    {QUICK_DOT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleQrColorChange(c)}
                        className="w-4 h-4 rounded-full border border-white/20 shrink-0 hover:scale-125 transition-transform"
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>

                {/* 2. Background Color */}
                <div className="p-3 rounded-xl bg-[#160f27] border border-purple-900/40 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-gray-300 font-medium">สีพื้นหลัง</label>
                    <span className="text-[10px] text-purple-400 font-mono">{bgColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => handleBgColorChange(e.target.value)}
                      className="w-8 h-8 rounded-lg border border-gray-700 bg-transparent cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={bgColor}
                      onChange={(e) => handleBgColorChange(e.target.value)}
                      className="bg-[#100a1d] px-2 py-1 rounded border border-purple-900/40 text-xs font-mono text-gray-200 w-full outline-none focus:border-purple-500"
                      placeholder="#ffffff"
                    />
                  </div>
                  {/* Quick Pick Swatches */}
                  <div className="flex items-center gap-1 mt-1 pt-1 border-t border-purple-900/30 overflow-x-auto">
                    {QUICK_BG_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleBgColorChange(c)}
                        className="w-4 h-4 rounded-full border border-white/20 shrink-0 hover:scale-125 transition-transform"
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>

                {/* 3. Outline / Border Color */}
                <div className="p-3 rounded-xl bg-[#160f27] border border-purple-900/40 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-gray-300 font-medium">สีกรอบ / ขอบทรง</label>
                    <span className="text-[10px] text-purple-400 font-mono">{borderColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={borderColor}
                      onChange={(e) => handleBorderColorChange(e.target.value)}
                      className="w-8 h-8 rounded-lg border border-gray-700 bg-transparent cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={borderColor}
                      onChange={(e) => handleBorderColorChange(e.target.value)}
                      className="bg-[#100a1d] px-2 py-1 rounded border border-purple-900/40 text-xs font-mono text-gray-200 w-full outline-none focus:border-purple-500"
                      placeholder="#000000"
                    />
                  </div>
                  {/* Quick Pick Swatches */}
                  <div className="flex items-center gap-1 mt-1 pt-1 border-t border-purple-900/30 overflow-x-auto">
                    {QUICK_DOT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleBorderColorChange(c)}
                        className="w-4 h-4 rounded-full border border-white/20 shrink-0 hover:scale-125 transition-transform"
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Border Width Slider */}
              <div className="mt-4 p-3 rounded-xl bg-[#160f27] border border-purple-900/30 flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-300 font-medium">ความหนาของเส้นขอบ</span>
                  <span className="text-[10px] text-gray-400">0px = ไร้ขอบ (เฉพาะตัว QR Code)</span>
                </div>
                <div className="flex items-center gap-3 w-48">
                  <input
                    type="range"
                    min="0"
                    max="16"
                    value={borderWidth}
                    onChange={(e) => setBorderWidth(Number(e.target.value))}
                    className="w-full accent-pink-500 cursor-pointer"
                  />
                  <span className="text-xs font-mono text-pink-400 w-8 text-right">{borderWidth}px</span>
                </div>
              </div>

              {/* 3. Custom URL Input (when callback provided) */}
              {onSaveCustomSlug && (
                <div className="mt-4 p-3.5 rounded-xl bg-[#160f27] border border-purple-900/40 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-purple-400" />
                      <h3 className="text-sm font-semibold text-gray-200">
                        3. ตั้งชื่อ Custom URL
                      </h3>
                    </div>
                    {isCustomSlugLocked && (
                      <span className="rounded-md border border-emerald-400/20 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                        เปิดใช้งานแล้ว
                      </span>
                    )}
                  </div>
                  <div className="flex overflow-hidden rounded-xl border border-purple-900/40 bg-[#100a1d] focus-within:border-purple-500">
                    <span className="flex shrink-0 items-center border-r border-purple-900/40 bg-white/5 px-3 font-mono text-xs text-slate-400">
                      {customUrlBase ? `${customUrlBase}/c/` : "/c/"}
                    </span>
                    <input
                      type="text"
                      value={slugInput}
                      onChange={(e) => setSlugInput(e.target.value)}
                      readOnly={isCustomSlugLocked}
                      placeholder={isCustomSlugLocked ? "" : "my-special-card"}
                      className="min-w-0 flex-1 bg-transparent px-3 py-2 font-mono text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none read-only:cursor-not-allowed read-only:text-slate-400"
                    />
                  </div>
                  {isCustomSlugLocked && (
                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={handleCopyCustomUrl}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-purple-800/40 bg-[#1f1638] px-3 py-1.5 text-xs font-medium text-purple-200 transition-colors hover:bg-[#2c204d] hover:text-white"
                      >
                        {slugCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-blue-400" />}
                        <span>{slugCopied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}</span>
                      </button>
                      <a
                        href={activeCustomUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-purple-800/40 bg-[#1f1638] px-3 py-1.5 text-xs font-medium text-purple-200 transition-colors hover:bg-[#2c204d] hover:text-white"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-pink-400" />
                        <span>เปิดลิงก์</span>
                      </a>
                    </div>
                  )}
                  {!isCustomSlugLocked && (
                    <p className="text-[11px] font-medium text-amber-400">
                      ตั้งชื่อ URL แล้วบันทึกจะไม่สามารถแก้ไขได้อีก!
                    </p>
                  )}
                  {slugError && (
                    <p className="rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-1.5 text-xs text-red-300">
                      {slugError}
                    </p>
                  )}
                  {!isCustomSlugLocked && (
                    <button
                      type="button"
                      onClick={handleSaveSlug}
                      disabled={slugSaving || !slugInput.trim()}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-2 text-xs font-bold text-white transition-all hover:opacity-95 disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {slugSaving ? "กำลังบันทึก..." : "บันทึก URL"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
