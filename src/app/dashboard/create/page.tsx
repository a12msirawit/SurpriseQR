"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Cake,
  Check,
  Droplets,
  Film,
  Flower,
  Gift,
  Grid2X2,
  Heart,
  Image as ImageIcon,
  Images,
  Info,
  Key,
  Link2,
  Lock,
  Mail,
  Music,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Star,
  Trash2,
  Upload,
  Video,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { StoragePricing } from "@/types/database";
import type {
  SurpriseQRData,
  SurpriseQRMedia,
} from "@/types/templates";
import { defaultStorylineModel, type StorylineModel } from "@/types/storyline";
import { compressImage, compressDataUrl } from "@/lib/image-compression";
import {
  defaultBlowCandlesData,
  defaultGrandNewYearData,
  defaultMidnightCinemaData,
  defaultRetroY2KData,
  defaultSongkranSplendorData,
  defaultHalloweenHauntedData,
  defaultLoveOsData,
  defaultPixelGachaData,
  defaultLunar3DData,
  defaultOrbitOfUsData,
  defaultStarlightMemoriesData,
  defaultSurpriseQRData,
  defaultVelvetCandleData,
  defaultVintageWaxSealData,
  getTemplateById,
  getTemplateSlugById,
  templateCatalog,
  type TemplateDefinition,
  type TemplateSlug,
} from "@/data/templates";
import { getTemplateComponent } from "@/lib/template-components";
import type { UnifiedTemplate } from "@/lib/templates";
import PreviewWatermark from "@/components/ui/preview-watermark";
import { getMediaLimit, slugifyCustomUrl } from "@/lib/tierRules";
import type { UserTier } from "@/types/database";

interface DashboardTemplateOption {
  id: string;
  name: string;
  cost: number;
  preview_url?: string;
  category?: string;
  is_premium?: boolean;
  systemDef?: TemplateDefinition;
}

const DRAFT_STORAGE_KEY = "card_draft_data";
const GUEST_CARD_IDS_KEY = "guest_card_ids";
const GUEST_CARDS_KEY = "guest_cards";

/**
 * Studio editor steps (top of the right column). Each step shows the matching
 * preview screen and only that step's form fields. Step 2 maps to Screen 2
 * (the gift-menu card grid); in the runtime envelope flow the envelope opens
 * Screen 2, whose three emoji choices (letter / memories / flowers) warp into
 * Screens 3-5.
 */
const EDITOR_STEPS: Array<{
  id: number;
  screen: number;
  label: string;
  icon: LucideIcon;
}> = [
    { id: 1, screen: 1, label: "ข้อมูลการ์ด & ซอง", icon: Gift },
    { id: 2, screen: 2, label: "เลือกของขวัญ", icon: Grid2X2 },
    { id: 3, screen: 3, label: "จดหมายรัก", icon: Mail },
    { id: 4, screen: 4, label: "ความทรงจำ", icon: ImageIcon },
    { id: 5, screen: 5, label: "ดอกไม้ & เสียงพื้นหลัง", icon: Flower },
    { id: 6, screen: 6, label: "วิดีโอความทรงจำ", icon: Video },
    { id: 7, screen: 7, label: "Finale", icon: Star },
  ];

/**
 * Editor steps specifically customized for Starlight Memories (3-Act Cutscene & Finale).
 */
const STARLIGHT_MEMORIES_STEPS: Array<{
  id: number;
  screen: number;
  label: string;
  icon: LucideIcon;
}> = [
    { id: 1, screen: 1, label: "ข้อมูล & เพลง", icon: Music },
    { id: 2, screen: 2, label: "ฉาก 1: จุดเริ่มต้น", icon: Film },
    { id: 3, screen: 3, label: "ฉาก 2: ช่วงเวลาของเรา", icon: Sparkles },
    { id: 4, screen: 4, label: "ฉาก 3: คำสัญญา", icon: Star },
    { id: 5, screen: 5, label: "ฉากส่งท้าย Finale", icon: ImageIcon },
  ];

/**
 * Editor steps specifically customized for Velvet Candle & Cake (Interactive Birthday).
 */
const VELVET_CANDLE_STEPS: Array<{
  id: number;
  screen: number;
  label: string;
  icon: LucideIcon;
}> = [
    { id: 1, screen: 1, label: "ข้อมูลวันเกิด & เพลง", icon: Cake },
    { id: 2, screen: 2, label: "คำอธิษฐาน & ข้อความในเค้ก", icon: Sparkles },
    { id: 3, screen: 3, label: "ลูกโป่งคำอวยพร", icon: Gift },
    { id: 4, screen: 4, label: "อัลบั้มภาพวันเกิด", icon: Images },
  ];

/**
 * Editor steps specifically customized for Midnight Cinema 35mm.
 */
const MIDNIGHT_CINEMA_STEPS: Array<{
  id: number;
  screen: number;
  label: string;
  icon: LucideIcon;
}> = [
    { id: 1, screen: 1, label: "ตั๋วภาพยนตร์", icon: Film },
    { id: 2, screen: 4, label: "บทภาพยนตร์", icon: Mail },
    { id: 3, screen: 2, label: "ม้วนฟิล์ม 35 มม.", icon: Images },
    { id: 4, screen: 6, label: "ฉากจบ Finale", icon: Star },
    { id: 5, screen: 5, label: "เพลงประกอบ", icon: Music },
  ];

const BLOW_CANDLES_STEPS: Array<{
  id: number;
  screen: number;
  label: string;
  icon: LucideIcon;
}> = [
    { id: 1, screen: 1, label: "1. หน้าแรก & ข้อมูลพื้นฐาน", icon: Cake },
    { id: 2, screen: 2, label: "2. เป่าเทียน & ฉลอง", icon: Sparkles },
    { id: 3, screen: 3, label: "3. รูปภาพ & สาส์นอวยพร", icon: Images },
    { id: 4, screen: 4, label: "4. วิดีโอ & หน้าปิดท้าย", icon: Video },
  ];

const RETRO_Y2K_STEPS: Array<{
  id: number;
  screen: number;
  label: string;
  icon: LucideIcon;
}> = [
    { id: 1, screen: 1, label: "1. หน้าต่างเตือน Alert", icon: AlertCircle },
    { id: 2, screen: 2, label: "2. หัวข้อ Notepad", icon: Mail },
    { id: 3, screen: 3, label: "3. เนื้อหาจดหมาย", icon: Sparkles },
    { id: 4, screen: 4, label: "4. รูปภาพ PhotoViewer", icon: Images },
    { id: 5, screen: 5, label: "5. ชื่อเพลง Winamp", icon: Music },
    { id: 6, screen: 6, label: "6. ไฟล์เพลงประกอบ", icon: Music },
    { id: 7, screen: 7, label: "7. หน้าฉลองปิดท้าย", icon: Star },
  ];

const STORYLINE_STEPS: Array<{
  id: number;
  screen: number;
  label: string;
  icon: LucideIcon;
}> = [
    { id: 1, screen: 0, label: "หน้าซอง & ธีม", icon: Mail },
    { id: 2, screen: 1, label: "ฉาก 1 · รูปภาพ", icon: ImageIcon },
    { id: 3, screen: 2, label: "ฉาก 2 · วิดีโอ", icon: Video },
    { id: 4, screen: 3, label: "ฉาก 3 · จดหมาย", icon: Film },
    { id: 5, screen: 4, label: "หน้าปิดท้าย", icon: Star },
  ];

const LOVE_OS_STEPS: Array<{
  id: number;
  screen: number;
  label: string;
  icon: LucideIcon;
}> = [
  { id: 1, screen: 1, label: "หน้าล็อกอิน Windows", icon: Lock },
  { id: 2, screen: 2, label: "ไฟล์ลับหน้าจอ", icon: Mail },
  { id: 3, screen: 3, label: "ป๊อปอัป Error", icon: AlertCircle },
  { id: 4, screen: 4, label: "เพลง & ข้อความความรู้สึก", icon: Music },
  { id: 5, screen: 4, label: "รูปความทรงจำ & ปิดท้าย", icon: Images },
];

const PIXEL_GACHA_STEPS: Array<{
  id: number;
  screen: number;
  label: string;
  icon: LucideIcon;
}> = [
  { id: 1, screen: 1, label: "ตู้กาชา & เพลงประกอบ", icon: Gift },
  { id: 2, screen: 2, label: "การ์ดคำอวยพร (SR)", icon: Sparkles },
  { id: 3, screen: 3, label: "การ์ดรูปความทรงจำ (SSR)", icon: Images },
  { id: 4, screen: 4, label: "จดหมายลับ (SECRET)", icon: Mail },
];

const LUNAR_3D_STEPS: Array<{
  id: number;
  screen: number;
  label: string;
  icon: LucideIcon;
}> = [
  { id: 1, screen: 1, label: "ดวงจันทร์ & รหัสผ่าน", icon: Lock },
  { id: 2, screen: 2, label: "เพลงประกอบ", icon: Music },
  { id: 3, screen: 3, label: "รูป 1:1 ด้านหลัง & ความรู้สึก", icon: Sparkles },
];

const ORBIT_OF_US_STEPS: Array<{
  id: number;
  screen: number;
  label: string;
  icon: LucideIcon;
}> = [
  { id: 1, screen: 1, label: "เปิดฉาก & ธีมสีกาแล็กซี", icon: Sparkles },
  { id: 2, screen: 2, label: "ข้อความลอยในวงโคจร", icon: Star },
  { id: 3, screen: 3, label: "รูปภาพในวงโคจร (4–12 รูป)", icon: Images },
  { id: 4, screen: 4, label: "หัวใจ 3D & จดหมายปิดท้าย", icon: Heart },
];

/**
 * Editor steps specifically customized for Grand New Year Celebration (4-Stage Festival).
 */
const GRAND_NEW_YEAR_STEPS: Array<{
  id: number;
  screen: number;
  label: string;
  icon: LucideIcon;
}> = [
    { id: 1, screen: 1, label: "เปิดฉาก & เคาท์ดาวน์", icon: Sparkles },
    { id: 2, screen: 2, label: "พลุ & ความทรงจำ (รูปที่ 1)", icon: Images },
    { id: 3, screen: 3, label: "สารอวยพร & คำทำนาย", icon: Gift },
    { id: 4, screen: 4, label: "ก้าวสู่ปีใหม่ (รูปที่ 2)", icon: Star },
  ];

const SONGKRAN_STEPS: Array<{
  id: number;
  screen: number;
  label: string;
  icon: LucideIcon;
}> = [
    { id: 1, screen: 1, label: "ลูกโป่งน้ำ & สาดถังใหญ่", icon: Droplets },
    { id: 2, screen: 2, label: "เช็ดกระจกเผยรูปที่ 1", icon: Images },
    { id: 3, screen: 3, label: "ปะแป้ง & เซียมซีหน้าร้อน", icon: Flower },
    { id: 4, screen: 4, label: "ปืนฉีดน้ำคอมโบ (รูปที่ 2)", icon: Star },
  ];

const HALLOWEEN_STEPS: Array<{
  id: number;
  screen: number;
  label: string;
  icon: LucideIcon;
}> = [
    { id: 1, screen: 1, label: "เปิดงานฉลอง & ผู้ส่ง", icon: Sparkles },
    { id: 2, screen: 2, label: "ปัดหมอกเผยรูปที่ 1", icon: Images },
    { id: 3, screen: 3, label: "คำอวยพร & เสี่ยงทาย", icon: Gift },
    { id: 4, screen: 4, label: "Trick or Treat ปิดท้าย", icon: Star },
  ];

/**
 * Editor steps specifically customized for Vintage Wax Seal & Royal Parchment.
 */
const VINTAGE_WAX_STEPS: Array<{
  id: number;
  screen: number;
  label: string;
  icon: LucideIcon;
}> = [
    { id: 1, screen: 1, label: "ซอง & ตราครั่ง", icon: Mail },
    { id: 2, screen: 2, label: "รหัสลับ PIN", icon: Key },
    { id: 3, screen: 3, label: "สารราชสาส์น", icon: Sparkles },
    { id: 4, screen: 4, label: "ภาพความทรงจำ", icon: Images },
    { id: 5, screen: 6, label: "หีบดนตรี & เพลง", icon: Music },
    { id: 6, screen: 7, label: "คำปฏิญาณปิดท้าย", icon: Star },
  ];

interface FestivalFormPreset {
  themeBorderClass: string;
  accentTextClass: string;
  tabHeaders: [string, string, string, string];
  fieldIds: {
    recipient: string;
    year: string;
    tagline: string;
    sender: string;
    photo1: string;
    photo1Caption: string;
    wishTitle: string;
    wishMessage: string;
    fortunes: string;
    photo2: string;
    photo2Caption: string;
    bgm: string;
  };
  labels: {
    year: string;
    yearPlaceholder: string;
    taglinePlaceholder: string;
    senderPlaceholder: string;
    photo1Label: string;
    photo1CaptionPlaceholder: string;
    wishTitleLabel: string;
    wishTitlePlaceholder: string;
    wishMessageLabel: string;
    wishMessagePlaceholder: string;
    fortunesLabel: string;
    fortuneItemPrefix: string;
    photo2Label: string;
    photo2CaptionPlaceholder: string;
  };
}

const FESTIVAL_FORM_PRESETS: Record<
  "new-year-grand-celebration" | "songkran-splendor" | "halloween-haunted-scroll",
  FestivalFormPreset
> = {
  "new-year-grand-celebration": {
    themeBorderClass: "border-amber-500/20 bg-amber-950/20",
    accentTextClass: "text-amber-100",
    tabHeaders: [
      "แท็บ 1: ตั๋วรถไฟข้ามปี",
      "แท็บ 2: หน้าต่างชมพลุ & โพลารอยด์ (รูปที่ 1)",
      "แท็บ 3: กล่องของขวัญ & ซองสุ่มพร",
      "แท็บ 4: สถานีปลายทางปีใหม่ (รูปที่ 2)",
    ],
    fieldIds: {
      recipient: "field-ny-recipient",
      year: "field-ny-year",
      tagline: "field-ny-tagline",
      sender: "field-ny-sender",
      photo1: "field-ny-photo1",
      photo1Caption: "field-ny-photo1-caption",
      wishTitle: "field-ny-wish-title",
      wishMessage: "field-ny-wish-message",
      fortunes: "field-ny-fortunes",
      photo2: "field-ny-photo2",
      photo2Caption: "field-ny-photo2-caption",
      bgm: "field-ny-bgm",
    },
    labels: {
      year: "ปีศักราช / ข้อความหลัก (Target Year)",
      yearPlaceholder: "2027",
      taglinePlaceholder: "ช่วงเวลาแห่งการเริ่มต้นใหม่ที่สว่างไสวที่สุด",
      senderPlaceholder: "จากใจผู้ส่ง",
      photo1Label: "รูปภาพความทรงจำที่ 1",
      photo1CaptionPlaceholder: "ขอบคุณทุกความทรงจำและรอยยิ้มที่มีให้กันตลอดทั้งปี",
      wishTitleLabel: "หัวข้อคำอวยพร",
      wishTitlePlaceholder: "สวัสดีปีใหม่ สุขสันต์ ร่ำรวย และสดใส",
      wishMessageLabel: "เนื้อหาคำอวยพรปีใหม่",
      wishMessagePlaceholder: "ขอให้ปีใหม่นี้นำพาความสุข...",
      fortunesLabel: "ชุดคำทำนายมงคล (4–6 ประโยค)",
      fortuneItemPrefix: "คำทำนายที่",
      photo2Label: "รูปภาพก้าวสู่ปีใหม่ที่ 2",
      photo2CaptionPlaceholder: "ก้าวสู่บทใหม่ของชีวิตไปด้วยกันอย่างงดงาม",
    },
  },
  "songkran-splendor": {
    themeBorderClass: "border-cyan-500/25 bg-cyan-950/20",
    accentTextClass: "text-cyan-100",
    tabHeaders: [
      "แท็บ 1: ลูกโป่งน้ำ & สาดถังใหญ่",
      "แท็บ 2: เช็ดกระจกเผยรูปที่ 1",
      "แท็บ 3: ปะแป้ง & เซียมซีหน้าร้อน",
      "แท็บ 4: ปืนฉีดน้ำคอมโบ (รูปที่ 2)",
    ],
    fieldIds: {
      recipient: "field-sk-recipient",
      year: "field-sk-year",
      tagline: "field-sk-tagline",
      sender: "field-sk-sender",
      photo1: "field-sk-photo1",
      photo1Caption: "field-sk-photo1-caption",
      wishTitle: "field-sk-blessing-title",
      wishMessage: "field-sk-blessing-message",
      fortunes: "field-sk-blessings",
      photo2: "field-sk-photo2",
      photo2Caption: "field-sk-photo2-caption",
      bgm: "field-sk-bgm",
    },
    labels: {
      year: "หัวเรื่องเทศกาล (เช่น สงกรานต์ 2569)",
      yearPlaceholder: "สงกรานต์ 2569",
      taglinePlaceholder: "คลายร้อนรับความสุข สาดความสดชื่นให้ชุ่มฉ่ำหัวใจตลอดปีใหม่ไทย",
      senderPlaceholder: "ส่งความชุ่มฉ่ำจากใจ",
      photo1Label: "รูปภาพความสุขที่ 1 (เผยชัดเมื่อถูเช็ดหยดน้ำ)",
      photo1CaptionPlaceholder: "เก็บภาพรอยยิ้มและช่วงเวลาแห่งความสดชื่นไว้ด้วยกัน",
      wishTitleLabel: "หัวข้อคำอวยพรสงกรานต์",
      wishTitlePlaceholder: "สวัสดีปีใหม่ไทย เย็นกาย สบายใจ",
      wishMessageLabel: "เนื้อหาคำอวยพรรดน้ำขอพร",
      wishMessagePlaceholder: "ขอให้ความบริสุทธิ์และความเย็นฉ่ำของสายน้ำ...",
      fortunesLabel: "ชุดคำอวยพรฤดูร้อนสุ่มการ์ด (4–6 ประโยค)",
      fortuneItemPrefix: "คำอวยพรที่",
      photo2Label: "รูปภาพเฉลิมฉลองที่ 2",
      photo2CaptionPlaceholder: "ก้าวเข้าสู่ปีใหม่ไทยด้วยพลังใจที่สดใสกว่าเดิม",
    },
  },
  "halloween-haunted-scroll": {
    themeBorderClass: "border-orange-500/35 bg-[#120b1e]/90",
    accentTextClass: "text-orange-300",
    tabHeaders: [
      "ช่วงที่ 1: เปิดการ์ดสุขสันต์วันฮาโลวีน",
      "ช่วงที่ 2: โถงภาพความทรงจำใต้หมอกแสงจันทร์",
      "ช่วงที่ 3: คำอวยพรคืนพระจันทร์ & กระดานเสี่ยงทาย",
      "ช่วงที่ 4: ปาร์ตี้ Trick or Treat & เพลงประกอบ",
    ],
    fieldIds: {
      recipient: "field-hw-recipient",
      year: "field-hw-year",
      tagline: "field-hw-tagline",
      sender: "field-hw-sender",
      photo1: "field-hw-photo1",
      photo1Caption: "field-hw-photo1-caption",
      wishTitle: "field-hw-wish-title",
      wishMessage: "field-hw-wish-message",
      fortunes: "field-hw-fortunes",
      photo2: "field-hw-photo2",
      photo2Caption: "field-hw-photo2-caption",
      bgm: "field-hw-bgm",
    },
    labels: {
      year: "ชื่อคืนเทศกาล (Festival Tag)",
      yearPlaceholder: "สุขสันต์วันฮาโลวีน 31 ตุลาคม",
      taglinePlaceholder: "ลองเลื่อนลงมาช้า ๆ แล้วเปิดรับเซอร์ไพรส์แสนสนุกที่ซ่อนอยู่ทุกช่วงกันนะ",
      senderPlaceholder: "ส่งตรงความสุขจากใจ",
      photo1Label: "รูปความทรงจำที่ 1 (ซ่อนใต้หมอกให้ปัดเปิดเผยภาพ)",
      photo1CaptionPlaceholder: "ปัดหมอกแสงจันทร์ให้จางลง เพื่อเปิดภาพความทรงจำสุดพิเศษใบแรก",
      wishTitleLabel: "หัวข้อคำอวยพรวันฮาโลวีน (Blessing Title)",
      wishTitlePlaceholder: "Happy Halloween! ขอให้มีแต่รอยยิ้มแสนหวาน",
      wishMessageLabel: "ข้อความคำอวยพรวันฮาโลวีน (Main Wish)",
      wishMessagePlaceholder: "คืนนี้ภูตผีน่ารักอาจออกมาทักทาย แต่ความปรารถนาดีที่มีให้ไม่มีวันจางหาย...",
      fortunesLabel: "ชุดคำอวยพรบนกระดานเสี่ยงทาย (4–6 ประโยค — เลื่อนแผ่นคริสตัล)",
      fortuneItemPrefix: "คำอวยพรเสี่ยงทายข้อที่",
      photo2Label: "รูปความทรงจำปิดท้ายที่ 2 (เฟรม Trick or Treat)",
      photo2CaptionPlaceholder: "Trick or Treat! ขอให้ความโชคดีและความสุขอยู่ข้างเธอตลอดค่ำคืนนี้",
    },
  },
};

interface SceneFormData {
  title: string;
  body: string;
  media_url?: string;
}

function resolveMediaLimitForFile(
  file: File,
  tier: string = "free",
  options?: { isPaidTemplate?: boolean; isPremiumTemplate?: boolean }
): number {
  let userTier = (tier as UserTier) || "free";
  let isPremium = options?.isPaidTemplate ?? options?.isPremiumTemplate;
  if (typeof window !== "undefined") {
    if (userTier === "free") {
      const cached = (window as unknown as { __SURPRISEQR_USER_TIER?: UserTier }).__SURPRISEQR_USER_TIER;
      if (cached) userTier = cached;
    }
    if (isPremium === undefined) {
      isPremium = (window as unknown as { __SURPRISEQR_IS_PREMIUM_TEMPLATE?: boolean }).__SURPRISEQR_IS_PREMIUM_TEMPLATE;
    }
  }
  const isPaidOrPremium = Boolean(isPremium);
  if (file.type.startsWith("video/")) return getMediaLimit(userTier, "video", { isPaidTemplate: isPaidOrPremium });
  if (file.type.startsWith("audio/")) return getMediaLimit(userTier, "audio", { isPaidTemplate: isPaidOrPremium });
  return getMediaLimit(userTier, "image", { isPaidTemplate: isPaidOrPremium });
}

/** Read an uploaded media file into an inline data URL (images get compressed). */
async function surpriseQRFileToSrc(
  file: File,
  tier: string = "free",
  options?: { isPaidTemplate?: boolean; isPremiumTemplate?: boolean }
): Promise<string> {
  const maxMb = resolveMediaLimitForFile(file, tier, options);
  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`ไฟล์ใหญ่เกิน ${maxMb}MB ตามโควตาแพ็กเกจของคุณ — กรุณาใช้ไฟล์ที่เล็กกว่าหรือใช้ลิงก์ URL แทน`);
  }
  let working = file;
  if (file.type.startsWith("image/")) {
    try {
      working = await compressImage(file);
    } catch {
      working = file;
    }
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
    reader.readAsDataURL(working);
  });
}

/** URL text input + local file upload for one Anniversary Surprise media slot. */
function SurpriseQRMediaInput({
  label,
  value,
  onChange,
  accept = "image/*",
  placeholder,
  tier = "free",
  isPremiumTemplate,
  hideUrlInput = false,
}: {
  label: string;
  value: string;
  onChange: (src: string) => void;
  accept?: string;
  placeholder?: string;
  tier?: UserTier | string;
  isPremiumTemplate?: boolean;
  hideUrlInput?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTextChange(event: React.ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value;
    if (raw.startsWith("data:image")) {
      setError(null);
      setBusy(true);
      try {
        const compressed = await compressDataUrl(raw);
        onChange(compressed);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "ไม่สามารถบีบอัดภาพได้");
        onChange(raw);
      } finally {
        setBusy(false);
      }
    } else {
      onChange(raw);
    }
  }

  return (
    <div>
      <label className="text-base font-semibold text-slate-200">
        {label}
        {!hideUrlInput && (
          <input
            value={value}
            onChange={handleTextChange}
            placeholder={placeholder ?? "https://... (หรือกดอัปโหลดไฟล์)"}
            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
          />
        )}
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? (
            "กำลังแปลงไฟล์..."
          ) : (
            <>
              <Upload className="h-4 w-4" />
              <span>อัปโหลดไฟล์</span>
            </>
          )}
        </button>
        {value ? (
          <>
            {hideUrlInput && (
              <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
                อัปโหลดไฟล์แล้ว
              </span>
            )}
            <button
              type="button"
              onClick={() => onChange("")}
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/20"
            >
              ล้างค่า
            </button>
          </>
        ) : null}
        {error ? <span className="text-sm font-medium text-red-300">{error}</span> : null}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setError(null);
          setBusy(true);
          surpriseQRFileToSrc(file, String(tier), { isPremiumTemplate })
            .then((src) => onChange(src))
            .catch((err: Error) => setError(err.message))
            .finally(() => setBusy(false));
        }}
      />
    </div>
  );
}

const storageOptions: StoragePricing[] = [
  { type: "14_days", name: "จัดเก็บ 14 วัน (ฟรี)", cost: 0, duration: "14 วัน" },
  { type: "permanent", name: "จัดเก็บถาวร", cost: 25, duration: "ตลอดไป" },
];

/** Format a quota count: the hard-capped unlimited sentinel (2147483647) or Infinity is shown as unlimited. */
function formatQuotaDisplay(value: number): string {
  return !Number.isFinite(value) || value >= 0x7FFFFFFF ? "ไม่จำกัด" : String(value);
}

// The "Sender Name" (ชื่อผู้ส่ง) field was removed from the form. The backend
// requires a non-empty `sender_name`, so we keep sending a safe default that
// matches the API's existing fallback (`"Sender"`) and satisfies the
// `sender_name TEXT NOT NULL` DB constraint.
const FALLBACK_SENDER_NAME = "Sender";

// The creation flow is locked to the Anniversary Surprise flagship template.
// ?template=<param> is still accepted for deep links but must resolve to it.
const ANNIVERSARY_TEMPLATE_SLUG: TemplateSlug = "anniversary-surprise";

/** Creation is locked to the Anniversary Surprise template as the primary option. Other resolved templates are also supported. */
function resolveOptionStrategy(option: DashboardTemplateOption | null, paramFallback?: string | null): TemplateSlug {
  const byId = getTemplateSlugById(option?.id) ?? getTemplateSlugById(option?.systemDef?.id);
  if (byId) return byId;

  if (paramFallback) {
    const byParam = getTemplateSlugById(paramFallback);
    if (byParam) return byParam;
  }

  const lower = `${option?.name ?? ""} ${paramFallback ?? ""}`.toLowerCase();
  if (lower.includes("velvet") || lower.includes("cake") || lower.includes("เค้ก") || lower.includes("เป่าเทียนวันเกิด")) {
    return "velvet-candle";
  }
  if (lower.includes("starlight") || lower.includes("stars") || lower.includes("ดวงดาว") || lower.includes("แสงดาว")) {
    return "starlight-memories";
  }
  if (lower.includes("blow candles") || lower.includes("candles")) {
    return "candles";
  }
  if (lower.includes("midnight") || lower.includes("cinema") || lower.includes("35mm")) {
    return "midnight-cinema";
  }
  if (lower.includes("songkran") || lower.includes("สงกราน") || lower.includes("สาดน้ำ") || lower.includes("ปีใหม่ไทย")) {
    return "songkran-splendor";
  }
  if (lower.includes("halloween") || lower.includes("haunted") || lower.includes("abyss") || lower.includes("ฮาโลวีน")) {
    return "halloween-haunted-scroll";
  }
  if (lower.includes("new year") || lower.includes("grand-new-year") || lower.includes("new-year-grand-celebration") || lower.includes("ปีใหม่")) {
    return "new-year-grand-celebration";
  }
  if (lower.includes("vintage") || lower.includes("wax") || lower.includes("parchment") || lower.includes("ตราครั่ง")) {
    return "vintage-wax-seal";
  }
  if (lower.includes("orbit") || lower.includes("galaxy") || lower.includes("กาแล็กซี")) {
    return "orbit-of-us";
  }
  if (lower.includes("lunar") || lower.includes("moon") || lower.includes("ดวงจันทร์")) {
    return "lunar-3d";
  }
  if (lower.includes("pixel-gacha") || lower.includes("pixel gacha") || lower.includes("gacha") || lower.includes("กาชา") || lower.includes("พิกเซล")) {
    return "pixel-gacha";
  }
  if (lower.includes("love os") || lower.includes("love-os") || lower.includes("desktop confession")) {
    return "love-os";
  }
  if (lower.includes("storyline") || lower.includes("story-line")) {
    return "storyline";
  }
  return ANNIVERSARY_TEMPLATE_SLUG;
}

function mapUnifiedToOption(t: UnifiedTemplate): DashboardTemplateOption {
  const sysDef = t.systemDefinition;
  // Database `price` takes absolute priority; static catalog price is only a
  // fallback. Normalize defensively (the DB value may arrive as a numeric
  // string or null) so a real price such as ฿9 is never coerced to 0.
  const dbPrice = t.price == null ? null : Number(t.price);
  const cost = dbPrice !== null && Number.isFinite(dbPrice) ? dbPrice : Number(sysDef?.priceCredits ?? 0);
  return {
    id: t.id,
    name: t.title,
    cost,
    preview_url: sysDef?.image ?? t.preview_url,
    category: sysDef?.category ?? t.category,
    is_premium: t.is_premium || cost > 0,
    systemDef: sysDef,
  };
}

/**
 * Selection policy for /dashboard/create:
 * - Remote DB templates that resolve to a known TemplateSlug are included.
 * - The Anniversary Surprise built-in definition is always offered as the
 *   primary fallback so creation always has an option regardless of DB state.
 */
function buildCreationOptions(remoteOptions: DashboardTemplateOption[]): DashboardTemplateOption[] {
  const catalogOptions: DashboardTemplateOption[] = templateCatalog.map((def) => ({
    id: def.id,
    name: def.title,
    cost: def.priceCredits,
    preview_url: def.image,
    category: def.category,
    is_premium: def.priceCredits > 0,
    systemDef: def,
  }));

  if (remoteOptions.length === 0) return catalogOptions;

  const validOptions: DashboardTemplateOption[] = [];
  const seen = new Set<string>();

  for (const opt of remoteOptions) {
    const slug = getTemplateSlugById(opt.id) ?? (opt.systemDef ? getTemplateSlugById(opt.systemDef.id) : null);
    if (slug) seen.add(slug);
    seen.add(opt.id);
    validOptions.push({
      ...opt,
      systemDef: opt.systemDef ?? getTemplateById(opt.id, opt.name),
    });
  }

  for (const catOpt of catalogOptions) {
    const slug = catOpt.systemDef?.slug;
    if (slug && !seen.has(slug) && !seen.has(catOpt.id)) {
      validOptions.push(catOpt);
      seen.add(slug);
      seen.add(catOpt.id);
    }
  }

  return validOptions;
}

function CreateStoryCardPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateParam = searchParams.get("template");

  const initialDef = useMemo(() => {
    if (!templateParam) return null;
    return getTemplateById(templateParam);
  }, [templateParam]);
  const initialSlug = initialDef?.slug ?? (templateParam ? getTemplateSlugById(templateParam) : null);

  const [cardTitle, setCardTitle] = useState(() => {
    if (initialSlug === "velvet-candle") return "Happy Birthday";
    if (initialSlug === "starlight-memories") return "Starlight Memories";
    if (initialSlug === "vintage-wax-seal") return "To Someone Special";
    return "";
  });
  const [recipientName, setRecipientName] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [scenes, setScenes] = useState<SceneFormData[]>([
    { title: "ปก", body: "", media_url: "" },
    { title: "ความทรงจำ", body: "", media_url: "" },
    { title: "เกม", body: "", media_url: "" },
    { title: "ความปรารถนาหลัก", body: "", media_url: "" },
  ]);
  const [templateOptions, setTemplateOptions] = useState<DashboardTemplateOption[]>(() => buildCreationOptions([]));
  const [selectedTemplate, setSelectedTemplate] = useState<DashboardTemplateOption | null>(() => {
    if (initialDef) {
      return {
        id: templateParam || initialDef.id,
        name: initialDef.title,
        cost: initialDef.priceCredits,
        preview_url: initialDef.image,
        category: initialDef.category,
        is_premium: initialDef.priceCredits > 0,
        systemDef: initialDef,
      };
    }
    return null;
  });
  const [selectedStorage, setSelectedStorage] = useState<StoragePricing>(
    storageOptions[0],
  );
  const [userCredits, setUserCredits] = useState(0);
  const [permanentQuota, setPermanentQuota] = useState(0);
  const [premiumQuota, setPremiumQuota] = useState(0);
  const [userTier, setUserTier] = useState("free");

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as unknown as { __SURPRISEQR_USER_TIER?: string }).__SURPRISEQR_USER_TIER = userTier;
    }
  }, [userTier]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as unknown as { __SURPRISEQR_IS_PREMIUM_TEMPLATE?: boolean }).__SURPRISEQR_IS_PREMIUM_TEMPLATE =
        Boolean(selectedTemplate?.is_premium || (selectedTemplate?.cost && selectedTemplate.cost > 0));
    }
  }, [selectedTemplate]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [surpriseQRData, setSurpriseQRData] = useState<SurpriseQRData>(() => {
    if (initialSlug === "velvet-candle") return structuredClone(defaultVelvetCandleData);
    if (initialSlug === "starlight-memories") return structuredClone(defaultStarlightMemoriesData);
    if (initialSlug === "midnight-cinema") return structuredClone(defaultMidnightCinemaData);
    if (initialSlug === "new-year-grand-celebration") return structuredClone(defaultGrandNewYearData);
    if (initialSlug === "songkran-splendor") return structuredClone(defaultSongkranSplendorData);
    if (initialSlug === "halloween-haunted-scroll") return structuredClone(defaultHalloweenHauntedData);
    if (initialSlug === "love-os") return structuredClone(defaultLoveOsData);
    if (initialSlug === "pixel-gacha") return structuredClone(defaultPixelGachaData);
    if (initialSlug === "lunar-3d") return structuredClone(defaultLunar3DData);
    if (initialSlug === "orbit-of-us") return structuredClone(defaultOrbitOfUsData);
    if (initialSlug === "vintage-wax-seal") return structuredClone(defaultVintageWaxSealData);
    if (initialSlug === "retro-y2k") return structuredClone(defaultRetroY2KData);
    return defaultSurpriseQRData;
  });
  const [candlePhotos, setCandlePhotos] = useState<string[]>(["", "", ""]);
  const [candleVideoUrl, setCandleVideoUrl] = useState<string>("");
  const [candleConfig, setCandleConfig] = useState({
    senderName: "",
    introHeadline: "ค่ำคืนแห่งคำอธิษฐาน",
    introPrompt: "หลับตาลงช้า ๆ แล้วตั้งคำอธิษฐานที่ดีที่สุดสำหรับปีใหม่ของชีวิตในวันนี้",
    introButtonCaption: "แตะเริ่มอธิษฐานและเป่าเทียน",
    blowingHeadline: "เป่าลมดับเทียนทั้ง 5 เล่ม",
    celebrationHeadline: "คำอธิษฐานส่องสว่างแล้ว",
    celebrationHint: "แตะลูกโป่งหรือท้องฟ้าเพื่อจุดพลุฉลอง",
    revealButtonCaption: "แตะเปิดกล่องความลับในเค้ก",
    letterTitle: "",
    letterMessage:
      "สุขสันต์วันเกิดนะ! ขอบคุณที่เป็นความสุขและเรื่องราวดี ๆ เสมอมา ขอให้ปีนี้เต็มไปด้วยรอยยิ้ม ความอบอุ่น และความสำเร็จในทุกก้าวที่ตั้งใจไว้",
    closingButtonCaption: "ชมการ์ดความทรงจำปิดท้าย",
    closingBadge: "Birthday Keepsake",
    closingTitle: "",
    wishMessage: "ขอให้ความปรารถนาดีทุกอย่างในค่ำคืนนี้สว่างไสวและเป็นจริงในเร็ววัน",
    audioUrl: "",
  });
  const [storylineModel, setStorylineModel] = useState<StorylineModel>(() => structuredClone(defaultStorylineModel));
  const [activeStep, setActiveStep] = useState(1);
  const [highlightedFieldId, setHighlightedFieldId] = useState<string | null>(null);
  const [focusedPreviewField, setFocusedPreviewField] = useState<{ id: string; label: string } | null>(null);
  const [previewRefreshToken, setPreviewRefreshToken] = useState(0);
  const selectedStrategy: TemplateSlug = resolveOptionStrategy(selectedTemplate, templateParam);
  const stepsToUse =
    selectedStrategy === "velvet-candle"
      ? VELVET_CANDLE_STEPS
      : selectedStrategy === "starlight-memories"
        ? STARLIGHT_MEMORIES_STEPS
        : selectedStrategy === "midnight-cinema"
          ? MIDNIGHT_CINEMA_STEPS
          : selectedStrategy === "new-year-grand-celebration"
            ? GRAND_NEW_YEAR_STEPS
            : selectedStrategy === "songkran-splendor"
              ? SONGKRAN_STEPS
              : selectedStrategy === "halloween-haunted-scroll"
                ? HALLOWEEN_STEPS
                : selectedStrategy === "vintage-wax-seal"
                  ? VINTAGE_WAX_STEPS
                  : selectedStrategy === "candles"
                    ? BLOW_CANDLES_STEPS
                    : selectedStrategy === "retro-y2k"
                      ? RETRO_Y2K_STEPS
                      : selectedStrategy === "love-os"
                        ? LOVE_OS_STEPS
                        : selectedStrategy === "pixel-gacha"
                          ? PIXEL_GACHA_STEPS
                          : selectedStrategy === "lunar-3d"
                            ? LUNAR_3D_STEPS
                            : selectedStrategy === "orbit-of-us"
                              ? ORBIT_OF_US_STEPS
                              : selectedStrategy === "storyline"
                          ? STORYLINE_STEPS
                          : EDITOR_STEPS;
  // Preview jumps to the screen whose step is currently active.
  const activeStepScreen = stepsToUse.find((s) => s.id === activeStep)?.screen ?? 1;

  const handleSelectField = useCallback((tabIndex: number, fieldId?: string) => {
    setActiveStep(tabIndex);
    if (fieldId) {
      setHighlightedFieldId(fieldId);
      setTimeout(() => {
        const el = document.getElementById(fieldId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          const target =
            el instanceof HTMLInputElement ||
              el instanceof HTMLTextAreaElement ||
              el instanceof HTMLSelectElement
              ? el
              : el.querySelector<HTMLElement>("input, textarea, select");
          target?.focus();
        }
      }, 60);
      setTimeout(() => {
        setHighlightedFieldId((curr) => (curr === fieldId ? null : curr));
      }, 2000);
    }
  }, []);

  const handleEditorFocusCapture = useCallback((event: React.SyntheticEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (
      !(
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.closest("[id^='field-']")
      )
    ) {
      return;
    }

    const fieldHost = target.id?.startsWith("field-")
      ? target
      : target.closest<HTMLElement>("[id^='field-']");
    const fieldId = fieldHost?.id;
    if (!fieldId) return;

    let label = "";
    const labelEl = target.closest("label") || fieldHost?.closest("label");
    if (labelEl) {
      const clone = labelEl.cloneNode(true) as HTMLElement;
      clone.querySelectorAll("input, textarea, select, button").forEach((n) => n.remove());
      label = (clone.textContent || "").replace(/\s+/g, " ").trim();
    }
    if (!label && fieldHost) {
      const heading = fieldHost.querySelector("label, p, span");
      if (heading) {
        label = (heading.textContent || "").replace(/\s+/g, " ").trim();
      }
    }
    if (!label && target instanceof HTMLInputElement && target.placeholder) {
      label = target.placeholder;
    }

    const cleanLabel = label.length > 42 ? `${label.slice(0, 40)}...` : label || "กำลังแก้ไข";
    setFocusedPreviewField({ id: fieldId, label: cleanLabel });
    window.dispatchEvent(
      new CustomEvent("sq-preview-focus", {
        detail: { fieldId, label: cleanLabel },
      })
    );
  }, []);

  const clearFocusedPreviewField = useCallback(() => {
    setFocusedPreviewField(null);
    window.dispatchEvent(new CustomEvent("sq-preview-focus", { detail: { fieldId: null, label: "" } }));
  }, []);

  const handleEditorBlurCapture = useCallback((event: React.FocusEvent<HTMLElement>) => {
    const nextTarget = event.relatedTarget as HTMLElement | null;
    if (!nextTarget) return;
    if (!event.currentTarget.contains(nextTarget) && !nextTarget.closest(".studio-live-preview")) {
      clearFocusedPreviewField();
    }
  }, [clearFocusedPreviewField]);

  useEffect(() => {
    if (!focusedPreviewField?.id) return;

    const handlePointerDownOutside = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const isFieldInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        Boolean(target.closest("[id^='field-']"));
      const enclosingLabel = target.closest("label");
      const isFieldLabel = Boolean(enclosingLabel?.querySelector("[id^='field-']"));
      const isPreviewEditable = Boolean(target.closest(".studio-live-preview [data-editable-field]"));

      if (isFieldInput || isFieldLabel || isPreviewEditable) return;

      clearFocusedPreviewField();
    };

    document.addEventListener("pointerdown", handlePointerDownOutside, true);
    return () => document.removeEventListener("pointerdown", handlePointerDownOutside, true);
  }, [focusedPreviewField?.id, clearFocusedPreviewField]);

  useEffect(() => {
    const previewRoot = document.querySelector<HTMLElement>(".studio-live-preview");
    if (!previewRoot) return;

    const clearHighlights = () => {
      previewRoot.querySelectorAll<HTMLElement>(".sq-preview-focus-ring, [data-sq-focused='true']").forEach((node) => {
        node.classList.remove("sq-preview-focus-ring");
        node.removeAttribute("data-sq-focused");
        node.removeAttribute("data-focus-label");
        node.removeAttribute("data-focus-inside");
        if (node.dataset.sqTempRel === "true") {
          node.style.position = "";
          delete node.dataset.sqTempRel;
        }
      });
    };

    clearHighlights();
    if (!focusedPreviewField?.id) return;

    const applyHighlight = (shouldScroll: boolean): boolean => {
      const targetEl = previewRoot.querySelector<HTMLElement>(
        `[data-editable-field="${focusedPreviewField.id}"]`
      );
      if (!targetEl) return false;

      clearHighlights();
      const computedPos = window.getComputedStyle(targetEl).position;
      if (computedPos === "static") {
        targetEl.style.position = "relative";
        targetEl.dataset.sqTempRel = "true";
      }

      const rect = targetEl.getBoundingClientRect();
      if (rect.height > 120 || rect.top < 120) {
        targetEl.setAttribute("data-focus-inside", "true");
      }

      const customLabel = targetEl.getAttribute("data-edit-label");
      targetEl.setAttribute("data-focus-label", customLabel || focusedPreviewField.label);
      targetEl.setAttribute("data-sq-focused", "true");
      targetEl.classList.add("sq-preview-focus-ring");
      if (shouldScroll) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      return true;
    };

    if (applyHighlight(true)) return;

    const observer = new MutationObserver(() => {
      if (applyHighlight(true)) {
        observer.disconnect();
      }
    });
    observer.observe(previewRoot, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-editable-field"],
    });

    const fallbackTimer = window.setTimeout(() => {
      applyHighlight(true);
      observer.disconnect();
    }, 1800);

    return () => {
      observer.disconnect();
      window.clearTimeout(fallbackTimer);
    };
  }, [focusedPreviewField, activeStepScreen, selectedStrategy]);

  const activeConfig = selectedStrategy === "storyline"
    ? {
      storylineModel: {
        ...storylineModel,
        meta: { ...storylineModel.meta, title: cardTitle || storylineModel.meta.title },
        recipient: {
          ...storylineModel.recipient,
          name: recipientName || storylineModel.recipient.name,
          passcode: storylineModel.recipient.passcode,
        },
      },
    }
    : selectedStrategy === "candles"
      ? {
        recipientName,
        senderName: candleConfig.senderName.trim() || FALLBACK_SENDER_NAME,
        introHeadline: candleConfig.introHeadline,
        introPrompt: candleConfig.introPrompt,
        introButtonCaption: candleConfig.introButtonCaption,
        blowingHeadline: candleConfig.blowingHeadline,
        celebrationHeadline: candleConfig.celebrationHeadline,
        celebrationHint: candleConfig.celebrationHint,
        revealButtonCaption: candleConfig.revealButtonCaption,
        letterTitle: candleConfig.letterTitle.trim() || undefined,
        message: candleConfig.letterMessage,
        closingButtonCaption: candleConfig.closingButtonCaption,
        closingBadge: candleConfig.closingBadge,
        closingTitle: candleConfig.closingTitle.trim() || undefined,
        wishMessage: candleConfig.wishMessage,
        audio_url: candleConfig.audioUrl.trim() || undefined,
        photos: candlePhotos.filter(Boolean).map((src) => ({ src })),
        videoUrl: candleVideoUrl.trim() || undefined,
      }
      : (selectedStrategy === "starlight-memories" || selectedStrategy === "velvet-candle" || selectedStrategy === "vintage-wax-seal")
        ? {
          ...surpriseQRData,
          title: cardTitle || surpriseQRData.content.title,
          recipientName: recipientName || surpriseQRData.content.menu.subTitle,
          content: {
            ...surpriseQRData.content,
            title: cardTitle || surpriseQRData.content.title,
            menu: {
              ...surpriseQRData.content.menu,
              subTitle: recipientName || surpriseQRData.content.menu.subTitle,
            },
          },
        }
        : surpriseQRData;

  useEffect(() => {
    if (!focusedPreviewField?.id) return;
    const previewRoot = document.querySelector<HTMLElement>(".studio-live-preview");
    if (!previewRoot) return;
    const targetEl = previewRoot.querySelector<HTMLElement>(
      `[data-editable-field="${focusedPreviewField.id}"]`
    );
    if (!targetEl) return;
    if (!targetEl.classList.contains("sq-preview-focus-ring")) {
      const customLabel = targetEl.getAttribute("data-edit-label");
      targetEl.setAttribute("data-focus-label", customLabel || focusedPreviewField.label);
      targetEl.setAttribute("data-sq-focused", "true");
      targetEl.classList.add("sq-preview-focus-ring");
    }
  }, [activeConfig, focusedPreviewField]);

  const PreviewComponent = getTemplateComponent(selectedStrategy);

  if (selectedTemplate && !PreviewComponent) {
    setError(`ไม่พบคอมโพเนนต์สำหรับเทมเพลต "${selectedTemplate.name}" (${selectedTemplate.id})`);
  }

  useEffect(() => {
    setPreviewRefreshToken((token) => token + 1);
  }, [activeStep]);
  const [previewImageUrl] = useState<string | null>(null);
  const [previewAudioUrl] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [guestCreated, setGuestCreated] = useState(false);
  const [editingGuestCardId, setEditingGuestCardId] = useState<string | null>(null);
  const [showCreationSummary, setShowCreationSummary] = useState(false);
  const [usePermanentQuota, setUsePermanentQuota] = useState(true);
  const [usePremiumQuota, setUsePremiumQuota] = useState(true);
  const [customSlug, setCustomSlug] = useState("");
  const [isEditingActive, setIsEditingActive] = useState(false);
  const blurTimeoutRef = useRef<number | null>(null);
  const [envelopeStyle, setEnvelopeStyle] = useState<1 | 2 | 3 | 4>(surpriseQRData.settings.envelopeStyle || 1);
  const [envelopeColor, setEnvelopeColor] = useState<string>(surpriseQRData.settings.envelopeColor || "#b02f63");
  // Full-screen Live Preview modal (desktop viewport) rendering the selected
  // template component in its recipient-facing mode (isEditing={false}).
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false);
  const baselineSigRef = useRef<string | null>(null);
  const historyGuardPushedRef = useRef(false);
  const bypassLeaveGuardRef = useRef(false);

  const currentEditSig = useMemo(
    () =>
      JSON.stringify(
        {
          templateId: selectedTemplate?.id ?? "",
          cardTitle,
          recipientName,
          pinCode,
          scenes,
          envelopeStyle,
          envelopeColor,
          candlePhotos,
          candleVideoUrl,
          candleConfig,
          surpriseQRData,
          storylineModel,
        },
        (_key, val) =>
          typeof val === "string" && val.length > 200 && val.startsWith("data:")
            ? `${val.slice(0, 48)}#${val.length}#${val.slice(-16)}`
            : val,
      ),
    [
      selectedTemplate?.id,
      cardTitle,
      recipientName,
      pinCode,
      scenes,
      envelopeStyle,
      envelopeColor,
      candlePhotos,
      candleVideoUrl,
      candleConfig,
      surpriseQRData,
      storylineModel,
    ]
  );

  useEffect(() => {
    baselineSigRef.current = null;
  }, [selectedTemplate?.id]);

  useEffect(() => {
    if (!selectedTemplate || baselineSigRef.current !== null) return;
    const timer = window.setTimeout(() => {
      baselineSigRef.current = currentEditSig;
    }, 300);
    return () => window.clearTimeout(timer);
  }, [selectedTemplate, currentEditSig]);

  const hasUnsavedChanges =
    !bypassLeaveGuardRef.current &&
    baselineSigRef.current !== null &&
    currentEditSig !== baselineSigRef.current;

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (hasUnsavedChanges && !historyGuardPushedRef.current) {
      window.history.pushState({ sqUnsavedGuard: true }, "");
      historyGuardPushedRef.current = true;
    }
    const onPopState = () => {
      if (bypassLeaveGuardRef.current || !hasUnsavedChanges) return;
      window.history.pushState({ sqUnsavedGuard: true }, "");
      setShowLeaveConfirmModal(true);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [hasUnsavedChanges]);

  const handleBackToDashboard = () => {
    if (hasUnsavedChanges) {
      setShowLeaveConfirmModal(true);
      return;
    }
    router.push("/dashboard");
  };

  const confirmLeaveWithoutSaving = () => {
    bypassLeaveGuardRef.current = true;
    setShowLeaveConfirmModal(false);
    router.push("/dashboard");
  };

  useEffect(() => {
    setSurpriseQRData((current) => ({
      ...current,
      settings: { ...current.settings, envelopeStyle, envelopeColor },
    }));
  }, [envelopeStyle, envelopeColor]);

  const handleEditingStart = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setIsEditingActive(true);
  };

  const handleEditingEnd = () => {
    blurTimeoutRef.current = window.setTimeout(() => {
      setIsEditingActive(false);
    }, 150);
  };

  // Sync the card title into the Anniversary Surprise preview config so the
  // embedded title updates in real-time while the user types.
  useEffect(() => {
    setSurpriseQRData((current) => ({
      ...current,
      content: {
        ...current.content,
        title: cardTitle || current.content.title,
      },
    }));
  }, [cardTitle]);

  // --- Unified payable calculation ------------------------------------------
  // Single source of truth shared by the bottom price bar, the payment summary
  // modal and the submitted payload: Payable = [Template Cost] + [Storage Cost].
  const premiumTemplate = !!selectedTemplate?.is_premium;
  const templatePrice = Number(selectedTemplate?.cost ?? 0);
  const storagePrice =
    selectedStorage.type === "permanent"
      ? (userTier === "god" || userTier === "vip" ? 0 : 25)
      : 0;
  // The quota radio applies whenever the template `is_premium`. It is disabled
  // when there are no remaining quota slots (premiumQuota <= 0).
  const templateHasFreeQuota = premiumTemplate && premiumQuota > 0;
  const canUsePremiumQuota = templateHasFreeQuota && usePremiumQuota;
  const templatePayable = canUsePremiumQuota ? 0 : templatePrice;
  const storageHasFreeQuota =
    selectedStorage.type === "permanent" &&
    userTier !== "god" &&
    userTier !== "vip" &&
    permanentQuota > 0;
  const canUsePermanentQuota = storageHasFreeQuota && usePermanentQuota;
  const storagePayable = canUsePermanentQuota ? 0 : storagePrice;
  const summaryCost = templatePayable + storagePayable;
  const hasEnoughCredits = userCredits >= summaryCost;
  const summaryCanAfford = hasEnoughCredits;
  const permanentIsFree = permanentQuota > 0 || userTier === "god" || userTier === "vip";
  const showsNames = true;
  const canSubmit = !isSubmitting && selectedTemplate !== null;

  // Close the full-screen preview with Escape while it is open.
  useEffect(() => {
    if (!showPreviewModal) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowPreviewModal(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showPreviewModal]);

  // Re-fetch profile/credits/quota so the UI instantly reflects deducted
  // balances (premium_quota, permanent_quota, credits) after card creation.
  const refreshUserAccount = useCallback(async () => {
    try {
      const response = await fetch("/api/user/credits", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        setUserCredits(Number(data.credits ?? 0));
        setPermanentQuota(Number(data.permanent_card_quota ?? 0));
        setPremiumQuota(Number(data.premium_template_quota ?? 0));
        setUserTier(data.tier || "free");
        setIsAuthenticated(data.isGuest !== true);
      }
    } catch {
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    async function fetchUserData() {
      await refreshUserAccount();

      try {
        const res = await fetch("/api/templates/list");
        if (res.ok) {
          const unified = (await res.json()) as UnifiedTemplate[];
          if (Array.isArray(unified)) {
            const remoteOptions = unified.map(mapUnifiedToOption);
            setTemplateOptions(buildCreationOptions(remoteOptions));
          }
        }
      } catch {
        // Static-catalog fallback: no remote templates returned, use built-in Anniversary Surprise.
        setTemplateOptions(buildCreationOptions([]));
      }

      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!saved) return;
      try {
        const draft = JSON.parse(saved);
        setCardTitle(draft.cardTitle || "");
        setRecipientName(draft.recipientName || "");
        setScenes(draft.scenes || scenes);
        setSelectedStorage(draft.selectedStorage || storageOptions[0]);
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
    }

    fetchUserData();
    return () => {
      if (previewImageUrl) URL.revokeObjectURL(previewImageUrl);
      if (previewAudioUrl) URL.revokeObjectURL(previewAudioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedStorage.type === "permanent") {
      setSelectedStorage((current) => ({ ...current, cost: permanentIsFree ? 0 : 25 }));
    }
  }, [permanentIsFree, selectedStorage.type]);

  useEffect(() => {
    if (templateOptions.length === 0) return;
    const templateParam = searchParams.get("template");

    // Find template by direct UUID match OR slug/title keywords
    let found = templateOptions.find((t) => {
      if (!templateParam) return false;

      const param = templateParam.toLowerCase();
      const tId = String(t.id || "").toLowerCase();
      const sysId = String(t.systemDef?.id || "").toLowerCase();
      // DashboardTemplateOption carries the human label in `name` (it has no
      // `title` field); static-catalog defs expose their own `title`.

      // 1. Direct match with raw templateParam UUID or ID
      if (tId === param || sysId === param) return true;

      // 2. Slug-alias match against the static template catalog
      if (getTemplateSlugById(param)) {
        if (getTemplateSlugById(tId) === getTemplateSlugById(param)) return true;
        if (sysId && getTemplateSlugById(sysId) === getTemplateSlugById(param)) return true;
      }

      return false;
    });

    if (!found) found = templateOptions[0] ?? null;
    if (found) {
      setSelectedTemplate(found);
      const slug = getTemplateSlugById(found.id) ?? getTemplateSlugById(found.systemDef?.id);
      if (slug === "velvet-candle") {
        setCardTitle((curr) => (!curr || curr === "Happy Anniversary, Love !") ? "Happy Birthday" : curr);
        setSurpriseQRData((prev) => {
          if (!prev || prev === defaultSurpriseQRData || prev.content?.title === "Happy Anniversary, Love !") {
            return structuredClone(defaultVelvetCandleData);
          }
          return prev;
        });
      }
      if (slug === "starlight-memories") {
        setCardTitle((curr) => (!curr || curr === "Happy Anniversary, Love !") ? "Starlight Memories" : curr);
        setSurpriseQRData((prev) => {
          if (!prev || prev === defaultSurpriseQRData || prev.content?.title === "Happy Anniversary, Love !") {
            return structuredClone(defaultStarlightMemoriesData);
          }
          return prev;
        });
      }
      if (slug === "midnight-cinema") {
        setCardTitle((curr) => (!curr || curr === "Happy Anniversary, Love !") ? "Midnight Cinema 35mm" : curr);
        setSurpriseQRData((prev) => {
          if (!prev || prev === defaultSurpriseQRData || prev.content?.title === "Happy Anniversary, Love !") {
            return structuredClone(defaultMidnightCinemaData);
          }
          return prev;
        });
      }
      if (slug === "new-year-grand-celebration") {
        setCardTitle((curr) => (!curr || curr === "Happy Anniversary, Love !") ? "Grand New Year Celebration" : curr);
        setSurpriseQRData((prev) => {
          if (!prev || prev === defaultSurpriseQRData || prev.content?.title === "Happy Anniversary, Love !") {
            return structuredClone(defaultGrandNewYearData);
          }
          return prev;
        });
      }
      if (slug === "songkran-splendor") {
        setCardTitle((curr) => (!curr || curr === "Happy Anniversary, Love !") ? "Songkran Splendor" : curr);
        setSurpriseQRData((prev) => {
          if (!prev || prev === defaultSurpriseQRData || prev.content?.title === "Happy Anniversary, Love !") {
            return structuredClone(defaultSongkranSplendorData);
          }
          return prev;
        });
      }
      if (slug === "halloween-haunted-scroll") {
        setCardTitle((curr) => (!curr || curr === "Happy Anniversary, Love !") ? "Midnight Haunted Abyss" : curr);
        setSurpriseQRData((prev) => {
          if (!prev || prev === defaultSurpriseQRData || prev.content?.title === "Happy Anniversary, Love !") {
            return structuredClone(defaultHalloweenHauntedData);
          }
          return prev;
        });
      }
      if (slug === "love-os") {
        setCardTitle((curr) => (!curr || curr === "Happy Anniversary, Love !") ? "My Favorite Person" : curr);
        setSurpriseQRData((prev) => {
          if (!prev || prev === defaultSurpriseQRData || prev.content?.title === "Happy Anniversary, Love !") {
            return structuredClone(defaultLoveOsData);
          }
          return prev;
        });
      }
      if (slug === "pixel-gacha") {
        setCardTitle((curr) => (!curr || curr === "Happy Anniversary, Love !") ? "MEMORY GACHA" : curr);
        setSurpriseQRData((prev) => {
          if (!prev || prev === defaultSurpriseQRData || prev.content?.title === "Happy Anniversary, Love !") {
            return structuredClone(defaultPixelGachaData);
          }
          return prev;
        });
      }
      if (slug === "lunar-3d") {
        setCardTitle((curr) => (!curr || curr === "Happy Anniversary, Love !") ? "The Secret Behind The Moon" : curr);
        setSurpriseQRData((prev) => {
          if (!prev || prev === defaultSurpriseQRData || prev.content?.title === "Happy Anniversary, Love !") {
            return structuredClone(defaultLunar3DData);
          }
          return prev;
        });
      }
      if (slug === "orbit-of-us") {
        setCardTitle((curr) => (!curr || curr === "Happy Anniversary, Love !") ? "Orbit of Us" : curr);
        setSurpriseQRData((prev) => {
          if (!prev || prev === defaultSurpriseQRData || prev.content?.title === "Happy Anniversary, Love !") {
            return structuredClone(defaultOrbitOfUsData);
          }
          return prev;
        });
      }
      if (slug === "vintage-wax-seal") {
        setCardTitle((curr) => (!curr || curr === "Happy Anniversary, Love !") ? "To Someone Special" : curr);
        setSurpriseQRData((prev) => {
          if (!prev || prev === defaultSurpriseQRData || prev.content?.title === "Happy Anniversary, Love !") {
            return structuredClone(defaultVintageWaxSealData);
          }
          return prev;
        });
      }
      if (found.systemDef === undefined) {
        const sysDef = getTemplateById(found.id, found.name);
        if (sysDef) {
          setSelectedTemplate((cur) =>
            cur?.id === found!.id
              ? { ...cur, systemDef: sysDef, cost: cur.cost ?? sysDef.priceCredits }
              : cur,
          );
        }
      }
    }
    const guestCardId = searchParams.get("guest_card");
    if (guestCardId && typeof window !== "undefined") {
      const guestCards = JSON.parse(localStorage.getItem(GUEST_CARDS_KEY) || "[]") as Array<{ id: string; recipient_name: string; sender_name: string; message: string; pin_code: string | null; template_id: string }>;
      const guestCard = guestCards.find((card) => card.id === guestCardId);
      if (guestCard) {
        setEditingGuestCardId(guestCard.id);
        setRecipientName(guestCard.recipient_name);
        setPinCode(guestCard.pin_code || "");
        setScenes((current) => current.map((scene, index) => index === 0 ? { ...scene, body: guestCard.message } : scene));
      }
    }
  }, [router, searchParams, templateOptions]);

  function saveDraftToStorage() {
    localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({
        cardTitle,
        recipientName,
        scenes,
        selectedStorage,
        savedAt: new Date().toISOString(),
      }),
    );
  }

  /** Point one of the template's image slots at a new URL / data-URL. */
  function setSurpriseQRImage(
    target: "letterHeader" | "filmstrip" | "polaroid" | "accent" | "hero",
    index: number,
    src: string,
  ) {
    const mapAt = (items: SurpriseQRMedia[], i: number): SurpriseQRMedia[] =>
      items.map((item, idx) => (idx === i ? { ...item, src } : item));
    setSurpriseQRData((current) => {
      if (target === "letterHeader") {
        return {
          ...current,
          content: {
            ...current.content,
            letter: {
              ...current.content.letter,
              headerImages: mapAt(current.content.letter.headerImages, index),
            },
          },
        };
      }
      if (target === "filmstrip") {
        return {
          ...current,
          content: {
            ...current.content,
            memories: {
              ...current.content.memories,
              filmstripImages: mapAt(current.content.memories.filmstripImages, index),
            },
          },
        };
      }
      if (target === "polaroid") {
        return {
          ...current,
          content: {
            ...current.content,
            memories: {
              ...current.content.memories,
              polaroidImages: mapAt(current.content.memories.polaroidImages, index),
            },
          },
        };
      }
      if (target === "accent") {
        return {
          ...current,
          content: {
            ...current.content,
            songMedia: {
              ...current.content.songMedia,
              accentImages: mapAt(current.content.songMedia.accentImages, index),
            },
          },
        };
      }
      return {
        ...current,
        content: {
          ...current.content,
          finale: {
            ...current.content.finale,
            heroImage: { ...current.content.finale.heroImage, src },
          },
        },
      };
    });
  }

  function buildPayload() {
    const templateId = selectedTemplate?.id ?? "anniversary-surprise";
    const base = {
      title: cardTitle || recipientName || "Untitled Card",
      templateId,
      template: templateId,
      slug: `${(cardTitle || recipientName || "untitled-card").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    };

    if (selectedStrategy === "candles") {
      const candlePayload = {
        recipientName,
        senderName: candleConfig.senderName.trim() || FALLBACK_SENDER_NAME,
        introHeadline: candleConfig.introHeadline,
        introPrompt: candleConfig.introPrompt,
        introButtonCaption: candleConfig.introButtonCaption,
        blowingHeadline: candleConfig.blowingHeadline,
        celebrationHeadline: candleConfig.celebrationHeadline,
        celebrationHint: candleConfig.celebrationHint,
        revealButtonCaption: candleConfig.revealButtonCaption,
        letterTitle: candleConfig.letterTitle.trim() || undefined,
        message: candleConfig.letterMessage,
        closingButtonCaption: candleConfig.closingButtonCaption,
        closingBadge: candleConfig.closingBadge,
        closingTitle: candleConfig.closingTitle.trim() || undefined,
        wishMessage: candleConfig.wishMessage,
        audio_url: candleConfig.audioUrl.trim() || undefined,
        photos: candlePhotos.filter(Boolean).map((src) => ({ src })),
        videoUrl: candleVideoUrl.trim() || undefined,
      };
      return {
        ...base,
        audioUrl: candleConfig.audioUrl.trim() || undefined,
        content: {
          templateId,
          ...candlePayload,
        },
        config: candlePayload,
      };
    }

    if (selectedStrategy === "storyline") {
      const storyConfig: StorylineModel = {
        ...storylineModel,
        meta: { ...storylineModel.meta, title: cardTitle || storylineModel.meta.title },
        recipient: {
          ...storylineModel.recipient,
          name: recipientName || storylineModel.recipient.name,
          passcode: storylineModel.recipient.passcode,
        },
      };
      return {
        ...base,
        title: cardTitle || storylineModel.meta.title || base.title,
        content: { templateId, storylineModel: storyConfig },
        config: { storylineModel: storyConfig },
      };
    }

    // Starlight Memories & Anniversary Surprise persist the full spec schema verbatim.
    const mergedSurpriseData = {
      ...surpriseQRData,
      title: cardTitle || surpriseQRData.content.title,
      recipientName: recipientName || surpriseQRData.content.menu.subTitle,
      content: {
        ...surpriseQRData.content,
        title: cardTitle || surpriseQRData.content.title,
        menu: {
          ...surpriseQRData.content.menu,
          subTitle: recipientName || surpriseQRData.content.menu.subTitle,
        },
      },
    };

    return {
      ...base,
      title: cardTitle || surpriseQRData.content.title || recipientName || base.title,
      content: {
        templateId,
        recipientName,
        title: cardTitle || surpriseQRData.content.title,
        settings: { ...surpriseQRData.settings },
        content: mergedSurpriseData.content,
        config: mergedSurpriseData,
      },
      config: mergedSurpriseData,
    };
  }

  async function submitCard(isDraft = false, confirmed = false) {
    if (!selectedTemplate) {
      setError("กำลังโหลดรายการเทมเพลต กรุณารอสักครู่");
      return;
    }
    // Only Storyline, Anniversary Surprise, and Vintage Wax Seal (when enabled) store a PIN.
    const effectivePin = selectedStrategy === "storyline"
      ? storylineModel.recipient.passcode
      : (selectedStrategy === "anniversary-surprise" || selectedStrategy === "vintage-wax-seal") && surpriseQRData.settings.enablePin
        ? surpriseQRData.settings.pinCode
        : "";
    if (selectedStrategy === "vintage-wax-seal" && surpriseQRData.settings.enablePin && !/^\d{4}$/.test(effectivePin)) {
      setError("กรุณากรอกรหัสลับเปิดผนึก PIN 4 หลักเป็นตัวเลข (เช่น 1234)");
      return;
    }
    if (selectedStrategy === "storyline" && !/^\d{4}$/.test(effectivePin)) {
      setError("กรุณากำหนดรหัสผ่าน Storyline เป็นตัวเลข 4 หลัก");
      return;
    }
    if (selectedStrategy === "storyline" && !/^\d{4}-\d{2}-\d{2}$/.test(storylineModel.finale.anniversaryDate)) {
      setError("กรุณาเลือกวันครบรอบสำหรับฉากสุดท้ายของ Storyline");
      return;
    }
    const trimmedPin = effectivePin.trim();
    if (trimmedPin && (trimmedPin.length < 4 || trimmedPin.length > 8)) {
      setError("กรุณากรอกรหัส PIN ให้มีความยาวระหว่าง 4 ถึง 8 หลัก");
      return;
    }
    if (!isDraft && !confirmed && isAuthenticated) {
      setShowCreationSummary(true);
      return;
    }
    if (!isAuthenticated && !isDraft) {
      const guestIds = JSON.parse(localStorage.getItem(GUEST_CARD_IDS_KEY) || "[]") as string[];
      if ((selectedTemplate?.cost ?? 0) > 0 || selectedStorage.type === "permanent") {
        setShowAuthModal(true);
        return;
      }

      if (editingGuestCardId) {
        const guestCards = JSON.parse(localStorage.getItem(GUEST_CARDS_KEY) || "[]") as Array<Record<string, unknown> & { id: string }>;
        const updatedCards = guestCards.map((card) => card.id === editingGuestCardId
          ? { ...card, recipient_name: recipientName, message: scenes.map((scene) => scene.body).filter(Boolean).join("\n\n"), pin_code: pinCode || null }
          : card);
        localStorage.setItem(GUEST_CARDS_KEY, JSON.stringify(updatedCards));
        bypassLeaveGuardRef.current = true;
        baselineSigRef.current = currentEditSig;
        setGuestCreated(true);
        window.setTimeout(() => router.push("/dashboard"), 1800);
        return;
      }
      if (guestIds.length >= 2) {
        setShowAuthModal(true);
        return;
      }

      const id = crypto.randomUUID();
      const guestCard = {
        id,
        user_id: null,
        template_id: selectedTemplate!.id,
        recipient_name: recipientName || "ผู้รับ",
        sender_name: FALLBACK_SENDER_NAME,
        message: scenes.map((scene) => scene.body).filter(Boolean).join("\n\n"),
        image_url: previewImageUrl,
        image_1: null,
        image_2: null,
        audio_url: previewAudioUrl,
        pin_code: effectivePin.trim() || null,
        hash_id: id,
        expiry_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        unlock_at: null,
        view_count: 0,
        template_cost: 0,
        storage_type: "14_days",
        storage_cost: 0,
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        is_permanent: false,
        custom_slug: null,
        has_watermark: false,
        created_at: new Date().toISOString(),
      };
      localStorage.setItem(
        GUEST_CARD_IDS_KEY,
        JSON.stringify([id, ...guestIds.filter((existingId) => existingId !== id)])
      );
      const guestCards = JSON.parse(localStorage.getItem(GUEST_CARDS_KEY) || "[]") as typeof guestCard[];
      localStorage.setItem(
        GUEST_CARDS_KEY,
        JSON.stringify([guestCard, ...guestCards.filter((card) => card.id !== id)])
      );
      bypassLeaveGuardRef.current = true;
      baselineSigRef.current = currentEditSig;
      setGuestCreated(true);
      window.setTimeout(() => router.push("/dashboard"), 1800);
      return;
    }
    if (!isAuthenticated) {
      saveDraftToStorage();
      router.push("/login?redirect=/dashboard/create");
      return;
    }
    if (!isDraft && isAuthenticated && !hasEnoughCredits) {
      setError("ยอดเงินคงเหลือไม่เพียงพอ กรุณาเติมเงินเพื่อดำเนินการต่อ");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const payload = buildPayload();
      const formData = new FormData();
      formData.append("title", payload.title);
      formData.append("template", selectedTemplate!.id);
      formData.append("template_id", selectedTemplate!.id);
      formData.append("templateId", selectedTemplate!.id);
      formData.append("slug", payload.slug);
      formData.append("content", JSON.stringify(payload.content));
      formData.append("config", JSON.stringify(payload.config));
      formData.append("expires_at", payload.expires_at);
      formData.append("recipient_name", recipientName);
      formData.append("sender_name", FALLBACK_SENDER_NAME);
      formData.append("pin_code", effectivePin.trim());
      formData.append("template_cost", templatePayable.toString());
      formData.append("storage_type", selectedStorage.type);
      formData.append("storage_cost", storagePayable.toString());
      formData.append("use_premium_quota", premiumTemplate && canUsePremiumQuota ? "true" : "false");
      formData.append("use_permanent_quota", canUsePermanentQuota ? "true" : "false");
      if (customSlug.trim()) formData.append("custom_slug", customSlug.trim());
      if (selectedTemplate?.id !== "anniversary-surprise") {
        formData.append("scenes", JSON.stringify(scenes));
      }
      formData.append("is_draft", isDraft ? "true" : "false");
      formData.append("is_guest", "false");

      const response = await fetch("/api/cards/create", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.error || "ไม่สามารถสร้างการ์ดได้");
        return;
      }
      // Card created: re-fetch profile/credits/quota so the UI immediately
      // reflects the consumed premium_quota / permanent_quota / credits.
      await refreshUserAccount();
      bypassLeaveGuardRef.current = true;
      baselineSigRef.current = currentEditSig;
      router.push(isAuthenticated ? "/dashboard" : "/");
    } catch {
      setError("ไม่สามารถสร้างการ์ดได้ กรุณาลองใหม่");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#06030c] px-4 py-5 text-slate-100">
      <div className="w-full max-w-[1800px] mx-auto px-4 lg:px-6 py-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <header className="mb-5 flex items-center justify-between gap-4 text-slate-100 lg:col-span-12">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-rose-400" />
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-rose-300">
                SurpriseQR Studio
              </p>
              <h1 className="text-2xl font-black">สร้างการ์ดเซอร์ไพรส์</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={handleBackToDashboard}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-base font-bold text-slate-200 transition-colors hover:bg-white/20 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> กลับแดชบอร์ด
          </button>
        </header>

        <section className="glass-panel w-full self-start rounded-3xl border border-purple-900/30 bg-[#0d071b]/80 p-4 shadow-lg shadow-black/20 backdrop-blur-md overflow-hidden lg:sticky lg:top-4 lg:col-span-6 lg:max-h-[calc(100vh-2rem)] lg:flex lg:flex-col">
          <div className="flex h-full w-full flex-col">
            <div className="glass-panel flex h-full flex-col overflow-hidden rounded-3xl border-space-border shadow-xl backdrop-blur-xl">
              <div className="shrink-0 border-b border-space-border px-5 py-4 text-slate-100">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-space-accent">
                      Live Preview
                    </p>
                    <p className="mt-1 text-base font-medium text-slate-300">
                      การเปลี่ยนแปลงจะแสดงทันที
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {focusedPreviewField && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-200 shadow-sm max-w-[200px] sm:max-w-[260px] truncate">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400 animate-pulse" />
                        <span className="truncate">กำลังชี้จุด: {focusedPreviewField.label}</span>
                      </span>
                    )}
                    <button type="button" onClick={() => setShowPreviewModal(true)} className="rounded-xl border border-space-border bg-white/10 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-white/20">ดูตัวอย่างเต็มจอ</button>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div
                  className={`studio-live-preview relative h-[380px] sm:h-[480px] md:h-[540px] lg:h-[calc(100vh-11rem)] overflow-y-auto pr-2 custom-scrollbar rounded-2xl border border-slate-800 bg-[#06030c] transition-opacity duration-500 hover:opacity-100 ${isEditingActive ? "opacity-100" : "opacity-70"
                    }`}
                >
                  {PreviewComponent && !showPreviewModal && (
                    <PreviewComponent
                      config={activeConfig}
                      isEditing
                      studio
                      activeScreen={activeStepScreen}
                      refreshToken={previewRefreshToken}
                      onSelectField={handleSelectField}
                    />
                  )}
                </div>
                <PreviewWatermark />
              </div>
            </div>
          </div>
        </section>

        <div className="lg:col-span-6 space-y-4 pr-2 custom-scrollbar lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          {/* Step navigation — drives both the preview screen and the visible form fields. */}
          <nav
            aria-label="ขั้นตอนการสร้างการ์ด"
            className="sticky top-2 z-10 flex items-center gap-1.5 overflow-x-auto no-scrollbar rounded-2xl border border-white/10 bg-[#0d071b]/95 p-2 shadow-lg shadow-black/20 backdrop-blur-md"
          >
            {stepsToUse.map((step) => {
              const Icon = step.icon;
              const isActive = activeStep === step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStep(step.id)}
                  aria-current={isActive ? "step" : undefined}
                  aria-controls={`editor-step-panel-${step.id}`}
                  aria-label={`ขั้นตอน ${step.id}: ${step.label}`}
                  className={`inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-2 text-sm font-bold transition-all ${isActive
                    ? selectedStrategy === "velvet-candle" || selectedStrategy === "midnight-cinema" || selectedStrategy === "new-year-grand-celebration" || selectedStrategy === "vintage-wax-seal"
                      ? "border-amber-400 bg-amber-500/25 text-amber-200 shadow-sm shadow-amber-500/30 ring-1 ring-amber-400/40"
                      : selectedStrategy === "songkran-splendor"
                        ? "border-cyan-400 bg-cyan-500/25 text-cyan-200 shadow-sm shadow-cyan-500/30 ring-1 ring-cyan-400/40"
                        : selectedStrategy === "halloween-haunted-scroll"
                          ? "border-orange-400 bg-orange-500/25 text-orange-200 shadow-sm shadow-orange-500/30 ring-1 ring-orange-400/40"
                          : selectedStrategy === "starlight-memories"
                            ? "border-violet-400 bg-violet-500/25 text-violet-200 shadow-sm shadow-violet-500/30 ring-1 ring-violet-400/40"
                            : "border-fuchsia-500 bg-fuchsia-500/20 text-white"
                    : "border-space-border bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  <span className="hidden sm:inline">{step.id}</span>
                  <span className="hidden xl:inline">{step.label}</span>
                </button>
              );
            })}
            <span className="ml-auto inline-flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPreviewRefreshToken((token) => token + 1)}
                aria-label="อัพเดตพรีวิว (บังคับรีเฟรช)"
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-space-border bg-white/5 px-2.5 py-2 text-sm font-bold text-slate-200 transition-colors hover:bg-white/10"
              >
                <RefreshCw aria-hidden="true" className="h-4 w-4" />
                <span className="hidden lg:inline">อัพเดตพรีวิว</span>
              </button>
            </span>
          </nav>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitCard();
            }}
            className="space-y-5"
          >

            {selectedStrategy === "anniversary-surprise" && activeStep === 1 && (
              <section id="editor-step-panel-1" aria-labelledby="card-info-heading" className="rounded-2xl border border-white/10 bg-[#120a21]/80 p-5">
                <div className="mb-5 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-fuchsia-400" />
                  <h2 id="card-info-heading" className="text-xl font-bold text-slate-100">ข้อมูลการ์ด</h2>
                </div>
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-yellow-400">หมายเหตุ: หากไม่ต้องการให้แสดงข้อความในจุดใด ให้ใส่เว้นวรรค (Spacebar) 1 ครั้งในช่องนั้น</span>
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-base font-semibold text-slate-200">
                    ชื่อการ์ด
                    <input
                      value={cardTitle}
                      onChange={(event) => setCardTitle(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                      placeholder="เช่น เซอร์ไพรส์วันเกิด"
                    />
                  </label>
                  {showsNames && (
                    <>
                      <label className="text-base font-semibold text-slate-200">
                        ชื่อผู้รับ
                        <input
                          value={recipientName}
                          onChange={(event) => setRecipientName(event.target.value)}
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                          placeholder="สำหรับใคร"
                        />
                      </label>
                    </>
                  )}
                  <div className="md:col-span-2">
                    <p className="mb-2 text-base font-semibold text-slate-200">รูปแบบซองจดหมาย</p>
                    <div className="flex flex-wrap items-center gap-3">
                      {([1, 2, 3, 4] as const).map((style) => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => setEnvelopeStyle(style)}
                          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition-colors ${envelopeStyle === style
                            ? "border-fuchsia-500 bg-fuchsia-500/20 text-white"
                            : "border-space-border bg-white/5 text-slate-300 hover:bg-white/10"
                            }`}
                        >
                          <Mail className="h-4 w-4" />
                          {style === 1 && "Classic Pink"}
                          {style === 2 && "Gold Premium"}
                          {style === 3 && "Soft Lavender"}
                          {style === 4 && "ปรับสีเอง"}
                        </button>
                      ))}
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-space-border bg-slate-950/60 px-3 py-1.5 text-sm font-semibold text-slate-200 hover:border-fuchsia-500/60">
                        <input
                          type="color"
                          aria-label="เลือกสีซองจดหมาย"
                          value={envelopeColor}
                          onChange={(event) => {
                            setEnvelopeColor(event.target.value);
                            setEnvelopeStyle(4);
                          }}
                          className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
                        />
                        <span className="font-mono text-xs uppercase text-slate-300">{envelopeColor}</span>
                      </label>
                    </div>
                    {envelopeStyle === 4 && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-slate-400">โทนสีแนะนำ:</span>
                        {[
                          { label: "โรสพิงก์", hex: "#b02f63" },
                          { label: "แดงไวน์", hex: "#9f1239" },
                          { label: "สกายบลู", hex: "#2563eb" },
                          { label: "มรกต", hex: "#059669" },
                          { label: "ม่วงเข้ม", hex: "#7c3aed" },
                          { label: "ช็อกโกแลต", hex: "#78350f" },
                        ].map((preset) => (
                          <button
                            key={preset.hex}
                            type="button"
                            onClick={() => {
                              setEnvelopeColor(preset.hex);
                              setEnvelopeStyle(4);
                            }}
                            title={preset.label}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all ${envelopeColor.toLowerCase() === preset.hex
                                ? "border-white bg-white/15 text-white"
                                : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"
                              }`}
                          >
                            <span className="h-3 w-3 rounded-full border border-white/40" style={{ backgroundColor: preset.hex }} />
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            <section
              className="rounded-2xl border border-white/10 bg-[#120a21]/80 p-5"
              onFocusCapture={handleEditorFocusCapture}
              onClickCapture={handleEditorFocusCapture}
              onBlurCapture={handleEditorBlurCapture}
            >
              <div className="mb-5 flex items-center gap-2">
                <Cake className="h-5 w-5 text-amber-400" />
                <h2 className="text-xl font-bold text-slate-100">
                  {selectedStrategy === "velvet-candle"
                    ? "Velvet Candle & Cake · ปรับแต่งวันเกิดและ 4 ลูกเล่นอินเทอร์แอคทีฟ"
                    : selectedStrategy === "starlight-memories"
                      ? "Starlight Memories · ลำดับฉากภาพยนตร์ 3 องค์ & ฉากส่งท้าย"
                      : selectedStrategy === "midnight-cinema"
                        ? "Midnight Cinema 35mm · ตั๋วหนัง ม้วนฟิล์ม และบทภาพยนตร์"
                        : selectedStrategy === "new-year-grand-celebration"
                          ? "Grand New Year Celebration · Midnight Time Train ขบวนรถไฟข้ามปี & กล่องของขวัญ"
                          : selectedStrategy === "songkran-splendor"
                            ? "Songkran Splendor · มหาสงกรานต์สาดสุข & รดน้ำขอพร"
                            : selectedStrategy === "halloween-haunted-scroll"
                              ? "Midnight Haunted Abyss · สุขสันต์วันฮาโลวีนแบบเลื่อนยาว & ปัดหมอก"
                              : selectedStrategy === "vintage-wax-seal"
                                ? "Vintage Wax Seal & Royal Parchment · จดหมายผนึกตราครั่ง & รหัสลับ"
                                : selectedStrategy === "candles"
                                  ? "Royal Candlelight Gala · เป่าเทียน รูปภาพ สาส์นอวยพร & วิดีโอ"
                                  : selectedStrategy === "retro-y2k"
                                    ? "Retro Windows 98 / Y2K Edition · หน้าต่างเตือน จดหมาย ภาพ & Winamp"
                                    : selectedStrategy === "love-os"
                                      ? "Love OS · Desktop Confession · หน้าล็อกอิน ไฟล์ลับ ปุ่ม Cancel หนีเมาส์ & ความทรงจำ"
                                      : selectedStrategy === "pixel-gacha"
                                        ? "Pixel Gacha Capsule · ตู้กาชาพิกเซลสุ่มการ์ดความทรงจำ & จดหมายลับ"
                                        : selectedStrategy === "lunar-3d"
                                          ? "Lunar Secret 3D · ดวงจันทร์ 3 มิติหมุน 360° & รูป 1:1 ด้านหลังดวงจันทร์"
                                          : selectedStrategy === "orbit-of-us"
                                            ? "Orbit of Us 3D · กาแล็กซีความทรงจำ 360° & ดาวรวมร่างเป็นหัวใจ 3 มิติ"
                                            : selectedStrategy === "storyline"
                                      ? "Storyline · เรื่องราว 3 ฉาก & หน้าปิดท้าย"
                                      : "ฉากและเนื้อหา"}
                </h2>
              </div>
              <div id="theme-style" className="mt-6 border-t border-slate-700/60 pt-6">
                {selectedStrategy === "velvet-candle" && (
                  <div
                    className="space-y-6"
                    onFocusCapture={handleEditingStart}
                    onBlurCapture={handleEditingEnd}
                  >
                    {/* TAB 1: ข้อมูลวันเกิด & เพลง */}
                    <div
                      id="editor-step-panel-1"
                      hidden={activeStep !== 1}
                      className="space-y-5 rounded-2xl border border-amber-500/20 bg-amber-950/20 p-5 shadow-lg shadow-black/30 backdrop-blur"
                    >
                      <div className="flex items-center gap-2 border-b border-amber-500/20 pb-3">
                        <Cake className="h-5 w-5 text-amber-400" />
                        <h3 className="text-lg font-bold text-amber-100">แท็บ 1: ข้อมูลวันเกิด & เพลงประกอบ</h3>
                      </div>
                      <p className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Info className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                        <span className="text-yellow-300">หมายเหตุ: หากไม่ต้องการให้แสดงข้อความในจุดใด ให้ใส่เว้นวรรค (Spacebar) 1 ครั้งในช่องนั้น</span>
                      </p>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-base font-semibold text-slate-200">
                          ชื่อเจ้าของวันเกิด (Recipient Name)
                          <input
                            id="field-velvet-name"
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            placeholder="คนพิเศษ"
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all ${highlightedFieldId === "field-velvet-name"
                              ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse"
                              : ""
                              }`}
                          />
                        </label>

                        <label className="text-base font-semibold text-slate-200">
                          ชื่อการ์ด / หัวเรื่องวันเกิด (Title)
                          <input
                            id="field-velvet-title"
                            value={cardTitle}
                            onChange={(e) => setCardTitle(e.target.value)}
                            placeholder="Happy Birthday"
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all ${highlightedFieldId === "field-velvet-title"
                              ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse"
                              : ""
                              }`}
                          />
                        </label>

                        <label className="text-base font-semibold text-slate-200">
                          อายุ / จำนวนเทียน (1-9 เล่ม หรือข้อความบนป้ายทอง)
                          <input
                            id="field-velvet-age"
                            value={surpriseQRData.content.flowers?.highlightText ?? "25"}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  flowers: {
                                    ...current.content.flowers,
                                    highlightText: val,
                                  },
                                },
                              }));
                            }}
                            placeholder="เช่น 25"
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all ${highlightedFieldId === "field-velvet-age"
                              ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse"
                              : ""
                              }`}
                          />
                          <p className="mt-1.5 text-xs text-slate-400">
                            ตัวเลขนี้จะสลักบนป้ายทองคำหน้าเค้ก และกำหนดจำนวนเทียนบนเค้ก (สูงสุด 9 เล่ม)
                          </p>
                        </label>

                        <div className="md:col-span-2">
                          <label className="text-base font-semibold text-slate-200">
                            ลิงก์เพลงประกอบ (YouTube หรือ .mp3)
                            <input
                              id="field-velvet-music"
                              value={surpriseQRData.content.songMedia.audioSrc || surpriseQRData.content.bgMusic.src || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSurpriseQRData((current) => ({
                                  ...current,
                                  content: {
                                    ...current.content,
                                    songMedia: {
                                      ...current.content.songMedia,
                                      audioSrc: val,
                                      src: val,
                                    },
                                    bgMusic: {
                                      ...current.content.bgMusic,
                                      src: val,
                                    },
                                  },
                                }));
                              }}
                              placeholder="https://www.youtube.com/watch?v=... หรือ https://.../song.mp3 (เว้นว่างเพื่อใช้ดนตรีกล่องดนตรี)"
                              className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all ${highlightedFieldId === "field-velvet-music"
                                ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse"
                                : ""
                                }`}
                            />
                          </label>
                          <p className="mt-1.5 text-xs text-slate-400">
                            รองรับทั้งลิงก์ YouTube และไฟล์ .mp3 หากไม่ระบุ ระบบจะบรรเลงเพลงวันเกิด Happy Birthday สไตล์กล่องดนตรีไขลานสังเคราะห์อัตโนมัติ
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* TAB 2: คำอธิษฐาน & ข้อความในเค้ก */}
                    <div
                      id="editor-step-panel-2"
                      hidden={activeStep !== 2}
                      className="space-y-5 rounded-2xl border border-amber-500/20 bg-amber-950/20 p-5 shadow-lg shadow-black/30 backdrop-blur"
                    >
                      <div className="flex items-center gap-2 border-b border-amber-500/20 pb-3">
                        <Sparkles className="h-5 w-5 text-amber-400" />
                        <h3 className="text-lg font-bold text-amber-100">แท็บ 2: คำอธิษฐาน & ข้อความลับในเค้ก (Gimmick 1 & 2)</h3>
                      </div>

                      <div className="space-y-4">
                        <label className="block text-base font-semibold text-slate-200">
                          ข้อความก่อนเป่าเทียน (Make a Wish Prompt)
                          <input
                            id="field-velvet-wish"
                            value={surpriseQRData.content.letter.title || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  letter: {
                                    ...current.content.letter,
                                    title: val,
                                  },
                                },
                              }));
                            }}
                            placeholder="หลับตาอธิษฐาน แล้วเป่าเทียนเพื่อเริ่มงานวันเกิด"
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all ${highlightedFieldId === "field-velvet-wish"
                              ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse"
                              : ""
                              }`}
                          />
                        </label>

                        <div className="grid gap-4 md:grid-cols-2 pt-2 border-t border-amber-500/15">
                          <label className="block text-base font-semibold text-slate-200">
                            คำโปรยการ์ดในเค้ก (Eyebrow)
                            <input
                              id="field-velvet-secret-eyebrow"
                              value={surpriseQRData.content.flowers?.subTitle || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSurpriseQRData((current) => ({
                                  ...current,
                                  content: {
                                    ...current.content,
                                    flowers: {
                                      ...current.content.flowers,
                                      subTitle: val,
                                    },
                                  },
                                }));
                              }}
                              placeholder="A SWEET SURPRISE"
                              className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                            />
                          </label>

                          <label className="block text-base font-semibold text-slate-200">
                            หัวข้อของขวัญลับในเค้ก (Secret Title)
                            <input
                              id="field-velvet-secret-title"
                              value={surpriseQRData.content.flowers?.title || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSurpriseQRData((current) => ({
                                  ...current,
                                  content: {
                                    ...current.content,
                                    flowers: {
                                      ...current.content.flowers,
                                      title: val,
                                    },
                                  },
                                }));
                              }}
                              placeholder="ของขวัญลับในก้อนเค้ก"
                              className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                            />
                          </label>
                        </div>

                        <label className="block text-base font-semibold text-slate-200">
                          ข้อความลับในเค้ก (ปรากฏเมื่อผู้รับใช้นิ้วปาดตัดเค้ก)
                          <textarea
                            id="field-velvet-secret"
                            rows={4}
                            value={surpriseQRData.content.flowers?.message || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  flowers: {
                                    ...current.content.flowers,
                                    message: val,
                                  },
                                },
                              }));
                            }}
                            placeholder="ขอบคุณที่เป็นความสุขและรอยยิ้มให้กันเสมอมา ขอให้ทุกวันของเธอสดใสและอบอุ่นดั่งแสงเทียนในค่ำคืนนี้"
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all ${highlightedFieldId === "field-velvet-secret"
                              ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse"
                              : ""
                              }`}
                          />
                        </label>
                      </div>
                    </div>

                    {/* TAB 3: ลูกโป่งคำอวยพร */}
                    <div
                      id="editor-step-panel-3"
                      hidden={activeStep !== 3}
                      className="space-y-5 rounded-2xl border border-amber-500/20 bg-amber-950/20 p-5 shadow-lg shadow-black/30 backdrop-blur"
                    >
                      <div className="flex items-center gap-2 border-b border-amber-500/20 pb-3">
                        <Gift className="h-5 w-5 text-amber-400" />
                        <h3 className="text-lg font-bold text-amber-100">แท็บ 3: ลูกโป่งคำอวยพร 3 ลูก (Gimmick 3: Tap to Pop)</h3>
                      </div>
                      <p className="text-xs text-slate-400">
                        ลูกโป่ง 3 เฉดสีพาสเทลหรู (Champagne Gold, Dusty Rose, Midnight Navy) เมื่อแตะจะแตกพร้อมเสียงป๊อป และปล่อยการ์ดคำอวยพรหรือรูปภาพออกมา
                      </p>

                      <div className="space-y-6">
                        {/* Balloon 1 */}
                        <div
                          id="field-velvet-balloon-1"
                          className={`rounded-xl border border-amber-500/20 bg-white/5 p-4 transition-all ${highlightedFieldId === "field-velvet-balloon-1"
                            ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse"
                            : ""
                            }`}
                        >
                          <p className="font-bold text-amber-200 mb-3 text-sm">ลูกโป่งที่ 1 — Champagne Gold</p>
                          <div className="grid gap-3 md:grid-cols-2">
                            <label className="text-sm font-semibold text-slate-200">
                              หัวข้อคำอวยพร
                              <input
                                value={surpriseQRData.content.menu.card1Title}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSurpriseQRData((current) => ({
                                    ...current,
                                    content: {
                                      ...current.content,
                                      menu: { ...current.content.menu, card1Title: val },
                                    },
                                  }));
                                }}
                                placeholder="ความสุขที่เปล่งประกาย"
                                className="mt-1 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100"
                              />
                            </label>
                            <label className="text-sm font-semibold text-slate-200">
                              ข้อความในลูกโป่ง
                              <input
                                value={surpriseQRData.content.menu.card1Desc}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSurpriseQRData((current) => ({
                                    ...current,
                                    content: {
                                      ...current.content,
                                      menu: { ...current.content.menu, card1Desc: val },
                                    },
                                  }));
                                }}
                                placeholder="ขอให้รอยยิ้มนี้อยู่คู่เธอเสมอในทุกๆ วัน"
                                className="mt-1 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100"
                              />
                            </label>
                            <div className="md:col-span-2">
                              <SurpriseQRMediaInput
                                label="รูปภาพในการ์ดลูกโป่งที่ 1 (ไม่บังคับ)"
                                value={surpriseQRData.content.memories.polaroidImages?.[0]?.src || ""}
                                onChange={(src) => setSurpriseQRImage("polaroid", 0, src)}
                                placeholder="วาง URL หรือเลือกไฟล์รูป"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Balloon 2 */}
                        <div
                          id="field-velvet-balloon-2"
                          className={`rounded-xl border border-rose-500/20 bg-white/5 p-4 transition-all ${highlightedFieldId === "field-velvet-balloon-2"
                            ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse"
                            : ""
                            }`}
                        >
                          <p className="font-bold text-rose-200 mb-3 text-sm">ลูกโป่งที่ 2 — Dusty Rose</p>
                          <div className="grid gap-3 md:grid-cols-2">
                            <label className="text-sm font-semibold text-slate-200">
                              หัวข้อคำอวยพร
                              <input
                                value={surpriseQRData.content.menu.card2Title}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSurpriseQRData((current) => ({
                                    ...current,
                                    content: {
                                      ...current.content,
                                      menu: { ...current.content.menu, card2Title: val },
                                    },
                                  }));
                                }}
                                placeholder="การเดินทางบทใหม่"
                                className="mt-1 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100"
                              />
                            </label>
                            <label className="text-sm font-semibold text-slate-200">
                              ข้อความในลูกโป่ง
                              <input
                                value={surpriseQRData.content.menu.card2Desc}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSurpriseQRData((current) => ({
                                    ...current,
                                    content: {
                                      ...current.content,
                                      menu: { ...current.content.menu, card2Desc: val },
                                    },
                                  }));
                                }}
                                placeholder="เติบโตอย่างงดงาม และเป็นตัวเองในเวอร์ชันที่มีความสุขที่สุด"
                                className="mt-1 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100"
                              />
                            </label>
                            <div className="md:col-span-2">
                              <SurpriseQRMediaInput
                                label="รูปภาพในการ์ดลูกโป่งที่ 2 (ไม่บังคับ)"
                                value={surpriseQRData.content.memories.polaroidImages?.[1]?.src || ""}
                                onChange={(src) => setSurpriseQRImage("polaroid", 1, src)}
                                placeholder="วาง URL หรือเลือกไฟล์รูป"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Balloon 3 */}
                        <div
                          id="field-velvet-balloon-3"
                          className={`rounded-xl border border-indigo-500/20 bg-white/5 p-4 transition-all ${highlightedFieldId === "field-velvet-balloon-3"
                            ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse"
                            : ""
                            }`}
                        >
                          <p className="font-bold text-indigo-200 mb-3 text-sm">ลูกโป่งที่ 3 — Midnight Navy</p>
                          <div className="grid gap-3 md:grid-cols-2">
                            <label className="text-sm font-semibold text-slate-200">
                              หัวข้อคำอวยพร
                              <input
                                value={surpriseQRData.content.menu.card3Title}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSurpriseQRData((current) => ({
                                    ...current,
                                    content: {
                                      ...current.content,
                                      menu: { ...current.content.menu, card3Title: val },
                                    },
                                  }));
                                }}
                                placeholder="คำอวยพรพิเศษ"
                                className="mt-1 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100"
                              />
                            </label>
                            <label className="text-sm font-semibold text-slate-200">
                              ข้อความในลูกโป่ง
                              <input
                                value={surpriseQRData.content.menu.card3Desc}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSurpriseQRData((current) => ({
                                    ...current,
                                    content: {
                                      ...current.content,
                                      menu: { ...current.content.menu, card3Desc: val },
                                    },
                                  }));
                                }}
                                placeholder="ไม่ว่าจะเกิดอะไรขึ้น จะมีฉันคอยอยู่เคียงข้างและเป็นกำลังใจให้เสมอ"
                                className="mt-1 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100"
                              />
                            </label>
                            <div className="md:col-span-2">
                              <SurpriseQRMediaInput
                                label="รูปภาพในการ์ดลูกโป่งที่ 3 (ไม่บังคับ)"
                                value={surpriseQRData.content.memories.polaroidImages?.[2]?.src || ""}
                                onChange={(src) => setSurpriseQRImage("polaroid", 2, src)}
                                placeholder="วาง URL หรือเลือกไฟล์รูป"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* TAB 4: อัลบั้มภาพวันเกิด & ส่งท้าย */}
                    <div
                      id="editor-step-panel-4"
                      hidden={activeStep !== 4}
                      className="space-y-5 rounded-2xl border border-amber-500/20 bg-amber-950/20 p-5 shadow-lg shadow-black/30 backdrop-blur"
                    >
                      <div className="flex items-center gap-2 border-b border-amber-500/20 pb-3">
                        <Images className="h-5 w-5 text-amber-400" />
                        <h3 className="text-lg font-bold text-amber-100">แท็บ 4: คลังภาพวันเกิดและข้อความส่งท้าย (Finale)</h3>
                      </div>
                      <p className="text-xs text-slate-400">
                        ภาพถ่ายแห่งความสุขของผู้รับในกรอบโพลารอยด์เรืองแสง และกล่องจดหมายอวยพรยาวจากใจ
                      </p>

                      <div className="space-y-4">
                        <label className="block text-base font-semibold text-slate-200">
                          หัวข้อหน้าอัลบั้มวันเกิด (Finale Title)
                          <input
                            id="field-velvet-finale-title"
                            value={surpriseQRData.content.finale.mainText || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  finale: {
                                    ...current.content.finale,
                                    mainText: val,
                                  },
                                },
                              }));
                            }}
                            placeholder="HAPPY BIRTHDAY"
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all ${highlightedFieldId === "field-velvet-finale-title"
                              ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse"
                              : ""
                              }`}
                          />
                        </label>

                        <div className="pt-2">
                          <p className="font-semibold text-slate-200 mb-2">รูปภาพความทรงจำ 4 ภาพ (กรอบโพลารอยด์)</p>
                          <div className="grid gap-3 md:grid-cols-2">
                            {[0, 1, 2, 3].map((idx) => (
                              <div
                                key={idx}
                                id={`field-velvet-photo-${idx + 1}`}
                                className={`rounded-xl p-1 transition-all ${highlightedFieldId === `field-velvet-photo-${idx + 1}`
                                  ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse"
                                  : ""
                                  }`}
                              >
                                <SurpriseQRMediaInput
                                  label={`รูปภาพที่ ${idx + 1}`}
                                  value={surpriseQRData.content.memories.filmstripImages?.[idx]?.src || ""}
                                  onChange={(src) => setSurpriseQRImage("filmstrip", idx, src)}
                                  placeholder="วาง URL หรือเลือกไฟล์รูป"
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        <label className="block text-base font-semibold text-slate-200 pt-2">
                          ข้อความอวยพรยาวจากใจ (Paragraphs)
                          <textarea
                            id="field-velvet-finale-msg"
                            rows={4}
                            value={surpriseQRData.content.letter.paragraphs.join("\n\n")}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  letter: {
                                    ...current.content.letter,
                                    paragraphs: val.split(/\n\n+/).filter(Boolean),
                                  },
                                },
                              }));
                            }}
                            placeholder="สุขสันต์วันเกิดนะ ขอให้ปีนี้เป็นปีที่แสนพิเศษ เต็มไปด้วยความทรงจำดีๆ..."
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all ${highlightedFieldId === "field-velvet-finale-msg"
                              ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse"
                              : ""
                              }`}
                          />
                        </label>

                        <label className="block text-base font-semibold text-slate-200">
                          คำลงท้าย (Sign-off)
                          <input
                            id="field-velvet-finale-sign"
                            value={surpriseQRData.content.finale.subText || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  finale: {
                                    ...current.content.finale,
                                    subText: val,
                                  },
                                },
                              }));
                            }}
                            placeholder="ด้วยรักและความปรารถนาดีเสมอ"
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}
                {(selectedStrategy === "new-year-grand-celebration" ||
                  selectedStrategy === "songkran-splendor" ||
                  selectedStrategy === "halloween-haunted-scroll") && (() => {
                    const preset = FESTIVAL_FORM_PRESETS[selectedStrategy];
                    const isSongkran = selectedStrategy === "songkran-splendor";
                    const isHalloween = selectedStrategy === "halloween-haunted-scroll";
                    const fInputCls = `mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all ${isSongkran
                        ? "focus:border-cyan-400 focus:ring-cyan-400/30"
                        : isHalloween
                          ? "focus:border-orange-400 focus:ring-orange-400/30"
                          : "focus:border-amber-500 focus:ring-amber-500/30"
                      }`;
                    const fHighlight = (id: string) =>
                      highlightedFieldId === id
                        ? `ring-4 ring-offset-2 ring-offset-slate-950 animate-pulse ${isSongkran ? "ring-cyan-400" : isHalloween ? "ring-orange-400" : "ring-amber-400"
                        }`
                        : "";
                    const patchFestivalContent = <K extends "menu" | "letter" | "memories" | "flowers" | "songMedia">(
                      section: K,
                      patch: Partial<SurpriseQRData["content"][K]>,
                    ) =>
                      setSurpriseQRData((current) => ({
                        ...current,
                        content: {
                          ...current.content,
                          [section]: { ...current.content[section], ...patch },
                        },
                      }));
                    const fortuneLines = (surpriseQRData.content.flowers?.message || "").split("\n");
                    const fortuneItems = Array.from(
                      { length: Math.max(4, Math.min(6, fortuneLines.length)) },
                      (_, idx) => fortuneLines[idx] ?? "",
                    );
                    const panelCls = `space-y-5 rounded-2xl border p-5 shadow-lg shadow-black/30 backdrop-blur ${preset.themeBorderClass}`;
                    const headerBorderCls = `flex items-center gap-2 border-b pb-3 ${isSongkran ? "border-cyan-500/20" : isHalloween ? "border-orange-500/20" : "border-amber-500/20"
                      }`;
                    const iconColorCls = isSongkran
                      ? "h-5 w-5 text-cyan-300"
                      : isHalloween
                        ? "h-5 w-5 text-orange-300"
                        : "h-5 w-5 text-amber-400";

                    return (
                      <div className="space-y-6" onFocusCapture={handleEditingStart} onBlurCapture={handleEditingEnd}>
                        {/* TAB 1 */}
                        <div id="editor-step-panel-1" hidden={activeStep !== 1} className={panelCls}>
                          <div className={headerBorderCls}>
                            {isSongkran ? <Droplets className={iconColorCls} /> : <Sparkles className={iconColorCls} />}
                            <h3 className={`text-lg font-bold ${preset.accentTextClass}`}>{preset.tabHeaders[0]}</h3>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <label className="text-base font-semibold text-slate-200">
                              ชื่อผู้รับ (Recipient Name)
                              <input
                                id={preset.fieldIds.recipient}
                                value={surpriseQRData.content.menu.subTitle}
                                onChange={(e) => {
                                  setRecipientName(e.target.value);
                                  patchFestivalContent("menu", { subTitle: e.target.value });
                                }}
                                placeholder="เพื่อนคนพิเศษ"
                                className={`${fInputCls} ${fHighlight(preset.fieldIds.recipient)}`}
                              />
                            </label>
                            <label className="text-base font-semibold text-slate-200">
                              {preset.labels.year}
                              <input
                                id={preset.fieldIds.year}
                                value={surpriseQRData.content.menu.title}
                                onChange={(e) => patchFestivalContent("menu", { title: e.target.value })}
                                placeholder={preset.labels.yearPlaceholder}
                                className={`${fInputCls} ${fHighlight(preset.fieldIds.year)}`}
                              />
                            </label>
                            <label className="text-base font-semibold text-slate-200 md:col-span-2">
                              ข้อความเกริ่นนำ (Opening Tagline)
                              <input
                                id={preset.fieldIds.tagline}
                                value={surpriseQRData.content.menu.card1Title}
                                onChange={(e) => patchFestivalContent("menu", { card1Title: e.target.value })}
                                placeholder={preset.labels.taglinePlaceholder}
                                className={`${fInputCls} ${fHighlight(preset.fieldIds.tagline)}`}
                              />
                            </label>
                            <label className="text-base font-semibold text-slate-200 md:col-span-2">
                              ชื่อผู้ส่ง (Sender Name)
                              <input
                                id={preset.fieldIds.sender}
                                value={surpriseQRData.content.menu.card1Desc}
                                onChange={(e) => patchFestivalContent("menu", { card1Desc: e.target.value })}
                                placeholder={preset.labels.senderPlaceholder}
                                className={`${fInputCls} ${fHighlight(preset.fieldIds.sender)}`}
                              />
                            </label>
                          </div>
                        </div>

                        {/* TAB 2 */}
                        <div id="editor-step-panel-2" hidden={activeStep !== 2} className={panelCls}>
                          <div className={headerBorderCls}>
                            <Images className={iconColorCls} />
                            <h3 className={`text-lg font-bold ${preset.accentTextClass}`}>{preset.tabHeaders[1]}</h3>
                          </div>
                          <div id={preset.fieldIds.photo1} className={`rounded-xl p-1 transition-all ${fHighlight(preset.fieldIds.photo1)}`}>
                            <SurpriseQRMediaInput
                              label={preset.labels.photo1Label}
                              value={surpriseQRData.content.memories.filmstripImages?.[0]?.src || ""}
                              onChange={(src) => setSurpriseQRImage("filmstrip", 0, src)}
                              placeholder="วาง URL หรืออัปโหลดรูปภาพที่ 1"
                            />
                          </div>
                          <label className="block text-base font-semibold text-slate-200">
                            คำบรรยายใต้ภาพที่ 1
                            <input
                              id={preset.fieldIds.photo1Caption}
                              value={surpriseQRData.content.memories.sectionTitle}
                              onChange={(e) => patchFestivalContent("memories", { sectionTitle: e.target.value })}
                              placeholder={preset.labels.photo1CaptionPlaceholder}
                              className={`${fInputCls} ${fHighlight(preset.fieldIds.photo1Caption)}`}
                            />
                          </label>
                        </div>

                        {/* TAB 3 */}
                        <div id="editor-step-panel-3" hidden={activeStep !== 3} className={panelCls}>
                          <div className={headerBorderCls}>
                            {isSongkran ? (
                              <Flower className={iconColorCls} />
                            ) : isHalloween ? (
                              <Sparkles className={iconColorCls} />
                            ) : (
                              <Gift className={iconColorCls} />
                            )}
                            <h3 className={`text-lg font-bold ${preset.accentTextClass}`}>{preset.tabHeaders[2]}</h3>
                          </div>
                          <label className="block text-base font-semibold text-slate-200">
                            {preset.labels.wishTitleLabel}
                            <input
                              id={preset.fieldIds.wishTitle}
                              value={surpriseQRData.content.letter.title}
                              onChange={(e) => patchFestivalContent("letter", { title: e.target.value })}
                              placeholder={preset.labels.wishTitlePlaceholder}
                              className={`${fInputCls} ${fHighlight(preset.fieldIds.wishTitle)}`}
                            />
                          </label>
                          <label className="block text-base font-semibold text-slate-200">
                            {preset.labels.wishMessageLabel}
                            <textarea
                              id={preset.fieldIds.wishMessage}
                              rows={4}
                              value={surpriseQRData.content.letter.paragraphs[0] || ""}
                              onChange={(e) => patchFestivalContent("letter", { paragraphs: [e.target.value] })}
                              placeholder={preset.labels.wishMessagePlaceholder}
                              className={`${fInputCls} ${fHighlight(preset.fieldIds.wishMessage)}`}
                            />
                          </label>
                          <div
                            id={preset.fieldIds.fortunes}
                            className={`space-y-2 rounded-xl p-1 transition-all ${fHighlight(preset.fieldIds.fortunes)}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`block text-sm font-semibold ${isSongkran ? "text-cyan-200" : isHalloween ? "text-orange-200" : "text-amber-200"
                                  }`}
                              >
                                {preset.labels.fortunesLabel}
                              </span>
                              {fortuneItems.length < 6 && (
                                <button
                                  type="button"
                                  onClick={() => patchFestivalContent("flowers", { message: [...fortuneItems, ""].join("\n") })}
                                  className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${isSongkran
                                      ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25"
                                      : isHalloween
                                        ? "border-orange-400/40 bg-orange-500/15 text-orange-200 hover:bg-orange-500/25"
                                        : "border-amber-400/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25"
                                    }`}
                                >
                                  + เพิ่มข้อความ
                                </button>
                              )}
                            </div>
                            {fortuneItems.map((desc, idx) => (
                              <input
                                key={idx}
                                value={desc}
                                onChange={(e) => {
                                  const next = [...fortuneItems];
                                  next[idx] = e.target.value;
                                  patchFestivalContent("flowers", { message: next.join("\n") });
                                }}
                                placeholder={`${preset.labels.fortuneItemPrefix} ${idx + 1}`}
                                className={fInputCls}
                              />
                            ))}
                          </div>
                        </div>

                        {/* TAB 4 */}
                        <div id="editor-step-panel-4" hidden={activeStep !== 4} className={panelCls}>
                          <div className={headerBorderCls}>
                            <Star className={iconColorCls} />
                            <h3 className={`text-lg font-bold ${preset.accentTextClass}`}>{preset.tabHeaders[3]}</h3>
                          </div>
                          <div id={preset.fieldIds.photo2} className={`rounded-xl p-1 transition-all ${fHighlight(preset.fieldIds.photo2)}`}>
                            <SurpriseQRMediaInput
                              label={preset.labels.photo2Label}
                              value={surpriseQRData.content.memories.filmstripImages?.[1]?.src || ""}
                              onChange={(src) => setSurpriseQRImage("filmstrip", 1, src)}
                              placeholder="วาง URL หรืออัปโหลดรูปภาพที่ 2"
                            />
                          </div>
                          <label className="block text-base font-semibold text-slate-200">
                            คำบรรยายใต้ภาพที่ 2
                            <input
                              id={preset.fieldIds.photo2Caption}
                              value={surpriseQRData.content.memories.description}
                              onChange={(e) => patchFestivalContent("memories", { description: e.target.value })}
                              placeholder={preset.labels.photo2CaptionPlaceholder}
                              className={`${fInputCls} ${fHighlight(preset.fieldIds.photo2Caption)}`}
                            />
                          </label>
                          <label className="block text-base font-semibold text-slate-200">
                            เพลงบรรเลงเฉลิมฉลอง (YouTube หรือ .mp3)
                            <input
                              id={preset.fieldIds.bgm}
                              type="url"
                              value={surpriseQRData.content.songMedia.audioSrc || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSurpriseQRData((current) => ({
                                  ...current,
                                  content: {
                                    ...current.content,
                                    songMedia: { ...current.content.songMedia, audioSrc: val },
                                    bgMusic: { ...current.content.bgMusic, src: val },
                                  },
                                }));
                              }}
                              placeholder="https://www.youtube.com/watch?v=... หรือ https://.../song.mp3"
                              className={`${fInputCls} ${fHighlight(preset.fieldIds.bgm)}`}
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })()}
                {selectedStrategy === "midnight-cinema" && (() => {
                  const cinemaInputCls = "mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all";
                  const highlightRing = (id: string) =>
                    highlightedFieldId === id ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse" : "";
                  const patchContent = <K extends "menu" | "letter" | "memories" | "finale" | "songMedia">(
                    section: K,
                    patch: Partial<SurpriseQRData["content"][K]>,
                  ) =>
                    setSurpriseQRData((current) => ({
                      ...current,
                      content: {
                        ...current.content,
                        [section]: { ...current.content[section], ...patch },
                      },
                    }));
                  const ticketFields = [
                    { key: "subTitle", label: "ข้อความสิทธิ์เข้าชม (Admit Label)", placeholder: "ADMIT ONE" },
                    { key: "card1Title", label: "วันที่ฉาย (Screening Date)", placeholder: "14 FEB 2026" },
                    { key: "card1Desc", label: "เวลาฉาย (Screening Time)", placeholder: "23:45" },
                    { key: "card2Desc", label: "โรงภาพยนตร์ (Theater Hall)", placeholder: "SCREEN 01" },
                    { key: "card2Title", label: "เลขที่นั่ง (Seat Number)", placeholder: "ROW A - 07 & 08" },
                  ] as const;

                  return (
                    <div
                      className="space-y-6"
                      onFocusCapture={handleEditingStart}
                      onBlurCapture={handleEditingEnd}
                    >
                      {/* TAB 1: ตั๋วภาพยนตร์ */}
                      <div id="editor-step-panel-1" hidden={activeStep !== 1} className="space-y-5 rounded-2xl border border-amber-500/20 bg-amber-950/20 p-5 shadow-lg shadow-black/30 backdrop-blur">
                        <div className="flex items-center gap-2 border-b border-amber-500/20 pb-3">
                          <Film className="h-5 w-5 text-amber-400" />
                          <h3 className="text-lg font-bold text-amber-100">แท็บ 1: ตั๋วภาพยนตร์ (Cinema Ticket)</h3>
                        </div>

                        <label className="block text-base font-semibold text-slate-200">
                          ชื่อภาพยนตร์บนตั๋ว (Movie Title)
                          <input
                            id="field-cinema-movie-title"
                            value={surpriseQRData.content.menu.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCardTitle(val || "Midnight Cinema 35mm");
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  title: val || "Midnight Cinema 35mm",
                                  menu: { ...current.content.menu, title: val },
                                },
                              }));
                            }}
                            placeholder="THE STORY OF US"
                            className={`${cinemaInputCls} ${highlightRing("field-cinema-movie-title")}`}
                          />
                        </label>

                        <div id="field-cinema-ticket-info" className={`grid gap-4 rounded-xl p-1 md:grid-cols-2 transition-all ${highlightRing("field-cinema-ticket-info")}`}>
                          <label className="text-base font-semibold text-slate-200">
                            ชื่อผู้รับการ์ด (สำหรับแสดงในรายการ)
                            <input
                              value={recipientName}
                              onChange={(e) => setRecipientName(e.target.value)}
                              placeholder="คนพิเศษ"
                              className={cinemaInputCls}
                            />
                          </label>
                          {ticketFields.map(({ key, label, placeholder }) => (
                            <label key={key} className="text-base font-semibold text-slate-200">
                              {label}
                              <input
                                value={surpriseQRData.content.menu[key]}
                                onChange={(e) => patchContent("menu", { [key]: e.target.value })}
                                placeholder={placeholder}
                                className={cinemaInputCls}
                              />
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* TAB 2: บทภาพยนตร์ */}
                      <div id="editor-step-panel-2" hidden={activeStep !== 2} className="space-y-5 rounded-2xl border border-amber-500/20 bg-amber-950/20 p-5 shadow-lg shadow-black/30 backdrop-blur">
                        <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                          <div className="flex items-center gap-2">
                            <Mail className="h-5 w-5 text-amber-400" />
                            <h3 className="text-lg font-bold text-amber-100">แท็บ 2: บทภาพยนตร์ (Screenplay)</h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => patchContent("letter", { paragraphs: [...surpriseQRData.content.letter.paragraphs, ""] })}
                            className="rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-200 transition hover:bg-amber-500/25"
                          >
                            + เพิ่มย่อหน้า
                          </button>
                        </div>

                        <div id="field-cinema-screenplay" className={`space-y-4 rounded-xl p-1 transition-all ${highlightRing("field-cinema-screenplay")}`}>
                          <label className="block text-base font-semibold text-slate-200">
                            หัวฉากบทภาพยนตร์ (Scene Heading)
                            <input
                              value={surpriseQRData.content.letter.title}
                              onChange={(e) => patchContent("letter", { title: e.target.value })}
                              placeholder="SCENE 1: EXT. MIDNIGHT SKY - NIGHT"
                              className={cinemaInputCls}
                            />
                          </label>

                          {surpriseQRData.content.letter.paragraphs.map((paragraph, pIdx) => (
                            <div key={pIdx} className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-slate-300">ย่อหน้าที่ {pIdx + 1}</span>
                                {surpriseQRData.content.letter.paragraphs.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => patchContent("letter", {
                                      paragraphs: surpriseQRData.content.letter.paragraphs.filter((_, i) => i !== pIdx),
                                    })}
                                    className="text-xs font-semibold text-rose-400 hover:text-rose-300"
                                  >
                                    ลบย่อหน้านี้
                                  </button>
                                )}
                              </div>
                              <textarea
                                rows={3}
                                value={paragraph}
                                onChange={(e) => {
                                  const nextParas = [...surpriseQRData.content.letter.paragraphs];
                                  nextParas[pIdx] = e.target.value;
                                  patchContent("letter", { paragraphs: nextParas });
                                }}
                                placeholder="เขียนความในใจ..."
                                className={cinemaInputCls}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* TAB 3: ม้วนฟิล์ม 35 มม. */}
                      <div id="editor-step-panel-3" hidden={activeStep !== 3} className="space-y-5 rounded-2xl border border-amber-500/20 bg-amber-950/20 p-5 shadow-lg shadow-black/30 backdrop-blur">
                        <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                          <div className="flex items-center gap-2">
                            <Images className="h-5 w-5 text-amber-400" />
                            <h3 className="text-lg font-bold text-amber-100">แท็บ 3: ม้วนฟิล์ม 35 มม. (Film Memories)</h3>
                          </div>
                          {surpriseQRData.content.memories.filmstripImages.length < 6 && (
                            <button
                              type="button"
                              onClick={() => patchContent("memories", {
                                filmstripImages: [...surpriseQRData.content.memories.filmstripImages, { type: "url", src: "/templates/galaxy-1.png" }],
                              })}
                              className="rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-200 transition hover:bg-amber-500/25"
                            >
                              + เพิ่มรูปในม้วนฟิล์ม
                            </button>
                          )}
                        </div>

                        <div id="field-cinema-memories-title" className={`space-y-4 rounded-xl p-1 transition-all ${highlightRing("field-cinema-memories-title")}`}>
                          <label className="block text-base font-semibold text-slate-200">
                            หัวข้อส่วนม้วนฟิล์ม (Section Title)
                            <input
                              value={surpriseQRData.content.memories.sectionTitle}
                              onChange={(e) => patchContent("memories", { sectionTitle: e.target.value })}
                              placeholder="THE 35MM MEMORIES"
                              className={cinemaInputCls}
                            />
                          </label>
                          <label className="block text-base font-semibold text-slate-200">
                            คำบรรยายความทรงจำ (Caption)
                            <input
                              value={surpriseQRData.content.memories.description}
                              onChange={(e) => patchContent("memories", { description: e.target.value })}
                              placeholder="บันทึกช่วงเวลาที่งดงามผ่านม้วนฟิล์ม 35 มม."
                              className={cinemaInputCls}
                            />
                          </label>
                        </div>

                        <div className="space-y-4">
                          {surpriseQRData.content.memories.filmstripImages.map((img, idx) => (
                            <div
                              key={idx}
                              id={`field-cinema-photo-${idx}`}
                              className={`rounded-xl border border-white/10 bg-slate-950/40 p-3 transition-all ${highlightRing(`field-cinema-photo-${idx}`)}`}
                            >
                              <div className="mb-2 flex items-center justify-between">
                                <span className="text-sm font-bold text-amber-200">เฟรมที่ #{String(idx + 1).padStart(2, "0")}</span>
                                {surpriseQRData.content.memories.filmstripImages.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => patchContent("memories", {
                                      filmstripImages: surpriseQRData.content.memories.filmstripImages.filter((_, i) => i !== idx),
                                    })}
                                    className="text-xs font-semibold text-rose-400 hover:text-rose-300"
                                  >
                                    ลบเฟรมนี้
                                  </button>
                                )}
                              </div>
                              <SurpriseQRMediaInput
                                label={`รูปภาพเฟรมที่ ${idx + 1}`}
                                value={img?.src || ""}
                                onChange={(src) => setSurpriseQRImage("filmstrip", idx, src)}
                                placeholder="วาง URL หรืออัปโหลดรูปภาพ"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* TAB 4: ฉากจบ Finale */}
                      <div id="editor-step-panel-4" hidden={activeStep !== 4} className="space-y-5 rounded-2xl border border-amber-500/20 bg-amber-950/20 p-5 shadow-lg shadow-black/30 backdrop-blur">
                        <div className="flex items-center gap-2 border-b border-amber-500/20 pb-3">
                          <Star className="h-5 w-5 text-amber-400" />
                          <h3 className="text-lg font-bold text-amber-100">แท็บ 4: ฉากจบ Finale</h3>
                        </div>

                        <div id="field-cinema-finale" className={`space-y-4 rounded-xl p-1 transition-all ${highlightRing("field-cinema-finale")}`}>
                          <label className="block text-base font-semibold text-slate-200">
                            ข้อความหลักฉากจบ (Main End Credit)
                            <input
                              value={surpriseQRData.content.finale.mainText}
                              onChange={(e) => patchContent("finale", { mainText: e.target.value })}
                              placeholder="THE END • AND THE STORY CONTINUES"
                              className={cinemaInputCls}
                            />
                          </label>
                          <label className="block text-base font-semibold text-slate-200">
                            ข้อความรองฉากจบ (Subtitle)
                            <textarea
                              rows={3}
                              value={surpriseQRData.content.finale.subText}
                              onChange={(e) => patchContent("finale", { subText: e.target.value })}
                              placeholder="ขอบคุณที่ร่วมเป็นตัวเอกในภาพยนตร์เรื่องนี้ด้วยกัน"
                              className={cinemaInputCls}
                            />
                          </label>
                        </div>
                      </div>

                      {/* TAB 5: เพลงประกอบ */}
                      <div id="editor-step-panel-5" hidden={activeStep !== 5} className="space-y-5 rounded-2xl border border-amber-500/20 bg-amber-950/20 p-5 shadow-lg shadow-black/30 backdrop-blur">
                        <div className="flex items-center gap-2 border-b border-amber-500/20 pb-3">
                          <Music className="h-5 w-5 text-amber-400" />
                          <h3 className="text-lg font-bold text-amber-100">แท็บ 5: เพลงประกอบ (Original Soundtrack)</h3>
                        </div>

                        <div id="field-cinema-soundtrack" className={`space-y-4 rounded-xl p-1 transition-all ${highlightRing("field-cinema-soundtrack")}`}>
                          <div className="grid gap-4 md:grid-cols-2">
                            <label className="text-base font-semibold text-slate-200">
                              ชื่อเพลง (Song Title)
                              <input
                                value={surpriseQRData.content.songMedia.songTitle}
                                onChange={(e) => patchContent("songMedia", { songTitle: e.target.value })}
                                placeholder="Cinema Paradiso (Love Theme)"
                                className={cinemaInputCls}
                              />
                            </label>
                            <label className="text-base font-semibold text-slate-200">
                              ชื่อศิลปิน (Artist)
                              <input
                                value={surpriseQRData.content.songMedia.songArtist}
                                onChange={(e) => patchContent("songMedia", { songArtist: e.target.value })}
                                placeholder="Ennio Morricone"
                                className={cinemaInputCls}
                              />
                            </label>
                          </div>
                          <label className="block text-base font-semibold text-slate-200">
                            ลิงก์เพลงประกอบ (YouTube หรือ .mp3)
                            <input
                              type="url"
                              value={surpriseQRData.content.songMedia.audioSrc || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSurpriseQRData((current) => ({
                                  ...current,
                                  content: {
                                    ...current.content,
                                    songMedia: { ...current.content.songMedia, audioSrc: val },
                                    bgMusic: { ...current.content.bgMusic, src: val },
                                  },
                                }));
                              }}
                              placeholder="https://www.youtube.com/watch?v=... หรือ https://.../song.mp3"
                              className={cinemaInputCls}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                {selectedStrategy === "starlight-memories" && (
                  <div
                    className="space-y-6"
                    onFocusCapture={handleEditingStart}
                    onBlurCapture={handleEditingEnd}
                  >
                    {/* TAB 1: ข้อมูลเรื่องราว & เพลง */}
                    <div
                      id="editor-step-panel-1"
                      hidden={activeStep !== 1}
                      className="space-y-5 rounded-2xl border border-violet-500/20 bg-violet-950/20 p-5 shadow-lg shadow-black/30 backdrop-blur"
                    >
                      <div className="flex items-center gap-2 border-b border-violet-500/20 pb-3">
                        <Music className="h-5 w-5 text-violet-400" />
                        <h3 className="text-lg font-bold text-violet-100">แท็บ 1: ข้อมูลเรื่องราว & เพลงประกอบ</h3>
                      </div>
                      <p className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Info className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                        <span className="text-yellow-300">หมายเหตุ: หากไม่ต้องการให้แสดงข้อความในจุดใด ให้ใส่เว้นวรรค (Spacebar) 1 ครั้งในช่องนั้น</span>
                      </p>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-base font-semibold text-slate-200">
                          ชื่อการ์ด / ชื่อเรื่องราว (Story Title)
                          <input
                            id="field-starlight-story-title"
                            value={cardTitle}
                            onChange={(e) => setCardTitle(e.target.value)}
                            placeholder="A Story of Us"
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all ${highlightedFieldId === "field-starlight-story-title"
                              ? "ring-4 ring-violet-400 ring-offset-2 ring-offset-slate-950 animate-pulse"
                              : ""
                              }`}
                          />
                        </label>

                        <label className="text-base font-semibold text-slate-200">
                          ชื่อผู้รับ (Recipient Name)
                          <input
                            id="field-starlight-recipient"
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            placeholder="ถึงคนพิเศษของฉัน"
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all ${highlightedFieldId === "field-starlight-recipient"
                              ? "ring-4 ring-violet-400 ring-offset-2 ring-offset-slate-950 animate-pulse"
                              : ""
                              }`}
                          />
                        </label>

                        <div className="md:col-span-2">
                          <label className="text-base font-semibold text-slate-200">
                            ข้อความแถบภาพยนตร์ด้านล่าง (Letterbox Tagline)
                            <input
                              id="field-starlight-letterbox"
                              value={surpriseQRData.content.memories.sectionTitle || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSurpriseQRData((current) => ({
                                  ...current,
                                  content: {
                                    ...current.content,
                                    memories: {
                                      ...current.content.memories,
                                      sectionTitle: val,
                                    },
                                  },
                                }));
                              }}
                              placeholder="CINEMATIC 21:9 WIDESCREEN EXPERIENCE"
                              className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all ${highlightedFieldId === "field-starlight-letterbox"
                                ? "ring-4 ring-violet-400 ring-offset-2 ring-offset-slate-950 animate-pulse"
                                : ""
                                }`}
                            />
                          </label>
                        </div>

                        <div
                          id="field-starlight-music"
                          className={`md:col-span-2 rounded-xl p-1 transition-all ${highlightedFieldId === "field-starlight-music"
                            ? "ring-4 ring-violet-400 ring-offset-2 ring-offset-slate-950 animate-pulse"
                            : ""
                            }`}
                        >
                          <SurpriseQRMediaInput
                            label="เพลงประกอบ (ลิงก์ YouTube / .mp3 หรืออัปโหลดไฟล์เสียง)"
                            value={surpriseQRData.content.songMedia.audioSrc || surpriseQRData.content.bgMusic.src || ""}
                            onChange={(val) => {
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  songMedia: {
                                    ...current.content.songMedia,
                                    audioSrc: val,
                                    src: val,
                                  },
                                  bgMusic: {
                                    ...current.content.bgMusic,
                                    src: val,
                                  },
                                },
                              }));
                            }}
                            accept="audio/*;video/*"
                            placeholder="https://www.youtube.com/watch?v=... หรือเลือกไฟล์เพลง"
                          />
                          <p className="mt-1.5 text-xs text-slate-400">
                            รองรับทั้งลิงก์ YouTube Shorts, วิดีโอ YouTube และอัปโหลดไฟล์เสียง .mp3 เล่นวนซ้ำอัตโนมัติตลอดการฉาย
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* TAB 2: ฉากที่ 1: จุดเริ่มต้น (Act 1) */}
                    <div
                      id="editor-step-panel-2"
                      hidden={activeStep !== 2}
                      className="space-y-5 rounded-2xl border border-violet-500/20 bg-violet-950/20 p-5 shadow-lg shadow-black/30 backdrop-blur"
                    >
                      <div className="flex items-center justify-between border-b border-violet-500/20 pb-3">
                        <div className="flex items-center gap-2">
                          <Film className="h-5 w-5 text-violet-400" />
                          <h3 className="text-lg font-bold text-violet-100">แท็บ 2: ฉากที่ 1 — จุดเริ่มต้น (ACT 1: THE ENCOUNTER)</h3>
                        </div>
                        <span className="text-xs font-mono text-violet-300">04.0s - 12.0s</span>
                      </div>

                      <div className="space-y-4">
                        <div
                          id="field-starlight-act-1"
                          className={`rounded-xl transition-all p-1 ${highlightedFieldId === "field-starlight-act-1"
                            ? "ring-4 ring-violet-400 ring-offset-2 ring-offset-slate-950 animate-pulse"
                            : ""
                            }`}
                        >
                          <SurpriseQRMediaInput
                            label="รูปภาพฉากที่ 1 (Widescreen 21:9)"
                            value={surpriseQRData.content.memories.filmstripImages?.[0]?.src || ""}
                            onChange={(src) => setSurpriseQRImage("filmstrip", 0, src)}
                            placeholder="วาง URL หรือเลือกไฟล์รูปภาพที่ 1"
                          />
                        </div>

                        <label className="block text-base font-semibold text-slate-200">
                          ชื่อหัวข้อฉากที่ 1 (Act Label)
                          <input
                            id="field-starlight-act-label-1"
                            value={surpriseQRData.content.menu.card1Title || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: { ...current.content, menu: { ...current.content.menu, card1Title: val } },
                              }));
                            }}
                            placeholder="ACT 1: THE ENCOUNTER"
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 ${highlightedFieldId === "field-starlight-act-label-1"
                              ? "ring-4 ring-violet-400 ring-offset-2 ring-offset-slate-950 animate-pulse"
                              : ""
                              }`}
                          />
                        </label>

                        <label className="block text-base font-semibold text-slate-200">
                          ข้อความความในใจฉากที่ 1 (Subtitle ท่อนที่ 1)
                          <textarea
                            id="field-starlight-act-text-1"
                            rows={3}
                            value={surpriseQRData.content.letter.paragraphs[0] || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSurpriseQRData((current) => {
                                const nextParas = [...current.content.letter.paragraphs];
                                nextParas[0] = val;
                                return {
                                  ...current,
                                  content: {
                                    ...current.content,
                                    letter: {
                                      ...current.content.letter,
                                      paragraphs: nextParas,
                                    },
                                  },
                                };
                              });
                            }}
                            placeholder="ในค่ำคืนที่ท้องฟ้าพร่างพราวไปด้วยแสงดาว..."
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 ${highlightedFieldId === "field-starlight-act-text-1"
                              ? "ring-4 ring-violet-400 ring-offset-2 ring-offset-slate-950 animate-pulse"
                              : ""
                              }`}
                          />
                        </label>
                      </div>
                    </div>

                    {/* TAB 3: ฉากที่ 2: ช่วงเวลาของเรา (Act 2) */}
                    <div
                      id="editor-step-panel-3"
                      hidden={activeStep !== 3}
                      className="space-y-5 rounded-2xl border border-violet-500/20 bg-violet-950/20 p-5 shadow-lg shadow-black/30 backdrop-blur"
                    >
                      <div className="flex items-center justify-between border-b border-violet-500/20 pb-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-violet-400" />
                          <h3 className="text-lg font-bold text-violet-100">แท็บ 3: ฉากที่ 2 — ช่วงเวลาของเรา (ACT 2: JOURNEY IN TIME)</h3>
                        </div>
                        <span className="text-xs font-mono text-violet-300">12.0s - 20.0s</span>
                      </div>

                      <div className="space-y-4">
                        <div
                          id="field-starlight-act-2"
                          className={`rounded-xl transition-all p-1 ${highlightedFieldId === "field-starlight-act-2"
                            ? "ring-4 ring-violet-400 ring-offset-2 ring-offset-slate-950 animate-pulse"
                            : ""
                            }`}
                        >
                          <SurpriseQRMediaInput
                            label="รูปภาพฉากที่ 2 (Widescreen 21:9)"
                            value={surpriseQRData.content.memories.filmstripImages?.[1]?.src || ""}
                            onChange={(src) => setSurpriseQRImage("filmstrip", 1, src)}
                            placeholder="วาง URL หรือเลือกไฟล์รูปภาพที่ 2"
                          />
                        </div>

                        <label className="block text-base font-semibold text-slate-200">
                          ชื่อหัวข้อฉากที่ 2 (Act Label)
                          <input
                            id="field-starlight-act-label-2"
                            value={surpriseQRData.content.menu.card2Title || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: { ...current.content, menu: { ...current.content.menu, card2Title: val } },
                              }));
                            }}
                            placeholder="ACT 2: JOURNEY IN TIME"
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 ${highlightedFieldId === "field-starlight-act-label-2"
                              ? "ring-4 ring-violet-400 ring-offset-2 ring-offset-slate-950 animate-pulse"
                              : ""
                              }`}
                          />
                        </label>

                        <label className="block text-base font-semibold text-slate-200">
                          ข้อความความในใจฉากที่ 2 (Subtitle ท่อนที่ 2)
                          <textarea
                            id="field-starlight-act-text-2"
                            rows={3}
                            value={surpriseQRData.content.letter.paragraphs[1] || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSurpriseQRData((current) => {
                                const nextParas = [...current.content.letter.paragraphs];
                                nextParas[1] = val;
                                return {
                                  ...current,
                                  content: {
                                    ...current.content,
                                    letter: {
                                      ...current.content.letter,
                                      paragraphs: nextParas,
                                    },
                                  },
                                };
                              });
                            }}
                            placeholder="ทุกช่วงเวลาที่เราได้หัวเราะและแบ่งปันรอยยิ้มด้วยกัน คือความทรงจำที่ล้ำค่าที่สุดในชีวิต..."
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 ${highlightedFieldId === "field-starlight-act-text-2"
                              ? "ring-4 ring-violet-400 ring-offset-2 ring-offset-slate-950 animate-pulse"
                              : ""
                              }`}
                          />
                        </label>
                      </div>
                    </div>

                    {/* TAB 4: ฉากที่ 3: คำสัญญา (Act 3) */}
                    <div
                      id="editor-step-panel-4"
                      hidden={activeStep !== 4}
                      className="space-y-5 rounded-2xl border border-violet-500/20 bg-violet-950/20 p-5 shadow-lg shadow-black/30 backdrop-blur"
                    >
                      <div className="flex items-center justify-between border-b border-violet-500/20 pb-3">
                        <div className="flex items-center gap-2">
                          <Star className="h-5 w-5 text-violet-400" />
                          <h3 className="text-lg font-bold text-violet-100">แท็บ 4: ฉากที่ 3 — คำสัญญา (ACT 3: THE HEARTBEAT)</h3>
                        </div>
                        <span className="text-xs font-mono text-violet-300">20.0s - 28.0s (Climax)</span>
                      </div>

                      <div className="space-y-4">
                        <div
                          id="field-starlight-act-3"
                          className={`rounded-xl transition-all p-1 ${highlightedFieldId === "field-starlight-act-3"
                            ? "ring-4 ring-violet-400 ring-offset-2 ring-offset-slate-950 animate-pulse"
                            : ""
                            }`}
                        >
                          <SurpriseQRMediaInput
                            label="รูปภาพฉากที่ 3 (Widescreen 21:9 — ไคลแมกซ์)"
                            value={surpriseQRData.content.memories.filmstripImages?.[2]?.src || ""}
                            onChange={(src) => setSurpriseQRImage("filmstrip", 2, src)}
                            placeholder="วาง URL หรือเลือกไฟล์รูปภาพที่ 3"
                          />
                        </div>

                        <label className="block text-base font-semibold text-slate-200">
                          ชื่อหัวข้อฉากที่ 3 (Act Label)
                          <input
                            id="field-starlight-act-label-3"
                            value={surpriseQRData.content.menu.card3Title || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: { ...current.content, menu: { ...current.content.menu, card3Title: val } },
                              }));
                            }}
                            placeholder="ACT 3: THE HEARTBEAT"
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 ${highlightedFieldId === "field-starlight-act-label-3"
                              ? "ring-4 ring-violet-400 ring-offset-2 ring-offset-slate-950 animate-pulse"
                              : ""
                              }`}
                          />
                        </label>

                        <label className="block text-base font-semibold text-slate-200">
                          ข้อความความในใจฉากที่ 3 (Subtitle ไคลแมกซ์)
                          <textarea
                            id="field-starlight-act-text-3"
                            rows={3}
                            value={surpriseQRData.content.letter.paragraphs[2] || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSurpriseQRData((current) => {
                                const nextParas = [...current.content.letter.paragraphs];
                                nextParas[2] = val;
                                return {
                                  ...current,
                                  content: {
                                    ...current.content,
                                    letter: {
                                      ...current.content.letter,
                                      paragraphs: nextParas,
                                    },
                                  },
                                };
                              });
                            }}
                            placeholder="ขอบคุณที่คอยเป็นแสงสว่างที่แสนอบอุ่น และทำให้ทุกๆ วันมีความหมายเสมอมา..."
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 ${highlightedFieldId === "field-starlight-act-text-3"
                              ? "ring-4 ring-violet-400 ring-offset-2 ring-offset-slate-950 animate-pulse"
                              : ""
                              }`}
                          />
                        </label>
                      </div>
                    </div>

                    {/* TAB 5: ฉากส่งท้าย Finale */}
                    <div
                      id="editor-step-panel-5"
                      hidden={activeStep !== 5}
                      className="space-y-5 rounded-2xl border border-violet-500/20 bg-violet-950/20 p-5 shadow-lg shadow-black/30 backdrop-blur"
                    >
                      <div className="flex items-center gap-2 border-b border-violet-500/20 pb-3">
                        <ImageIcon className="h-5 w-5 text-violet-400" />
                        <h3 className="text-lg font-bold text-violet-100">แท็บ 5: ฉากส่งท้าย (Polaroid Memory Stack & Finale)</h3>
                      </div>
                      <p className="text-xs text-slate-400">
                        ฉากส่งท้ายจะแสดงผลหลังจบคัดซีน 28 วินาที เป็นโพลารอยด์แห่งความทรงจำที่ผู้รับสามารถแตะเปิดดูภาพขยายและอ่านข้อความทบทวนได้อย่างอิสระ
                      </p>

                      <div className="space-y-4">
                        <label className="block text-base font-semibold text-slate-200">
                          ข้อความหัวเรื่องฉากส่งท้าย (Polaroid Header)
                          <input
                            id="field-starlight-finale-title"
                            value={surpriseQRData.content.finale.mainText || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  finale: {
                                    ...current.content.finale,
                                    mainText: val,
                                  },
                                },
                              }));
                            }}
                            placeholder="ALWAYS IN MY HEART"
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all ${highlightedFieldId === "field-starlight-finale-title"
                              ? "ring-4 ring-violet-400 ring-offset-2 ring-offset-slate-950 animate-pulse"
                              : ""
                              }`}
                          />
                        </label>

                        <label className="block text-base font-semibold text-slate-200">
                          คำอวยพรจบ / ข้อความปิดท้าย (Finale Message)
                          <textarea
                            id="field-starlight-finale-msg"
                            rows={3}
                            value={surpriseQRData.content.finale.subText || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  finale: {
                                    ...current.content.finale,
                                    subText: val,
                                  },
                                },
                              }));
                            }}
                            placeholder="และจะยังคงเป็นดวงดาวที่งดงามที่สุดเสมอ"
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all ${highlightedFieldId === "field-starlight-finale-msg"
                              ? "ring-4 ring-violet-400 ring-offset-2 ring-offset-slate-950 animate-pulse"
                              : ""
                              }`}
                          />
                        </label>

                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="block text-base font-semibold text-slate-200">
                            คำแนะนำการดูโพลารอยด์ (Gallery Hint)
                            <input
                              id="field-starlight-gallery-hint"
                              value={surpriseQRData.content.memories.description || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSurpriseQRData((current) => ({
                                  ...current,
                                  content: {
                                    ...current.content,
                                    memories: {
                                      ...current.content.memories,
                                      description: val,
                                    },
                                  },
                                }));
                              }}
                              placeholder="ปาดเลือกหยิบดูภาพโพลารอยด์ หรือแตะเพื่ออ่านข้อความความในใจ"
                              className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all ${highlightedFieldId === "field-starlight-gallery-hint"
                                ? "ring-4 ring-violet-400 ring-offset-2 ring-offset-slate-950 animate-pulse"
                                : ""
                                }`}
                            />
                          </label>

                          <label className="block text-base font-semibold text-slate-200">
                            ข้อความปุ่มเล่นซ้ำ (Replay Button)
                            <input
                              id="field-starlight-replay-label"
                              value={surpriseQRData.content.flowers.subTitle || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSurpriseQRData((current) => ({
                                  ...current,
                                  content: {
                                    ...current.content,
                                    flowers: {
                                      ...current.content.flowers,
                                      subTitle: val,
                                    },
                                  },
                                }));
                              }}
                              placeholder="ชมคัดซีนภาพยนตร์อีกครั้ง"
                              className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all ${highlightedFieldId === "field-starlight-replay-label"
                                ? "ring-4 ring-violet-400 ring-offset-2 ring-offset-slate-950 animate-pulse"
                                : ""
                                }`}
                            />
                          </label>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                          <label className="block text-sm font-semibold text-slate-200">
                            ป้ายหมายเลขโพลารอยด์ 1
                            <input
                              id="field-starlight-scene-badge-1"
                              value={surpriseQRData.content.menu.card1Desc || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSurpriseQRData((current) => ({
                                  ...current,
                                  content: { ...current.content, menu: { ...current.content.menu, card1Desc: val } },
                                }));
                              }}
                              placeholder="SCENE 01"
                              className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all ${highlightedFieldId === "field-starlight-scene-badge-1"
                                ? "ring-4 ring-violet-400 ring-offset-2 ring-offset-slate-950 animate-pulse"
                                : ""
                                }`}
                            />
                          </label>
                          <label className="block text-sm font-semibold text-slate-200">
                            ป้ายหมายเลขโพลารอยด์ 2
                            <input
                              id="field-starlight-scene-badge-2"
                              value={surpriseQRData.content.menu.card2Desc || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSurpriseQRData((current) => ({
                                  ...current,
                                  content: { ...current.content, menu: { ...current.content.menu, card2Desc: val } },
                                }));
                              }}
                              placeholder="SCENE 02"
                              className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all ${highlightedFieldId === "field-starlight-scene-badge-2"
                                ? "ring-4 ring-violet-400 ring-offset-2 ring-offset-slate-950 animate-pulse"
                                : ""
                                }`}
                            />
                          </label>
                          <label className="block text-sm font-semibold text-slate-200">
                            ป้ายหมายเลขโพลารอยด์ 3
                            <input
                              id="field-starlight-scene-badge-3"
                              value={surpriseQRData.content.menu.card3Desc || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSurpriseQRData((current) => ({
                                  ...current,
                                  content: { ...current.content, menu: { ...current.content.menu, card3Desc: val } },
                                }));
                              }}
                              placeholder="SCENE 03"
                              className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all ${highlightedFieldId === "field-starlight-scene-badge-3"
                                ? "ring-4 ring-violet-400 ring-offset-2 ring-offset-slate-950 animate-pulse"
                                : ""
                                }`}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedStrategy === "vintage-wax-seal" && (
                  <div
                    className="space-y-6"
                    onFocusCapture={handleEditingStart}
                    onBlurCapture={handleEditingEnd}
                  >
                    {/* TAB 1: ซองจดหมาย & ตราครั่ง */}
                    <div
                      id="editor-step-panel-1"
                      hidden={activeStep !== 1}
                      className="space-y-5 rounded-2xl border border-amber-500/25 bg-amber-950/20 p-5 shadow-lg shadow-black/30 backdrop-blur"
                    >
                      <div className="flex items-center gap-2 border-b border-amber-500/20 pb-3">
                        <Mail className="h-5 w-5 text-amber-400" />
                        <h3 className="text-lg font-bold text-amber-100">แท็บ 1: หน้าซองจดหมาย & ตราประทับครั่ง</h3>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-base font-semibold text-slate-200">
                          หัวข้อหน้าซอง / ชื่อผู้รับหลัก (Envelope Title)
                          <input
                            id="field-wax-envelope-title"
                            value={cardTitle}
                            onChange={(e) => setCardTitle(e.target.value)}
                            placeholder="To Someone Special"
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all ${highlightedFieldId === "field-wax-envelope-title" ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse" : ""}`}
                          />
                        </label>
                        <label className="text-base font-semibold text-slate-200">
                          คำจั่วหัวเหนือชื่อ (Royal Subtitle)
                          <input
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            placeholder="Royal Parchment"
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                          />
                        </label>
                      </div>
                      <div id="field-wax-seal-style" className={`space-y-2 rounded-xl border border-amber-500/20 bg-slate-950/40 p-4 ${highlightedFieldId === "field-wax-seal-style" ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse" : ""}`}>
                        <span className="block text-sm font-bold text-amber-200">สีของตราครั่งประทับซอง</span>
                        <div className="grid grid-cols-3 gap-3 pt-1">
                          {([
                            { id: 1 as const, label: "ครั่งแดงทับทิม (รูปหัวใจ)" },
                            { id: 2 as const, label: "ครั่งทองคำโบราณ (รูปกุหลาบ)" },
                            { id: 3 as const, label: "ครั่งแดงหลวง (รูปมงกุฎ)" },
                          ]).map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setEnvelopeStyle(item.id)}
                              className={`rounded-xl border px-3 py-2.5 text-xs sm:text-sm font-bold transition-all ${envelopeStyle === item.id
                                  ? "border-amber-400 bg-amber-500/25 text-amber-100 shadow-sm shadow-amber-500/25"
                                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                                }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* TAB 2: รหัสลับหลังเปิดซอง */}
                    <div
                      id="editor-step-panel-2"
                      hidden={activeStep !== 2}
                      className="space-y-5 rounded-2xl border border-amber-500/25 bg-amber-950/20 p-5 shadow-lg shadow-black/30 backdrop-blur"
                    >
                      <div className="flex items-center gap-2 border-b border-amber-500/20 pb-3">
                        <Lock className="h-5 w-5 text-amber-400" />
                        <h3 className="text-lg font-bold text-amber-100">แท็บ 2: รหัสลับ 4 หลัก (แสดงหลังเปิดซอง)</h3>
                      </div>
                      <p className="text-sm text-slate-300">
                        เมื่อผู้รับแตะแกะตราครั่งเปิดซอง ระบบจะเริ่มเล่นเสียงเพลงอัตโนมัติ และให้กรอกรหัสลับ 4 หลักก่อนเปิดอ่านสารราชสาส์น
                      </p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="flex items-center gap-3 rounded-xl border border-amber-400/25 bg-slate-950/50 p-4 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={surpriseQRData.settings.enablePin}
                            onChange={(e) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                settings: { ...current.settings, enablePin: e.target.checked },
                              }))
                            }
                            className="h-5 w-5 accent-amber-500"
                          />
                          <span className="text-base font-bold text-amber-100">เปิดใช้งานรหัสลับหลังเปิดซอง</span>
                        </label>
                        <label className="text-base font-semibold text-slate-200">
                          รหัส PIN 4 หลัก
                          <input
                            id="field-wax-pin-code"
                            maxLength={4}
                            inputMode="numeric"
                            disabled={!surpriseQRData.settings.enablePin}
                            value={surpriseQRData.settings.pinCode}
                            onChange={(e) => {
                              const cleanPin = e.target.value.replace(/\D/g, "").slice(0, 4);
                              setSurpriseQRData((current) => ({
                                ...current,
                                settings: { ...current.settings, pinCode: cleanPin },
                              }));
                            }}
                            placeholder="1234"
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 font-mono text-lg tracking-[0.35em] text-amber-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:opacity-45 transition-all ${highlightedFieldId === "field-wax-pin-code" ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse" : ""}`}
                          />
                        </label>
                      </div>
                    </div>

                    {/* TAB 3: สารราชสาส์น */}
                    <div
                      id="editor-step-panel-3"
                      hidden={activeStep !== 3}
                      className="space-y-5 rounded-2xl border border-amber-500/25 bg-amber-950/20 p-5 shadow-lg shadow-black/30 backdrop-blur"
                    >
                      <div className="flex items-center gap-2 border-b border-amber-500/20 pb-3">
                        <Sparkles className="h-5 w-5 text-amber-400" />
                        <h3 className="text-lg font-bold text-amber-100">แท็บ 3: สารราชสาส์นบนกระดาษโบราณ</h3>
                      </div>
                      <label className="block text-base font-semibold text-slate-200">
                        หัวข้อจดหมาย (Letter Headline)
                        <input
                          id="field-wax-letter-title"
                          value={surpriseQRData.content.letter.title}
                          onChange={(e) =>
                            setSurpriseQRData((current) => ({
                              ...current,
                              content: {
                                ...current.content,
                                letter: { ...current.content.letter, title: e.target.value },
                              },
                            }))
                          }
                          placeholder="คำจารึกถึงคนสำคัญที่สุด"
                          className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${highlightedFieldId === "field-wax-letter-title" ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse" : ""}`}
                        />
                      </label>
                      <label className="block text-base font-semibold text-slate-200">
                        เนื้อความ (ขึ้นย่อหน้าใหม่ด้วยการเว้น 1 บรรทัด)
                        <textarea
                          id="field-wax-letter-body"
                          rows={6}
                          value={surpriseQRData.content.letter.paragraphs.join("\n\n")}
                          onChange={(e) => {
                            const paragraphs = e.target.value
                              .split(/\n{2,}/)
                              .map((p) => p.trim())
                              .filter((p) => p.length > 0);
                            setSurpriseQRData((current) => ({
                              ...current,
                              content: {
                                ...current.content,
                                letter: {
                                  ...current.content.letter,
                                  paragraphs: paragraphs.length > 0 ? paragraphs : [""],
                                },
                              },
                            }));
                          }}
                          placeholder="พิมพ์ข้อความในจดหมาย..."
                          className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${highlightedFieldId === "field-wax-letter-body" ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse" : ""}`}
                        />
                      </label>
                    </div>

                    {/* TAB 4: คลังภาพความทรงจำ */}
                    <div
                      id="editor-step-panel-4"
                      hidden={activeStep !== 4}
                      className="space-y-5 rounded-2xl border border-amber-500/25 bg-amber-950/20 p-5 shadow-lg shadow-black/30 backdrop-blur"
                    >
                      <div className="flex items-center gap-2 border-b border-amber-500/20 pb-3">
                        <Images className="h-5 w-5 text-amber-400" />
                        <h3 className="text-lg font-bold text-amber-100">แท็บ 4: ภาพความทรงจำกรอบทองคำ</h3>
                      </div>
                      <div id="field-wax-photos" className={`grid gap-4 md:grid-cols-3 rounded-xl p-1 ${highlightedFieldId === "field-wax-photos" ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse" : ""}`}>
                        {[0, 1, 2].map((idx) => (
                          <SurpriseQRMediaInput
                            key={idx}
                            label={`ภาพความทรงจำที่ ${idx + 1}`}
                            value={surpriseQRData.content.memories.polaroidImages[idx]?.src ?? ""}
                            onChange={(src) => setSurpriseQRImage("polaroid", idx, src)}
                          />
                        ))}
                      </div>
                      <label className="block text-base font-semibold text-slate-200">
                        คำบรรยายใต้กรอบรูปภาพหลัก (Gallery Caption)
                        <input
                          id="field-wax-photo-caption"
                          value={surpriseQRData.content.memories.description}
                          onChange={(e) =>
                            setSurpriseQRData((current) => ({
                              ...current,
                              content: {
                                ...current.content,
                                memories: { ...current.content.memories, description: e.target.value },
                              },
                            }))
                          }
                          placeholder="ช่วงเวลาอันแสนพิเศษของเรา"
                          className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${highlightedFieldId === "field-wax-photo-caption" ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse" : ""}`}
                        />
                      </label>
                    </div>

                    {/* TAB 5: หีบดนตรี & เสียงเพลง */}
                    <div
                      id="editor-step-panel-5"
                      hidden={activeStep !== 5}
                      className="space-y-5 rounded-2xl border border-amber-500/25 bg-amber-950/20 p-5 shadow-lg shadow-black/30 backdrop-blur"
                    >
                      <div className="flex items-center gap-2 border-b border-amber-500/20 pb-3">
                        <Music className="h-5 w-5 text-amber-400" />
                        <h3 className="text-lg font-bold text-amber-100">แท็บ 5: หีบดนตรี & เสียงประกอบอัตโนมัติ</h3>
                      </div>
                      <p className="text-xs text-amber-200/80">
                        หากไม่อัปโหลดไฟล์เสียง ระบบจะบรรเลงทำนองหีบดนตรีคลาสสิกอัตโนมัติทันทีที่เปิดผนึกซอง
                      </p>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-base font-semibold text-slate-200">
                          ชื่อบทเพลง (Song Title)
                          <input
                            id="field-wax-song-title"
                            value={surpriseQRData.content.songMedia.songTitle}
                            onChange={(e) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  songMedia: { ...current.content.songMedia, songTitle: e.target.value },
                                },
                              }))
                            }
                            placeholder="Our Eternal Song"
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${highlightedFieldId === "field-wax-song-title" ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse" : ""}`}
                          />
                        </label>
                        <label className="text-base font-semibold text-slate-200">
                          ศิลปิน / คำอธิบายบทเพลง
                          <input
                            value={surpriseQRData.content.songMedia.sectionTitle}
                            onChange={(e) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  songMedia: { ...current.content.songMedia, sectionTitle: e.target.value },
                                },
                              }))
                            }
                            placeholder="Royal Music Box Selection"
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                          />
                        </label>
                        <div className="md:col-span-2">
                          <SurpriseQRMediaInput
                            label="ไฟล์เสียง / MP3 ประกอบ (เว้นว่างเพื่อใช้เสียงหีบดนตรีในตัว)"
                            accept="audio/*"
                            value={surpriseQRData.content.songMedia.src}
                            onChange={(src) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  songMedia: { ...current.content.songMedia, src },
                                },
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* TAB 6: คำปฏิญาณปิดท้าย */}
                    <div
                      id="editor-step-panel-6"
                      hidden={activeStep !== 6}
                      className="space-y-5 rounded-2xl border border-amber-500/25 bg-amber-950/20 p-5 shadow-lg shadow-black/30 backdrop-blur"
                    >
                      <div className="flex items-center gap-2 border-b border-amber-500/20 pb-3">
                        <Star className="h-5 w-5 text-amber-400" />
                        <h3 className="text-lg font-bold text-amber-100">แท็บ 6: ลายเซ็น & คำปฏิญาณปิดท้าย</h3>
                      </div>
                      <label className="block text-base font-semibold text-slate-200">
                        ข้อความลงนาม / หัวข้อปิดท้าย
                        <input
                          id="field-wax-finale-message"
                          value={surpriseQRData.content.finale.mainText}
                          onChange={(e) =>
                            setSurpriseQRData((current) => ({
                              ...current,
                              content: {
                                ...current.content,
                                finale: { ...current.content.finale, mainText: e.target.value },
                              },
                            }))
                          }
                          placeholder="ด้วยความปรารถนาดีเสมอมา"
                          className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${highlightedFieldId === "field-wax-finale-message" ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse" : ""}`}
                        />
                      </label>
                      <label className="block text-base font-semibold text-slate-200">
                        ข้อความคำมั่นสัญญาเพิ่มเติม (Finale Subtext)
                        <textarea
                          rows={3}
                          value={surpriseQRData.content.finale.subText}
                          onChange={(e) =>
                            setSurpriseQRData((current) => ({
                              ...current,
                              content: {
                                ...current.content,
                                finale: { ...current.content.finale, subText: e.target.value },
                              },
                            }))
                          }
                          placeholder="เก็บถ้อยคำและช่วงเวลาเหล่านี้ไว้เป็นคำสัญญาในความทรงจำตลอดไป"
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                        />
                      </label>
                      <label className="block text-base font-semibold text-slate-200">
                        วันครบรอบ / วันเริ่มต้น (สำหรับนับเวลารวมในฉากจบ)
                        <input
                          id="field-wax-anniversary-date"
                          type="date"
                          value={surpriseQRData.content.finale.anniversaryDate ?? "2024-02-14"}
                          onChange={(e) =>
                            setSurpriseQRData((current) => ({
                              ...current,
                              content: {
                                ...current.content,
                                finale: {
                                  ...current.content.finale,
                                  anniversaryDate: e.target.value,
                                },
                              },
                            }))
                          }
                          className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${highlightedFieldId === "field-wax-anniversary-date" ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse" : ""}`}
                        />
                      </label>
                    </div>
                  </div>
                )}
                {selectedStrategy === "anniversary-surprise" && (
                  <div
                    className="space-y-6"
                    onFocusCapture={handleEditingStart}
                    onBlurCapture={handleEditingEnd}
                  >
                    <p className="mb-4 text-base font-bold text-slate-200">
                      แก้ไขเนื้อหา Anniversary Surprise (ซองจดหมาย + PIN 7 หน้าจอ)
                    </p>
                    <div id="editor-step-panel-1-b" hidden={activeStep !== 1} className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="mb-3 text-sm font-black uppercase tracking-wider text-fuchsia-300">📩 ซองจดหมาย & ตั้งค่าทั่วไป</p>
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                        <Info className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-yellow-400">หมายเหตุ: หากไม่ต้องการให้แสดงข้อความในจุดใด ให้ใส่เว้นวรรค (Spacebar) 1 ครั้งในช่องนั้น</span>
                      </p>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="text-base font-semibold text-slate-200">
                          <div className="flex items-center justify-between">
                            <span>เปิดใช้รหัส PIN</span>
                            <button
                              type="button"
                              onClick={() =>
                                setSurpriseQRData((current) => ({
                                  ...current,
                                  settings: {
                                    ...current.settings,
                                    enablePin: !current.settings.enablePin,
                                  },
                                }))
                              }
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${surpriseQRData.settings.enablePin ? "bg-fuchsia-500" : "bg-slate-700"
                                }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${surpriseQRData.settings.enablePin ? "translate-x-6" : "translate-x-1"
                                  }`}
                              />
                            </button>
                          </div>
                          <p className="mt-1 text-xs text-slate-400">
                            {surpriseQRData.settings.enablePin ? "ผู้รับจะต้องใส่ PIN 4 หลักเพื่อเปิดซอง" : "ปิด PIN ผู้รับเปิดซองได้ทันที"}
                          </p>
                        </div>
                        <label className="text-base font-semibold text-slate-200">
                          รหัส PIN (4 หลัก)
                          <div className="relative mt-2">
                            <input
                              value={surpriseQRData.settings.pinCode}
                              onChange={(event) =>
                                setSurpriseQRData((current) => ({
                                  ...current,
                                  settings: {
                                    ...current.settings,
                                    pinCode: event.target.value.replace(/\D/g, "").slice(0, 4),
                                  },
                                }))
                              }
                              disabled={!surpriseQRData.settings.enablePin}
                              className={`w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20 ${!surpriseQRData.settings.enablePin ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                              placeholder="1234"
                            />
                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                              {surpriseQRData.settings.enablePin ? (
                                <Key className="h-4 w-4 text-fuchsia-400" />
                              ) : (
                                <Lock className="h-4 w-4 text-white/40" />
                              )}
                            </div>
                          </div>
                        </label>
                        <label className="text-base font-semibold text-slate-200">
                          วาร์ปเปิดซอง (ms)
                          <input
                            type="number"
                            value={surpriseQRData.settings.warpDurationEnvelopeMs}
                            onChange={(event) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                settings: {
                                  ...current.settings,
                                  warpDurationEnvelopeMs: Number(event.target.value) || 4500,
                                },
                              }))
                            }
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                          />
                        </label>
                        <label className="text-base font-semibold text-slate-200">
                          วาร์ปเปลี่ยนหน้า (ms)
                          <input
                            type="number"
                            value={surpriseQRData.settings.warpDurationOptionMs}
                            onChange={(event) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                settings: {
                                  ...current.settings,
                                  warpDurationOptionMs: Number(event.target.value) || 3000,
                                },
                              }))
                            }
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                          />
                        </label>
                      </div>
                    </div>

                    <div id="editor-step-panel-2" hidden={activeStep !== 2} className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="mb-3 text-sm font-black uppercase tracking-wider text-fuchsia-300">🎁 หน้า 2 — เมนูเลือกของขวัญ</p>
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                        <Info className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-yellow-400">หมายเหตุ: หากไม่ต้องการให้แสดงข้อความในจุดใด ให้ใส่เว้นวรรค (Spacebar) 1 ครั้งในช่องนั้น</span>
                      </p>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-base font-semibold text-slate-200 md:col-span-2">
                          หัวข้อย่อย (Subtitle)
                          <input
                            value={surpriseQRData.content.menu.subTitle}
                            onChange={(event) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  menu: { ...current.content.menu, subTitle: event.target.value },
                                },
                              }))
                            }
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                            placeholder="ของขวัญที่รออยู่"
                          />
                        </label>
                        <label className="text-base font-semibold text-slate-200 md:col-span-2">
                          หัวข้อหลัก (Title)
                          <input
                            value={surpriseQRData.content.menu.title}
                            onChange={(event) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  menu: { ...current.content.menu, title: event.target.value },
                                },
                              }))
                            }
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                            placeholder="เลือกของขวัญสักชิ้นสิ"
                          />
                        </label>

                        <label className="text-base font-semibold text-slate-200 md:col-span-2">
                          <span className="text-fuchsia-300">การ์ด 1 — จดหมายรัก</span>
                        </label>
                        <label className="text-base font-semibold text-slate-200">
                          ไอคอน (Emoji)
                          <input
                            value={surpriseQRData.content.menu.card1Icon}
                            onChange={(event) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  menu: { ...current.content.menu, card1Icon: event.target.value },
                                },
                              }))
                            }
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                            placeholder="💌"
                          />
                        </label>
                        <label className="text-base font-semibold text-slate-200">
                          ชื่อการ์ด 1 (Title)
                          <input
                            value={surpriseQRData.content.menu.card1Title}
                            onChange={(event) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  menu: { ...current.content.menu, card1Title: event.target.value },
                                },
                              }))
                            }
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                            placeholder="ข้อความจากหัวใจ"
                          />
                        </label>
                        <label className="text-base font-semibold text-slate-200 md:col-span-2">
                          คำอธิบายการ์ด 1 (Description)
                          <input
                            value={surpriseQRData.content.menu.card1Desc}
                            onChange={(event) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  menu: { ...current.content.menu, card1Desc: event.target.value },
                                },
                              }))
                            }
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                            placeholder="จดหมายรักที่เขียนด้วยใจถึงเธอ"
                          />
                        </label>

                        <label className="text-base font-semibold text-slate-200 md:col-span-2">
                          <span className="text-fuchsia-300">การ์ด 2 — ความทรงจำ</span>
                        </label>
                        <label className="text-base font-semibold text-slate-200">
                          ไอคอน (Emoji)
                          <input
                            value={surpriseQRData.content.menu.card2Icon}
                            onChange={(event) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  menu: { ...current.content.menu, card2Icon: event.target.value },
                                },
                              }))
                            }
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                            placeholder="📸"
                          />
                        </label>
                        <label className="text-base font-semibold text-slate-200">
                          ชื่อการ์ด 2 (Title)
                          <input
                            value={surpriseQRData.content.menu.card2Title}
                            onChange={(event) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  menu: { ...current.content.menu, card2Title: event.target.value },
                                },
                              }))
                            }
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                            placeholder="ความทรงจำ"
                          />
                        </label>
                        <label className="text-base font-semibold text-slate-200 md:col-span-2">
                          คำอธิบายการ์ด 2 (Description)
                          <input
                            value={surpriseQRData.content.menu.card2Desc}
                            onChange={(event) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  menu: { ...current.content.menu, card2Desc: event.target.value },
                                },
                              }))
                            }
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                            placeholder="ภาพช่วงเวลาแสนดีของเรา"
                          />
                        </label>

                        <label className="text-base font-semibold text-slate-200 md:col-span-2">
                          <span className="text-fuchsia-300">การ์ด 3 — ดอกไม้</span>
                        </label>
                        <label className="text-base font-semibold text-slate-200">
                          ไอคอน (Emoji)
                          <input
                            value={surpriseQRData.content.menu.card3Icon}
                            onChange={(event) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  menu: { ...current.content.menu, card3Icon: event.target.value },
                                },
                              }))
                            }
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                            placeholder="💐"
                          />
                        </label>
                        <label className="text-base font-semibold text-slate-200">
                          ชื่อการ์ด 3 (Title)
                          <input
                            value={surpriseQRData.content.menu.card3Title}
                            onChange={(event) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  menu: { ...current.content.menu, card3Title: event.target.value },
                                },
                              }))
                            }
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                            placeholder="ดอกไม้"
                          />
                        </label>
                        <label className="text-base font-semibold text-slate-200 md:col-span-2">
                          คำอธิบายการ์ด 3 (Description)
                          <input
                            value={surpriseQRData.content.menu.card3Desc}
                            onChange={(event) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  menu: { ...current.content.menu, card3Desc: event.target.value },
                                },
                              }))
                            }
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                            placeholder="ช่อดอกไม้เสมือนจริงจากใจ"
                          />
                        </label>
                      </div>
                    </div>

                    <div id="editor-step-panel-3" hidden={activeStep !== 3} className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="mb-3 text-sm font-black uppercase tracking-wider text-fuchsia-300">💌 หน้า 3 — จดหมายรัก</p>
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                        <Info className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-yellow-400">หมายเหตุ: หากไม่ต้องการให้แสดงข้อความในจุดใด ให้ใส่เว้นวรรค (Spacebar) 1 ครั้งในช่องนั้น</span>
                      </p>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-base font-semibold text-slate-200 md:col-span-2">
                          หัวข้อจดหมาย (Letter Title)
                          <input
                            value={surpriseQRData.content.letter.title}
                            onChange={(event) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  letter: { ...current.content.letter, title: event.target.value },
                                },
                              }))
                            }
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                            placeholder="Happy Anniversary, my love."
                          />
                        </label>
                        <label className="text-base font-semibold text-slate-200 md:col-span-2">
                          เนื้อความจดหมาย (เว้นบรรทัดว่างคั่นแต่ละย่อหน้า)
                          <textarea
                            value={surpriseQRData.content.letter.paragraphs.join("\n\n")}
                            onChange={(event) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  letter: {
                                    ...current.content.letter,
                                    paragraphs: event.target.value.split(/\n{2,}/),
                                  },
                                },
                              }))
                            }
                            rows={5}
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                            placeholder="ย่อหน้าที่ 1"
                          />
                        </label>
                        <SurpriseQRMediaInput
                          label="โพลารอยด์บน 1"
                          value={surpriseQRData.content.letter.headerImages[0]?.src ?? ""}
                          onChange={(src) => setSurpriseQRImage("letterHeader", 0, src)}
                        />
                        <SurpriseQRMediaInput
                          label="โพลารอยด์บน 2"
                          value={surpriseQRData.content.letter.headerImages[1]?.src ?? ""}
                          onChange={(src) => setSurpriseQRImage("letterHeader", 1, src)}
                        />
                      </div>
                    </div>

                    <div id="editor-step-panel-4" hidden={activeStep !== 4} className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="mb-3 text-sm font-black uppercase tracking-wider text-fuchsia-300">🎞️ หน้า 4 — ความทรงจำ</p>
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                        <Info className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-yellow-400">หมายเหตุ: หากไม่ต้องการให้แสดงข้อความในจุดใด ให้ใส่เว้นวรรค (Spacebar) 1 ครั้งในช่องนั้น</span>
                      </p>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-base font-semibold text-slate-200 md:col-span-2">
                          ชื่อหัวข้อหน้า (Section Title)
                          <input
                            value={surpriseQRData.content.memories.sectionTitle}
                            onChange={(event) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  memories: { ...current.content.memories, sectionTitle: event.target.value },
                                },
                              }))
                            }
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                            placeholder="Memories Made With You"
                          />
                        </label>
                        <label className="text-base font-semibold text-slate-200 md:col-span-2">
                          คำอธิบายความทรงจำ (Description)
                          <textarea
                            value={surpriseQRData.content.memories.description}
                            onChange={(event) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  memories: { ...current.content.memories, description: event.target.value },
                                },
                              }))
                            }
                            rows={3}
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                            placeholder="ข้อความอธิบายความทรงจำ..."
                          />
                        </label>
                        <SurpriseQRMediaInput
                          label="ภาพฟิล์ม 1"
                          value={surpriseQRData.content.memories.filmstripImages[0]?.src ?? ""}
                          onChange={(src) => setSurpriseQRImage("filmstrip", 0, src)}
                        />
                        <SurpriseQRMediaInput
                          label="ภาพฟิล์ม 2"
                          value={surpriseQRData.content.memories.filmstripImages[1]?.src ?? ""}
                          onChange={(src) => setSurpriseQRImage("filmstrip", 1, src)}
                        />
                        <SurpriseQRMediaInput
                          label="ภาพฟิล์ม 3"
                          value={surpriseQRData.content.memories.filmstripImages[2]?.src ?? ""}
                          onChange={(src) => setSurpriseQRImage("filmstrip", 2, src)}
                        />
                        <SurpriseQRMediaInput
                          label="โพลารอยด์ 1"
                          value={surpriseQRData.content.memories.polaroidImages[0]?.src ?? ""}
                          onChange={(src) => setSurpriseQRImage("polaroid", 0, src)}
                        />
                        <SurpriseQRMediaInput
                          label="โพลารอยด์ 2"
                          value={surpriseQRData.content.memories.polaroidImages[1]?.src ?? ""}
                          onChange={(src) => setSurpriseQRImage("polaroid", 1, src)}
                        />
                        <SurpriseQRMediaInput
                          label="โพลารอยด์ 3"
                          value={surpriseQRData.content.memories.polaroidImages[2]?.src ?? ""}
                          onChange={(src) => setSurpriseQRImage("polaroid", 2, src)}
                        />
                        <SurpriseQRMediaInput
                          label="โพลารอยด์ 4"
                          value={surpriseQRData.content.memories.polaroidImages[3]?.src ?? ""}
                          onChange={(src) => setSurpriseQRImage("polaroid", 3, src)}
                        />
                        <SurpriseQRMediaInput
                          label="โพลารอยด์ 5"
                          value={surpriseQRData.content.memories.polaroidImages[4]?.src ?? ""}
                          onChange={(src) => setSurpriseQRImage("polaroid", 4, src)}
                        />
                      </div>
                    </div>

                    <div id="editor-step-panel-5" hidden={activeStep !== 5} className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-fuchsia-300">
                        <Flower className="h-4 w-4 text-fuchsia-400" />
                        <span>หน้า 5 — ดอกไม้ &amp; เสียงพื้นหลัง</span>
                      </p>
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                        <Info className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-yellow-400">หมายเหตุ: หากไม่ต้องการให้แสดงข้อความในจุดใด ให้ใส่เว้นวรรค (Spacebar) 1 ครั้งในช่องนั้น</span>
                      </p>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-base font-semibold text-slate-200 md:col-span-2">
                          หัวข้อย่อย (Subtitle)
                          <input
                            value={surpriseQRData.content.flowers.subTitle}
                            onChange={(event) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  flowers: { ...current.content.flowers, subTitle: event.target.value },
                                },
                              }))
                            }
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                            placeholder="ช่อดอกไม้จากใจ"
                          />
                        </label>
                        <label className="text-base font-semibold text-slate-200 md:col-span-2">
                          หัวข้อหลัก (Title)
                          <input
                            value={surpriseQRData.content.flowers.title}
                            onChange={(event) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  flowers: { ...current.content.flowers, title: event.target.value },
                                },
                              }))
                            }
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                            placeholder="ช่อดอกไม้แห่งความรัก"
                          />
                        </label>
                        <label className="text-base font-semibold text-slate-200 md:col-span-2">
                          ข้อความมอบดอกไม้ (Flower Message)
                          <textarea
                            value={surpriseQRData.content.flowers.message}
                            onChange={(event) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  flowers: { ...current.content.flowers, message: event.target.value },
                                },
                              }))
                            }
                            rows={3}
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                            placeholder="มอบช่อดอกไม้นี้แทนความรู้สึกดีๆ ขอบคุณที่คอยเติมเต็มรอยยิ้มและความอบอุ่นให้กันในทุกๆ วัน"
                          />
                        </label>
                        <label className="text-base font-semibold text-slate-200 md:col-span-2">
                          ข้อความไฮไลต์ความรู้สึก (Highlight)
                          <textarea
                            value={surpriseQRData.content.flowers.highlightText}
                            onChange={(event) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  flowers: { ...current.content.flowers, highlightText: event.target.value },
                                },
                              }))
                            }
                            rows={3}
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                            placeholder="ความรักและการเติบโตเคียงข้างกันตลอดไป"
                          />
                        </label>
                        <label className="text-base font-semibold text-slate-200 md:col-span-2">
                          รายการพรสุ่ม (บรรทัดละ 1 พร — กดปุ่มพรเพื่อสุ่มทีละ 1 ข้อความ)
                          <textarea
                            value={(surpriseQRData.content.flowers.wishes ?? []).join("\n")}
                            onChange={(event) => {
                              const lines = event.target.value.split("\n");
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  flowers: { ...current.content.flowers, wishes: lines },
                                },
                              }));
                            }}
                            rows={4}
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                            placeholder={"ขอให้ทุกวันของเธอเต็มไปด้วยรอยยิ้มและความสุข\nไม่ว่าจะเจอเรื่องอะไร จะมีฉันคอยอยู่ข้างๆ เสมอ\nขอให้ความรักของเราเติบโตและงดงามแบบนี้ตลอดไป"}
                          />
                        </label>
                        <SurpriseQRMediaInput
                          label="เสียงพื้นหลัง mp3 (Background Music)"
                          value={surpriseQRData.content.bgMusic.src}
                          accept="audio/*;video/*"
                          onChange={(src) =>
                            setSurpriseQRData((current) => ({
                              ...current,
                              content: {
                                ...current.content,
                                bgMusic: { ...current.content.bgMusic, src },
                              },
                            }))
                          }
                          placeholder="ไฟล์ mp3"
                        />
                      </div>
                    </div>

                    <div id="editor-step-panel-6" hidden={activeStep !== 6} className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="mb-3 text-sm font-black uppercase tracking-wider text-fuchsia-300">🎬 หน้า 6 — วิดีโอ</p>
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                        <Info className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-yellow-400">หมายเหตุ: หากไม่ต้องการให้แสดงข้อความในจุดใด ให้ใส่เว้นวรรค (Spacebar) 1 ครั้งในช่องนั้น</span>
                      </p>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-base font-semibold text-slate-200 md:col-span-2">
                          ชื่อเพลง (Song Title)
                          <input
                            value={surpriseQRData.content.songMedia.songTitle}
                            onChange={(event) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  songMedia: { ...current.content.songMedia, songTitle: event.target.value },
                                },
                              }))
                            }
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                            placeholder="ความทรงจำ"
                          />
                        </label>
                        <label className="text-base font-semibold text-slate-200 md:col-span-2">
                          ชื่อหัวข้อวิดีโอ (Video Section Title)
                          <input
                            value={surpriseQRData.content.songMedia.sectionTitle}
                            onChange={(event) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  songMedia: { ...current.content.songMedia, sectionTitle: event.target.value },
                                },
                              }))
                            }
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                            placeholder="ความทรงจำ"
                          />
                        </label>
                        <SurpriseQRMediaInput
                          label="ตัวเล่นวิดีโอความทรงจำ"
                          value={surpriseQRData.content.songMedia.src}
                          accept="video/*"
                          onChange={(src) =>
                            setSurpriseQRData((current) => ({
                              ...current,
                              content: {
                                ...current.content,
                                songMedia: { ...current.content.songMedia, src },
                              },
                            }))
                          }
                          placeholder="https://youtu.be/... หรือ https://...mp4"
                        />
                        <SurpriseQRMediaInput
                          label="ภาพกรอบประกอบ 1"
                          value={surpriseQRData.content.songMedia.accentImages[0]?.src ?? ""}
                          onChange={(src) => setSurpriseQRImage("accent", 0, src)}
                        />
                        <SurpriseQRMediaInput
                          label="ภาพกรอบประกอบ 2"
                          value={surpriseQRData.content.songMedia.accentImages[1]?.src ?? ""}
                          onChange={(src) => setSurpriseQRImage("accent", 1, src)}
                        />
                      </div>
                    </div>

                    <div id="editor-step-panel-7" hidden={activeStep !== 7} className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="mb-3 text-sm font-black uppercase tracking-wider text-fuchsia-300">💖 หน้า 7 — ฉากจบ (Finale)</p>
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                        <Info className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-yellow-400">หมายเหตุ: หากไม่ต้องการให้แสดงข้อความในจุดใด ให้ใส่เว้นวรรค (Spacebar) 1 ครั้งในช่องนั้น</span>
                      </p>
                      <div className="grid gap-4 md:grid-cols-2">
                        <SurpriseQRMediaInput
                          label="ภาพพื้นหลัง Hero"
                          value={surpriseQRData.content.finale.heroImage.src}
                          onChange={(src) => setSurpriseQRImage("hero", 0, src)}
                        />
                        <label className="text-base font-semibold text-slate-200">
                          ข้อความหลัก (Main Headline)
                          <input
                            value={surpriseQRData.content.finale.mainText}
                            onChange={(event) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  finale: { ...current.content.finale, mainText: event.target.value },
                                },
                              }))
                            }
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                            placeholder="HAPPY ANNIVERSARY"
                          />
                        </label>
                        <label className="text-base font-semibold text-slate-200 md:col-span-2">
                          ข้อความรอง (Sub Headline)
                          <input
                            value={surpriseQRData.content.finale.subText}
                            onChange={(event) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  finale: { ...current.content.finale, subText: event.target.value },
                                },
                              }))
                            }
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                            placeholder="Love of my life 💕"
                          />
                        </label>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-yellow-400">
                      รูป วิดีโอ เพลง ช่อดอกไม้ และ Finale แก้ไขได้ครบ — กดหมายเลขสเต็ปด้านบนเพื่อสลับหน้าจอพรีวิวกับฟิลด์ให้ตรงกัน (การเปลี่ยนแปลงอัปเดตสดทันที)
                    </p>
                  </div>
                )}

                {selectedStrategy === "candles" && (
                  <div className="space-y-6" onFocusCapture={handleEditingStart} onBlurCapture={handleEditingEnd}>
                    {/* TAB 1: หน้าแรก & ข้อมูลพื้นฐาน */}
                    <div
                      id="editor-step-panel-1"
                      hidden={activeStep !== 1}
                      className="space-y-5 rounded-2xl border border-amber-500/20 bg-amber-950/20 p-5 shadow-lg shadow-black/30 backdrop-blur"
                    >
                      <div className="flex items-center gap-2 border-b border-amber-500/20 pb-3">
                        <Cake className="h-5 w-5 text-amber-400" />
                        <h3 className="text-lg font-bold text-amber-100">แท็บ 1: หน้าแรก & ข้อมูลพื้นฐาน</h3>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-base font-semibold text-slate-200">
                          ชื่อผู้รับ
                          <input
                            id="field-candles-recipient"
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            placeholder="คนพิเศษ"
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none ${highlightedFieldId === "field-candles-recipient" ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse" : ""}`}
                          />
                        </label>
                        <label className="text-base font-semibold text-slate-200">
                          ชื่อผู้ส่ง
                          <input
                            id="field-candles-sender"
                            value={candleConfig.senderName}
                            onChange={(e) => setCandleConfig((prev) => ({ ...prev, senderName: e.target.value }))}
                            placeholder="จากใจคนพิเศษ"
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none ${highlightedFieldId === "field-candles-sender" ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse" : ""}`}
                          />
                        </label>
                        <label className="text-base font-semibold text-slate-200">
                          หัวข้อหน้าแรก
                          <input
                            id="field-candles-intro-headline"
                            value={candleConfig.introHeadline}
                            onChange={(e) => setCandleConfig((prev) => ({ ...prev, introHeadline: e.target.value }))}
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base text-slate-100 focus:border-amber-400 focus:outline-none ${highlightedFieldId === "field-candles-intro-headline" ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse" : ""}`}
                          />
                        </label>
                        <label className="text-base font-semibold text-slate-200">
                          ข้อความปุ่มเริ่ม
                          <input
                            value={candleConfig.introButtonCaption}
                            onChange={(e) => setCandleConfig((prev) => ({ ...prev, introButtonCaption: e.target.value }))}
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base text-slate-100 focus:border-amber-400 focus:outline-none"
                          />
                        </label>
                        <label className="text-base font-semibold text-slate-200 md:col-span-2">
                          ข้อความเกริ่นนำหน้าแรก
                          <textarea
                            id="field-candles-intro-prompt"
                            rows={2}
                            value={candleConfig.introPrompt}
                            onChange={(e) => setCandleConfig((prev) => ({ ...prev, introPrompt: e.target.value }))}
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base text-slate-100 focus:border-amber-400 focus:outline-none ${highlightedFieldId === "field-candles-intro-prompt" ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse" : ""}`}
                          />
                        </label>
                      </div>

                      <div className="pt-1">
                        <SurpriseQRMediaInput
                          label="เพลงประกอบพื้นหลัง (MP3 / YouTube)"
                          value={candleConfig.audioUrl}
                          onChange={(audioUrl) => setCandleConfig((prev) => ({ ...prev, audioUrl }))}
                          accept="audio/*"
                          placeholder="เว้นว่างเพื่อใช้เพลงกล่องดนตรีอัตโนมัติ หรือวาง URL เพลง / YouTube"
                          tier={userTier}
                          isPremiumTemplate={selectedTemplate?.is_premium}
                        />
                      </div>
                    </div>

                    {/* TAB 2: เป่าเทียน & ฉลอง */}
                    <div
                      id="editor-step-panel-2"
                      hidden={activeStep !== 2}
                      className="space-y-5 rounded-2xl border border-amber-500/20 bg-amber-950/20 p-5 shadow-lg shadow-black/30 backdrop-blur"
                    >
                      <div className="flex items-center gap-2 border-b border-amber-500/20 pb-3">
                        <Sparkles className="h-5 w-5 text-amber-400" />
                        <h3 className="text-lg font-bold text-amber-100">แท็บ 2: เป่าเทียน & ฉลอง</h3>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-base font-semibold text-slate-200">
                          หัวข้อหน้าเป่าเทียน
                          <input
                            id="field-candles-blowing-headline"
                            value={candleConfig.blowingHeadline}
                            onChange={(e) => setCandleConfig((prev) => ({ ...prev, blowingHeadline: e.target.value }))}
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base text-slate-100 focus:border-amber-400 focus:outline-none ${highlightedFieldId === "field-candles-blowing-headline" ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse" : ""}`}
                          />
                        </label>
                        <label className="text-base font-semibold text-slate-200">
                          หัวข้อหลังเป่าเทียนดับ
                          <input
                            id="field-candles-celebration-headline"
                            value={candleConfig.celebrationHeadline}
                            onChange={(e) => setCandleConfig((prev) => ({ ...prev, celebrationHeadline: e.target.value }))}
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base text-slate-100 focus:border-amber-400 focus:outline-none ${highlightedFieldId === "field-candles-celebration-headline" ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse" : ""}`}
                          />
                        </label>
                        <label className="text-base font-semibold text-slate-200">
                          ข้อความชวนเล่นหน้าฉลอง
                          <input
                            id="field-candles-celebration-hint"
                            value={candleConfig.celebrationHint}
                            onChange={(e) => setCandleConfig((prev) => ({ ...prev, celebrationHint: e.target.value }))}
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base text-slate-100 focus:border-amber-400 focus:outline-none ${highlightedFieldId === "field-candles-celebration-hint" ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse" : ""}`}
                          />
                        </label>
                        <label className="text-base font-semibold text-slate-200">
                          ข้อความปุ่มเปิดกล่องความลับ
                          <input
                            value={candleConfig.revealButtonCaption}
                            onChange={(e) => setCandleConfig((prev) => ({ ...prev, revealButtonCaption: e.target.value }))}
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base text-slate-100 focus:border-amber-400 focus:outline-none"
                          />
                        </label>
                      </div>
                    </div>

                    {/* TAB 3: รูปภาพ & สาส์นอวยพร */}
                    <div
                      id="editor-step-panel-3"
                      hidden={activeStep !== 3}
                      className="space-y-5 rounded-2xl border border-rose-300/20 bg-rose-950/20 p-5 shadow-lg shadow-black/30 backdrop-blur"
                    >
                      <div className="flex items-center gap-2 border-b border-rose-300/20 pb-3">
                        <Images className="h-5 w-5 text-rose-300" />
                        <h3 className="text-lg font-bold text-rose-100">แท็บ 3: รูปภาพ & สาส์นอวยพร</h3>
                      </div>

                      <div id="field-candles-photos" className="grid gap-4 md:grid-cols-3">
                        {candlePhotos.map((src, index) => (
                          <SurpriseQRMediaInput
                            key={index}
                            label={`รูปความทรงจำ ${index + 1}`}
                            value={src}
                            onChange={(next) => setCandlePhotos((current) => current.map((item, itemIndex) => itemIndex === index ? next : item))}
                            placeholder="วาง URL หรือเลือกไฟล์รูป"
                          />
                        ))}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-base font-semibold text-slate-200">
                          หัวข้อสาส์นอวยพร
                          <input
                            value={candleConfig.letterTitle}
                            onChange={(e) => setCandleConfig((prev) => ({ ...prev, letterTitle: e.target.value }))}
                            placeholder={`สาส์นอวยพรถึง ${recipientName || "คนพิเศษ"}`}
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-rose-400 focus:outline-none"
                          />
                        </label>
                        <label className="text-base font-semibold text-slate-200">
                          ข้อความปุ่มไปหน้าปิดท้าย
                          <input
                            value={candleConfig.closingButtonCaption}
                            onChange={(e) => setCandleConfig((prev) => ({ ...prev, closingButtonCaption: e.target.value }))}
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base text-slate-100 focus:border-rose-400 focus:outline-none"
                          />
                        </label>
                        <label className="text-base font-semibold text-slate-200 md:col-span-2">
                          เนื้อหาสาส์นอวยพร
                          <textarea
                            id="field-candles-letter"
                            rows={4}
                            value={candleConfig.letterMessage}
                            onChange={(e) => setCandleConfig((prev) => ({ ...prev, letterMessage: e.target.value }))}
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base text-slate-100 focus:border-rose-400 focus:outline-none ${highlightedFieldId === "field-candles-letter" ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse" : ""}`}
                          />
                        </label>
                      </div>
                    </div>

                    {/* TAB 4: วิดีโอ & หน้าปิดท้าย */}
                    <div
                      id="editor-step-panel-4"
                      hidden={activeStep !== 4}
                      className="space-y-5 rounded-2xl border border-amber-500/20 bg-amber-950/20 p-5 shadow-lg shadow-black/30 backdrop-blur"
                    >
                      <div className="flex items-center gap-2 border-b border-amber-500/20 pb-3">
                        <Video className="h-5 w-5 text-amber-400" />
                        <h3 className="text-lg font-bold text-amber-100">แท็บ 4: วิดีโอ & หน้าปิดท้าย</h3>
                      </div>

                      <div id="field-candles-video">
                        <SurpriseQRMediaInput
                          label="วิดีโอความทรงจำ (แสดงด้านบนหน้าปิดท้าย)"
                          value={candleVideoUrl}
                          onChange={setCandleVideoUrl}
                          accept="video/*"
                          placeholder="วาง URL วิดีโอ MP4 / YouTube หรือเลือกไฟล์วิดีโอ"
                          tier={userTier}
                          isPremiumTemplate={selectedTemplate?.is_premium}
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-base font-semibold text-slate-200">
                          ป้ายหัวข้อด้านบน
                          <input
                            id="field-candles-closing-badge"
                            value={candleConfig.closingBadge}
                            onChange={(e) => setCandleConfig((prev) => ({ ...prev, closingBadge: e.target.value }))}
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base text-slate-100 focus:border-amber-400 focus:outline-none ${highlightedFieldId === "field-candles-closing-badge" ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse" : ""}`}
                          />
                        </label>
                        <label className="text-base font-semibold text-slate-200">
                          หัวข้อใหญ่หน้าปิดท้าย
                          <input
                            id="field-candles-closing-title"
                            value={candleConfig.closingTitle}
                            onChange={(e) => setCandleConfig((prev) => ({ ...prev, closingTitle: e.target.value }))}
                            placeholder={`Happy Birthday ${recipientName || "คนพิเศษ"}`}
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none ${highlightedFieldId === "field-candles-closing-title" ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse" : ""}`}
                          />
                        </label>
                        <label className="text-base font-semibold text-slate-200 md:col-span-2">
                          คำอวยพรปิดท้าย
                          <textarea
                            id="field-candles-wish"
                            rows={3}
                            value={candleConfig.wishMessage}
                            onChange={(e) => setCandleConfig((prev) => ({ ...prev, wishMessage: e.target.value }))}
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base text-slate-100 focus:border-amber-400 focus:outline-none ${highlightedFieldId === "field-candles-wish" ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 animate-pulse" : ""}`}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {selectedStrategy === "retro-y2k" && (
                  <div className="space-y-6" onFocusCapture={handleEditingStart} onBlurCapture={handleEditingEnd}>
                    {/* TAB 1: หน้าต่างเตือน Alert */}
                    <div
                      id="editor-step-panel-1"
                      hidden={activeStep !== 1}
                      className="space-y-4 rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-5"
                    >
                      <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-3">
                        <AlertCircle className="h-5 w-5 text-cyan-400" />
                        <h3 className="text-lg font-bold text-cyan-100">แท็บ 1: หน้าต่างเตือน Alert (Windows 98)</h3>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-base font-semibold text-slate-200 md:col-span-2">
                          หัวข้อหน้าต่างแจ้งเตือน
                          <input
                            id="field-retro-alert-title"
                            value={surpriseQRData.content.menu.title}
                            onChange={(e) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  menu: { ...current.content.menu, title: e.target.value },
                                },
                              }))
                            }
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base text-slate-100 focus:border-cyan-400 focus:outline-none ${highlightedFieldId === "field-retro-alert-title" ? "ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-950 animate-pulse" : ""}`}
                          />
                        </label>
                        <label className="text-base font-semibold text-slate-200 md:col-span-2">
                          ข้อความแจ้งเตือน
                          <textarea
                            id="field-retro-alert-message"
                            rows={2}
                            value={surpriseQRData.content.menu.subTitle}
                            onChange={(e) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  menu: { ...current.content.menu, subTitle: e.target.value },
                                },
                              }))
                            }
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base text-slate-100 focus:border-cyan-400 focus:outline-none ${highlightedFieldId === "field-retro-alert-message" ? "ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-950 animate-pulse" : ""}`}
                          />
                        </label>
                        <label className="text-base font-semibold text-slate-200">
                          ข้อความปุ่มตกลง (Yes)
                          <input
                            value={surpriseQRData.content.menu.card1Title}
                            onChange={(e) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  menu: { ...current.content.menu, card1Title: e.target.value },
                                },
                              }))
                            }
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base text-slate-100 focus:border-cyan-400 focus:outline-none"
                          />
                        </label>
                        <label className="text-base font-semibold text-slate-200">
                          ข้อความปุ่มยกเลิก (ปุ่มหนีเมาส์)
                          <input
                            value={surpriseQRData.content.menu.card1Desc}
                            onChange={(e) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  menu: { ...current.content.menu, card1Desc: e.target.value },
                                },
                              }))
                            }
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base text-slate-100 focus:border-cyan-400 focus:outline-none"
                          />
                        </label>
                      </div>
                    </div>

                    {/* TAB 2: หัวข้อ Notepad */}
                    <div
                      id="editor-step-panel-2"
                      hidden={activeStep !== 2}
                      className="space-y-4 rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-5"
                    >
                      <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-3">
                        <Mail className="h-5 w-5 text-cyan-400" />
                        <h3 className="text-lg font-bold text-cyan-100">แท็บ 2: หัวข้อหน้าต่าง Notepad.exe</h3>
                      </div>
                      <label className="block text-base font-semibold text-slate-200">
                        ชื่อไฟล์ / หัวข้อ Notepad
                        <input
                          id="field-retro-letter-title"
                          value={surpriseQRData.content.letter.title}
                          onChange={(e) =>
                            setSurpriseQRData((current) => ({
                              ...current,
                              content: {
                                ...current.content,
                                letter: { ...current.content.letter, title: e.target.value },
                              },
                            }))
                          }
                          className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base text-slate-100 focus:border-cyan-400 focus:outline-none ${highlightedFieldId === "field-retro-letter-title" ? "ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-950 animate-pulse" : ""}`}
                        />
                      </label>
                    </div>

                    {/* TAB 3: เนื้อหาจดหมาย */}
                    <div
                      id="editor-step-panel-3"
                      hidden={activeStep !== 3}
                      className="space-y-4 rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-5"
                    >
                      <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-3">
                        <Sparkles className="h-5 w-5 text-cyan-400" />
                        <h3 className="text-lg font-bold text-cyan-100">แท็บ 3: เนื้อหาจดหมายพิมพ์ดีด</h3>
                      </div>
                      <label className="block text-base font-semibold text-slate-200">
                        ข้อความใน Notepad (เว้นบรรทัดเพื่อขึ้นย่อหน้าใหม่)
                        <textarea
                          id="field-retro-letter-content"
                          rows={5}
                          value={surpriseQRData.content.letter.paragraphs.join("\n")}
                          onChange={(e) =>
                            setSurpriseQRData((current) => ({
                              ...current,
                              content: {
                                ...current.content,
                                letter: {
                                  ...current.content.letter,
                                  paragraphs: e.target.value.split("\n"),
                                },
                              },
                            }))
                          }
                          className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base text-slate-100 focus:border-cyan-400 focus:outline-none ${highlightedFieldId === "field-retro-letter-content" ? "ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-950 animate-pulse" : ""}`}
                        />
                      </label>
                    </div>

                    {/* TAB 4: รูปภาพ PhotoViewer */}
                    <div
                      id="editor-step-panel-4"
                      hidden={activeStep !== 4}
                      className="space-y-4 rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-5"
                    >
                      <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-3">
                        <Images className="h-5 w-5 text-cyan-400" />
                        <h3 className="text-lg font-bold text-cyan-100">แท็บ 4: รูปภาพ PhotoViewer.exe</h3>
                      </div>
                      <div id="field-retro-photo-viewer" className="grid gap-4 md:grid-cols-3">
                        {[0, 1, 2].map((idx) => (
                          <SurpriseQRMediaInput
                            key={idx}
                            label={`รูปภาพที่ ${idx + 1}`}
                            value={surpriseQRData.content.memories.polaroidImages[idx]?.src ?? ""}
                            onChange={(src) =>
                              setSurpriseQRData((current) => {
                                const next = [...current.content.memories.polaroidImages];
                                next[idx] = { type: "url", src };
                                return {
                                  ...current,
                                  content: {
                                    ...current.content,
                                    memories: { ...current.content.memories, polaroidImages: next },
                                  },
                                };
                              })
                            }
                            placeholder="วาง URL หรือเลือกไฟล์รูป"
                          />
                        ))}
                      </div>
                      <label className="block text-base font-semibold text-slate-200">
                        คำบรรยายใต้ภาพ
                        <input
                          id="field-retro-photo-caption"
                          value={surpriseQRData.content.memories.description}
                          onChange={(e) =>
                            setSurpriseQRData((current) => ({
                              ...current,
                              content: {
                                ...current.content,
                                memories: { ...current.content.memories, description: e.target.value },
                              },
                            }))
                          }
                          className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base text-slate-100 focus:border-cyan-400 focus:outline-none ${highlightedFieldId === "field-retro-photo-caption" ? "ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-950 animate-pulse" : ""}`}
                        />
                      </label>
                    </div>

                    {/* TAB 5: ชื่อเพลง Winamp */}
                    <div
                      id="editor-step-panel-5"
                      hidden={activeStep !== 5}
                      className="space-y-4 rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-5"
                    >
                      <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-3">
                        <Music className="h-5 w-5 text-cyan-400" />
                        <h3 className="text-lg font-bold text-cyan-100">แท็บ 5: ชื่อเพลง & ศิลปินบน Winamp</h3>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-base font-semibold text-slate-200">
                          ชื่อเพลง
                          <input
                            id="field-retro-song-title"
                            value={surpriseQRData.content.songMedia.songTitle}
                            onChange={(e) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  songMedia: { ...current.content.songMedia, songTitle: e.target.value },
                                },
                              }))
                            }
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base text-slate-100 focus:border-cyan-400 focus:outline-none ${highlightedFieldId === "field-retro-song-title" ? "ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-950 animate-pulse" : ""}`}
                          />
                        </label>
                        <label className="text-base font-semibold text-slate-200">
                          ชื่อศิลปิน
                          <input
                            value={surpriseQRData.content.songMedia.songArtist}
                            onChange={(e) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  songMedia: { ...current.content.songMedia, songArtist: e.target.value },
                                },
                              }))
                            }
                            className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base text-slate-100 focus:border-cyan-400 focus:outline-none"
                          />
                        </label>
                      </div>
                    </div>

                    {/* TAB 6: ไฟล์เพลงประกอบ */}
                    <div
                      id="editor-step-panel-6"
                      hidden={activeStep !== 6}
                      className="space-y-4 rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-5"
                    >
                      <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-3">
                        <Music className="h-5 w-5 text-cyan-400" />
                        <h3 className="text-lg font-bold text-cyan-100">แท็บ 6: ไฟล์เพลงประกอบ (MP3 / YouTube)</h3>
                      </div>
                      <div id="field-retro-audio-src">
                        <SurpriseQRMediaInput
                          label="ไฟล์เพลงหรือลิงก์ YouTube"
                          value={surpriseQRData.content.songMedia.audioSrc || surpriseQRData.content.bgMusic.src}
                          onChange={(src) =>
                            setSurpriseQRData((current) => ({
                              ...current,
                              content: {
                                ...current.content,
                                bgMusic: { type: "url", src },
                                songMedia: { ...current.content.songMedia, audioSrc: src },
                              },
                            }))
                          }
                          accept="audio/*"
                          placeholder="วาง URL เพลง MP3 / YouTube หรือเลือกไฟล์เสียง"
                          tier={userTier}
                          isPremiumTemplate={selectedTemplate?.is_premium}
                        />
                      </div>
                    </div>

                    {/* TAB 7: หน้าฉลองปิดท้าย */}
                    <div
                      id="editor-step-panel-7"
                      hidden={activeStep !== 7}
                      className="space-y-4 rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-5"
                    >
                      <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-3">
                        <Star className="h-5 w-5 text-cyan-400" />
                        <h3 className="text-lg font-bold text-cyan-100">แท็บ 7: หน้าต่างฉลองปิดท้าย</h3>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-base font-semibold text-slate-200 md:col-span-2">
                          หัวข้อหน้าต่างฉลอง
                          <input
                            id="field-retro-finale-title"
                            value={surpriseQRData.content.finale.mainText}
                            onChange={(e) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  finale: { ...current.content.finale, mainText: e.target.value },
                                },
                              }))
                            }
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base text-slate-100 focus:border-cyan-400 focus:outline-none ${highlightedFieldId === "field-retro-finale-title" ? "ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-950 animate-pulse" : ""}`}
                          />
                        </label>
                        <label className="text-base font-semibold text-slate-200 md:col-span-2">
                          ข้อความฉลองปิดท้าย
                          <textarea
                            id="field-retro-finale-message"
                            rows={3}
                            value={surpriseQRData.content.finale.subText}
                            onChange={(e) =>
                              setSurpriseQRData((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  finale: { ...current.content.finale, subText: e.target.value },
                                },
                              }))
                            }
                            className={`mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-base text-slate-100 focus:border-cyan-400 focus:outline-none ${highlightedFieldId === "field-retro-finale-message" ? "ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-950 animate-pulse" : ""}`}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {selectedStrategy === "love-os" && (
                  <div className="space-y-5 rounded-2xl border border-pink-400/25 bg-[#160b29]/85 p-5" onFocusCapture={handleEditingStart} onBlurCapture={handleEditingEnd}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-base font-bold text-pink-100">
                        Love OS · {LOVE_OS_STEPS.find((s) => s.id === activeStep)?.label ?? "ปรับแต่ง"}
                      </p>
                      <button type="button" onClick={() => setPreviewRefreshToken((token) => token + 1)} className="rounded-lg border border-space-border px-3 py-2 text-sm font-bold text-slate-200 hover:bg-white/10">อัปเดตตัวอย่าง</button>
                    </div>

                    {/* Tab 1: หน้าล็อกอิน Windows */}
                    <div id="editor-step-panel-1" hidden={activeStep !== 1} className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm font-semibold text-slate-200">
                        ชื่อบัญชีหน้าล็อกอิน
                        <input
                          id="field-loveos-user"
                          value={surpriseQRData.content.title}
                          onChange={(e) => setSurpriseQRData((c) => ({ ...c, content: { ...c.content, title: e.target.value } }))}
                          placeholder="My Favorite Person"
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        />
                      </label>
                      <label className="block text-sm font-semibold text-slate-200">
                        รหัสผ่านปลดล็อก Windows (4 หลัก)
                        <input
                          id="field-loveos-pin"
                          inputMode="numeric"
                          maxLength={4}
                          value={surpriseQRData.settings.pinCode}
                          onChange={(e) => {
                            const nextPin = e.target.value.replace(/\D/g, "").slice(0, 4);
                            setPinCode(nextPin);
                            setSurpriseQRData((c) => ({ ...c, settings: { ...c.settings, enablePin: true, pinCode: nextPin } }));
                          }}
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 font-mono tracking-widest text-slate-100"
                        />
                      </label>
                      <div id="field-loveos-avatar" className="md:col-span-2">
                        <SurpriseQRMediaInput
                          label="รูปโปรไฟล์หน้าล็อกอิน (ไม่บังคับ)"
                          value={surpriseQRData.content.finale.heroImage.src}
                          onChange={(src) =>
                            setSurpriseQRData((c) => ({
                              ...c,
                              content: { ...c.content, finale: { ...c.content.finale, heroImage: { type: "url", src } } },
                            }))
                          }
                          placeholder="วาง URL หรืออัปโหลดรูปโปรไฟล์"
                          tier={userTier}
                          isPremiumTemplate={selectedTemplate?.is_premium}
                        />
                      </div>
                    </div>

                    {/* Tab 2: ไฟล์ลับหน้าจอ */}
                    <div id="editor-step-panel-2" hidden={activeStep !== 2} className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm font-semibold text-slate-200 md:col-span-2">
                        ชื่อไฟล์ลับบนหน้าจอ
                        <input
                          id="field-loveos-filename"
                          value={surpriseQRData.content.menu.card1Title}
                          onChange={(e) => setSurpriseQRData((c) => ({ ...c, content: { ...c.content, menu: { ...c.content.menu, card1Title: e.target.value } } }))}
                          placeholder="Secret_For_You.love"
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 font-mono text-slate-100"
                        />
                      </label>
                      <label className="block text-sm font-semibold text-slate-200 md:col-span-2">
                        ชื่อไฟล์วิดีโอบนหน้าจอ
                        <input
                          id="field-loveos-video-name"
                          value={surpriseQRData.content.songMedia.sectionTitle}
                          onChange={(e) =>
                            setSurpriseQRData((c) => ({
                              ...c,
                              content: { ...c.content, songMedia: { ...c.content.songMedia, sectionTitle: e.target.value } },
                            }))
                          }
                          placeholder="Our_Video.mp4"
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 font-mono text-slate-100"
                        />
                      </label>
                      <div id="field-loveos-video-src" className="md:col-span-2">
                        <SurpriseQRMediaInput
                          label="ไฟล์วิดีโอ (.mp4) หรือลิงก์ YouTube"
                          value={surpriseQRData.content.songMedia.src}
                          onChange={(src) =>
                            setSurpriseQRData((c) => ({
                              ...c,
                              content: { ...c.content, songMedia: { ...c.content.songMedia, src } },
                            }))
                          }
                          accept="video/*"
                          placeholder="วางลิงก์ YouTube / MP4 หรืออัปโหลดไฟล์วิดีโอ"
                          tier={userTier}
                          isPremiumTemplate={selectedTemplate?.is_premium}
                        />
                      </div>
                    </div>

                    {/* Tab 3: ป๊อปอัป Error */}
                    <div id="editor-step-panel-3" hidden={activeStep !== 3} className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm font-semibold text-slate-200 md:col-span-2">
                        หัวข้อหน้าต่าง Error
                        <input
                          id="field-loveos-err-title"
                          value={surpriseQRData.content.menu.title}
                          onChange={(e) => setSurpriseQRData((c) => ({ ...c, content: { ...c.content, menu: { ...c.content.menu, title: e.target.value } } }))}
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        />
                      </label>
                      <label className="block text-sm font-semibold text-slate-200 md:col-span-2">
                        ข้อความในป๊อปอัป Error
                        <textarea
                          id="field-loveos-err-msg"
                          rows={2}
                          value={surpriseQRData.content.menu.card1Desc}
                          onChange={(e) => setSurpriseQRData((c) => ({ ...c, content: { ...c.content, menu: { ...c.content.menu, card1Desc: e.target.value } } }))}
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        />
                      </label>
                      <label className="block text-sm font-semibold text-slate-200">
                        ข้อความปุ่ม Yes (เปิดอ่าน + เล่นเพลง)
                        <input
                          id="field-loveos-yes-btn"
                          value={surpriseQRData.content.menu.card2Title}
                          onChange={(e) => setSurpriseQRData((c) => ({ ...c, content: { ...c.content, menu: { ...c.content.menu, card2Title: e.target.value } } }))}
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        />
                      </label>
                      <label className="block text-sm font-semibold text-slate-200">
                        ข้อความปุ่ม Cancel (หนีเมาส์ / ย้ายที่)
                        <input
                          id="field-loveos-cancel-btn"
                          value={surpriseQRData.content.menu.card3Title}
                          onChange={(e) => setSurpriseQRData((c) => ({ ...c, content: { ...c.content, menu: { ...c.content.menu, card3Title: e.target.value } } }))}
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        />
                      </label>
                    </div>

                    {/* Tab 4: เพลง & ข้อความความรู้สึก */}
                    <div id="editor-step-panel-4" hidden={activeStep !== 4} className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm font-semibold text-slate-200 md:col-span-2">
                        ชื่อเพลงที่แสดง
                        <input
                          id="field-loveos-song-title"
                          value={surpriseQRData.content.songMedia.songTitle}
                          onChange={(e) =>
                            setSurpriseQRData((c) => ({
                              ...c,
                              content: { ...c.content, songMedia: { ...c.content.songMedia, songTitle: e.target.value } },
                            }))
                          }
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        />
                      </label>
                      <div id="field-loveos-music" className="md:col-span-2">
                        <SurpriseQRMediaInput
                          label="ไฟล์เพลง .mp3 หรือลิงก์ YouTube (เล่นอัตโนมัติเมื่อกด Yes)"
                          value={surpriseQRData.content.bgMusic.src || surpriseQRData.content.songMedia.audioSrc}
                          onChange={(src) =>
                            setSurpriseQRData((c) => ({
                              ...c,
                              content: {
                                ...c.content,
                                bgMusic: { type: "url", src },
                                songMedia: { ...c.content.songMedia, audioSrc: src },
                              },
                            }))
                          }
                          accept=".mp3,audio/mpeg,audio/*"
                          placeholder="วางลิงก์ YouTube หรือกดอัปโหลดไฟล์ .mp3 (เว้นว่างใช้ดนตรีจากเทมเพลต)"
                          tier={userTier}
                          isPremiumTemplate={selectedTemplate?.is_premium}
                        />
                      </div>
                      <label className="block text-sm font-semibold text-slate-200 md:col-span-2">
                        หัวข้อข้อความความรู้สึก
                        <input
                          id="field-loveos-letter-title"
                          value={surpriseQRData.content.letter.title}
                          onChange={(e) =>
                            setSurpriseQRData((c) => ({
                              ...c,
                              content: { ...c.content, letter: { ...c.content.letter, title: e.target.value } },
                            }))
                          }
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        />
                      </label>
                      <label className="block text-sm font-semibold text-slate-200 md:col-span-2">
                        ข้อความความรู้สึก
                        <textarea
                          id="field-loveos-letter-body"
                          rows={6}
                          value={surpriseQRData.content.letter.paragraphs.join("\n\n")}
                          onChange={(e) =>
                            setSurpriseQRData((c) => ({
                              ...c,
                              content: {
                                ...c.content,
                                letter: { ...c.content.letter, paragraphs: e.target.value.split(/\n{2,}/) },
                              },
                            }))
                          }
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        />
                      </label>
                    </div>

                    {/* Tab 5: รูปความทรงจำ & ปิดท้าย */}
                    <div id="editor-step-panel-5" hidden={activeStep !== 5} className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm font-semibold text-slate-200 md:col-span-2">
                        หัวข้อแกลเลอรีรูปความทรงจำ
                        <input
                          id="field-loveos-gallery-title"
                          value={surpriseQRData.content.memories.sectionTitle}
                          onChange={(e) =>
                            setSurpriseQRData((c) => ({
                              ...c,
                              content: { ...c.content, memories: { ...c.content.memories, sectionTitle: e.target.value } },
                            }))
                          }
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        />
                      </label>
                      <label className="block text-sm font-semibold text-slate-200 md:col-span-2">
                        คำบรรยายแกลเลอรี
                        <input
                          id="field-loveos-gallery-desc"
                          value={surpriseQRData.content.memories.description}
                          onChange={(e) =>
                            setSurpriseQRData((c) => ({
                              ...c,
                              content: { ...c.content, memories: { ...c.content.memories, description: e.target.value } },
                            }))
                          }
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        />
                      </label>
                      {[0, 1, 2, 3, 4].map((idx) => (
                        <div key={idx} id={`field-loveos-photo-${idx}`} className="md:col-span-2">
                          <SurpriseQRMediaInput
                            label={`รูปความทรงจำที่ ${idx + 1}`}
                            value={surpriseQRData.content.memories.polaroidImages[idx]?.src ?? ""}
                            onChange={(src) =>
                              setSurpriseQRData((c) => {
                                const next = [...(c.content.memories.polaroidImages ?? [])];
                                while (next.length <= idx) next.push({ type: "url", src: "" });
                                next[idx] = { type: "url", src };
                                return { ...c, content: { ...c.content, memories: { ...c.content.memories, polaroidImages: next } } };
                              })
                            }
                            placeholder="วาง URL หรืออัปโหลดรูปความทรงจำ"
                            tier={userTier}
                            isPremiumTemplate={selectedTemplate?.is_premium}
                          />
                        </div>
                      ))}
                      <label className="block text-sm font-semibold text-slate-200">
                        ข้อความปิดท้าย
                        <input
                          id="field-loveos-finale-main"
                          value={surpriseQRData.content.finale.mainText}
                          onChange={(e) =>
                            setSurpriseQRData((c) => ({
                              ...c,
                              content: { ...c.content, finale: { ...c.content.finale, mainText: e.target.value } },
                            }))
                          }
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        />
                      </label>
                      <label className="block text-sm font-semibold text-slate-200">
                        คำลงท้าย
                        <input
                          id="field-loveos-finale-sub"
                          value={surpriseQRData.content.finale.subText}
                          onChange={(e) =>
                            setSurpriseQRData((c) => ({
                              ...c,
                              content: { ...c.content, finale: { ...c.content.finale, subText: e.target.value } },
                            }))
                          }
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {selectedStrategy === "pixel-gacha" && (
                  <div className="space-y-5 rounded-2xl border border-amber-300/25 bg-[#1b0c31]/85 p-5" onFocusCapture={handleEditingStart} onBlurCapture={handleEditingEnd}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-base font-bold text-amber-200">
                        Pixel Gacha · {PIXEL_GACHA_STEPS.find((s) => s.id === activeStep)?.label ?? "ปรับแต่ง"}
                      </p>
                      <button type="button" onClick={() => setPreviewRefreshToken((token) => token + 1)} className="rounded-lg border border-space-border px-3 py-2 text-sm font-bold text-slate-200 hover:bg-white/10">อัปเดตตัวอย่าง</button>
                    </div>

                    {/* Tab 1: ตู้กาชา & เพลงประกอบ */}
                    <div id="editor-step-panel-1" hidden={activeStep !== 1} className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm font-semibold text-slate-200">
                        ชื่อตู้กาชาบนป้ายไฟ
                        <input
                          id="field-gacha-title"
                          value={surpriseQRData.content.title}
                          onChange={(e) => setSurpriseQRData((c) => ({ ...c, content: { ...c.content, title: e.target.value } }))}
                          placeholder="MEMORY GACHA"
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 font-mono text-slate-100"
                        />
                      </label>
                      <label className="block text-sm font-semibold text-slate-200">
                        ข้อความใต้ป้ายตู้ / ชื่อผู้รับ
                        <input
                          id="field-gacha-sub"
                          value={surpriseQRData.content.menu.subTitle}
                          onChange={(e) => setSurpriseQRData((c) => ({ ...c, content: { ...c.content, menu: { ...c.content.menu, subTitle: e.target.value } } }))}
                          placeholder="สำหรับคนพิเศษของฉัน"
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        />
                      </label>
                      <label className="block text-sm font-semibold text-slate-200 md:col-span-2">
                        ชื่อเพลงประกอบ
                        <input
                          id="field-gacha-song"
                          value={surpriseQRData.content.songMedia.songTitle}
                          onChange={(e) =>
                            setSurpriseQRData((c) => ({
                              ...c,
                              content: { ...c.content, songMedia: { ...c.content.songMedia, songTitle: e.target.value } },
                            }))
                          }
                          placeholder="8-Bit Love Melody"
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        />
                      </label>
                      <div id="field-gacha-music" className="md:col-span-2">
                        <SurpriseQRMediaInput
                          label="ไฟล์เพลง .mp3 หรือลิงก์ YouTube (เว้นว่างใช้ดนตรี 8-bit จากเทมเพลต)"
                          value={surpriseQRData.content.bgMusic.src || surpriseQRData.content.songMedia.audioSrc}
                          onChange={(src) =>
                            setSurpriseQRData((c) => ({
                              ...c,
                              content: {
                                ...c.content,
                                bgMusic: { type: "url", src },
                                songMedia: { ...c.content.songMedia, audioSrc: src },
                              },
                            }))
                          }
                          accept=".mp3,audio/mpeg,audio/*"
                          placeholder="วางลิงก์ YouTube หรืออัปโหลดไฟล์ .mp3"
                          tier={userTier}
                          isPremiumTemplate={selectedTemplate?.is_premium}
                        />
                      </div>
                    </div>

                    {/* Tab 2: การ์ดคำอวยพร (SR) */}
                    <div id="editor-step-panel-2" hidden={activeStep !== 2} className="grid gap-4">
                      <label className="block text-sm font-semibold text-slate-200">
                        หัวข้อการ์ดคำอวยพร (SR)
                        <input
                          id="field-gacha-wish-title"
                          value={surpriseQRData.content.menu.card1Title}
                          onChange={(e) => setSurpriseQRData((c) => ({ ...c, content: { ...c.content, menu: { ...c.content.menu, card1Title: e.target.value } } }))}
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        />
                      </label>
                      <label className="block text-sm font-semibold text-slate-200">
                        ข้อความในการ์ดคำอวยพร
                        <textarea
                          id="field-gacha-wish-desc"
                          rows={4}
                          value={surpriseQRData.content.menu.card1Desc}
                          onChange={(e) => setSurpriseQRData((c) => ({ ...c, content: { ...c.content, menu: { ...c.content.menu, card1Desc: e.target.value } } }))}
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        />
                      </label>
                    </div>

                    {/* Tab 3: การ์ดรูปความทรงจำ (SSR) */}
                    <div id="editor-step-panel-3" hidden={activeStep !== 3} className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm font-semibold text-slate-200 md:col-span-2">
                        ชื่อสมุดสะสมความทรงจำ
                        <input
                          id="field-gacha-album-title"
                          value={surpriseQRData.content.memories.sectionTitle}
                          onChange={(e) =>
                            setSurpriseQRData((c) => ({
                              ...c,
                              content: { ...c.content, memories: { ...c.content.memories, sectionTitle: e.target.value } },
                            }))
                          }
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        />
                      </label>
                      <label className="block text-sm font-semibold text-slate-200 md:col-span-2">
                        คำบรรยายใต้สมุดสะสม
                        <input
                          id="field-gacha-album-desc"
                          value={surpriseQRData.content.memories.description}
                          onChange={(e) =>
                            setSurpriseQRData((c) => ({
                              ...c,
                              content: { ...c.content, memories: { ...c.content.memories, description: e.target.value } },
                            }))
                          }
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        />
                      </label>
                      {[0, 1, 2, 3].map((idx) => (
                        <div key={idx} id={`field-gacha-photo-${idx}`} className="md:col-span-2">
                          <SurpriseQRMediaInput
                            label={`การ์ดรูปความทรงจำ SSR #${idx + 1}`}
                            value={surpriseQRData.content.memories.polaroidImages[idx]?.src ?? ""}
                            onChange={(src) =>
                              setSurpriseQRData((c) => {
                                const next = [...(c.content.memories.polaroidImages ?? [])];
                                while (next.length <= idx) next.push({ type: "url", src: "" });
                                next[idx] = { type: "url", src };
                                return { ...c, content: { ...c.content, memories: { ...c.content.memories, polaroidImages: next } } };
                              })
                            }
                            placeholder="วาง URL หรืออัปโหลดรูปภาพความทรงจำ"
                            tier={userTier}
                            isPremiumTemplate={selectedTemplate?.is_premium}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Tab 4: จดหมายลับ (SECRET) & ปิดท้าย */}
                    <div id="editor-step-panel-4" hidden={activeStep !== 4} className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm font-semibold text-slate-200 md:col-span-2">
                        หัวข้อจดหมายลับ (SECRET)
                        <input
                          id="field-gacha-letter-title"
                          value={surpriseQRData.content.letter.title}
                          onChange={(e) =>
                            setSurpriseQRData((c) => ({
                              ...c,
                              content: { ...c.content, letter: { ...c.content.letter, title: e.target.value } },
                            }))
                          }
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        />
                      </label>
                      <label className="block text-sm font-semibold text-slate-200 md:col-span-2">
                        เนื้อหาจดหมายลับ
                        <textarea
                          id="field-gacha-letter-body"
                          rows={6}
                          value={surpriseQRData.content.letter.paragraphs.join("\n\n")}
                          onChange={(e) =>
                            setSurpriseQRData((c) => ({
                              ...c,
                              content: {
                                ...c.content,
                                letter: { ...c.content.letter, paragraphs: e.target.value.split(/\n{2,}/) },
                              },
                            }))
                          }
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        />
                      </label>
                      <label className="block text-sm font-semibold text-slate-200">
                        ข้อความปิดท้าย
                        <input
                          id="field-gacha-finale-main"
                          value={surpriseQRData.content.finale.mainText}
                          onChange={(e) =>
                            setSurpriseQRData((c) => ({
                              ...c,
                              content: { ...c.content, finale: { ...c.content.finale, mainText: e.target.value } },
                            }))
                          }
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 font-mono text-slate-100"
                        />
                      </label>
                      <label className="block text-sm font-semibold text-slate-200">
                        คำลงท้าย
                        <input
                          id="field-gacha-finale-sub"
                          value={surpriseQRData.content.finale.subText}
                          onChange={(e) =>
                            setSurpriseQRData((c) => ({
                              ...c,
                              content: { ...c.content, finale: { ...c.content.finale, subText: e.target.value } },
                            }))
                          }
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {selectedStrategy === "lunar-3d" && (
                  <div className="space-y-5 rounded-2xl border border-amber-200/25 bg-[#0e1228]/90 p-5" onFocusCapture={handleEditingStart} onBlurCapture={handleEditingEnd}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-base font-bold text-amber-100">
                        Lunar Secret 3D · {LUNAR_3D_STEPS.find((s) => s.id === activeStep)?.label ?? "ปรับแต่ง"}
                      </p>
                      <button type="button" onClick={() => setPreviewRefreshToken((token) => token + 1)} className="rounded-lg border border-space-border px-3 py-2 text-sm font-bold text-slate-200 hover:bg-white/10">อัปเดตตัวอย่าง</button>
                    </div>

                    {/* Tab 1: ดวงจันทร์ & รหัสผ่าน */}
                    <div id="editor-step-panel-1" hidden={activeStep !== 1} className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm font-semibold text-slate-200 md:col-span-2">
                        ชื่อการ์ดบนท้องฟ้า
                        <input
                          id="field-lunar-title"
                          value={surpriseQRData.content.title}
                          onChange={(e) => setSurpriseQRData((c) => ({ ...c, content: { ...c.content, title: e.target.value } }))}
                          placeholder="The Secret Behind The Moon"
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        />
                      </label>
                      <label className="block text-sm font-semibold text-slate-200">
                        ข้อความใต้ดวงจันทร์
                        <input
                          id="field-lunar-sub"
                          value={surpriseQRData.content.menu.subTitle}
                          onChange={(e) => setSurpriseQRData((c) => ({ ...c, content: { ...c.content, menu: { ...c.content.menu, subTitle: e.target.value } } }))}
                          placeholder="ลองแตะที่ดวงจันทร์"
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        />
                      </label>
                      <label className="block text-sm font-semibold text-slate-200">
                        รหัสผ่าน 4 หลักหลังวาร์ป
                        <input
                          id="field-lunar-pin"
                          inputMode="numeric"
                          maxLength={4}
                          value={surpriseQRData.settings.pinCode}
                          onChange={(e) => {
                            const nextPin = e.target.value.replace(/\D/g, "").slice(0, 4);
                            setPinCode(nextPin);
                            setSurpriseQRData((c) => ({ ...c, settings: { ...c.settings, enablePin: true, pinCode: nextPin } }));
                          }}
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 font-mono tracking-widest text-slate-100"
                        />
                      </label>
                    </div>

                    {/* Tab 2: เพลงประกอบ */}
                    <div id="editor-step-panel-2" hidden={activeStep !== 2} className="grid gap-4">
                      <label className="block text-sm font-semibold text-slate-200">
                        ชื่อเพลงประกอบ
                        <input
                          id="field-lunar-song"
                          value={surpriseQRData.content.songMedia.songTitle}
                          onChange={(e) =>
                            setSurpriseQRData((c) => ({
                              ...c,
                              content: { ...c.content, songMedia: { ...c.content.songMedia, songTitle: e.target.value } },
                            }))
                          }
                          placeholder="Moonlight Serenade"
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        />
                      </label>
                      <div id="field-lunar-music">
                        <SurpriseQRMediaInput
                          label="ไฟล์เพลง .mp3 หรือลิงก์ YouTube (เว้นว่างใช้เสียงดนตรีอวกาศจากเทมเพลต)"
                          value={surpriseQRData.content.bgMusic.src || surpriseQRData.content.songMedia.audioSrc}
                          onChange={(src) =>
                            setSurpriseQRData((c) => ({
                              ...c,
                              content: {
                                ...c.content,
                                bgMusic: { type: "url", src },
                                songMedia: { ...c.content.songMedia, audioSrc: src },
                              },
                            }))
                          }
                          accept=".mp3,audio/mpeg,audio/*"
                          placeholder="วางลิงก์ YouTube หรืออัปโหลดไฟล์ .mp3"
                          tier={userTier}
                          isPremiumTemplate={selectedTemplate?.is_premium}
                        />
                      </div>
                    </div>

                    {/* Tab 3: รูป 1:1 ด้านหลังดวงจันทร์ & ข้อความความรู้สึก */}
                    <div id="editor-step-panel-3" hidden={activeStep !== 3} className="grid gap-4">
                      <div id="field-lunar-photo">
                        <SurpriseQRMediaInput
                          label="รูปภาพ 1:1 ด้านหลังดวงจันทร์ (ระบบครอป 1:1 อัตโนมัติ)"
                          value={surpriseQRData.content.memories.polaroidImages[0]?.src ?? ""}
                          onChange={(src) =>
                            setSurpriseQRData((c) => ({
                              ...c,
                              content: {
                                ...c.content,
                                memories: {
                                  ...c.content.memories,
                                  polaroidImages: [{ type: "url", src }],
                                },
                              },
                            }))
                          }
                          placeholder="วาง URL หรืออัปโหลดรูปภาพ 1:1"
                          tier={userTier}
                          isPremiumTemplate={selectedTemplate?.is_premium}
                        />
                      </div>
                      <label className="block text-sm font-semibold text-slate-200">
                        หัวข้อข้อความความรู้สึก
                        <input
                          id="field-lunar-letter-title"
                          value={surpriseQRData.content.letter.title}
                          onChange={(e) =>
                            setSurpriseQRData((c) => ({
                              ...c,
                              content: { ...c.content, letter: { ...c.content.letter, title: e.target.value } },
                            }))
                          }
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        />
                      </label>
                      <label className="block text-sm font-semibold text-slate-200">
                        ข้อความความรู้สึก
                        <textarea
                          id="field-lunar-letter-body"
                          rows={5}
                          value={surpriseQRData.content.letter.paragraphs.join("\n\n")}
                          onChange={(e) =>
                            setSurpriseQRData((c) => ({
                              ...c,
                              content: {
                                ...c.content,
                                letter: { ...c.content.letter, paragraphs: e.target.value.split(/\n{2,}/) },
                              },
                            }))
                          }
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        />
                      </label>
                      <label className="block text-sm font-semibold text-slate-200">
                        คำลงท้าย
                        <input
                          id="field-lunar-signoff"
                          value={surpriseQRData.content.finale.subText}
                          onChange={(e) =>
                            setSurpriseQRData((c) => ({
                              ...c,
                              content: { ...c.content, finale: { ...c.content.finale, subText: e.target.value } },
                            }))
                          }
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {selectedStrategy === "orbit-of-us" && (
                  <div className="space-y-5 rounded-2xl border border-pink-400/25 bg-[#120922]/90 p-5" onFocusCapture={handleEditingStart} onBlurCapture={handleEditingEnd}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-base font-bold text-pink-100">
                        Orbit of Us 3D · {ORBIT_OF_US_STEPS.find((s) => s.id === activeStep)?.label ?? "ปรับแต่ง"}
                      </p>
                      <button
                        type="button"
                        onClick={() => setPreviewRefreshToken((token) => token + 1)}
                        className="rounded-lg border border-space-border px-3 py-2 text-sm font-bold text-slate-200 hover:bg-white/10"
                      >
                        อัปเดตตัวอย่าง
                      </button>
                    </div>

                    {/* Tab 1: เปิดฉาก & ธีมสีกาแล็กซี */}
                    <div id="editor-step-panel-1" hidden={activeStep !== 1} className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm font-semibold text-slate-200">
                        ชื่อจักรวาล / หัวข้อด้านบน
                        <input
                          id="field-orbit-title"
                          value={surpriseQRData.content.title}
                          onChange={(e) =>
                            setSurpriseQRData((c) => ({
                              ...c,
                              content: { ...c.content, title: e.target.value },
                            }))
                          }
                          placeholder="Orbit of Us"
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        />
                      </label>

                      <label className="block text-sm font-semibold text-slate-200">
                        นับจำนวนวันครบรอบ (เลือกวันเริ่มต้น ระบบคำนวณจำนวนวันแสดงบนกาแล็กซี)
                        <input
                          id="field-orbit-date"
                          type="date"
                          value={
                            /^\d{4}-\d{2}-\d{2}$/.test(surpriseQRData.content.menu.card1Title || "")
                              ? surpriseQRData.content.menu.card1Title
                              : "2025-11-21"
                          }
                          onChange={(e) =>
                            setSurpriseQRData((c) => ({
                              ...c,
                              content: {
                                ...c.content,
                                menu: { ...c.content.menu, card1Title: e.target.value },
                              },
                            }))
                          }
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        />
                      </label>

                      <label className="block text-sm font-semibold text-slate-200">
                        ธีมสีกาแล็กซี (Palette)
                        <select
                          id="field-orbit-palette"
                          value={surpriseQRData.content.menu.card1Icon || "rose-nebula"}
                          onChange={(e) =>
                            setSurpriseQRData((c) => ({
                              ...c,
                              content: {
                                ...c.content,
                                menu: { ...c.content.menu, card1Icon: e.target.value },
                              },
                            }))
                          }
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        >
                          <option value="rose-nebula">Rose Nebula (ชมพู-ม่วง-ทอง)</option>
                          <option value="midnight-gold">Midnight Gold (ทองคำ-อำพัน-น้ำเงินเข้ม)</option>
                          <option value="sakura-galaxy">Sakura Galaxy (ซากุระ-พีช-ไวโอเล็ต)</option>
                        </select>
                      </label>

                      <label className="block text-sm font-semibold text-slate-200">
                        รหัสผ่าน 4 หลักหลังวาร์ปดวงดาว
                        <input
                          id="field-orbit-pin"
                          inputMode="numeric"
                          maxLength={4}
                          value={surpriseQRData.settings.pinCode}
                          onChange={(e) => {
                            const nextPin = e.target.value.replace(/\D/g, "").slice(0, 4);
                            setPinCode(nextPin);
                            setSurpriseQRData((c) => ({
                              ...c,
                              settings: { ...c.settings, enablePin: true, pinCode: nextPin },
                            }));
                          }}
                          placeholder="1234"
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 font-mono tracking-widest text-slate-100"
                        />
                      </label>

                      <label className="block text-sm font-semibold text-slate-200 md:col-span-2">
                        ข้อความเปิดฉาก (Intro Text — แสดงทีละตัวอักษรก่อนแตะหน้าจอเพื่อวาร์ป)
                        <textarea
                          id="field-orbit-intro"
                          rows={2}
                          value={surpriseQRData.content.menu.subTitle}
                          onChange={(e) =>
                            setSurpriseQRData((c) => ({
                              ...c,
                              content: {
                                ...c.content,
                                menu: { ...c.content.menu, subTitle: e.target.value },
                              },
                            }))
                          }
                          placeholder="ในจักรวาลที่มีดาวนับล้านดวง ขอบคุณที่โคจรมาเจอกันนะ"
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        />
                      </label>

                      <div id="field-orbit-music" className="md:col-span-2">
                        <SurpriseQRMediaInput
                          label="ไฟล์เพลง .mp3 หรือลิงก์ YouTube (เว้นว่างใช้เสียงดนตรีอวกาศจากเทมเพลต)"
                          value={surpriseQRData.content.bgMusic.src || surpriseQRData.content.songMedia.audioSrc}
                          onChange={(src) =>
                            setSurpriseQRData((c) => ({
                              ...c,
                              content: {
                                ...c.content,
                                bgMusic: { type: "url", src },
                                songMedia: { ...c.content.songMedia, audioSrc: src },
                              },
                            }))
                          }
                          accept=".mp3,audio/mpeg,audio/*"
                          placeholder="วางลิงก์ YouTube หรืออัปโหลดไฟล์ .mp3"
                          tier={userTier}
                          isPremiumTemplate={selectedTemplate?.is_premium}
                        />
                      </div>
                    </div>

                    {/* Tab 2: ข้อความลอยในวงโคจร (5–15 คำ) */}
                    <div id="editor-step-panel-2" hidden={activeStep !== 2} className="grid gap-4">
                      <label className="block text-sm font-semibold text-slate-200">
                        ชุดข้อความลอยในวงโคจร 3 มิติ (แยกบรรทัดละ 1 ข้อความ · แนะนำ 5–15 บรรทัด)
                        <textarea
                          id="field-orbit-phrases"
                          rows={8}
                          value={surpriseQRData.content.flowers.message}
                          onChange={(e) =>
                            setSurpriseQRData((c) => ({
                              ...c,
                              content: {
                                ...c.content,
                                flowers: { ...c.content.flowers, message: e.target.value },
                              },
                            }))
                          }
                          placeholder={"รักเธอนะ\nอยู่ด้วยกันไปนานๆ\nYou are my universe"}
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        />
                      </label>
                    </div>

                    {/* Tab 3: รูปภาพในวงโคจร (4–12 รูป) & แคปชัน */}
                    <div id="editor-step-panel-3" hidden={activeStep !== 3} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-200">
                          รูปภาพความทรงจำในวงโคจร ({surpriseQRData.content.memories.filmstripImages.length}/12 รูป)
                        </p>
                        <div className="flex gap-2">
                          {surpriseQRData.content.memories.filmstripImages.length < 12 && (
                            <button
                              type="button"
                              onClick={() =>
                                setSurpriseQRData((c) => ({
                                  ...c,
                                  content: {
                                    ...c.content,
                                    memories: {
                                      ...c.content.memories,
                                      filmstripImages: [
                                        ...c.content.memories.filmstripImages,
                                        { type: "url", src: "/templates/galaxy-1.png" },
                                      ],
                                    },
                                    flowers: {
                                      ...c.content.flowers,
                                      wishes: [...(c.content.flowers.wishes ?? []), "ความทรงจำที่แสนพิเศษ"],
                                    },
                                  },
                                }))
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-pink-400/40 bg-pink-500/20 px-3 py-1.5 text-xs font-bold text-pink-200 hover:bg-pink-500/30"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>เพิ่มรูปในวงโคจร</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div id="field-orbit-photos" className="grid gap-4 md:grid-cols-2">
                        {surpriseQRData.content.memories.filmstripImages.map((imgItem, idx) => (
                          <div
                            key={idx}
                            className="space-y-2.5 rounded-xl border border-white/10 bg-slate-950/50 p-3.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-pink-200">
                                รูปในวงโคจรใบที่ {idx + 1}
                              </span>
                              {surpriseQRData.content.memories.filmstripImages.length > 4 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSurpriseQRData((c) => ({
                                      ...c,
                                      content: {
                                        ...c.content,
                                        memories: {
                                          ...c.content.memories,
                                          filmstripImages: c.content.memories.filmstripImages.filter(
                                            (_, i) => i !== idx,
                                          ),
                                        },
                                        flowers: {
                                          ...c.content.flowers,
                                          wishes: (c.content.flowers.wishes ?? []).filter(
                                            (_, i) => i !== idx,
                                          ),
                                        },
                                      },
                                    }))
                                  }
                                  className="rounded-md p-1 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300"
                                  title="ลบรูปนี้"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>

                            <SurpriseQRMediaInput
                              label={`รูปภาพที่ ${idx + 1}`}
                              value={imgItem.src}
                              onChange={(src) =>
                                setSurpriseQRData((c) => {
                                  const nextImgs = [...c.content.memories.filmstripImages];
                                  nextImgs[idx] = { type: "url", src };
                                  return {
                                    ...c,
                                    content: {
                                      ...c.content,
                                      memories: { ...c.content.memories, filmstripImages: nextImgs },
                                    },
                                  };
                                })
                              }
                              placeholder="วาง URL หรืออัปโหลดรูปภาพ"
                              tier={userTier}
                              isPremiumTemplate={selectedTemplate?.is_premium}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tab 4: หัวใจ 3D & จดหมายปิดท้าย */}
                    <div id="editor-step-panel-4" hidden={activeStep !== 4} className="grid gap-4">
                      <label className="block text-sm font-semibold text-slate-200">
                        หัวข้อจดหมายเมื่อดาวรวมเป็นหัวใจ 3 มิติ
                        <input
                          id="field-orbit-letter-title"
                          value={surpriseQRData.content.letter.title}
                          onChange={(e) =>
                            setSurpriseQRData((c) => ({
                              ...c,
                              content: {
                                ...c.content,
                                letter: { ...c.content.letter, title: e.target.value },
                              },
                            }))
                          }
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        />
                      </label>

                      <label className="block text-sm font-semibold text-slate-200">
                        เนื้อหาจดหมายความรู้สึก
                        <textarea
                          id="field-orbit-letter-body"
                          rows={5}
                          value={surpriseQRData.content.letter.paragraphs.join("\n\n")}
                          onChange={(e) =>
                            setSurpriseQRData((c) => ({
                              ...c,
                              content: {
                                ...c.content,
                                letter: {
                                  ...c.content.letter,
                                  paragraphs: e.target.value.split(/\n{2,}/),
                                },
                              },
                            }))
                          }
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        />
                      </label>

                      <label className="block text-sm font-semibold text-slate-200">
                        คำลงท้าย / ชื่อผู้ส่ง
                        <input
                          id="field-orbit-signoff"
                          value={surpriseQRData.content.finale.subText}
                          onChange={(e) =>
                            setSurpriseQRData((c) => ({
                              ...c,
                              content: {
                                ...c.content,
                                finale: { ...c.content.finale, subText: e.target.value },
                              },
                            }))
                          }
                          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {selectedStrategy === "storyline" && (
                  <div className="space-y-5 rounded-2xl border border-white/10 bg-[#120a21]/80 p-5" onFocusCapture={handleEditingStart} onBlurCapture={handleEditingEnd}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-base font-bold text-rose-100">Storyline · {STORYLINE_STEPS.find((s) => s.id === activeStep)?.label ?? "แก้ไขเรื่องราว"}</p>
                      <button type="button" onClick={() => setPreviewRefreshToken((token) => token + 1)} className="rounded-lg border border-space-border px-3 py-2 text-sm font-bold text-slate-200 hover:bg-white/10">อัปเดตตัวอย่าง</button>
                    </div>

                    {/* Tab 1: หน้าซอง & ธีม */}
                    <div hidden={activeStep !== 1} className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm font-semibold text-slate-200">ชื่อเรื่อง<input id="field-story-title" value={cardTitle} onChange={(event) => setCardTitle(event.target.value)} placeholder={storylineModel.meta.title} className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-500" /></label>
                      <label className="block text-sm font-semibold text-slate-200">ชื่อผู้รับ<input id="field-story-recipient" value={recipientName} onChange={(event) => setRecipientName(event.target.value)} placeholder="ชื่อที่จะแสดงบนการ์ด" className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-500" /></label>
                      <label className="block text-sm font-semibold text-slate-200 md:col-span-2">ข้อความหน้าซอง<input id="field-story-cover" value={storylineModel.recipient.coverMessage} onChange={(event) => setStorylineModel((current) => ({ ...current, recipient: { ...current.recipient, coverMessage: event.target.value } }))} className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100" /></label>
                      <label className="block text-sm font-semibold text-slate-200">สีธีม<input type="color" value={storylineModel.meta.themeColor} onChange={(event) => setStorylineModel((current) => ({ ...current, meta: { ...current.meta, themeColor: event.target.value } }))} className="mt-2 h-12 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 p-1" /></label>
                      <label className="block text-sm font-semibold text-slate-200">รูปแบบเพลงประกอบ<select value={storylineModel.meta.bgMusicType} onChange={(event) => { const nextType = event.target.value as StorylineModel["meta"]["bgMusicType"]; setStorylineModel((current) => { const curUrl = current.meta.bgMusicUrl || ""; const isDefaultPixabay = curUrl.includes("cdn.pixabay.com/download/audio"); const isYt = /youtu\.be|youtube\.com/i.test(curUrl); const isDataAudio = curUrl.startsWith("data:audio"); const nextUrl = isDefaultPixabay || (nextType === "mp3" && isYt) || (nextType === "youtube" && isDataAudio) ? "" : curUrl; return { ...current, meta: { ...current.meta, bgMusicType: nextType, bgMusicUrl: nextUrl } }; }); }} className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"><option value="synth">ดนตรีจากเทมเพลตเอง (กล่องดนตรี)</option><option value="mp3">ไฟล์เพลง .mp3</option><option value="youtube">ลิงก์จาก YouTube</option></select></label>
                      {storylineModel.meta.bgMusicType === "mp3" && (
                        <div className="md:col-span-2">
                          <SurpriseQRMediaInput
                            label="ไฟล์เพลง .mp3"
                            value={storylineModel.meta.bgMusicUrl}
                            onChange={(bgMusicUrl) => setStorylineModel((current) => ({ ...current, meta: { ...current.meta, bgMusicUrl } }))}
                            accept=".mp3,audio/mpeg,audio/*"
                            hideUrlInput
                            tier={userTier}
                            isPremiumTemplate={selectedTemplate?.is_premium}
                          />
                        </div>
                      )}
                      {storylineModel.meta.bgMusicType === "youtube" && (
                        <label className="block text-sm font-semibold text-slate-200 md:col-span-2">ลิงก์จาก YouTube<input type="url" value={storylineModel.meta.bgMusicUrl} onChange={(event) => setStorylineModel((current) => ({ ...current, meta: { ...current.meta, bgMusicUrl: event.target.value } }))} placeholder="https://www.youtube.com/watch?v=... หรือ https://youtu.be/..." className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-500" /></label>
                      )}
                      <label className="block text-sm font-semibold text-slate-200">รหัสผ่าน 4 หลัก<input id="field-story-pin" inputMode="numeric" maxLength={4} value={storylineModel.recipient.passcode} onChange={(event) => setStorylineModel((current) => ({ ...current, recipient: { ...current.recipient, passcode: event.target.value.replace(/\D/g, "").slice(0, 4) } }))} className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100" /></label>
                    </div>

                    {/* Tab 2: ฉาก 1 · รูปภาพ */}
                    <div hidden={activeStep !== 2} className="grid gap-4 md:grid-cols-2">
                      <div id="field-story-photo1" className="md:col-span-2">
                        <SurpriseQRMediaInput label="ภาพความทรงจำ" value={storylineModel.storyScenes[0].mediaUrl} onChange={(mediaUrl) => setStorylineModel((current) => ({ ...current, storyScenes: [{ ...current.storyScenes[0], mediaUrl }, current.storyScenes[1], current.storyScenes[2]] }))} placeholder="วาง URL หรือเลือกไฟล์รูป" />
                      </div>
                      <label className="block text-sm font-semibold text-slate-200 md:col-span-2">คำบรรยายภาพ<input id="field-story-photo1-caption" value={storylineModel.storyScenes[0].caption} onChange={(event) => setStorylineModel((current) => ({ ...current, storyScenes: [{ ...current.storyScenes[0], caption: event.target.value }, current.storyScenes[1], current.storyScenes[2]] }))} className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100" /></label>
                      <label className="block text-sm font-semibold text-slate-200 md:col-span-2">ข้อความใต้ภาพ<input id="field-story-photo1-sub" value={storylineModel.storyScenes[0].subCaption} onChange={(event) => setStorylineModel((current) => ({ ...current, storyScenes: [{ ...current.storyScenes[0], subCaption: event.target.value }, current.storyScenes[1], current.storyScenes[2]] }))} className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100" /></label>
                    </div>

                    {/* Tab 3: ฉาก 2 · วิดีโอ */}
                    <div hidden={activeStep !== 3} className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm font-semibold text-slate-200">แหล่งวิดีโอ<select value={storylineModel.storyScenes[1].videoSource} onChange={(event) => setStorylineModel((current) => ({ ...current, storyScenes: [current.storyScenes[0], { ...current.storyScenes[1], videoSource: event.target.value as StorylineModel["storyScenes"][1]["videoSource"] }, current.storyScenes[2]] }))} className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"><option value="mp4">MP4</option><option value="youtube">YouTube</option></select></label>
                      <label className="block text-sm font-semibold text-slate-200">ลิงก์ MP4 หรือ YouTube<input id="field-story-video" type="url" value={storylineModel.storyScenes[1].videoUrl} onChange={(event) => setStorylineModel((current) => ({ ...current, storyScenes: [current.storyScenes[0], { ...current.storyScenes[1], videoUrl: event.target.value }, current.storyScenes[2]] }))} placeholder="https://..." className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-500" /></label>
                      <label className="block text-sm font-semibold text-slate-200 md:col-span-2">คำบรรยายวิดีโอ<input id="field-story-video-caption" value={storylineModel.storyScenes[1].caption} onChange={(event) => setStorylineModel((current) => ({ ...current, storyScenes: [current.storyScenes[0], { ...current.storyScenes[1], caption: event.target.value }, current.storyScenes[2]] }))} className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100" /></label>
                    </div>

                    {/* Tab 4: ฉาก 3 · จดหมาย */}
                    <div hidden={activeStep !== 4} className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm font-semibold text-slate-200 md:col-span-2">หัวข้อจดหมาย<input id="field-story-letter-title" value={storylineModel.storyScenes[2].highlightHeading} onChange={(event) => setStorylineModel((current) => ({ ...current, storyScenes: [current.storyScenes[0], current.storyScenes[1], { ...current.storyScenes[2], highlightHeading: event.target.value }] }))} className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100" /></label>
                      <label className="block text-sm font-semibold text-slate-200 md:col-span-2">เนื้อหาในจดหมาย<textarea id="field-story-letter-body" rows={5} value={storylineModel.storyScenes[2].bodyParagraphs.join("\n\n")} onChange={(event) => setStorylineModel((current) => ({ ...current, storyScenes: [current.storyScenes[0], current.storyScenes[1], { ...current.storyScenes[2], bodyParagraphs: event.target.value.split(/\n{2,}/) }] }))} className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100" /></label>
                      <label className="block text-sm font-semibold text-slate-200 md:col-span-2">คำลงท้าย<input id="field-story-signoff" value={storylineModel.storyScenes[2].signOff} onChange={(event) => setStorylineModel((current) => ({ ...current, storyScenes: [current.storyScenes[0], current.storyScenes[1], { ...current.storyScenes[2], signOff: event.target.value }] }))} className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100" /></label>
                    </div>

                    {/* Tab 5: หน้าปิดท้าย */}
                    <div hidden={activeStep !== 5} className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm font-semibold text-slate-200">วันครบรอบ<input id="field-story-date" type="date" value={storylineModel.finale.anniversaryDate} onChange={(event) => setStorylineModel((current) => ({ ...current, finale: { ...current.finale, anniversaryDate: event.target.value } }))} className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100" /></label>
                      <label className="flex items-center gap-3 text-sm font-semibold text-slate-200"><input type="checkbox" checked={storylineModel.finale.counterEnabled} onChange={(event) => setStorylineModel((current) => ({ ...current, finale: { ...current.finale, counterEnabled: event.target.checked } }))} className="h-4 w-4 accent-rose-500" />แสดงตัวนับจำนวนวัน</label>
                      <label className="block text-sm font-semibold text-slate-200 md:col-span-2">ข้อความลับฉากสุดท้าย<textarea id="field-story-secret" rows={2} value={storylineModel.finale.secretMessage} onChange={(event) => setStorylineModel((current) => ({ ...current, finale: { ...current.finale, secretMessage: event.target.value } }))} className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100" /></label>
                      <label className="block text-sm font-semibold text-slate-200">เอฟเฟกต์ฉากสุดท้าย<select value={storylineModel.finale.confettiStyle} onChange={(event) => setStorylineModel((current) => ({ ...current, finale: { ...current.finale, confettiStyle: event.target.value as StorylineModel["finale"]["confettiStyle"] } }))} className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-slate-100"><option value="heart-petals">กลีบหัวใจ</option><option value="confetti">คอนเฟตตี</option></select></label>
                    </div>
                  </div>
                )}


              </div>
            </section>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-base font-medium text-red-300">
                <AlertCircle className="h-5 w-5 shrink-0" />
                {error}
              </div>
            )}
            {isAuthenticated && !hasEnoughCredits && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-base font-medium text-amber-300">
                ยอดเงินคงเหลือไม่เพียงพอ: ต้องการอีก ฿{(summaryCost - userCredits).toFixed(2)}
              </div>
            )}
            <div className="sticky bottom-3 z-20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-white/10 bg-[#0d071b]/95 p-3.5 sm:p-4 shadow-xl shadow-black/40 backdrop-blur-md">
              <div className="flex items-center justify-between sm:justify-start gap-2 text-base font-semibold text-slate-300">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-fuchsia-400" />
                  <span>รวม</span>
                </div>
                <strong className="text-xl font-black text-slate-100">฿{summaryCost.toFixed(2)}</strong>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    if (!isAuthenticated) {
                      if (selectedStorage.type === "permanent") {
                        setShowAuthModal(true);
                        return;
                      }
                      saveDraftToStorage();
                      router.push("/login?redirect=/dashboard/create");
                      return;
                    }
                    void submitCard(true);
                  }}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-600 px-3.5 py-2.5 text-sm sm:text-base font-semibold text-slate-200 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  บันทึกร่าง
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="flex-[2] sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-4 py-2.5 text-sm sm:text-base font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  {isSubmitting ? "กำลังสร้าง..." : "สร้างการ์ด & สร้าง QR"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      {showCreationSummary && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#13111c] p-6 text-white shadow-2xl">
            <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-sm font-medium leading-6 text-amber-300">คำเตือน: เมื่อกดสร้างการ์ดเรียบร้อยแล้ว การ์ดจะถูกเผยแพร่จริงและไม่สามารถกลับมาแก้ไขเนื้อหาหรือเทมเพลตได้อีก</div>
            <h2 className="text-xl font-black text-white">สรุปการสร้างการ์ด</h2>
            <div className="mt-5 space-y-4 text-sm">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="font-bold text-slate-200">สิทธิ์เทมเพลต</p>
                {premiumTemplate ? (
                  <>
                    <label className={`mt-3 flex items-center gap-2 ${templateHasFreeQuota ? "text-slate-300" : "text-slate-500"}`}>
                      <input type="radio" name="summary-template-payment" className="accent-fuchsia-500" disabled={!templateHasFreeQuota} checked={canUsePremiumQuota} onChange={() => setUsePremiumQuota(true)} />
                      ใช้สิทธิ์เทมเพลต (หัก 1 สิทธิ์) — เหลือ {premiumQuota} สิทธิ์{templateHasFreeQuota ? "" : " (ไม่มีสิทธิ์คงเหลือ)"}
                    </label>
                    <label className="mt-2 flex items-center gap-2 text-slate-300">
                      <input type="radio" name="summary-template-payment" className="accent-fuchsia-500" checked={!canUsePremiumQuota} onChange={() => setUsePremiumQuota(false)} />
                      ชำระด้วยเงินในระบบ (฿{templatePrice})
                    </label>
                  </>
                ) : templatePrice === 0 ? (
                  <p className="mt-2 text-slate-300">เทมเพลตฟรี — ฿0</p>
                ) : (
                  <p className="mt-2 text-slate-300">ชำระด้วยเงินในระบบ (฿{templatePrice})</p>
                )}
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="font-bold text-slate-200">จัดเก็บการ์ด</p>
                <label className="mt-3 flex items-center gap-2 text-slate-300">
                  <input type="radio" name="summary-storage" className="accent-fuchsia-500" checked={selectedStorage.type === "14_days"} onChange={() => setSelectedStorage(storageOptions[0])} />
                  จัดเก็บ 14 วัน (ฟรี)
                </label>
                <label className="mt-2 flex items-center gap-2 text-slate-300">
                  <input type="radio" name="summary-storage" className="accent-fuchsia-500" checked={selectedStorage.type === "permanent"} onChange={() => setSelectedStorage({ ...storageOptions[1], cost: storagePrice })} />
                  จัดเก็บถาวร{userTier === "god" || userTier === "vip" ? " (รวมในแพ็กเกจ - 0 บาท)" : " (25 บาท - รวมสิทธิ์ Custom URL)"}
                </label>
                {selectedStorage.type === "permanent" && permanentQuota > 0 && userTier !== "god" && userTier !== "vip" && (
                  <label className="mt-3 flex items-center gap-2 text-slate-300">
                    <input type="checkbox" className="accent-fuchsia-500" checked={usePermanentQuota} onChange={(event) => setUsePermanentQuota(event.target.checked)} />
                    ใช้สิทธิ์จัดเก็บถาวร (หัก 1 สิทธิ์ - 0 บาท) — เหลือ {formatQuotaDisplay(permanentQuota)} สิทธิ์
                  </label>
                )}
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="font-bold text-slate-200">สรุปรายการ</p>
                <p className="mt-1 text-slate-300">ค่าเทมเพลต: {canUsePremiumQuota ? "หักสิทธิ์เทมเพลต 1 สิทธิ์ - 0 บาท" : `฿${templatePayable}`}</p>
                {selectedStorage.type === "permanent" && (
                  <p className="mt-1 text-slate-300">ค่าจัดเก็บถาวร (รวม Custom URL): {canUsePermanentQuota ? "หักสิทธิ์จัดเก็บถาวร 1 สิทธิ์ - 0 บาท" : userTier === "god" || userTier === "vip" ? "รวมในแพ็กเกจ - 0 บาท" : "฿25"}</p>
                )}
                <p className="mt-1 text-slate-300">สิทธิ์เทมเพลตฟรีคงเหลือ: {premiumQuota} สิทธิ์</p>
                <p className="mt-3 font-black text-fuchsia-300">ยอดเงินที่ต้องชำระ: <span className="text-3xl font-black">฿{summaryCost.toFixed(2)}</span></p>
                <p className="mt-1 text-slate-300">ยอดเงินคงเหลือหลังสร้าง: ฿{Math.max(0, userCredits - summaryCost).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</p>
                {!hasEnoughCredits && <p className="mt-2 text-sm font-medium text-red-300">ยอดเงินคงเหลือไม่เพียงพอ: ต้องการอีก ฿{(summaryCost - userCredits).toFixed(2)}</p>}
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setShowCreationSummary(false)} className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-bold text-slate-300 transition-colors hover:bg-white/10">ยกเลิก</button>
              <button type="button" disabled={!summaryCanAfford} onClick={() => { setShowCreationSummary(false); void submitCard(false, true); }} className="flex-1 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-4 py-3 font-bold text-white shadow-lg shadow-fuchsia-900/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">ยืนยันชำระ</button>
            </div>
          </div>
        </div>
      )}
      {showPreviewModal && (
        <div
          className="fixed inset-0 z-[120] h-[100dvh] w-screen overflow-hidden bg-[#06030c]"
          role="dialog"
          aria-modal="true"
          aria-label="ตัวอย่างการ์ดแบบเต็มจอ"
        >
          <button
            type="button"
            onClick={() => setShowPreviewModal(false)}
            aria-label="ปิดตัวอย่าง"
            title="ปิดตัวอย่าง"
            className="fixed left-4 top-4 z-[130] inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/60 text-slate-100 shadow-2xl backdrop-blur-md transition hover:border-white/40 hover:bg-black/80 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative h-full w-full overflow-x-hidden overflow-y-auto custom-scrollbar">
            {PreviewComponent && <PreviewComponent config={activeConfig} isEditing={false} />}
          </div>
          <PreviewWatermark />
        </div>
      )}
      {showLeaveConfirmModal && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-confirm-title"
          onClick={() => setShowLeaveConfirmModal(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-white/15 bg-[#120a21] p-6 text-slate-100 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/40 bg-amber-500/15 text-amber-300">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h2 id="leave-confirm-title" className="text-lg font-bold text-white">
                  มีการแก้ไขที่ยังไม่ได้บันทึก
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                  คุณได้แก้ไขข้อมูลในเทมเพลตนี้ไว้แล้ว หากย้อนกลับตอนนี้การเปลี่ยนแปลงที่ยังไม่ได้บันทึกจะหายไป
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowLeaveConfirmModal(false)}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-200 transition-colors hover:bg-white/10"
              >
                อยู่แก้ไขต่อ
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLeaveConfirmModal(false);
                  void submitCard(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-fuchsia-400/40 bg-fuchsia-500/20 px-4 py-2.5 text-sm font-bold text-fuchsia-100 transition-colors hover:bg-fuchsia-500/30"
              >
                <Save className="h-4 w-4" />
                บันทึกร่าง
              </button>
              <button
                type="button"
                onClick={confirmLeaveWithoutSaving}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-rose-500"
              >
                ออกโดยไม่บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
      {showAuthModal && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl"><h2 className="text-xl font-bold text-slate-900">กรุณาเข้าสู่ระบบหรือสมัครสมาชิก</h2><p className="mt-3 text-sm text-slate-600">สมัครสมาชิกเพื่อสร้างการ์ดเพิ่มเติมและใช้ฟีเจอร์แบบชำระเงิน</p><div className="mt-5 flex gap-3"><Link href="/login?redirect=/dashboard/create" className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white">เข้าสู่ระบบ</Link><Link href="/register?redirect=/dashboard/create" className="flex-1 rounded-xl bg-rose-500 px-4 py-3 text-sm font-bold text-white">สมัครสมาชิก</Link></div><button type="button" onClick={() => setShowAuthModal(false)} className="mt-4 text-sm text-slate-500">ปิด</button></div></div>}
      {guestCreated && <div className="fixed bottom-5 left-1/2 z-[90] -translate-x-1/2 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-medium text-amber-900 shadow-lg">สมัครสมาชิกฟรีเพื่อผูกการ์ดใบนี้ไว้ ไม่ให้การ์ดสูญหาย</div>}
    </main>
  );
}

export default function CreateStoryCardPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <CreateStoryCardPageInner />
    </Suspense>
  );
}
