"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Link2, Trash2, UploadCloud } from "lucide-react";
import { uploadTemplatePreviewVideo } from "@/lib/storage-client";
import type { TemplateDemoLinks } from "@/types/database";

const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm"];
const MAX_PREVIEW_VIDEO_SECONDS = 20;

const DEMO_LINK_FIELDS: Array<{
  name: string;
  key: keyof TemplateDemoLinks;
  label: string;
  placeholder: string;
}> = [
  { name: "demo_tiktok", key: "tiktok", label: "TikTok", placeholder: "https://www.tiktok.com/@yourshop" },
  { name: "demo_youtube", key: "youtube", label: "YouTube", placeholder: "https://youtu.be/xxxxxxxx" },
  { name: "demo_facebook", key: "facebook", label: "Facebook", placeholder: "https://www.facebook.com/yourpage" },
  { name: "demo_instagram", key: "instagram", label: "Instagram", placeholder: "https://www.instagram.com/yourshop" },
];

interface TemplateMediaFieldsProps {
  /** Unique prefix for input ids (e.g. "new" or the template id). */
  idPrefix: string;
  /** Storage folder for the upload; omit when creating a brand-new template. */
  templateId?: string;
  /** Existing preview video URL to prefill (edit mode). */
  initialVideoUrl?: string | null;
  /** Existing external demo links to prefill (edit mode). */
  initialLinks?: TemplateDemoLinks | null;
}

/** Reads the duration (seconds) of a video File; null when it cannot be determined. */
async function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      const objectUrl = URL.createObjectURL(file);
      const cleanup = () => {
        URL.revokeObjectURL(objectUrl);
        video.removeAttribute("src");
      };
      video.onloadedmetadata = () => {
        const duration = video.duration;
        cleanup();
        resolve(Number.isFinite(duration) ? duration : null);
      };
      video.onerror = () => {
        cleanup();
        resolve(null);
      };
      video.src = objectUrl;
    } catch {
      resolve(null);
    }
  });
}


/**
 * Shared admin template form fields: preview video upload (stored in the
 * `template-previews` Supabase Storage bucket, MP4/WebM, max 20 seconds) with
 * a live in-form preview player, plus the external demo-link inputs
 * (TikTok / YouTube / Facebook / Instagram persisted to demo_video_links).
 */
export default function TemplateMediaFields({
  idPrefix,
  templateId,
  initialVideoUrl = null,
  initialLinks = null,
}: TemplateMediaFieldsProps) {
  const [videoUrl, setVideoUrl] = useState(initialVideoUrl ?? "");
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleVideoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    // Reset so selecting the same file again still fires onChange.
    event.target.value = "";
    if (!file) return;

    setUploadError(null);

    const isAccepted =
      ACCEPTED_VIDEO_TYPES.includes(file.type) || /\.(mp4|webm)$/i.test(file.name);
    if (!isAccepted) {
      setUploadError("รองรับเฉพาะไฟล์วิดีโอ MP4 หรือ WebM เท่านั้น");
      return;
    }

    const duration = await readVideoDuration(file);
    if (duration !== null && duration > MAX_PREVIEW_VIDEO_SECONDS + 0.5) {
      const message = `วิดีโอยาว ${duration.toFixed(1)} วินาที กรุณาใช้วิดีโอไม่เกิน ${MAX_PREVIEW_VIDEO_SECONDS} วินาที`;
      window.alert(message);
      setUploadError(message);
      return;
    }

    // Instant local preview while the upload is in-flight.
    setLocalPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    setUploading(true);
    try {
      const { url, error } = await uploadTemplatePreviewVideo(file, templateId);
      if (error || !url) {
        setUploadError(error ?? "ไม่สามารถอัปโหลดวิดีโอได้ กรุณาลองใหม่อีกครั้ง");
        return;
      }
      setVideoUrl(url);
    } catch {
      setUploadError("ไม่สามารถอัปโหลดวิดีโอได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setUploading(false);
    }
  }

  const previewSrc = localPreviewUrl ?? (videoUrl.trim() ? videoUrl.trim() : null);

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor={`${idPrefix}-preview-video-file`}
          className="block text-sm font-medium text-slate-300 mb-2"
        >
          วิดีโอตัวอย่างเทมเพลต (สูงสุด 20 วินาที) / Preview Video
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-xl border border-space-border bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-all hover:bg-white/10 disabled:opacity-50"
          >
            <UploadCloud className="h-4 w-4" />
            {uploading ? "กำลังอัปโหลด..." : "เลือกไฟล์วิดีโอ (MP4 / WebM)"}
          </button>
          {videoUrl && !uploading && (
            <button
              type="button"
              onClick={() => {
                setVideoUrl("");
                setLocalPreviewUrl(null);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 transition-all hover:bg-red-500/20"
            >
              <Trash2 className="h-4 w-4" />
              ลบวิดีโอ
            </button>
          )}
          <input
            ref={fileInputRef}
            id={`${idPrefix}-preview-video-file`}
            type="file"
            accept="video/mp4,video/webm"
            className="hidden"
            onChange={handleVideoSelected}
            disabled={uploading}
          />
        </div>
        <input
          type="text"
          name="preview_video_url"
          value={videoUrl}
          onChange={(event) => {
            setVideoUrl(event.target.value);
            setLocalPreviewUrl(null);
          }}
          placeholder="URL วิดีโอตัวอย่าง (อัปโหลดไฟล์ หรือวาง URL ได้เลย)"
          className="mt-2 w-full px-4 py-3 rounded-xl bg-white/5 border border-space-border text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:border-transparent transition-all"
        />
        {uploadError && <p className="mt-2 text-sm text-red-400">{uploadError}</p>}
        {previewSrc && (
          <video
            key={previewSrc}
            src={previewSrc}
            controls
            autoPlay
            loop
            muted
            playsInline
            className="mt-3 w-full max-w-sm rounded-xl border border-space-border bg-black"
          />
        )}
      </div>

      <div>
        <p className="flex items-center gap-1.5 text-sm font-medium text-slate-300 mb-2">
          <Link2 className="h-4 w-4" />
          ลิงก์ตัวอย่างงานจากภายนอก / External Demo Links
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {DEMO_LINK_FIELDS.map((field) => (
            <label key={field.name} className="text-sm font-medium text-slate-300">
              {field.label}
              <input
                type="url"
                name={field.name}
                defaultValue={initialLinks?.[field.key] ?? ""}
                placeholder={field.placeholder}
                className="mt-1 w-full px-4 py-2.5 rounded-xl bg-white/5 border border-space-border text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:border-transparent transition-all"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
