"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Edit3 } from "lucide-react";
import { updateCard } from "@/app/cards/actions";
import CardPreview from "@/components/cards/card-preview";
import MediaUploader from "@/components/cards/MediaUploader";
import { useCardMediaState } from "@/hooks/useCardMediaState";
import { DEFAULT_ROYALTY_FREE_AUDIO } from "@/components/cards/MediaUploader";
import { isValidPin } from "@/lib/tierRules";
import type { Template, Card, UserTier } from "@/types/database";
import QRCodeCustomizer from "@/components/qr-code/QRCodeCustomizer";

// Cards created through the dashboard flow persist a serialized JSON blob in
// `cards.message` (template metadata + rendered text), e.g.:
//   { "templateId":"...", "cardTitle":"...", "promiseMessage":"...",
//     "closingWish":"...", "heroImage":"...", "themeColor":"..." }
// We must never dump that raw blob into a textarea or the live preview, so we
// detect it, hydrate the editable text fields, and re-serialize on save while
// preserving every non-editable key (templateId, heroImage, themeColor, ...).
type CardMessageContent = {
  templateId?: string;
  template_id?: string;
  recipientName?: string;
  cardTitle?: string;
  envelopeTitle?: string;
  title?: string;
  openingLine?: string;
  promiseMessage?: string;
  loveMessage?: string;
  finalMessage?: string;
  letterText?: string;
  message?: string;
  closingWish?: string;
  heroImage?: string;
  themeColor?: string;
  [key: string]: unknown;
};

/** Possible keys holding the primary love-letter / message text. */
const MESSAGE_KEYS = ["promiseMessage", "loveMessage", "finalMessage", "letterText", "message"] as const;

/**
 * Safely parse `card.message`. Returns `null` when it is not a JSON object, so
 * plain-text legacy messages pass through untouched and raw JSON never leaks.
 */
function parseCardMessage(raw: string): CardMessageContent | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as CardMessageContent)
      : null;
  } catch {
    return null;
  }
}

/** Extract the user-facing love message from a parsed template blob. */
function pickCardMessageText(content: CardMessageContent | null): string {
  if (!content) return "";
  for (const key of MESSAGE_KEYS) {
    const value = content[key];
    if (typeof value === "string") return value;
  }
  return "";
}

/** Extract the editable title/envelope caption from a parsed template blob. */
function pickCardTitleText(content: CardMessageContent | null): string {
  if (!content) return "";
  if (typeof content.cardTitle === "string") return content.cardTitle;
  if (typeof content.envelopeTitle === "string") return content.envelopeTitle;
  if (typeof content.title === "string") return content.title;
  return "";
}

/** The specific key that holds the love message, so we write edits back to it. */
function pickMessageKey(content: CardMessageContent | null): string {
  if (content) {
    for (const key of MESSAGE_KEYS) {
      if (typeof content[key] === "string") return key;
    }
  }
  return "message";
}

/** The specific key that holds the title caption, if any. */
function pickTitleKey(content: CardMessageContent | null): "cardTitle" | "envelopeTitle" | "title" | null {
  if (content) {
    if (typeof content.cardTitle === "string") return "cardTitle";
    if (typeof content.envelopeTitle === "string") return "envelopeTitle";
    if (typeof content.title === "string") return "title";
  }
  return null;
}

interface CardEditorProps {
  card: Card;
  templates: Template[];
  isPremium: boolean;
  userId: string;
  tier: UserTier;
}

