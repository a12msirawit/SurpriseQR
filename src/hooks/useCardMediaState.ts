"use client";

import { useRef, useState, type ChangeEvent } from "react";
import type { UserTier } from "@/types/database";
import { compressImage } from "@/lib/image-compression";

export interface CardMediaState {
  imageFile: File | null;
  imagePreview: string | null;
  audioFile: File | null;
  audioSelection: string;
  deleteImage: boolean;
  deleteAudio: boolean;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  audioInputRef: React.RefObject<HTMLInputElement | null>;
  handleImageChange: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleAudioChange: (e: ChangeEvent<HTMLInputElement>) => void;
  clearImage: () => void;
  clearAudio: () => void;
  setAudioSelection: (value: string) => void;
  setDeleteImage: (value: boolean) => void;
  setDeleteAudio: (value: boolean) => void;
  setImagePreview: (value: string | null) => void;
}

export interface UseCardMediaStateOptions {
  tier: UserTier;
  initialImageUrl?: string | null;
  initialAudioSelection?: string;
  errorSetter?: (message: string | null) => void;
}

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
const AUDIO_ACCEPT = "audio/mpeg,audio/wav,audio/mp3";

function resolveMaxSizeMB(tier: UserTier): { image: number; audio: number } {
  const size = tier === "pro" || tier === "vip" ? 10 : 5;
  return { image: size, audio: size };
}

export const MEDIA_ACCEPT = { IMAGE_ACCEPT, AUDIO_ACCEPT };

export function useCardMediaState(options: UseCardMediaStateOptions): CardMediaState {
  const { tier, initialImageUrl = null, initialAudioSelection = "", errorSetter } = options;
  const setError = errorSetter ?? (() => undefined);

  const [imageFile, setImageFileState] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialImageUrl);
  const [audioFile, setAudioFileState] = useState<File | null>(null);
  const [audioSelection, setAudioSelection] = useState<string>(initialAudioSelection);
  const [deleteImage, setDeleteImage] = useState(false);
  const [deleteAudio, setDeleteAudio] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  async function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const { image: maxSizeMB } = resolveMaxSizeMB(tier);
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`รูปภาพต้องมีขนาดไม่เกิน ${maxSizeMB} MB`);
      return;
    }
    try {
      const compressed = await compressImage(file);
      setImageFileState(compressed);
      setImagePreview(URL.createObjectURL(compressed));
      setDeleteImage(false);
    } catch {
      setError("ไม่สามารถประมวลผลภาพได้ กรุณาลองไฟล์อื่น");
    }
  }

  function handleAudioChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const { audio: maxSizeMB } = resolveMaxSizeMB(tier);
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`ไฟล์เพลง MP3 ต้องมีขนาดไม่เกิน ${maxSizeMB} MB`);
      return;
    }
    setError(null);
    setAudioFileState(file);
    setAudioSelection("");
    setDeleteAudio(false);
  }

  function clearImage() {
    setImageFileState(null);
    setImagePreview(null);
    setDeleteImage(true);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  function clearAudio() {
    setAudioFileState(null);
    setAudioSelection("");
    setDeleteAudio(true);
    if (audioInputRef.current) audioInputRef.current.value = "";
  }

  return {
    imageFile,
    imagePreview,
    audioFile,
    audioSelection,
    deleteImage,
    deleteAudio,
    imageInputRef,
    audioInputRef,
    handleImageChange,
    handleAudioChange,
    clearImage,
    clearAudio,
    setAudioSelection,
    setDeleteImage,
    setDeleteAudio,
    setImagePreview,
  };
}
