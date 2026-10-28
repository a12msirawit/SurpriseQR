"use client";

import React from "react";
import { UploadCloud, Image as ImageIcon, Music, X } from "lucide-react";
import { MEDIA_ACCEPT } from "@/hooks/useCardMediaState";
import type { UserTier } from "@/types/database";

export interface RoyaltyFreeAudio {
  id: string;
  name: string;
}

export const DEFAULT_ROYALTY_FREE_AUDIO: RoyaltyFreeAudio[] = [
  { id: "https://example.com/audio/birthday-song.mp3", name: "เพลงวันเกิด" },
  { id: "https://example.com/audio/celebration.mp3", name: "เพลงฉลอง" },
  { id: "https://example.com/audio/romantic-piano.mp3", name: "เปียโนโรแมนติก" },
  { id: "https://example.com/audio/thank-you-music.mp3", name: "เพลงขอบคุณ" },
  { id: "https://example.com/audio/gentle-apology.mp3", name: "เพลงขอโทษ" },
];

function resolveSizeLabelMB(tier: UserTier): number {
  return tier === "pro" || tier === "vip" ? 10 : 5;
}

interface ImageUploaderProps {
  tier: UserTier;
  preview: string | null;
  imageInputRef: React.RefObject<HTMLInputElement>;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearImage: () => void;
  clearButtonClass?: string;
}

interface AudioUploaderProps {
  tier: UserTier;
  file: File | null;
  selection: string;
  audioInputRef: React.RefObject<HTMLInputElement>;
  onAudioChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearAudio: () => void;
  onSelectionChange: (value: string) => void;
  clearButtonClass?: string;
  royaltyFreeAudio?: RoyaltyFreeAudio[];
}

export function ImageUploader({
  tier,
  preview,
  imageInputRef,
  onImageChange,
  onClearImage,
  clearButtonClass = "px-4 py-2 rounded-xl font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-all flex items-center gap-2 mx-auto",
}: ImageUploaderProps) {
  const size = resolveSizeLabelMB(tier);
  return (
    <div>
      <label htmlFor="media-uploader-image" className="mb-2 block text-sm font-medium text-slate-300">
        รูปภาพ (สูงสุด {size} MB)
      </label>
      <div className="cursor-pointer rounded-2xl border-2 border-dashed border-space-border/60 bg-white/5 p-6 text-center transition-all hover:border-space-accent hover:bg-white/10">
        <input
          id="media-uploader-image"
          ref={imageInputRef}
          type="file"
          accept={MEDIA_ACCEPT.IMAGE_ACCEPT}
          onChange={onImageChange}
          className="hidden"
        />
        <label htmlFor="media-uploader-image" className="cursor-pointer">
          {preview ? (
            <div className="space-y-3">
              <img src={preview} alt="ตัวอย่างภาพ" className="mx-auto max-h-48 rounded-xl" />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onClearImage();
                }}
                className={clearButtonClass}
              >
                <X className="h-4 w-4" />
                ลบรูปภาพ
              </button>
            </div>
          ) : (
            <div>
              <UploadCloud className="mx-auto mb-3 h-12 w-12 text-space-accent/60" />
              <p className="font-medium text-slate-300">คลิกเพื่ออัปโหลดรูปภาพ</p>
              <p className="mt-1 text-sm text-slate-400">PNG, JPG, WEBP</p>
            </div>
          )}
        </label>
      </div>
    </div>
  );
}

