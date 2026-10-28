"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Clock3, Copy, Download, Eye, EyeOff, Layers, MoreVertical, PencilLine, Plus, QrCode, Save, Share2, Trash2, X } from "lucide-react";
import type { Card, TemplateDemoLinks, UserTier } from "@/types/database";
import type { UnifiedTemplate } from "@/lib/templates";
import { getExpirationLabel, getCardSharePath } from "@/lib/card-utils";
import AddOnPurchaseModal from "@/components/payment/AddOnPurchaseModal";
import { getTemplateById, templateCatalog, type TemplateDefinition } from "@/data/templates";
import QRCodeCustomizer from "@/components/qr-code/QRCodeCustomizer";

interface CardListProps {
  cards: Card[];
  tier: UserTier;
  baseUrl: string;
  isGuest?: boolean;
  isDraft?: boolean;
  /**
   * DB-published templates (getAllTemplates, the exact list TemplateShowcase
   * renders). Searched first when resolving card template info so custom or
   * admin templates show their DB preview video/thumbnail.
   */
  templates?: UnifiedTemplate[];
}

const GUEST_CARD_IDS_KEY = "guest_card_ids";
const GUEST_CARDS_KEY = "guest_cards";

const TEMPLATE_ID_ALIASES = new Set([
  ...templateCatalog.map((item) => item.id),
  ...templateCatalog.flatMap((item) => item.aliases),
  "10000000-0000-4000-8000-000000000002",
]);

const FALLBACK_TEMPLATE: Pick<TemplateDefinition, "title" | "image" | "previewVideo"> = {
  title: "SurpriseQR",
  image: "/templates/surprise-qr.svg",
  previewVideo: undefined,
};

/** Display info for a card template: DB row first, static catalog as fallback. */
export interface CardTemplateInfo extends Pick<TemplateDefinition, "title" | "image" | "previewVideo"> {
  /** Raw DB preview video URL (templates.preview_video_url); null when unset. */
  previewVideoUrl?: string | null;
  /** Raw DB preview image (templates.preview_url, normalized by getAllTemplates). */
  previewUrl?: string | null;
  /** DB thumbnail override (templates.thumbnail_url); null when unset. */
  thumbnailUrl?: string | null;
  /** DB external demo links (templates.demo_video_links), same data TemplateShowcase uses. */
  demoVideoLinks?: TemplateDemoLinks | null;
}

/**
 * Resolve the template display info for a card. The DB templates list from the
 * server (getAllTemplates, the same source TemplateShowcase uses) is searched
 * first so cards created from custom/admin templates pick up their DB preview
 * video / demo links / thumbnail; the static catalog remains the fallback for
 * built-in system templates.
 */
export function getCardTemplateInfo(templateId: string, dbTemplates?: UnifiedTemplate[]): CardTemplateInfo {
  const dbTemplate = dbTemplates?.find((item) => item.id === templateId);
  if (dbTemplate) {
    return {
      title: dbTemplate.title || FALLBACK_TEMPLATE.title,
      image: dbTemplate.thumbnail_url || dbTemplate.preview_url || FALLBACK_TEMPLATE.image,
      previewVideo: dbTemplate.preview_video_url ?? dbTemplate.systemDefinition?.previewVideo ?? undefined,
      previewVideoUrl: dbTemplate.preview_video_url ?? null,
      previewUrl: dbTemplate.preview_url ?? null,
      thumbnailUrl: dbTemplate.thumbnail_url ?? null,
      demoVideoLinks: dbTemplate.demo_video_links ?? null,
    };
  }
  if (TEMPLATE_ID_ALIASES.has(templateId)) {
    const def = getTemplateById(templateId);
    return { title: def.title, image: def.image, previewVideo: def.previewVideo };
  }
  return { ...FALLBACK_TEMPLATE };
}

