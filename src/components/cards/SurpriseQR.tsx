"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import generatePayload from "promptpay-qr";
import QRCode from "qrcode";
import { CheckCircle2, Lock, X } from "lucide-react";
import { buildSurpriseQRHTML } from "@/lib/surpriseqr/template-engine";
import type { SurpriseQRData } from "@/types/templates";

export interface SurpriseQRProps {
  /** Full template data (settings + content). */
  config: SurpriseQRData;
  /** Enable the embedded live admin editor (drawer + fab). */
  isEditing?: boolean;
  /** Server-verified card PIN; overrides the template PIN when present. */
  expectedPin?: string;
  /** Public share link used by "copy link" in the admin panel. */
  shareUrl?: string;
  /** Called whenever the embedded editor changes the config. */
  onConfigChange?: (config: SurpriseQRData) => void;
  /** Gateway hook; when provided it replaces the built-in pay modal. */
  onRequestPay?: () => void;
  /**
   * Studio live-preview mode: keeps edit conveniences (overlay-dismiss,
   * escaping modals) but hides the pencil FAB and the admin drawer.
   */
  studio?: boolean;
  /** 1-based template screen the preview should jump to (host-driven). */
  activeScreen?: number;
  /** Increment to force a fresh sq:set-config push to the iframe (fallback). */
  refreshToken?: number;
}

/** Download a text payload as a file (used for the HTML bundle export). */
function downloadFile(content: string, filename: string) {
  try {
    const blob = new Blob([content], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1200);
  } catch {
    // ignore sandbox / private-mode download failures
  }
}

/**
 * React host wrapper for the Anniversary Surprise single-file HTML engine.
 *
 * The engine runs fully inside a sandboxed <iframe srcDoc> and the two sides
 * communicate with postMessage:
 *   engine -> host: sq:ready, sq:config, sq:request-pay, sq:mark-paid, sq:export
 *   host  -> engine: sq:init (pay QR + share url), sq:set-config,
 *                    sq:payment-success
 */
