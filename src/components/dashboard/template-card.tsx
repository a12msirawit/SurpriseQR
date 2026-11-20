"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye, EyeOff, ExternalLink, X, Crown, Wand2 } from "lucide-react";
import type { Template, TemplateDemoLinks } from "@/types/database";
import { getTemplateComponent } from "@/lib/template-components";
import PreviewWatermark from "@/components/ui/preview-watermark";
import {
  defaultBlowCandlesData,
  defaultMidnightCinemaData,
  defaultRetroY2KData,
  defaultStarlightMemoriesData,
  defaultSurpriseQRData,
  defaultVelvetCandleData,
  defaultVintageWaxSealData,
  defaultGrandNewYearData,
  defaultSongkranSplendorData,
  defaultHalloweenHauntedData,
  defaultLoveOsData,
  defaultPixelGachaData,
  defaultLunar3DData,
  defaultOrbitOfUsData,
  getTemplateSlugById,
  matchTemplateSlugByTitle,
  type TemplateSlug,
} from "@/data/templates";
import { defaultStorylineModel } from "@/types/storyline";

function getPreviewConfig(slug: TemplateSlug | null): unknown {
  switch (slug) {
    case "velvet-candle":
      return defaultVelvetCandleData;
    case "new-year-grand-celebration":
      return defaultGrandNewYearData;
    case "songkran-splendor":
      return defaultSongkranSplendorData;
    case "halloween-haunted-scroll":
      return defaultHalloweenHauntedData;
    case "love-os":
      return defaultLoveOsData;
    case "pixel-gacha":
      return defaultPixelGachaData;
    case "lunar-3d":
      return defaultLunar3DData;
    case "orbit-of-us":
      return defaultOrbitOfUsData;
    case "starlight-memories":
      return defaultStarlightMemoriesData;
    case "midnight-cinema":
      return defaultMidnightCinemaData;
    case "vintage-wax-seal":
      return defaultVintageWaxSealData;
    case "retro-y2k":
      return defaultRetroY2KData;
    case "candles":
      return {
        recipientName: "คนพิเศษ",
        senderName: "จากใจ",
        wishMessage: defaultBlowCandlesData.content.finale.subText,
        message: defaultBlowCandlesData.content.letter.paragraphs.join("\n\n"),
        photos: [{ src: "/templates/galaxy-1.png" }],
      };
    case "storyline":
      return { storylineModel: defaultStorylineModel };
    default:
      return defaultSurpriseQRData;
  }
}

/** Safely coerce demo_video_links from the DB (null, object, or JSON string) into a record. */
function normalizeDemoLinks(value: unknown): TemplateDemoLinks {
  if (value == null) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as TemplateDemoLinks;
      }
    } catch {
      // fall through to empty object
    }
    return {};
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as TemplateDemoLinks;
  }
  return {};
}

/** Dashboard-facing template card data (DB row + optional thumbnail override). */
export interface TemplateCardData extends Template {
  /** Optional static thumbnail override; falls back to preview_url. */
  thumbnail_url?: string | null;
  slug?: string;
  badge?: string;
}

interface TemplateCardProps {
  template: TemplateCardData;
  /** Last-resort fallback image when neither thumbnail_url nor preview_url is set. */
  fallbackImage?: string;
}

interface DemoLink {
  key: keyof NonNullable<Template["demo_video_links"]>;
  label: string;
  colorClass: string;
}

const DEMO_LINKS: DemoLink[] = [
  { key: "tiktok", label: "TikTok", colorClass: "bg-black hover:bg-neutral-800 border-white/10" },
  { key: "youtube", label: "YouTube", colorClass: "bg-red-600 hover:bg-red-500 border-red-500" },
  { key: "facebook", label: "Facebook", colorClass: "bg-blue-600 hover:bg-blue-500 border-blue-500" },
  { key: "instagram", label: "Instagram", colorClass: "bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:opacity-90 border-white/10" },
];

/**
 * User-dashboard template card. When the template has an uploaded preview
 * video it is rendered as a non-interactive, autoplaying looping thumbnail;
 * otherwise the static image is shown.
 */
