import type { SurpriseQRData } from "@/types/templates";

/** Canonical template slugs. Must match the `slug` column in public.templates. */
export type TemplateSlug = "anniversary-surprise" | "candles" | "storyline";

export interface TemplateDefinition {
  id: string;
  slug: TemplateSlug;
  title: string;
  category: string;
  priceCredits: number;
  image?: string;
  previewVideo?: string;
  gallery?: string[];
  longDescription: string;
  features: string[];
  /** DB ids / legacy slugs that must resolve to this template. */
  aliases: string[];
  defaults: SurpriseQRData;
}

/** Default content for the Anniversary Surprise (7-screen) flagship template. */
export const defaultSurpriseQRData: SurpriseQRData = {
  settings: {
    enablePin: true,
    pinCode: "1234",
    warpDurationEnvelopeMs: 2500,
    warpDurationOptionMs: 2000,
    isPaid: true,
    envelopeStyle: 1,
  },
  content: {
    title: "Happy Anniversary, Love !",
    menu: {
      subTitle: "ของขวัญที่รออยู่",
      title: "เลือกของขวัญสักชิ้นสิ",
      card1Icon: "💌",
      card1Title: "ข้อความจากหัวใจ",
      card1Desc: "จดหมายรักที่เขียนด้วยใจถึงเธอ",
      card2Icon: "📸",
      card2Title: "ความทรงจำ",
      card2Desc: "ภาพช่วงเวลาแสนดีของเรา",
      card3Icon: "💐",
      card3Title: "ดอกไม้",
      card3Desc: "ช่อดอกไม้จากใจ",
    },
    bgMusic: { type: "url", src: "" },
    letter: {
      title: "Happy Anniversary, my love.",
      paragraphs: [
        "ข้อความบรรทัดที่ 1...",
        "ข้อความบรรทัดที่ 2...",
        "และอีกมากมายที่ฉันอยากบอกเธอ ✨",
      ],
      headerImages: [
        { type: "url", src: "/templates/galaxy-1.png" },
        { type: "url", src: "/templates/galaxy-2.png" },
      ],
    },
    memories: {
      sectionTitle: "Memories Made With You",
      filmstripImages: [
        { type: "url", src: "/templates/galaxy-1.png" },
        { type: "url", src: "/templates/galaxy-2.png" },
        { type: "url", src: "/templates/surprise-qr.svg" },
      ],
      polaroidImages: [
        { type: "url", src: "/templates/galaxy-1.png" },
        { type: "url", src: "/templates/galaxy-2.png" },
        { type: "url", src: "/templates/galaxy-1.png" },
        { type: "url", src: "/templates/galaxy-2.png" },
        { type: "url", src: "/templates/surprise-qr.svg" },
      ],
      description: "ข้อความอธิบายความทรงจำ...",
    },
    flowers: {
      subTitle: "ช่อดอกไม้จากใจ",
      title: "ช่อดอกไม้",
      message: "ข้อความ...",
      highlightText: "ความรักและการเติบโต...",
    },
    songMedia: {
      mediaType: "auto",
      src: "",
      audioSrc: "",
      songTitle: "ความทรงจำ",
      songArtist: "",
      sectionTitle: "for you",
      accentImages: [
        { type: "url", src: "/templates/galaxy-1.png" },
        { type: "url", src: "/templates/galaxy-2.png" },
      ],
    },
    finale: {
      heroImage: { type: "url", src: "/templates/galaxy-2.png" },
      mainText: "HAPPY ANNIVERSARY",
      subText: "Love of my life 💕",
    },
  },
};

