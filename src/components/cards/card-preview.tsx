"use client";

import { getTemplateComponent } from "@/lib/template-components";
import { getTemplateSlugById } from "@/data/templates";
import CustomQRCode from "@/components/qr-code/CustomQRCode";
import type { Template } from "@/types/database";

interface CardPreviewProps {
  card: {
    recipient_name: string;
    sender_name: string;
    message: string;
    image_url?: string;
    image_1?: string;
    image_2?: string;
    audio_url?: string;
    qr_value?: string;
  };
  template?: Template | null;
  darkMode?: boolean;
}

export default function CardPreview({ card, template, darkMode = false }: CardPreviewProps) {
  const templateSlug = template ? getTemplateSlugById(template.id) : null;
  const TemplateComponent = templateSlug ? getTemplateComponent(templateSlug) : null;

  // When a dedicated template component exists, render it instead of the
  // generic preview so each template shows its own design.
  if (TemplateComponent && templateSlug) {
    return (
      <div className={`rounded-3xl border p-8 shadow-xl ${darkMode ? "space-y-6 border-space-border glass-panel bg-white/5 text-white" : "space-y-6 border-rose-200/60 bg-gradient-to-br from-rose-100/80 via-pink-100/60 to-purple-100/80"}`}>
        <TemplateComponent
          config={{
            recipientName: card.recipient_name,
            senderName: card.sender_name,
            message: card.message,
            wishMessage: card.message,
            audio_url: card.audio_url,
            image_url: card.image_url,
          }}
          studio
        />
      </div>
    );
  }

  // Generic fallback preview for templates without a dedicated component.
  return (
    <div className={`rounded-3xl border p-8 shadow-xl ${darkMode ? "space-y-6 border-space-border glass-panel bg-white/5 text-white" : "space-y-6 border-rose-200/60 bg-gradient-to-br from-rose-100/80 via-pink-100/60 to-purple-100/80"}`}>
      <div className="space-y-2">
        <h3 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>For: {card.recipient_name}</h3>
        <p className={darkMode ? "text-slate-200" : "text-slate-600"}>From: {card.sender_name}</p>
      </div>

      <div className={`rounded-2xl border p-6 ${darkMode ? "border-space-border bg-white/5" : "border-rose-100/60 bg-white/80"}`}>
        <p className={`whitespace-pre-wrap ${darkMode ? "text-slate-100" : "text-slate-800"}`}>{card.message}</p>
      </div>

      {[card.image_url, card.image_1, card.image_2].filter(Boolean).map((imageUrl, index) => imageUrl && (
        <div key={imageUrl} className={`rounded-2xl border p-4 ${darkMode ? "border-space-border bg-white/5" : "border-rose-100/60 bg-white/80"}`}>
          <img src={imageUrl} alt={`รูปภาพที่ ${index + 1}`} className="w-full rounded-xl" />
        </div>
      ))}

      {card.audio_url && (
        <div className={`rounded-2xl border p-4 ${darkMode ? "border-space-border bg-white/5" : "border-rose-100/60 bg-white/80"}`}>
          <audio controls src={card.audio_url} className="w-full" />
        </div>
      )}

      {card.qr_value && <div className="glass-panel flex justify-center rounded-2xl border border-space-border bg-white/5 p-4"><CustomQRCode value={card.qr_value} shape="rounded" text="สแกนเพื่อเปิดการ์ด" size={210} /></div>}
    </div>
  );
}