export default function TemplateCard({ template, fallbackImage }: TemplateCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const thumbnailSrc =
    template.thumbnail_url || template.preview_url || fallbackImage || "/templates/surprise-qr.svg";
  const title = template.title || "เทมเพลต";
  const isPremium = (template.price ?? 0) > 0 || template.is_premium;

  const links = normalizeDemoLinks(template.demo_video_links);
  const availableLinks = DEMO_LINKS.filter((item) => !!links[item.key]?.trim());

  const resolvedSlug =
    (template.slug as TemplateSlug | undefined) ??
    getTemplateSlugById(template.id) ??
    matchTemplateSlugByTitle(title);
  const PreviewComponent = isPreviewOpen
    ? getTemplateComponent({ id: template.id, title })
    : null;

  useEffect(() => {
    if (!isPreviewOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsPreviewOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isPreviewOpen]);

  return (
    <>
      <div className="relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl">
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          {template.preview_video_url ? (
            <video
              src={template.preview_video_url}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover pointer-events-none"
            />
          ) : (
            <Image
              src={thumbnailSrc}
              alt={title}
              fill
              unoptimized={typeof thumbnailSrc === "string" && (thumbnailSrc.endsWith(".svg") || thumbnailSrc.includes(".svg?"))}
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 20vw"
              className="object-cover"
            />
          )}
          {template.is_published === false && (
            <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border border-fuchsia-400/50 bg-fuchsia-950/85 px-2.5 py-1 text-[11px] font-bold text-fuchsia-200 shadow-lg backdrop-blur-md">
              <EyeOff className="h-3 w-3" /> เฉพาะแอดมิน
            </span>
          )}
          {isPremium ? (
            <span className="absolute right-3 top-3 z-10 inline-flex items-center rounded-full border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 px-2.5 py-1 text-xs font-semibold text-amber-300 shadow-lg backdrop-blur-md">
              <Crown className="w-3 h-3 mr-1 inline" /> พรีเมียม
            </span>
          ) : (
            <span className="absolute right-3 top-3 z-10 inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-300 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block mr-1.5" /> ใช้งานฟรี
            </span>
          )}
        </div>
        <div className="flex-1 p-4 space-y-2">
          <span className="text-xs font-bold capitalize text-slate-300">
            {template.category || ""}
          </span>
          <h3 className="text-lg font-black text-white">{title}</h3>
          {isPremium ? (
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-bold text-amber-400">
                ฿{Number(template.price ?? 0).toLocaleString()}
              </span>
              {template.original_price && template.original_price > (template.price ?? 0) && (
                <>
                  <span className="text-xs text-slate-400 line-through">
                    ฿{Number(template.original_price).toLocaleString()}
                  </span>
                  <span className="rounded-full border border-rose-400/30 bg-rose-500/20 px-2 py-0.5 text-[11px] font-bold text-rose-300">
                    ลด {Math.round(((template.original_price - (template.price ?? 0)) / template.original_price) * 100)}%
                  </span>
                </>
              )}
            </div>
          ) : (
            <p className="text-[14px] font-semibold text-emerald-400">ฟรี</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-white/5 p-4">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="w-full min-h-[40px] py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 text-xs sm:text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5 border border-white/10 active:scale-95"
          >
            <Eye className="w-3.5 h-3.5" />
            ดูตัวอย่าง
          </button>
          <Link
            href={`/dashboard/create?template=${template.id}`}
            className="w-full min-h-[40px] py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-purple-900/30 transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Wand2 className="w-3.5 h-3.5 mr-1" />
            เลือกเทมเพลต
          </Link>
        </div>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`ลิงก์ตัวอย่างของ ${title}`}
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#120a21] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Demo Links</p>
                <h3 className="text-lg font-black text-white">ลิงก์ตัวอย่าง</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="ปิด"
                className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {availableLinks.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-center text-sm font-medium text-slate-300">
                เทมเพลตนี้ยังไม่มีลิงก์ตัวอย่าง
              </p>
            ) : (
              <div className="grid gap-3">
                {availableLinks.map((item) => (
                  <a
                    key={item.key}
                    href={links[item.key]?.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-bold text-white transition-all active:scale-95 ${item.colorClass}`}
                  >
                    <span>{item.label}</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setIsPreviewOpen(true);
              }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-fuchsia-400/40 bg-gradient-to-r from-purple-600/80 to-pink-600/80 px-4 py-3 text-sm font-bold text-white shadow-md transition-all hover:from-purple-500 hover:to-pink-500 active:scale-95"
            >
              <Eye className="h-4 w-4" />
              <span>พรีวิวเทมเพลต</span>
            </button>

            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              ปิด
            </button>
          </div>
        </div>
      )}

      {isPreviewOpen && (
        <div
          className="fixed inset-0 z-[120] h-[100dvh] w-screen overflow-hidden bg-[#06030c]"
          role="dialog"
          aria-modal="true"
          aria-label={`พรีวิวเทมเพลต ${title}`}
        >
          <div className="fixed left-4 top-4 z-[130] flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(false)}
              aria-label="ปิดตัวอย่าง"
              title="ปิดตัวอย่าง"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/65 text-slate-100 shadow-2xl backdrop-blur-md transition hover:border-white/40 hover:bg-black/85 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <Link
              href={`/dashboard/create?template=${template.id}`}
              onClick={() => setIsPreviewOpen(false)}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-xs font-bold text-white shadow-xl backdrop-blur-md transition hover:from-purple-500 hover:to-pink-500"
            >
              <Wand2 className="h-3.5 w-3.5" />
              <span>เลือกเทมเพลตนี้</span>
            </Link>
          </div>

          <div className="relative h-full w-full overflow-x-hidden overflow-y-auto custom-scrollbar">
            {PreviewComponent ? (
              <PreviewComponent config={getPreviewConfig(resolvedSlug)} isEditing={false} />
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-center text-sm text-slate-400">
                ไม่พบคอมโพเนนต์สำหรับพรีวิวเทมเพลตนี้
              </div>
            )}
          </div>
          <PreviewWatermark />
        </div>
      )}
    </>
  );
}