export default function CardEditor({ card, templates, isPremium, userId, tier }: CardEditorProps) {
  void isPremium;
  void userId;
  const router = useRouter();
  const accessOnly = card.status === "published";

  // Hydrate editable text from `card.message` so the raw stored JSON blob is
  // never shown in inputs or the live preview (see helpers above).
  const embeddedContent = parseCardMessage(card.message);
  const messageKey = pickMessageKey(embeddedContent);
  const titleKey = pickTitleKey(embeddedContent);

  const [recipientName, setRecipientName] = useState(card.recipient_name);
  const [senderName, setSenderName] = useState(card.sender_name);
  const [message, setMessage] = useState(
    embeddedContent ? pickCardMessageText(embeddedContent) : card.message
  );
  const [title, setTitle] = useState(embeddedContent ? pickCardTitleText(embeddedContent) : "");
  const [pinCode, setPinCode] = useState(card.pin_code || "");
  const [customSlug, setCustomSlug] = useState(card.custom_slug || "");
  const [darkMode, setDarkMode] = useState(false);
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("mobile");
  const [showPreview, setShowPreview] = useState(false);
  const [showQr, setShowQr] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [accessLoading, setAccessLoading] = useState(false);

  const initialAudioSelection =
    DEFAULT_ROYALTY_FREE_AUDIO.find((a) => a.id === card.audio_url)?.id || "";

  const media = useCardMediaState({
    tier,
    initialImageUrl: card.image_url,
    initialAudioSelection,
    errorSetter: setError,
  });

  const selectedTemplate = templates.find((t) => t.id === card.template_id);
  const cardUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/c/${card.custom_slug || card.hash_id}`;

  async function handleCopyCardLink() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(cardUrl);
    }
  }

  const previewCard = {
    recipient_name: recipientName,
    sender_name: senderName,
    message: message,
    image_url: media.imagePreview || undefined,
    audio_url:
      media.audioSelection ||
      (media.audioFile
        ? URL.createObjectURL(media.audioFile)
        : card.audio_url && !media.deleteAudio
        ? card.audio_url
        : undefined),
    qr_value: showQr ? `/c/${card.hash_id}` : undefined,
  };

  /**
   * Produce the value written back into `cards.message`:
   * - JSON template cards: merge the edited message/title back into the stored
   *   blob and re-serialize (preserving templateId, heroImage, themeColor, ...).
   * - Plain-text legacy cards: pass the edited text through unchanged.
   */
  function buildSubmitMessage(): string {
    if (!embeddedContent || !messageKey) return message;
    const updated: CardMessageContent = { ...embeddedContent };
    updated[messageKey] = message;
    if (titleKey) updated[titleKey] = title;
    return JSON.stringify(updated);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!isValidPin(pinCode)) {
      setError("กรุณากรอกรหัส PIN ให้มีความยาวระหว่าง 4 ถึง 8 หลัก");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("recipient_name", recipientName);
    formData.append("sender_name", senderName);
    formData.append("message", buildSubmitMessage());
    formData.append("pin_code", pinCode);
    if (card.is_permanent && !card.custom_slug) formData.append("custom_slug", customSlug);
    if (media.imageFile) formData.append("image", media.imageFile);
    if (media.audioFile) formData.append("audio", media.audioFile);
    if (media.audioSelection) formData.append("audio_selection", media.audioSelection);
    if (media.deleteImage) formData.append("delete_image", "on");
    if (media.deleteAudio) formData.append("delete_audio", "on");

    const result = await updateCard(card.id, formData);

    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSaved(true);
    window.setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1200);
  }

  async function handleAccessSubmit(
    event: React.FormEvent<HTMLFormElement>,
    field: "pin" | "url"
  ) {
    event.preventDefault();
    if (field === "pin" && !isValidPin(pinCode)) {
      setAccessError("กรุณากรอกรหัส PIN ให้เป็นตัวเลข 4 หลัก");
      return;
    }
    setAccessLoading(true);
    setAccessError(null);
    const formData = new FormData();
    if (field === "pin") formData.append("pin_code", pinCode);
    if (field === "url" && card.is_permanent && !card.custom_slug) {
      formData.append("custom_slug", customSlug);
    }
    const result = await updateCard(card.id, formData);
    setAccessLoading(false);
    if (result.error) {
      setAccessError(result.error);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  if (accessOnly) {
    const urlLocked = !!card.custom_slug;
    return (
      <div className="mx-auto max-w-lg space-y-5">
        <header className="space-y-1">
          <h1 className="text-2xl font-black text-white">แก้ไข PIN / Custom URL</h1>
          <p className="text-sm text-slate-400">การ์ดเผยแพร่แล้ว แก้ไขได้เฉพาะ PIN และ Custom URL เท่านั้น</p>
        </header>

        <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-yellow-500/15 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300 backdrop-blur-md">
              {card.is_permanent ? "ถาวร" : "ใช้งานปกติ"}
            </span>
          </div>
          <div className="mt-3 rounded-xl border border-white/10 bg-black/10 p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Card Link</p>
            <div className="mt-2 flex items-center gap-2">
              <a href={cardUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100 hover:text-space-accent">
                {cardUrl}
              </a>
              <button type="button" onClick={() => void handleCopyCardLink()} className="inline-flex items-center gap-1.5 rounded-lg border border-space-border bg-white/5 px-2.5 py-2 text-xs font-bold text-slate-200 hover:bg-white/10">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                คัดลอก
              </button>
            </div>
          </div>
        </div>

        {/* PIN form */}
        <form onSubmit={(event) => void handleAccessSubmit(event, "pin")} className="space-y-4 rounded-3xl border border-space-border bg-white/5 p-6 shadow-xl">
          <h2 className="text-lg font-bold text-white">แก้ไขรหัส PIN</h2>
          <label className="block text-sm font-medium text-slate-300">
            รหัส PIN
            <input
              value={pinCode}
              onChange={(event) => setPinCode(event.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              maxLength={4}
              className="mt-2 w-full rounded-xl border border-space-border bg-white/5 px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-space-accent/30"
              placeholder="ระบุรหัส PIN 4 หลัก"
            />
            <span className="mt-1 block text-xs text-slate-400">รหัส PIN ต้องเป็นตัวเลข 4 หลัก</span>
          </label>
          {accessError && (
            <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-400">{accessError}</p>
          )}
          <button type="submit" disabled={accessLoading} className="w-full rounded-xl bg-space-accent px-4 py-3 font-bold text-white disabled:opacity-50">
            {accessLoading ? "กำลังบันทึก PIN..." : "บันทึก PIN"}
          </button>
        </form>

        {/* Custom URL form (only for permanent cards) */}
        {card.is_permanent && (
          <form onSubmit={(event) => void handleAccessSubmit(event, "url")} className="space-y-4 rounded-3xl border border-space-border bg-white/5 p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white">แก้ไข Custom URL</h2>
            <label className="block text-sm font-medium text-slate-300">
              Custom URL
              <input
                value={customSlug}
                onChange={(event) => setCustomSlug(event.target.value)}
                readOnly={urlLocked}
                className="mt-2 w-full rounded-xl border border-space-border bg-white/5 px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-space-accent/30 read-only:cursor-not-allowed read-only:text-slate-400"
                placeholder={urlLocked ? "" : "ชื่อ-ลิงก์-ของคุณ"}
              />
              {!urlLocked && (
                <span className="mt-2 block text-xs font-semibold text-amber-400">
                  ตั้งชื่อ URL แล้วบันทึกจะไม่สามารถแก้ไขได้อีก!
                </span>
              )}
            </label>
            {accessError && (
              <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-400">{accessError}</p>
            )}
            <button type="submit" disabled={accessLoading || urlLocked} className="w-full rounded-xl bg-space-accent px-4 py-3 font-bold text-white disabled:opacity-50">
              {accessLoading ? "กำลังบันทึก URL..." : urlLocked ? "URL ถูกล็อกแล้ว" : "บันทึก URL"}
            </button>
          </form>
        )}

        <button type="button" onClick={() => router.push("/dashboard")} className="w-full rounded-xl border border-space-border bg-white/5 px-4 py-3 font-bold text-slate-200">
          กลับไปแดชบอร์ด
        </button>
      </div>
    );
  }

  return (
    <form id="card-edit-form" onSubmit={handleSubmit} className="space-y-6">
      {/* Sticky top action header — keeps Save always reachable without scrolling */}
      <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/90 px-4 py-3 shadow-lg backdrop-blur-xl">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-700 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200 transition-all hover:bg-white/10"
        >
          กลับไปแดชบอร์ด
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-700 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200 transition-all hover:bg-white/10 lg:hidden"
          >
            {showPreview ? "ซ่อนตัวอย่าง" : "ดูตัวอย่าง"}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-space-accent px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-space-accent/25 transition-all hover:-translate-y-0.5 disabled:opacity-50"
          >
            <Edit3 className="h-4 w-4" />
            {loading ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* ================= Left column — scrollable form controls ================= */}
        <div className="order-2 space-y-6 lg:order-1 lg:col-span-7">
          {/* Basic Information */}
          <section className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
            <h2 className="text-lg font-bold text-white">ข้อมูลพื้นฐาน</h2>

            <div>
              <label htmlFor="recipient" className="mb-2 block text-sm font-medium text-slate-300">
                ชื่อผู้รับ
              </label>
              <input
                id="recipient"
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-neutral-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-space-accent/30 transition-all"
                placeholder="สำหรับใคร"
              />
            </div>

            <div>
              <label htmlFor="sender" className="mb-2 block text-sm font-medium text-slate-300">
                ชื่อผู้ส่ง
              </label>
              <input
                id="sender"
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-neutral-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-space-accent/30 transition-all"
                placeholder="ชื่อของคุณ"
              />
            </div>

            {embeddedContent && titleKey && (
              <div>
                <label htmlFor="title" className="mb-2 block text-sm font-medium text-slate-300">
                  หัวข้อ
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-neutral-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-space-accent/30 transition-all"
                  placeholder="หัวข้อการ์ด"
                />
              </div>
            )}

            <div>
              <label htmlFor="message" className="mb-2 block text-sm font-medium text-slate-300">
                ข้อความ
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={5}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-neutral-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-space-accent/30 transition-all resize-y"
                placeholder="เขียนข้อความอบอุ่นของคุณ..."
              />
            </div>
          </section>

          {/* Security & Links */}
          <section className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
            <h2 className="text-lg font-bold text-white">ความปลอดภัยและลิงก์</h2>

            {card.is_permanent && (
              <div>
                <label htmlFor="custom-slug" className="mb-2 block text-sm font-medium text-slate-300">
                  ชื่อ Custom URL
                </label>
                <div className="flex overflow-hidden rounded-xl border border-neutral-700 bg-white/5 focus-within:border-space-accent focus-within:ring-2 focus-within:ring-space-accent/30">
                  <span className="flex shrink-0 items-center border-r border-neutral-700 bg-white/5 px-3 text-sm text-slate-400">
                    {typeof window === "undefined" ? "surpriseqr.com/c/" : `${window.location.host}/c/`}
                  </span>
                  <input
                    id="custom-slug"
                    value={customSlug}
                    onChange={(event) => setCustomSlug(event.target.value)}
                    readOnly={!!card.custom_slug}
                    className="min-w-0 flex-1 bg-transparent px-4 py-3 text-slate-200 outline-none placeholder-slate-500 read-only:cursor-not-allowed read-only:text-slate-400"
                    placeholder={card.custom_slug ? "" : "ชื่อ-ลิงก์-ของคุณ"}
                  />
                </div>
                {!card.custom_slug && (
                  <p className="mt-2 text-xs font-semibold text-amber-400">
                    ตั้งชื่อ URL แล้วบันทึกจะไม่สามารถแก้ไขได้อีก!
                  </p>
                )}
              </div>
            )}

            {card.is_permanent && card.custom_slug && (
              <div className="rounded-xl border border-neutral-700 bg-black/10 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Card Link</p>
                <div className="mt-2 flex items-center gap-2">
                  <a href={cardUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100 hover:text-space-accent">
                    {cardUrl}
                  </a>
                  <button
                    type="button"
                    onClick={() => void handleCopyCardLink()}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-700 bg-white/5 px-2.5 py-2 text-xs font-bold text-slate-200 hover:bg-white/10"
                  >
                    คัดลอก
                  </button>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="pin" className="mb-2 block text-sm font-medium text-slate-300">
                รหัส PIN (ไม่บังคับ)
              </label>
              <input
                id="pin"
                type="text"
                inputMode="numeric"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                maxLength={4}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-neutral-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-space-accent/30 transition-all"
                placeholder="ระบุรหัส PIN 4 หลัก"
              />
              <p className="mt-1 text-xs text-slate-400">รหัส PIN ต้องเป็นตัวเลข 4 หลัก</p>
            </div>
          </section>


          {/* Media Uploads */}
          <section className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
            <h2 className="text-lg font-bold text-white">รูปภาพและเสียง</h2>
            <MediaUploader
              tier={tier}
              imagePreview={media.imagePreview}
              imageInputRef={media.imageInputRef as React.RefObject<HTMLInputElement>}
              audioInputRef={media.audioInputRef as React.RefObject<HTMLInputElement>}
              audioFile={media.audioFile}
              audioSelection={media.audioSelection}
              onImageChange={media.handleImageChange}
              onClearImage={() => media.clearImage()}
              onAudioChange={media.handleAudioChange}
              onClearAudio={() => media.clearAudio()}
              onAudioSelectionChange={(value) => {
                media.setAudioSelection(value);
                if (value) media.setDeleteAudio(false);
              }}
              clearImageClass="px-4 py-2 rounded-xl font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-all flex items-center gap-2 mx-auto"
              clearAudioClass="px-4 py-2 rounded-xl font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-all flex items-center gap-2 mx-auto"
            />
          </section>

          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-500/10 p-3 rounded-xl">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">{error}</p>
            </div>
          )}
          {saved && (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-200">
              บันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว กำลังกลับไปแดชบอร์ด...
            </div>
          )}
        </div>

        {/* ================= Right column — sticky Live Preview ================= */}
        <div
          className={`order-1 lg:order-2 lg:sticky lg:top-6 lg:h-fit lg:col-span-5 space-y-4 ${showPreview ? "block" : "hidden lg:block"}`}
        >
          {/* Top toolbar — controls live ABOVE the preview frame, never overlapping card content */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-800 bg-neutral-900/50 p-3">
            <h3 className="text-base font-bold text-white">ดูตัวอย่างแบบสด</h3>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewMode("mobile")}
                className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${previewMode === "mobile" ? "border-space-accent bg-space-accent text-white" : "border-neutral-700 bg-white/5 text-slate-300 hover:bg-white/10"}`}
              >
                Mobile
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("desktop")}
                className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${previewMode === "desktop" ? "border-space-accent bg-space-accent text-white" : "border-neutral-700 bg-white/5 text-slate-300 hover:bg-white/10"}`}
              >
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setDarkMode((value) => !value)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${darkMode ? "border-space-accent bg-space-accent text-white" : "border-neutral-700 bg-white/5 text-slate-300 hover:bg-white/10"}`}
              >
                {darkMode ? "BG สว่าง" : "BG ดำ"}
              </button>
              <button
                type="button"
                onClick={() => setShowQr((value) => !value)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${showQr ? "border-space-accent bg-space-accent text-white" : "border-neutral-700 bg-white/5 text-slate-300 hover:bg-white/10"}`}
              >
                {showQr ? "QR: แสดง" : "QR: ซ่อน"}
              </button>
            </div>
          </div>


          {/* Preview frame */}
          <div
            className={`mx-auto w-full overflow-hidden transition-all duration-300 ${previewMode === "mobile" ? "max-w-[375px] aspect-[9/19.5] rounded-[40px] border-4 border-neutral-700 shadow-2xl overflow-y-auto" : "max-w-full aspect-[16/9] rounded-2xl border border-neutral-700 shadow-xl overflow-y-auto"}`}
          >
            <CardPreview card={previewCard} template={selectedTemplate} darkMode={darkMode} />
          </div>

          <section className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-white">ปรับแต่ง QR Code</h3>
            <QRCodeCustomizer value={`/c/${card.hash_id}`} />
          </section>
        </div>
      </div>
    </form>
  );
}