export default function SurpriseQR({
  config,
  isEditing = false,
  expectedPin = "",
  shareUrl = "",
  onConfigChange,
  onRequestPay,
  studio = false,
  activeScreen,
  refreshToken,
}: SurpriseQRProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  const lastEchoRef = useRef("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [payConfirmed, setPayConfirmed] = useState(false);

  // A DB-level PIN always wins over the embedded template PIN.
  const merged = useMemo<SurpriseQRData>(() => {
    if (expectedPin) {
      return {
        ...config,
        settings: { ...config.settings, enablePin: true, pinCode: expectedPin },
      };
    }
    return config;
  }, [config, expectedPin]);

  // The iframe shell is built ONCE per (edit, studio) mode. Every keystroke
  // afterwards flows through postMessage (sq:set-config) so the engine never
  // reloads and the active screen / playback is preserved during live edits.
  const html = useMemo(
    () => buildSurpriseQRHTML(merged, { edit: isEditing, showAdmin: !studio }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isEditing, studio],
  );

  // Generate the PromptPay QR data URL for the built-in pay modal.
  const promptTarget = merged.settings?.promptpayTarget ?? "";
  const promptAmount = merged.settings?.promptpayAmount ?? 0;
  useEffect(() => {
    let cancelled = false;
    if (!promptTarget) {
      setQrDataUrl("");
      return;
    }
    (async () => {
      try {
        const cleanTarget = promptTarget.replace(/[-\s]/g, "");
        const payload = generatePayload(cleanTarget, {
          amount: Number(promptAmount) > 0 ? Number(promptAmount) : undefined,
        });
        const url = await QRCode.toDataURL(payload, { width: 300, margin: 2 });
        if (!cancelled) {
          setQrDataUrl(url);
          if (readyRef.current) {
            frameRef.current?.contentWindow?.postMessage(
              {
                type: "sq:init",
                pay: { qr: url, amount: promptAmount, target: cleanTarget },
                shareUrl: shareUrl || "",
              },
              "*",
            );
          }
        }
      } catch {
        if (!cancelled) setQrDataUrl("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [promptTarget, promptAmount, shareUrl]);

  // Host -> engine: push external config updates (skip echoes of our own).
  useEffect(() => {
    if (!readyRef.current) return;
    const sig = JSON.stringify(merged);
    if (sig === lastEchoRef.current) return;
    frameRef.current?.contentWindow?.postMessage(
      { type: "sq:set-config", config: merged },
      "*",
    );
  }, [merged]);

  // Host -> engine: jump the preview to the screen matching the active step.
  useEffect(() => {
    if (activeScreen === undefined || !readyRef.current) return;
    frameRef.current?.contentWindow?.postMessage(
      { type: "sq:show-screen", n: activeScreen },
      "*",
    );
  }, [activeScreen]);

  // Fallback "อัพเดตพรีวิว": force a fresh config push regardless of the echo
  // dedupe, then re-assert the active screen.
  useEffect(() => {
    if (refreshToken === undefined) return;
    frameRef.current?.contentWindow?.postMessage(
      { type: "sq:set-config", config: merged },
      "*",
    );
    if (activeScreen !== undefined) {
      frameRef.current?.contentWindow?.postMessage(
        { type: "sq:show-screen", n: activeScreen },
        "*",
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  // Engine -> host message protocol.
  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      const frame = frameRef.current;
      if (!frame) return;
      if (ev.source !== frame.contentWindow) return;
      const data = ev.data;
      if (!data || typeof data !== "object") return;
      const msg = data as { type?: string; config?: SurpriseQRData; html?: string };
      switch (msg.type) {
        case "sq:ready":
          readyRef.current = true;
          // Invalidate the echo marker so any config change that happened before
          // the iframe loaded is re-pushed below, then force-sync the CURRENT
          // config and the active screen immediately.
          lastEchoRef.current = "";
          frame.contentWindow?.postMessage(
            {
              type: "sq:init",
              pay: {
                qr: qrDataUrl,
                amount: promptAmount,
                target: merged.settings?.promptpayTarget ?? "",
              },
              shareUrl: shareUrl || "",
            },
            "*",
          );
          frame.contentWindow?.postMessage(
            { type: "sq:set-config", config: merged },
            "*",
          );
          if (activeScreen !== undefined) {
            frame.contentWindow?.postMessage(
              { type: "sq:show-screen", n: activeScreen },
              "*",
            );
          }
          break;
        case "sq:config":
          if (msg.config) {
            lastEchoRef.current = JSON.stringify(msg.config);
            onConfigChange?.(msg.config);
          }
          break;
        case "sq:request-pay":
          if (typeof onRequestPay === "function") {
            onRequestPay();
          } else {
            setPayOpen(true);
          }
          break;
        case "sq:mark-paid":
          if (typeof onRequestPay === "function") {
            // Gateway hook owns the payment flow; nothing to do here.
          } else {
            setPayConfirmed(true);
            frame.contentWindow?.postMessage({ type: "sq:payment-success" }, "*");
          }
          break;
        case "sq:export":
          if (msg.html) downloadFile(msg.html, "surprise-card.html");
          break;
        default:
          break;
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrDataUrl, promptAmount, shareUrl, onRequestPay, merged]);

  function confirmPaid() {
    setPayConfirmed(true);
    setPayOpen(false);
    frameRef.current?.contentWindow?.postMessage(
      { type: "sq:payment-success" },
      "*",
    );
  }

  return (
    <div className="relative h-full min-h-[100dvh] w-full overflow-hidden bg-[#2c0a18]">
      <iframe
        ref={frameRef}
        srcDoc={html}
        title="Anniversary Surprise"
        sandbox="allow-same-origin allow-scripts allow-forms allow-modals allow-popups"
        allow="autoplay; fullscreen"
        className="absolute inset-0 h-full w-full border-0"
      />

      {payOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="ชำระเงินเพื่อเผยแพร่การ์ด"
        >
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#13111c] p-6 text-center text-white shadow-2xl">
            <div className="mb-2 flex items-start justify-between">
              <div className="text-left">
                <p className="text-lg font-black">💳 ชำระเงินเพื่อเผยแพร่</p>
                <p className="mt-1 text-sm text-slate-300">
                  สแกน PromptPay หรือกดชำระเงินผ่านช่องทางที่เลือก
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayOpen(false)}
                aria-label="ปิด"
                className="rounded-full bg-white/10 p-2 text-slate-300 transition-colors hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="PromptPay QR"
                className="mx-auto mt-2 h-52 w-52 rounded-xl bg-white p-2"
              />
            ) : (
              <div className="mx-auto mt-2 flex h-52 w-52 flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300">
                <Lock className="mb-2 h-8 w-8" />
                <p className="text-sm">PromptPay: {promptTarget || "ไม่ได้ตั้งค่า"}</p>
              </div>
            )}

            <p className="mt-3 text-sm text-slate-300">
              ยอดชำระ:{" "}
              <strong className="text-white">
                ฿{Number(promptAmount) > 0 ? Number(promptAmount).toFixed(2) : "0.00"}
              </strong>
            </p>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setPayOpen(false)}
                className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold text-slate-300 transition-colors hover:bg-white/10"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmPaid}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-rose-500 px-4 py-3 text-sm font-bold text-white shadow-lg transition-opacity hover:opacity-90"
              >
                <CheckCircle2 className="h-4 w-4" />
                ยืนยันชำระเงินแล้ว
              </button>
            </div>
          </div>
        </div>
      )}

      {payConfirmed && (
        <div className="fixed bottom-5 left-1/2 z-[90] -translate-x-1/2 rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-800 shadow-lg">
          ✅ ชำระเงินเรียบร้อย — ปลดล็อกการส่งออกการ์ดแล้ว
        </div>
      )}
    </div>
  );
}