export function AudioUploader({
  tier,
  file,
  selection,
  audioInputRef,
  onAudioChange,
  onClearAudio,
  onSelectionChange,
  clearButtonClass = "px-4 py-2 rounded-xl font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-all flex items-center gap-2 mx-auto",
  royaltyFreeAudio = DEFAULT_ROYALTY_FREE_AUDIO,
}: AudioUploaderProps) {
  const size = resolveSizeLabelMB(tier);
  return (
    <>
      <div>
        <label htmlFor="media-uploader-audio" className="mb-2 block text-sm font-medium text-slate-300">
          ไฟล์เสียง (สูงสุด {size} MB)
        </label>
        <div className="cursor-pointer rounded-2xl border-2 border-dashed border-space-border/60 bg-white/5 p-6 text-center transition-all hover:border-space-accent hover:bg-white/10">
          <input
            id="media-uploader-audio"
            ref={audioInputRef}
            type="file"
            accept={MEDIA_ACCEPT.AUDIO_ACCEPT}
            onChange={onAudioChange}
            className="hidden"
          />
          <label htmlFor="media-uploader-audio" className="cursor-pointer">
            {file ? (
              <div className="space-y-3">
                <Music className="mx-auto h-12 w-12 text-space-accent/60" />
                <p className="font-medium text-slate-300">{file.name}</p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    onClearAudio();
                  }}
                  className={clearButtonClass}
                >
                  <X className="h-4 w-4" />
                  ลบเสียง
                </button>
              </div>
            ) : (
              <div>
                <Music className="mx-auto mb-3 h-12 w-12 text-space-accent/60" />
                <p className="font-medium text-slate-300">คลิกเพื่ออัปโหลดเสียง</p>
                <p className="mt-1 text-sm text-slate-400">MP3, WAV</p>
              </div>
            )}
          </label>
        </div>
      </div>

      <div>
        <label htmlFor="media-uploader-audio-select" className="mb-2 block text-sm font-medium text-slate-300">
          หรือเลือกเพลงฟรีที่ใช้ได้
        </label>
        <select
          id="media-uploader-audio-select"
          value={selection}
          onChange={(e) => {
            onSelectionChange(e.target.value);
          }}
          className="w-full rounded-xl border border-space-border bg-white/5 px-4 py-3 text-slate-200 transition-all focus:outline-none focus:ring-2 focus:ring-space-accent/30"
        >
          <option value="">ไม่มี</option>
          {royaltyFreeAudio.map((audio) => (
            <option key={audio.id} value={audio.id}>
              {audio.name}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

export default function MediaUploader(props: {
  tier: UserTier;
  imagePreview: string | null;
  imageInputRef: React.RefObject<HTMLInputElement>;
  audioInputRef: React.RefObject<HTMLInputElement>;
  audioFile: File | null;
  audioSelection: string;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearImage: () => void;
  onAudioChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearAudio: () => void;
  onAudioSelectionChange: (value: string) => void;
  clearImageClass?: string;
  clearAudioClass?: string;
  title?: string;
  titleIcon?: React.ReactNode;
  sectionClass?: string;
}) {
  const {
    tier,
    imagePreview,
    imageInputRef,
    audioInputRef,
    audioFile,
    audioSelection,
    onImageChange,
    onClearImage,
    onAudioChange,
    onClearAudio,
    onAudioSelectionChange,
    clearImageClass,
    clearAudioClass,
    title = "สื่อ",
    titleIcon = <ImageIcon className="w-5 h-5 text-space-accent" />,
    sectionClass = "glass-panel rounded-3xl border-space-border bg-white/5 p-6 space-y-6 backdrop-blur-xl",
  } = props;
  return (
    <section className={sectionClass}>
      <h2 className="flex items-center gap-2 text-xl font-bold text-white">
        {titleIcon}
        {title}
      </h2>
      <ImageUploader
        tier={tier}
        preview={imagePreview}
        imageInputRef={imageInputRef}
        onImageChange={onImageChange}
        onClearImage={onClearImage}
        clearButtonClass={clearImageClass}
      />
      <AudioUploader
        tier={tier}
        file={audioFile}
        selection={audioSelection}
        audioInputRef={audioInputRef}
        onAudioChange={onAudioChange}
        onClearAudio={onClearAudio}
        onSelectionChange={(value) => {
          onAudioSelectionChange(value);
          if (value && audioInputRef.current) audioInputRef.current.value = "";
        }}
        clearButtonClass={clearAudioClass}
      />
    </section>
  );
}