/** Default content for the Blow Candles (birthday) template. */
export const defaultBlowCandlesData: SurpriseQRData = {
  settings: {
    enablePin: true,
    pinCode: "1234",
    isPaid: false,
    envelopeStyle: 1,
    warpDurationEnvelopeMs: 2500,
    warpDurationOptionMs: 2000,
  },
  content: {
    title: "สุขสันต์วันเกิด 🎂",
    menu: {
      subTitle: "คำอวยพรจากหัวใจ",
      title: "เป่าเทียนขอพร",
      card1Icon: "🎂",
      card1Title: "คำอวยพร",
      card1Desc: "ขอให้มีความสุขมากๆ นะครับ",
      card2Icon: "🎁",
      card2Title: "ของขวัญ",
      card2Desc: "ของขวัญจากใจให้คุณ",
      card3Icon: "🕯️",
      card3Title: "เป่าเทียน",
      card3Desc: "เป่าเทียนเพื่อขอพร",
    },
    bgMusic: { type: "url", src: "" },
    letter: {
      title: "สุขสันต์วันเกิด",
      paragraphs: [
        "ขอให้วันเกิดปีนี้เต็มไปด้วยความสุข",
        "และความรักจากคนรอบข้างนะครับ",
        "เป่าเทียนแล้วขอพรอะไรก็ขอให้สมปรารถนา",
      ],
      headerImages: [{ type: "url", src: "/templates/surprise-qr.svg" }],
    },
    memories: {
      sectionTitle: "ความทรงจำดีๆ",
      filmstripImages: [{ type: "url", src: "/templates/surprise-qr.svg" }],
      polaroidImages: [{ type: "url", src: "/templates/surprise-qr.svg" }],
      description: "ภาพความทรงจำประทับใจ",
    },
    flowers: {
      subTitle: "ดอกไม้จากใจ",
      title: "ช่อดอกไม้",
      message: "มอบดอกไม้ให้ในวันพิเศษ",
      highlightText: "ความสุขและการเติบโต",
    },
    songMedia: {
      mediaType: "auto",
      src: "",
      audioSrc: "",
      songTitle: "เพลงวันเกิด",
      songArtist: "",
      sectionTitle: "สำหรับคุณ",
      accentImages: [{ type: "url", src: "/templates/surprise-qr.svg" }],
    },
    finale: {
      heroImage: { type: "url", src: "/templates/surprise-qr.svg" },
      mainText: "สุขสันต์วันเกิด",
      subText: "Happy Birthday 🎂",
    },
  },
};

/** Default content for the Storyline anniversary template. */
export const defaultStorylineData: SurpriseQRData = {
  ...defaultSurpriseQRData,
  settings: { ...defaultSurpriseQRData.settings, enablePin: false, pinCode: "" },
  content: {
    ...defaultSurpriseQRData.content,
    title: "เรื่องราวของเรา",
    letter: {
      title: "ถึงคนพิเศษ",
      paragraphs: ["ทุกช่วงเวลาที่มีเธอ คือความทรงจำที่ฉันอยากเก็บไว้ตลอดไป"],
      headerImages: [],
    },
    memories: {
      ...defaultSurpriseQRData.content.memories,
      filmstripImages: [],
      polaroidImages: [],
    },
    finale: {
      ...defaultSurpriseQRData.content.finale,
      mainText: "เรื่องราวของเรา",
      subText: "ขอบคุณที่อยู่ด้วยกันเสมอ ❤️",
    },
  },
};

