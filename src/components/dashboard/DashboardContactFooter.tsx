"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Check,
  Copy,
  ExternalLink,
  MessageCircle,
  QrCode,
  UserPlus,
  X,
} from "lucide-react";

const LINE_ID = "@369yagqz";
const LINE_ADD_URL = "https://line.me/R/ti/p/@369yagqz";
const LINE_QR_IMAGE_PATH = "/images/line-qr.png";

function LineLogoIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.282.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}

export default function DashboardContactFooter() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsModalOpen(false);
      }
    }

    if (isModalOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalOpen]);

  async function handleCopyLineId() {
    try {
      await navigator.clipboard.writeText(LINE_ID);
      setCopied(true);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = LINE_ID;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
    }
  }

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <>
      <footer className="flex w-full justify-center pt-2 pb-6 sm:justify-end">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="group inline-flex shrink-0 items-center gap-2.5 rounded-xl border border-[#06C755]/40 bg-[#120a21]/90 px-4 py-2.5 text-white shadow-md shadow-black/30 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#06C755] hover:bg-[#06C755]/15 hover:shadow-emerald-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06C755]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#06C755] text-white shadow-sm shadow-[#06C755]/30 transition-transform duration-200 group-hover:scale-105">
            <LineLogoIcon className="h-4 w-4" />
          </span>
          <div className="text-left">
            <span className="block text-sm font-bold leading-tight text-white">
              ติดต่อเรา
            </span>
            <span className="block text-[11px] font-medium text-emerald-400">
              LINE ID: {LINE_ID}
            </span>
          </div>
          <MessageCircle className="ml-0.5 h-4 w-4 text-slate-400 transition-colors group-hover:text-[#06C755]" />
        </button>
      </footer>

      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dashboard-contact-modal-title"
          onClick={() => setIsModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-purple-900/50 bg-[#120a21] p-6 text-center text-slate-100 shadow-2xl"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              aria-label="ปิดหน้าต่าง"
              className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/15 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#06C755] text-white shadow-lg shadow-[#06C755]/30">
              <LineLogoIcon className="h-7 w-7" />
            </div>

            <h3
              id="dashboard-contact-modal-title"
              className="text-xl font-extrabold text-white"
            >
              ติดต่อเราผ่าน LINE
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              เลือกช่องทางที่สะดวกเพื่อพูดคุยกับทีมงาน SurpriseQR
            </p>

            {/* Toast Alert */}
            {copied && (
              <div
                role="status"
                aria-live="polite"
                className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300"
              >
                <Check className="h-4 w-4 shrink-0" />
                <span>คัดลอก LINE ID {LINE_ID} เรียบร้อยแล้ว</span>
              </div>
            )}

            {/* QR Code Section */}
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center justify-center gap-2 text-sm font-bold text-slate-200">
                <QrCode className="h-4 w-4 text-[#06C755]" />
                <span>สแกน QR Code</span>
              </div>

              <div className="mx-auto flex w-fit items-center justify-center rounded-2xl border-2 border-[#06C755]/40 bg-white p-3.5 shadow-inner">
                {!imageError ? (
                  <img
                    src={LINE_QR_IMAGE_PATH}
                    alt={`LINE QR Code ${LINE_ID}`}
                    onError={() => setImageError(true)}
                    className="h-44 w-44 object-contain"
                  />
                ) : (
                  <QRCodeSVG
                    value={LINE_ADD_URL}
                    size={176}
                    level="M"
                    includeMargin={false}
                    fgColor="#0f172a"
                    bgColor="#ffffff"
                  />
                )}
              </div>

              <p className="mt-3 text-xs text-slate-400">
                LINE ID:{" "}
                <span className="font-bold text-white">{LINE_ID}</span>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 space-y-2.5">
              <a
                href={LINE_ADD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#06C755] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#06C755]/25 transition hover:bg-[#05b34c] active:scale-[0.99]"
              >
                <UserPlus className="h-4 w-4" />
                <span>เพิ่มเพื่อนผ่าน LINE</span>
                <ExternalLink className="h-4 w-4 opacity-85" />
              </a>

              <button
                type="button"
                onClick={handleCopyLineId}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold text-slate-100 transition hover:bg-white/10 active:scale-[0.99]"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span className="text-emerald-400">
                      คัดลอก {LINE_ID} แล้ว
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 text-slate-300" />
                    <span>คัดลอก LINE ID {LINE_ID}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