function CardItem({ card, tier, baseUrl, isGuest, isDraft, templates, onDeleted, onAddOn }: { card: Card; tier: UserTier; baseUrl: string; isGuest: boolean; isDraft: boolean; templates?: UnifiedTemplate[]; onDeleted: (id: string) => void; onAddOn: (id: string) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const shareUrl = `${baseUrl}${getCardSharePath(card.hash_id)}`;
  const expirationLabel = getExpirationLabel(tier, card.expires_at ?? card.expiry_date);
  const isExpired = expirationLabel === "หมดอายุ";
  const [qrOpen, setQrOpen] = useState(false);
  const [customSlug, setCustomSlug] = useState(card.custom_slug ?? "");
  const [pinVisible, setPinVisible] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editPin, setEditPin] = useState(card.pin_code ?? "");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSaving, setPinSaving] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlSaving, setUrlSaving] = useState(false);
  const urlLocked = !!card.custom_slug;
  const template = getCardTemplateInfo(card.template_id, templates);
  // Draft cards (status === 'draft' or rendered on /dashboard/drafts) get a
  // distinct unpublished presentation: a template preview instead of a QR code
  // (drafts have no scannable public link yet), "continue editing" as the
  // primary action, and a draft-expiry badge driven by draft_expires_at.
  const isDraftCard = isDraft || card.status === "draft";
  const draftEditHref = `/dashboard/create?draftId=${card.id}`;
  const draftDaysRemaining = card.draft_expires_at
    ? Math.max(0, Math.ceil((new Date(card.draft_expires_at).getTime() - Date.now()) / 86400000))
    : null;
  const cardUrl = card.custom_slug ? `${baseUrl}/c/${card.custom_slug}` : shareUrl;
  const daysRemaining = card.expires_at ? Math.max(0, Math.ceil((new Date(card.expires_at).getTime() - Date.now()) / 86400000)) : null;
  function downloadQrCode() {
    const svg = svgRef.current;
    if (!svg) return;
    const serialized = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = Math.round((image.height / image.width) * canvas.width);
      const context = canvas.getContext("2d");
      if (!context) return;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `surpriseqr-${card.hash_id}.png`;
      link.click();
      URL.revokeObjectURL(svgUrl);
    };
    image.src = svgUrl;
  }

  function downloadQrSvg() {
    const svg = svgRef.current;
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `surpriseqr-${card.hash_id}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function copyShareLink() {
    navigator.clipboard.writeText(cardUrl);
  }

  async function savePin() {
    setPinSaving(true);
    setPinError(null);
    try {
      const response = await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinCode: editPin || null }),
      });
      const data = await response.json();
      if (!response.ok) {
        setPinError(data.error || "ไม่สามารถบันทึกรหัส PIN ได้");
        return;
      }
      card.pin_code = data.pinCode;
      setEditOpen(false);
    } catch {
      setPinError("ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่");
    } finally {
      setPinSaving(false);
    }
  }

  async function saveUrl() {
    if (urlLocked) return;
    setUrlSaving(true);
    setUrlError(null);
    try {
      const response = await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customSlug }),
      });
      const data = await response.json();
      if (!response.ok) {
        setUrlError(data.error || "ไม่สามารถแก้ไข Custom URL ได้");
        return;
      }
      card.custom_slug = data.customSlug;
      setEditOpen(false);
    } catch {
      setUrlError("ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่");
    } finally {
      setUrlSaving(false);
    }
  }

  function openEditModal() {
    setEditPin(card.pin_code ?? "");
    setCustomSlug(card.custom_slug ?? "");
    setPinError(null);
    setUrlError(null);
    setEditOpen(true);
    setMenuOpen(false);
  }

  async function deleteCard() {
    if (!window.confirm(isDraftCard ? "คุณต้องการลบฉบับร่างนี้ใช่หรือไม่?" : "คุณต้องการลบการ์ดนี้ใช่หรือไม่?")) return;
    onDeleted(card.id);
    if (isGuest) {
      const ids = JSON.parse(localStorage.getItem(GUEST_CARD_IDS_KEY) || "[]") as string[];
      const guestCards = JSON.parse(localStorage.getItem(GUEST_CARDS_KEY) || "[]") as Card[];
      localStorage.setItem(GUEST_CARD_IDS_KEY, JSON.stringify(ids.filter((id) => id !== card.id)));
      localStorage.setItem(GUEST_CARDS_KEY, JSON.stringify(guestCards.filter((item) => item.id !== card.id)));
      return;
    }
    const response = await fetch(`/api/cards/${card.id}`, { method: "DELETE" });
    if (!response.ok) {
      window.alert("ไม่สามารถลบการ์ดได้ กรุณาลองใหม่");
      window.location.reload();
    }
  }

  return (
    <article className="glass-panel-hover glass-panel group overflow-hidden rounded-3xl border-space-border shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
      <div className="relative h-44 overflow-hidden bg-slate-900">
        {template.previewVideo && (template.previewVideo.startsWith("http://") || template.previewVideo.startsWith("https://")) ? (
          <video
            src={template.previewVideo}
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 pointer-events-none"
          />
        ) : (
          <img
            src={template.image ?? "/templates/surprise-qr.svg"}
            alt={`เทมเพลต ${template.title}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/10 to-transparent" />
        <div className="absolute right-3 top-3 text-white">
          <div className="relative flex items-start gap-2">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="เมนูการ์ด"
              aria-expanded={menuOpen}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-black/35 text-white transition hover:bg-black/60"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-11 z-20 w-44 rounded-xl border border-white/15 bg-slate-950/95 p-1 shadow-xl backdrop-blur-xl">
                {isGuest ? (
                  <Link
                    href={`/dashboard/create?guest_card=${card.id}`}
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-200 hover:bg-white/10"
                  >
                    <PencilLine className="h-4 w-4" />
                    แก้ไขข้อมูล
                  </Link>
                ) : isDraftCard ? (
                  <Link
                    href={draftEditHref}
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-200 hover:bg-white/10"
                  >
                    <PencilLine className="h-4 w-4" />
                    แก้ไขฉบับร่าง
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={openEditModal}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-200 hover:bg-white/10"
                  >
                    <PencilLine className="h-4 w-4" />
                    แก้ไขข้อมูล
                  </button>
                )}
                {!card.is_permanent && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onAddOn(card.id);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-amber-200 hover:bg-amber-400/10"
                  >
                    <Save className="h-4 w-4" />
                    ซื้อสิทธิ์เสริม
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    void deleteCard();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-300 hover:bg-red-400/10"
                >
                  <Trash2 className="h-4 w-4" />
                  {isDraftCard ? "ลบร่าง" : "ลบการ์ด"}
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="absolute bottom-3 right-3">
          <span
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold backdrop-blur-md ${card.is_permanent ? "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border-amber-500/40" : isDraftCard ? "bg-amber-400 text-amber-950 border-amber-300" : isExpired ? "bg-red-400 text-red-950 border-red-300" : "bg-white/90 text-slate-800 border-white/40"}`}
          >
            {card.is_permanent
              ? "ถาวร"
              : isDraftCard
                ? draftDaysRemaining === null
                  ? "ฉบับร่าง"
                  : `ฉบับร่าง เหลือ ${draftDaysRemaining} วัน`
                : isExpired
                  ? "หมดอายุ"
                  : `เหลือ ${daysRemaining ?? 14} วัน`}
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-space-accent" />
          <span className="text-sm font-semibold text-slate-200">
            {template.title}
          </span>
        </div>
        <div className="glass-panel mt-3 flex items-center justify-between rounded-xl border-space-border bg-white/5 px-3 py-2 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-space-accent" />
            <span className="font-semibold text-slate-300">
              {new Date(card.created_at).toLocaleDateString("th-TH")}
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-slate-300">
            <Eye className="h-4 w-4 text-space-accent" />
            <span className="text-slate-300">{card.view_count ?? 0}</span>
          </div>
        </div>

        {isDraftCard && (
          <Link
            href={draftEditHref}
            aria-label={`แก้ไขฉบับร่าง ${card.recipient_name}`}
            className="mt-4 flex items-center justify-center rounded-2xl border border-dashed border-amber-400/30 bg-gradient-to-br from-white/5 via-white/5 to-slate-900/30 p-6 transition-colors hover:border-amber-400/60"
          >
            <span className="relative block h-[162px] w-full max-w-[210px] overflow-hidden rounded-2xl shadow-lg shadow-slate-950/30">
              <img
                src={template.image ?? "/templates/surprise-qr.svg"}
                alt={`ตัวอย่างเทมเพลต ${template.title}`}
                className="h-full w-full object-cover"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-transparent" />
              <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-slate-950/70 px-2 py-1.5 text-xs font-bold text-amber-200 backdrop-blur-sm">
                <PencilLine className="h-3.5 w-3.5" />
                ฉบับร่าง — ยังไม่เผยแพร่
              </span>
            </span>
          </Link>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-space-border bg-white/5 px-3 py-3 text-center text-base font-bold text-slate-200 transition-all hover:border-space-accent hover:text-space-accent"
          >
            <Eye className="h-4 w-4" />
            ดูตัวอย่าง
          </button>
          {isDraftCard ? (
            <Link
              href={draftEditHref}
              className="btn-gradient inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-3 py-3 text-center text-base font-bold text-white transition-all"
            >
              <PencilLine className="h-4 w-4" />
              แก้ไขฉบับร่าง
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              className="btn-gradient inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-3 py-3 text-center text-base font-bold text-white transition-all"
            >
              <Share2 className="h-4 w-4" />
              QR Code
            </button>
          )}
        </div>
        {qrOpen && typeof document !== "undefined"
          ? createPortal(
              <div
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                role="dialog"
                aria-modal="true"
              >
                <div className="glass-panel relative flex max-h-[85vh] w-full max-w-4xl flex-col overflow-y-auto rounded-3xl border-space-border bg-[#06030c]/95 shadow-2xl backdrop-blur-xl">
                  <button
                    type="button"
                    onClick={() => setQrOpen(false)}
                    aria-label="ปิดหน้าต่าง"
                    className="absolute right-3 top-3 z-10 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/10 text-xl font-bold text-slate-200 shadow-md hover:bg-white/20 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <div className="min-h-0">
                    <QRCodeCustomizer value={cardUrl} svgRef={svgRef} />
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-3 border-t border-space-border bg-black/20 p-4">
                    <button
                      type="button"
                      onClick={copyShareLink}
                      className="inline-flex items-center gap-2 rounded-xl border border-space-border bg-white/10 px-4 py-3 text-base font-bold text-slate-200 hover:bg-white/20"
                    >
                      <Copy className="h-4 w-4" />
                      คัดลอกลิงก์
                    </button>
                    <button
                      type="button"
                      onClick={downloadQrCode}
                      className="btn-gradient inline-flex items-center gap-2 rounded-xl px-4 py-3 text-base font-bold text-white"
                    >
                      <Download className="h-4 w-4" />
                      ดาวน์โหลด PNG
                    </button>
                    <button
                      type="button"
                      onClick={downloadQrSvg}
                      className="inline-flex items-center gap-2 rounded-xl border border-space-border bg-white/10 px-4 py-3 text-base font-bold text-slate-200 hover:bg-white/20"
                    >
                      <Download className="h-3 w-3" />
                      ดาวน์โหลด SVG
                    </button>
                  </div>
                </div>
              </div>,
              document.body,
            )
          : null}
        {editOpen && typeof document !== "undefined"
          ? createPortal(
              <div
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                role="dialog"
                aria-modal="true"
              >
            <div className="glass-panel max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border-space-border bg-[#06030c]/95 p-6 text-slate-100 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">
                  แก้ไขข้อมูลการ์ด
                </h3>
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  aria-label="ปิด"
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-slate-300 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <section className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
                <h4 className="font-bold text-white">รหัส PIN</h4>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type={pinVisible ? "text" : "password"}
                    value={editPin}
                    onChange={(event) =>
                      setEditPin(
                        event.target.value.replace(/\D/g, "").slice(0, 4),
                      )
                    }
                    inputMode="numeric"
                    maxLength={4}
                    className="min-w-0 flex-1 rounded-xl border border-space-border bg-black/20 px-4 py-3 text-white"
                    placeholder="ระบุรหัส PIN 4 หลัก"
                  />
                  <button
                    type="button"
                    onClick={() => setPinVisible((visible) => !visible)}
                    aria-label={pinVisible ? "ซ่อนรหัส PIN" : "แสดงรหัส PIN"}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-space-border bg-white/10 text-slate-200 hover:bg-white/20"
                  >
                    {pinVisible ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-400">รหัส PIN ต้องเป็นตัวเลข 4 หลัก</p>
                {pinError && (
                  <p className="mt-2 rounded-lg bg-red-400/10 p-2 text-xs text-red-200">{pinError}</p>
                )}
                <button
                  type="button"
                  onClick={() => void savePin()}
                  disabled={pinSaving}
                  className="btn-gradient mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {pinSaving ? "กำลังบันทึก PIN..." : "บันทึก PIN"}
                </button>
              </section>
              <section className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                <h4 className="font-bold text-white">Custom URL</h4>
                <input
                  value={customSlug}
                  onChange={(event) => setCustomSlug(event.target.value)}
                  readOnly={urlLocked}
                  className="mt-3 w-full rounded-xl border border-space-border bg-white/5 px-4 py-3 text-white read-only:cursor-not-allowed read-only:text-slate-400"
                  placeholder={urlLocked ? "" : "my-special-card"}
                />
                {!urlLocked && (
                  <p className="mt-2 text-xs font-semibold text-amber-400">
                    ตั้งชื่อ URL แล้วบันทึกจะไม่สามารถแก้ไขได้อีก!
                  </p>
                )}
                {urlError && (
                  <p className="mt-2 rounded-lg bg-red-400/10 p-2 text-xs text-red-200">{urlError}</p>
                )}
                <button
                  type="button"
                  onClick={() => void saveUrl()}
                  disabled={urlSaving || urlLocked}
                  className="btn-gradient mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {urlSaving ? "กำลังบันทึก URL..." : urlLocked ? "URL ถูกล็อกแล้ว" : "บันทึก URL"}
                </button>
              </section>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="mt-5 w-full rounded-xl border border-space-border bg-white/10 px-4 py-3 font-bold text-slate-200 hover:bg-white/20"
              >
                ปิด
              </button>
            </div>
              </div>,
              document.body,
            )
          : null}
        {previewOpen && typeof document !== "undefined"
          ? createPortal(
              <div
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                role="dialog"
                aria-modal="true"
                onClick={() => setPreviewOpen(false)}
              >
                <div
                  className="glass-panel relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#06030c]/95 p-6 text-slate-100 shadow-2xl backdrop-blur-xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(false)}
                    aria-label="ปิดหน้าต่าง"
                    className="absolute right-3 top-3 z-10 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/10 text-xl font-bold text-slate-200 shadow-md transition-colors hover:bg-white/20 hover:text-white"
                  >
                    ×
                  </button>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-space-accent">
                    ตัวอย่างการ์ด
                  </p>
                  <h3 className="mt-1 text-2xl font-black text-white">
                    {card.recipient_name}
                  </h3>
                  <img
                    src={template.image ?? "/templates/surprise-qr.svg"}
                    alt={`เทมเพลต ${template.title}`}
                    className="mt-4 h-40 w-full rounded-2xl object-cover"
                  />
                  <dl className="mt-5 space-y-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <dt className="font-semibold text-slate-300">เทมเพลต</dt>
                      <dd className="text-right font-bold text-white">
                        {template.title}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <dt className="font-semibold text-slate-300">
                        ผู้รับ / ผู้ส่ง
                      </dt>
                      <dd className="text-right font-bold text-white">
                        {card.recipient_name} ← {card.sender_name}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <dt className="font-semibold text-slate-300">สถานะ</dt>
                      <dd
                        className={`text-right font-bold ${isExpired ? "text-red-400" : "text-emerald-400"}`}
                      >
                        {expirationLabel}
                        {card.is_permanent ? " · ถาวร" : ""}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <dt className="font-semibold text-slate-300">
                        สร้างเมื่อ
                      </dt>
                      <dd className="text-right font-bold text-white">
                        {new Date(card.created_at).toLocaleDateString("th-TH")}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <dt className="font-semibold text-slate-300">
                        ยอดเข้าชม
                      </dt>
                      <dd className="text-right font-bold text-white">
                        {card.view_count ?? 0}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-6 flex flex-wrap gap-3 border-t border-white/10 pt-4">
                    <a
                      href={cardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-gradient inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-base font-bold text-white"
                    >
                      <Eye className="h-4 w-4" />
                      เปิดการ์ดฉบับเต็ม
                    </a>
                    <button
                      type="button"
                      onClick={() => setPreviewOpen(false)}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base font-bold text-slate-200 transition-colors hover:bg-white/10"
                    >
                      ปิด
                    </button>
                  </div>
                </div>
              </div>,
              document.body,
            )
          : null}
      </div>
    </article>
  );
}

export default function CardList({ cards, tier, baseUrl, isGuest = false, isDraft = false, templates }: CardListProps) {
  const [visibleCards, setVisibleCards] = useState(cards);
  const [addOnCardId, setAddOnCardId] = useState<string | null>(null);

  useEffect(() => {
    if (!isGuest) return;
    const ids = JSON.parse(localStorage.getItem(GUEST_CARD_IDS_KEY) || "[]") as string[];
    const guestCards = JSON.parse(localStorage.getItem(GUEST_CARDS_KEY) || "[]") as Card[];
    setVisibleCards(guestCards.filter((card) => ids.includes(card.id)));
  }, [isGuest]);

  if (visibleCards.length === 0) {
    return (
      <div className="glass-panel rounded-2xl border-dashed border-space-border bg-white/5 px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-space-accent">
          <QrCode className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-bold text-white">ยังไม่มีการ์ดที่สร้างไว้</h3>
        <p className="mt-2 text-base font-medium text-slate-300">เริ่มสร้างการ์ดเซอร์ไพรส์แรกของคุณได้ทันที</p>
        <Link
          href="/templates"
          className="btn-gradient mt-6 inline-flex items-center gap-2 rounded-xl px-4 py-3 text-base font-bold text-white shadow-md"
        >
          <Plus className="h-4 w-4" /> สร้างการ์ดใหม่
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
      {visibleCards.map((card) => (
        <CardItem key={card.id} card={card} tier={tier} baseUrl={baseUrl} isGuest={isGuest} isDraft={isDraft} templates={templates} onDeleted={(id) => setVisibleCards((current) => current.filter((item) => item.id !== id))} onAddOn={setAddOnCardId} />
      ))}
      {!isGuest && <AddOnPurchaseModal
        open={addOnCardId !== null}
        onClose={() => setAddOnCardId(null)}
        cardId={addOnCardId ?? undefined}
        onSubmitted={() => setVisibleCards((current) => current.map((item) => item.id === addOnCardId ? { ...item, is_permanent: true, storage_type: "permanent", expires_at: null } : item))}
      />}
    </div>
  );
}
