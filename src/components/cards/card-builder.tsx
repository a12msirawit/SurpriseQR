"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Sparkles } from "lucide-react";
import { createCard } from "@/app/cards/actions";
import CardPreview from "@/components/cards/card-preview";
import MediaUploader from "@/components/cards/MediaUploader";
import { useCardMediaState } from "@/hooks/useCardMediaState";
import type { Template, UserTier } from "@/types/database";

interface CardBuilderProps {
  templates: Template[];
  isPremium: boolean;
  userId: string;
  tier: UserTier;
}

export default function CardBuilder({ templates, isPremium, userId, tier }: CardBuilderProps) {
  void isPremium;
  void userId;
  const router = useRouter();
  const [recipientName, setRecipientName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [message, setMessage] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("mobile");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const media = useCardMediaState({
    tier,
    errorSetter: setError,
  });

  const selectedTemplate = templates.find((t) => t.id === templateId);

  const previewCard = {
    recipient_name: recipientName || "ชื่อผู้รับ",
    sender_name: senderName || "ชื่อผู้ส่ง",
    message: message || "ข้อความของคุณจะปรากฏที่นี่...",
    image_url: media.imagePreview || undefined,
    audio_url:
      media.audioSelection || (media.audioFile ? URL.createObjectURL(media.audioFile) : undefined),
  };

  function handleClearImage() {
    media.clearImage();
    media.setDeleteImage(false);
  }

  function handleClearAudio() {
    media.clearAudio();
    media.setDeleteAudio(false);
  }

  function handleAudioSelection(value: string) {
    media.setAudioSelection(value);
    if (value) media.setDeleteAudio(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (pinCode && (pinCode.length < 4 || pinCode.length > 8)) {
      setError("กรุณากรอกรหัส PIN ให้มีความยาวระหว่าง 4 ถึง 8 หลัก");
      return;
    }

    if (!templateId) {
      setError("กรุณาเลือกเทมเพลต");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("recipient_name", recipientName);
    formData.append("sender_name", senderName);
    formData.append("message", message);
    formData.append("pin_code", pinCode);
    formData.append("template_id", templateId);
    if (media.imageFile) formData.append("image", media.imageFile);
    if (media.audioFile) formData.append("audio", media.audioFile);
    if (media.audioSelection) formData.append("audio_selection", media.audioSelection);

    const result = await createCard(formData);

    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-5">
        <section className="glass-panel rounded-3xl border-space-border bg-white/5 p-6 space-y-6 backdrop-blur-xl">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-space-accent" />
            รายละเอียดการ์ด
          </h2>
          
          <div>
            <label htmlFor="template" className="block text-sm font-medium text-slate-300 mb-2">
              เทมเพลต
            </label>
            <select
              id="template"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-space-border text-slate-200 focus:outline-none focus:ring-2 focus:ring-space-accent/30 transition-all"
            >
              <option value="">เลือกเทมเพลต</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.title} {template.is_premium ? "(พรีเมียม)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="recipient" className="block text-sm font-medium text-slate-300 mb-2">
              ชื่อผู้รับ
            </label>
            <input
              id="recipient"
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-space-border text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-space-accent/30 transition-all"
              placeholder="สำหรับใคร"
            />
          </div>

          <div>
            <label htmlFor="sender" className="block text-sm font-medium text-slate-300 mb-2">
              ชื่อผู้ส่ง
            </label>
            <input
              id="sender"
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-space-border text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-space-accent/30 transition-all"
              placeholder="ชื่อของคุณ"
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-slate-300 mb-2">
              ข้อความ
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-space-border text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-space-accent/30 transition-all resize-none"
              placeholder="เขียนข้อความอันอบอุ่นของคุณ..."
            />
          </div>

          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-slate-300 mb-2">
              รหัส PIN (ไม่บังคับ)
            </label>
            <input
              id="pin"
              type="text"
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value)}
              minLength={4}
              maxLength={8}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-space-border text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-space-accent/30 transition-all"
              placeholder="ระบุรหัส PIN 4 - 8 หลัก"
            />
            <p className="mt-1 text-xs text-slate-400">รหัส PIN ต้องมีความยาว 4 - 8 หลัก</p>
          </div>
        </section>

        <MediaUploader
          tier={tier}
          imagePreview={media.imagePreview}
          imageInputRef={media.imageInputRef as React.RefObject<HTMLInputElement>}
          audioInputRef={media.audioInputRef as React.RefObject<HTMLInputElement>}
          audioFile={media.audioFile}
          audioSelection={media.audioSelection}
          onImageChange={media.handleImageChange}
          onClearImage={handleClearImage}
          onAudioChange={media.handleAudioChange}
          onClearAudio={handleClearAudio}
          onAudioSelectionChange={handleAudioSelection}
          clearImageClass="px-4 py-2 rounded-xl font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-all flex items-center gap-2 mx-auto"
          clearAudioClass="px-4 py-2 rounded-xl font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-all flex items-center gap-2 mx-auto"
        />
        {(() => { if (media.imageInputRef?.current) void 0; if (media.audioInputRef?.current) void 0; return null; })()}

        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 rounded-2xl font-bold text-white bg-space-accent shadow-lg shadow-space-accent/25 hover:shadow-space-accent/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Sparkles className="w-5 h-5" />
          {loading ? "กำลังสร้างการ์ด..." : "สร้างการ์ด"}
        </button>
      </div>

      <div className="space-y-4 self-start lg:sticky lg:top-6 lg:col-span-7 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
        <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-semibold text-slate-300">ดูตัวอย่างแบบสด</h3><div className="flex gap-2"><button type="button" onClick={() => setPreviewMode("mobile")} className={`rounded-xl border px-3 py-2 text-sm font-bold ${previewMode === "mobile" ? "border-space-accent bg-space-accent text-white" : "border-space-border bg-white/5 text-slate-300"}`}>Mobile</button><button type="button" onClick={() => setPreviewMode("desktop")} className={`rounded-xl border px-3 py-2 text-sm font-bold ${previewMode === "desktop" ? "border-space-accent bg-space-accent text-white" : "border-space-border bg-white/5 text-slate-300"}`}>Desktop</button><button type="button" onClick={() => setDarkMode((value) => !value)} className="rounded-xl border border-space-border bg-white/5 px-3 py-2 text-sm font-bold text-slate-300">{darkMode ? "พื้นหลังสว่าง" : "พื้นหลังดำ"}</button></div></div>
        <div className={`mx-auto w-full overflow-hidden transition-all duration-300 ${previewMode === "mobile" ? "max-w-[375px] aspect-[9/19.5] rounded-[40px] border-4 border-space-border shadow-2xl" : "max-w-full aspect-[16/9] rounded-2xl border border-space-border shadow-xl"}`}>
          <CardPreview card={previewCard} template={selectedTemplate} darkMode={darkMode} />
        </div>
      </div>
    </form>
  );
}