export const templateCatalog: TemplateDefinition[] = [
  {
    id: "anniversary-surprise",
    slug: "anniversary-surprise",
    title: "Anniversary Surprise",
    category: "love",
    priceCredits: 0,
    image: "/templates/surprise-qr.svg",
    previewVideo: undefined,
    gallery: ["/templates/surprise-qr.svg", "/templates/galaxy-1.png"],
    longDescription:
      "การ์ด Anniversary Surprise — ซองจดหมายลอยน้ำ แป้นพิมพ์ PIN 7 หน้าจอ ข้อความ รูปความทรงจำ ดอกไม้ แผ่นเสียง และวิดีโอสุดท้าย พร้อมแอดมินแก้ไขสดและส่งออกไฟล์ HTML ใบเดียว",
    features: [
      "ซองจดหมายลอยน้ำ + PIN 4 หลัก",
      "7 หน้าจอ: ข้อความ / ความทรงจำ / ดอกไม้ / เพลง / Finale",
      "แก้ไขสด (ข้อความ + รูป + วิดีโอ + เพลง)",
      "ส่งออกไฟล์ HTML ใบเดียว / PromptPay",
    ],
    aliases: [
      "anniversary-surprise",
      "anniversary",
      // Production Anniversary Surprise row UUID (seed migration 20260829000005):
      "10000000-0000-4000-8000-000000000006",
    ],
    defaults: defaultSurpriseQRData,
  },
  {
    id: "candles",
    slug: "candles",
    title: "Blow Candles",
    category: "birthday",
    priceCredits: 0,
    image: "/templates/surprise-qr.svg",
    previewVideo: undefined,
    gallery: ["/templates/surprise-qr.svg"],
    longDescription:
      "การ์ดจุดเทียนวันเกิด — ซองจดหมายลอยน้ำ พิน 4 หลัก และระบบเป่าเทียน",
    features: [
      "จุด/เป่าเทียนอัตโนมัติด้วยไมโครโฟน",
      "โหมดแตะสำรอง",
      "บันทึกภาพการจุดเทียนลง Canvas",
    ],
    aliases: [
      "candles",
      "วันเกิด",
      // Production Blow Candles row UUID (seed migration 20261103000001).
      "10000000-0000-4000-8000-000000000007",
    ],
    defaults: defaultBlowCandlesData,
  },
  {
    id: "storyline",
    slug: "storyline",
    title: "Storyline",
    category: "love",
    priceCredits: 0,
    image: "/templates/storyline.svg",
    gallery: ["/templates/storyline.svg"],
    longDescription: "การ์ดเล่าเรื่องราวความทรงจำ ผ่านหน้าปก ภาพถ่าย และจดหมายส่วนตัว",
    features: ["เรื่องราว 3 ฉาก", "เพิ่มภาพความทรงจำได้ 3 ภาพ", "ข้อความจากผู้สร้างถึงผู้รับ"],
    aliases: ["storyline", "story-line", "เรื่องราว", "10000000-0000-4000-8000-000000000008"],
    defaults: defaultStorylineData,
  },
];

export function getTemplateThumbnail(path?: string) {
  return path || "/templates/surprise-qr.svg";
}

/**
 * Resolve the canonical slug from an arbitrary identifier (canonical slug,
 * production DB id, or legacy id/slug). Returns null when nothing matches —
 * callers decide their own fallback.
 */
export function getTemplateSlugById(id?: string): TemplateSlug | null {
  const key = (id ?? "").trim().toLowerCase();
  if (!key) return null;
  const direct = templateCatalog.find(
    (item) => item.id === key || item.aliases.some((alias) => alias.toLowerCase() === key),
  );
  return direct ? direct.slug : null;
}

/**
 * Keyword-based title matching. Returns null when no family keyword matches
 * (so callers never accidentally match a random title to a template).
 */
export function matchTemplateSlugByTitle(title?: string): TemplateSlug | null {
  const lower = (title ?? "").toLowerCase();
  if (lower.includes("storyline") || lower.includes("story-line") || lower.includes("เรื่องราว")) {
    return "storyline";
  }
  if (lower.includes("blow candles") || lower.includes("candles") || lower.includes("วันเกิด")) {
    return "candles";
  }
  if (lower.includes("anniversary") || lower.includes("วันครบรอบ") || lower.includes("ซองจดหมาย")) {
    return "anniversary-surprise";
  }
  return null;
}

export const getTemplateSlugByTitle = (title?: string): TemplateSlug | null =>
  matchTemplateSlugByTitle(title);

export const getTemplateById = (id?: string, title?: string): TemplateDefinition | undefined => {
  const byIdSlug = getTemplateSlugById(id);
  if (byIdSlug) {
    const match = templateCatalog.find((item) => item.slug === byIdSlug);
    if (match) return { ...match, image: getTemplateThumbnail(match.image) };
  }
  const byTitle = templateCatalog.find((item) => item.title.toLowerCase() === (title ?? "").toLowerCase());
  if (byTitle) return { ...byTitle, image: getTemplateThumbnail(byTitle.image) };
  const byKeywords = matchTemplateSlugByTitle(title);
  if (byKeywords) {
    const match = templateCatalog.find((item) => item.slug === byKeywords);
    if (match) return { ...match, image: getTemplateThumbnail(match.image) };
  }
  return undefined;
};
