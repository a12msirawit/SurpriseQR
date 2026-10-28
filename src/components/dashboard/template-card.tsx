"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Eye, ExternalLink, Sparkles, X } from "lucide-react";
import type { Template, TemplateDemoLinks } from "@/types/database";

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
  const thumbnailSrc =
    template.thumbnail_url || template.preview_url || fallbackImage || "/templates/surprise-qr.svg";
  const title = template.title || "เทมเพลต";
  const isPremium = (template.price ?? 0) > 0 || template.is_premium;

  const links = normalizeDemoLinks(template.demo_video_links);
  const availableLinks = DEMO_LINKS.filter((item) => !!links[item.key]?.trim());

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
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 20vw"
              className="object-cover"
            />
          )}
          {isPremium ? (
            <span className="absolute right-3 top-3 z-10 rounded-full border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 px-2.5 py-1 text-xs font-semibold text-amber-300 shadow-lg backdrop-blur-md">
              👑 พรีเมียม
            </span>
          ) : (
            <span className="absolute right-3 top-3 z-10 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-300 backdrop-blur-md">
              🟢 ใช้งานฟรี
            </span>
          )}
        </div>
        <div className="flex-1 p-4 space-y-2">
          <span className="text-xs font-bold capitalize text-slate-300">
            {template.category || ""}
          </span>
          <h3 className="text-lg font-black text-white">{title}</h3>
          <p className={`text-[14px] font-semibold ${isPremium ? "text-amber-400" : "text-slate-300"}`}>
            {isPremium ? `฿${template.price ?? 0}` : "ฟรี"}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-white/5 p-4">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1.5 border border-white/10 active:scale-95"
          >
            <Eye className="w-3.5 h-3.5" />
            ดูตัวอย่าง
          </button>
          <Link
            href={`/dashboard/create?template=${template.id}`}
            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-semibold shadow-md shadow-purple-900/30 transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
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
              onClick={() => setIsModalOpen(false)}
              className="mt-5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              ปิด
            </button>
          </div>
        </div>
      )}
    </>
  );
}