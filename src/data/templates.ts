import type { SurpriseQRData } from "@/types/templates";

/** Canonical template slugs. Must match the `slug` column in public.templates. */
export type TemplateSlug =
  | "anniversary-surprise"
  | "candles"
  | "storyline"
  | "retro-y2k"
  | "vintage-wax-seal"
  | "midnight-cinema"
  | "starlight-memories"
  | "velvet-candle";

export interface TemplateDefinition {
  id: string;
  slug: TemplateSlug;
  title: string;
  category: string;
  priceCredits: number;
  image?: string;
  badge?: string;
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
      card1Icon: "mail",
      card1Title: "ข้อความจากหัวใจ",
      card1Desc: "จดหมายรักที่เขียนด้วยใจถึงเธอ",
      card2Icon: "camera",
      card2Title: "ความทรงจำ",
      card2Desc: "ภาพช่วงเวลาแสนดีของเรา",
      card3Icon: "sparkles",
      card3Title: "ดอกไม้",
      card3Desc: "ช่อดอกไม้จากใจ",
    },
    bgMusic: { type: "url", src: "" },
    letter: {
      title: "Happy Anniversary, my love.",
      paragraphs: [
        "ข้อความบรรทัดที่ 1...",
        "ข้อความบรรทัดที่ 2...",
        "และอีกมากมายที่ฉันอยากบอกเธอ",
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
      subText: "Love of my life",
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
    title: "Birthday Surprise",
    menu: {
      subTitle: "คำอวยพรจากหัวใจ",
      title: "เป่าเทียนขอพร",
      card1Icon: "cake",
      card1Title: "คำอวยพร",
      card1Desc: "ขอให้มีความสุขมากๆ นะครับ",
      card2Icon: "gift",
      card2Title: "ของขวัญ",
      card2Desc: "ของขวัญจากใจให้คุณ",
      card3Icon: "flame",
      card3Title: "เป่าเทียน",
      card3Desc: "เป่าเทียนเพื่อขอพร",
    },
    bgMusic: { type: "url", src: "" },
    letter: {
      title: "Happy Birthday! Wishing you an amazing year ahead.",
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
      mainText: "Birthday Surprise",
      subText: "Happy Birthday! Wishing you an amazing year ahead.",
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
      subText: "ขอบคุณที่อยู่ด้วยกันเสมอ",
    },
  },
};

/** Default content for the Retro Windows 98 / Y2K Edition template. */
export const defaultRetroY2KData: SurpriseQRData = {
  ...defaultSurpriseQRData,
  settings: {
    ...defaultSurpriseQRData.settings,
    enablePin: false,
    pinCode: "",
  },
  content: {
    ...defaultSurpriseQRData.content,
    title: "Retro Windows 98 / Y2K Edition",
    menu: {
      subTitle: "ตรวจพบความรู้สึกพิเศษเกินขนาดในไดรฟ์ C:\\ ต้องการเปิดอ่านข้อความเซอร์ไพรส์หรือไม่?",
      title: "SYSTEM ALERT: Heartbeat Overload.exe",
      card1Icon: "alert",
      card1Title: "Yes (Y)",
      card1Desc: "Cancel",
      card2Icon: "notepad",
      card2Title: "Notepad.exe",
      card2Desc: "Love Letter",
      card3Icon: "winamp",
      card3Title: "Winamp",
      card3Desc: "Music Player",
    },
    letter: {
      title: "Heartfelt_Message.txt",
      paragraphs: [
        "ทุกช่วงเวลาที่ผ่านมากับเธอ",
        "คือความทรงจำที่อบอุ่นและมีค่าที่สุดในชีวิต",
        "ขอบคุณที่คอยอยู่เคียงข้างและเป็นรอยยิ้มให้กันเสมอ",
      ],
      headerImages: [{ type: "url", src: "/templates/retro-y2k.svg" }],
    },
    memories: {
      sectionTitle: "Memories_98.bmp",
      filmstripImages: [
        { type: "url", src: "/templates/galaxy-1.png" },
        { type: "url", src: "/templates/galaxy-2.png" },
      ],
      polaroidImages: [
        { type: "url", src: "/templates/galaxy-1.png" },
        { type: "url", src: "/templates/galaxy-2.png" },
      ],
      description: "Photo snapshots from the good old days",
    },
    songMedia: {
      mediaType: "auto",
      src: "",
      audioSrc: "",
      songTitle: "Our_Special_Melody.mp3",
      songArtist: "Winamp 2.91",
      sectionTitle: "Stereo Audio",
      accentImages: [{ type: "url", src: "/templates/retro-y2k.svg" }],
    },
    finale: {
      heroImage: { type: "url", src: "/templates/retro-y2k.svg" },
      mainText: "YOU ARE MY FAVORITE PERSON",
      subText: "ขอบคุณที่เข้ามาเป็นเรื่องราวดีๆ ในทุกๆ วัน",
    },
  },
};

/** Default content for the Vintage Wax Seal & Royal Parchment template. */
export const defaultVintageWaxSealData: SurpriseQRData = {
  ...defaultSurpriseQRData,
  settings: {
    ...defaultSurpriseQRData.settings,
    enablePin: false,
    pinCode: "",
  },
  content: {
    ...defaultSurpriseQRData.content,
    title: "Vintage Wax Seal & Royal Parchment",
    menu: {
      subTitle: "สัมผัสตราประทับเพื่อคลี่อ่านความในใจ",
      title: "To Someone Special",
      card1Icon: "ruby", // seal color: "ruby" | "gold"
      card1Title: "เปิดผนึก",
      card1Desc: "แตะเพื่อแกะ",
      card2Icon: "heart", // seal symbol: "heart" | "rose" | "crown"
      card2Title: "ตราสัญลักษณ์",
      card2Desc: "Heart Emblem",
      card3Icon: "letter",
      card3Title: "จดหมาย",
      card3Desc: "Royal Parchment",
    },
    letter: {
      title: "TO MY BELOVED",
      paragraphs: [
        "แด่เธอ... ผู้เป็นดั่งแสงสว่างอันอบอุ่นในทุกค่ำคืน",
        "ทุกช่วงเวลาที่ได้ร่วมเดินทางด้วยกัน คือความทรงจำที่ล้ำค่าประหนึ่งทองคำ",
        "ขอบคุณที่คอยเป็นของขวัญที่วิเศษที่สุดในชีวิตของฉันเสมอมา",
      ],
      headerImages: [{ type: "url", src: "/templates/vintage-wax-seal.svg" }],
    },
    memories: {
      sectionTitle: "Memories Made of Gold",
      filmstripImages: [
        { type: "url", src: "/templates/galaxy-1.png" },
        { type: "url", src: "/templates/galaxy-2.png" },
      ],
      polaroidImages: [
        { type: "url", src: "/templates/galaxy-1.png" },
        { type: "url", src: "/templates/galaxy-2.png" },
      ],
      description: "ภาพความทรงจำที่เราจารึกไว้ด้วยกัน",
    },
    songMedia: {
      mediaType: "auto",
      src: "",
      audioSrc: "",
      songTitle: "Chamber Music Box in A Major",
      songArtist: "Royal Orchestra",
      sectionTitle: "Antique Keepsake",
      accentImages: [{ type: "url", src: "/templates/vintage-wax-seal.svg" }],
    },
    finale: {
      heroImage: { type: "url", src: "/templates/vintage-wax-seal.svg" },
      mainText: "A LOVE WRITTEN IN THE STARS",
      subText: "ขอให้ความรักและความผูกพันของเรา ยืนยงงดงามตราบชั่วนิรันดร์",
    },
  },
};

/** Default content for the Midnight Cinema 35mm template. */
export const defaultMidnightCinemaData: SurpriseQRData = {
  ...defaultSurpriseQRData,
  settings: {
    ...defaultSurpriseQRData.settings,
    enablePin: false,
    pinCode: "",
  },
  content: {
    ...defaultSurpriseQRData.content,
    title: "Midnight Cinema 35mm",
    menu: {
      subTitle: "ADMIT ONE",
      title: "THE STORY OF US",
      card1Icon: "ticket",
      card1Title: "14 FEB 2026",
      card1Desc: "23:45",
      card2Icon: "seat",
      card2Title: "ROW A - 07 & 08",
      card2Desc: "SCREEN 01",
      card3Icon: "film",
      card3Title: "PREMIERE NIGHT",
      card3Desc: "DIRECTED WITH LOVE",
    },
    letter: {
      title: "SCENE 1: EXT. MIDNIGHT SKY - NIGHT",
      paragraphs: [
        "แด่เธอ... ผู้เป็นดั่งบทภาพยนตร์ที่งดงามที่สุดในชีวิตของฉัน",
        "ทุกค่ำคืนที่เราได้ร่วมเดินทางผ่านเรื่องราวต่างๆ คือช่วงเวลาที่ประทับแน่นอยู่ในใจเสมือนม้วนฟิล์ม 35 มม.",
        "ขอบคุณที่เข้ามาเป็นดั่งแสงสปอตไลท์อันอบอุ่น และทำให้ทุกๆ วันมีความหมาย",
      ],
      headerImages: [{ type: "url", src: "/templates/midnight-cinema.svg" }],
    },
    memories: {
      sectionTitle: "THE 35MM MEMORIES",
      filmstripImages: [
        { type: "url", src: "/templates/galaxy-1.png" },
        { type: "url", src: "/templates/galaxy-2.png" },
        { type: "url", src: "/templates/surprise-qr.svg" },
      ],
      polaroidImages: [
        { type: "url", src: "/templates/galaxy-1.png" },
        { type: "url", src: "/templates/galaxy-2.png" },
      ],
      description: "บันทึกช่วงเวลาที่งดงามผ่านม้วนฟิล์ม 35 มม.",
    },
    songMedia: {
      mediaType: "auto",
      src: "",
      audioSrc: "",
      songTitle: "Cinema Paradiso (Love Theme)",
      songArtist: "Ennio Morricone",
      sectionTitle: "ORIGINAL SOUNDTRACK",
      accentImages: [{ type: "url", src: "/templates/midnight-cinema.svg" }],
    },
    finale: {
      heroImage: { type: "url", src: "/templates/midnight-cinema.svg" },
      mainText: "THE END • AND THE STORY CONTINUES",
      subText: "ขอบคุณที่ร่วมเป็นตัวเอกในภาพยนตร์เรื่องนี้ด้วยกัน",
    },
  },
};

/** Default content for the Starlight Memories template. */
export const defaultStarlightMemoriesData: SurpriseQRData = {
  ...defaultSurpriseQRData,
  settings: {
    ...defaultSurpriseQRData.settings,
    enablePin: false,
    pinCode: "",
  },
  content: {
    ...defaultSurpriseQRData.content,
    title: "Starlight Memories",
    menu: {
      subTitle: "ถึงคนพิเศษของฉัน",
      title: "ดวงดาวแห่งความทรงจำ",
      card1Icon: "sparkles",
      card1Title: "60-Second Immersion",
      card1Desc: "ช่วงเวลาสะกดอารมณ์ 60 วินาที",
      card2Icon: "image",
      card2Title: "Memory Gallery",
      card2Desc: "แกลเลอรีความทรงจำที่ปลดล็อก",
      card3Icon: "music",
      card3Title: "Background Melody",
      card3Desc: "ท่วงทำนองใต้แสงดาว",
    },
    letter: {
      title: "STARLIGHT MEMORIES",
      paragraphs: [
        "ในค่ำคืนที่ท้องฟ้าพร่างพราวไปด้วยแสงดาว",
        "ทุกช่วงเวลาที่เราได้หัวเราะและแบ่งปันรอยยิ้มด้วยกัน คือความทรงจำที่ล้ำค่าที่สุดในชีวิต",
        "ขอบคุณที่คอยเป็นแสงสว่างที่แสนอบอุ่น และทำให้ทุกๆ วันมีความหมายเสมอมา",
      ],
      headerImages: [{ type: "url", src: "/templates/starlight-memories.svg" }],
    },
    memories: {
      sectionTitle: "STARLIGHT MOMENTS",
      filmstripImages: [
        { type: "url", src: "/templates/galaxy-1.png" },
        { type: "url", src: "/templates/galaxy-2.png" },
        { type: "url", src: "/templates/starlight-memories.svg" },
      ],
      polaroidImages: [
        { type: "url", src: "/templates/galaxy-1.png" },
        { type: "url", src: "/templates/galaxy-2.png" },
      ],
      description: "เรื่องราวใต้ผืนฟ้าดวงดาว",
    },
    songMedia: {
      mediaType: "auto",
      src: "",
      audioSrc: "",
      songTitle: "A Sky Full of Stars",
      songArtist: "Midnight Melody",
      sectionTitle: "SOUNDTRACK UNDER THE STARS",
      accentImages: [{ type: "url", src: "/templates/starlight-memories.svg" }],
    },
    finale: {
      heroImage: { type: "url", src: "/templates/starlight-memories.svg" },
      mainText: "ALWAYS IN MY HEART",
      subText: "และจะยังคงเป็นดวงดาวที่งดงามที่สุดเสมอ",
    },
  },
};

/** Default content for the Velvet Candle & Cake (Interactive Birthday) template. */
export const defaultVelvetCandleData: SurpriseQRData = {
  ...defaultSurpriseQRData,
  settings: {
    ...defaultSurpriseQRData.settings,
    enablePin: false,
    pinCode: "",
  },
  content: {
    ...defaultSurpriseQRData.content,
    title: "Happy Birthday",
    menu: {
      subTitle: "คนพิเศษ",
      title: "สุขสันต์วันเกิด",
      card1Icon: "sparkles",
      card1Title: "ความสุขที่เปล่งประกาย",
      card1Desc: "ขอให้รอยยิ้มนี้อยู่คู่เธอเสมอในทุกๆ วัน",
      card2Icon: "heart",
      card2Title: "การเดินทางบทใหม่",
      card2Desc: "เติบโตอย่างงดงาม และเป็นตัวเองในเวอร์ชันที่มีความสุขที่สุด",
      card3Icon: "gift",
      card3Title: "คำอวยพรพิเศษ",
      card3Desc: "ไม่ว่าจะเกิดอะไรขึ้น จะมีฉันคอยอยู่เคียงข้างและเป็นกำลังใจให้เสมอ",
    },
    letter: {
      title: "หลับตาอธิษฐาน แล้วเป่าเทียนเพื่อเริ่มงานวันเกิด",
      paragraphs: [
        "สุขสันต์วันเกิดนะ ขอให้ปีนี้เป็นปีที่แสนพิเศษ เต็มไปด้วยความทรงจำดีๆ และความรักที่อบอุ่น",
        "ขอบคุณที่เกิดมาและเป็นความสดใสให้กับทุกคนรอบข้าง ขอให้ทุกความปรารถนาที่อธิษฐานในวันนี้กลายเป็นจริง",
      ],
      headerImages: [{ type: "url", src: "/templates/velvet-candle.svg" }],
    },
    memories: {
      sectionTitle: "BIRTHDAY MOMENTS",
      filmstripImages: [
        { type: "url", src: "/templates/velvet-candle.svg" },
        { type: "url", src: "/templates/velvet-candle.svg" },
        { type: "url", src: "/templates/velvet-candle.svg" },
        { type: "url", src: "/templates/velvet-candle.svg" },
      ],
      polaroidImages: [
        { type: "url", src: "/templates/velvet-candle.svg" },
        { type: "url", src: "/templates/velvet-candle.svg" },
        { type: "url", src: "/templates/velvet-candle.svg" },
      ],
      description: "ความทรงจำวันเกิด",
    },
    flowers: {
      subTitle: "A SWEET SURPRISE",
      title: "ของขวัญลับในก้อนเค้ก",
      message: "ขอบคุณที่เป็นความสุขและรอยยิ้มให้กันเสมอมา ขอให้ทุกวันของเธอสดใสและอบอุ่นดั่งแสงเทียนในค่ำคืนนี้",
      highlightText: "25",
    },
    songMedia: {
      mediaType: "auto",
      src: "",
      audioSrc: "",
      songTitle: "Happy Birthday Music Box",
      songArtist: "SurpriseQR",
      sectionTitle: "BIRTHDAY MELODY",
      accentImages: [{ type: "url", src: "/templates/velvet-candle.svg" }],
    },
    finale: {
      heroImage: { type: "url", src: "/templates/velvet-candle.svg" },
      mainText: "HAPPY BIRTHDAY",
      subText: "ด้วยรักและความปรารถนาดีเสมอ",
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
  {
    id: "retro-y2k",
    slug: "retro-y2k",
    title: "Retro Windows 98 / Y2K Edition",
    category: "love",
    priceCredits: 0,
    badge: "VIRAL Y2K",
    image: "/templates/retro-y2k.svg",
    gallery: ["/templates/retro-y2k.svg"],
    longDescription:
      "เทมเพลต Retro Windows 98 สไตล์ Y2K Awwwards / TikTok สุดไวรัล — มีระบบ CRT scanlines, 3D bevels ขอบนูน-ขอบจม, กล่องเตือน Error runaway button วิ่งหนีเมาส์, โปรแกรม Notepad.exe พิมพ์ดีด, PhotoViewer.exe และเครื่องเล่น Winamp จำลองพร้อม Equalizer ดุ๊กดิ๊กและเสียง Retro Web Audio API แท้",
    features: [
      "สไตล์ Windows 98 แท้ พร้อมเอฟเฟกต์ CRT Scanline",
      "กล่องเตือน Heartbeat Overload.exe + ปุ่ม Cancel วิ่งหนีเมาส์",
      "Notepad.exe จำลองพร้อมเอฟเฟกต์ Typewriter",
      "เครื่องเล่น Winamp + Spectrum Equalizer และพลุฉลอง",
      "เสียงคลิกและเสียงเตือน Retro Web Audio API",
    ],
    aliases: [
      "retro-y2k",
      "retro",
      "windows98",
      "y2k",
      "win98",
      "10000000-0000-4000-8000-000000000009",
    ],
    defaults: defaultRetroY2KData,
  },
  {
    id: "vintage-wax-seal",
    slug: "vintage-wax-seal",
    title: "Vintage Wax Seal & Royal Parchment",
    category: "love",
    priceCredits: 0,
    badge: "LUXURY",
    image: "/templates/vintage-wax-seal.svg",
    gallery: ["/templates/vintage-wax-seal.svg"],
    longDescription:
      "เทมเพลตซองจดหมายหรูระดับ Cinematic พร้อมตราประทับครั่ง 3D (3D Wax Seal) ที่แตะแล้วแตกออกด้วยฟิสิกส์และเสียง Crack จริง แอนิเมชันคลี่กระดาษจดหมายวินเทจ 3 ท่อน ภาพถ่ายโพลารอยด์ติดเทปทอง และเครื่องเล่นกล่องดนตรีไขลานพร้อมละอองทอง",
    features: [
      "บรรยากาศห้องแสงเทียนอบอุ่น & ละอองทองคำ (Gold Dust)",
      "ตราประทับครั่ง 3D ทับทิม/ทอง แตะแตกออกด้วยฟิสิกส์ + เสียง Crack แท้",
      "ซองจดหมายลินินงาช้าง ขอบทองโบราณ คลี่เปิด 3 มิติ",
      "เครื่องเล่นกล่องดนตรีไขลาน (Music Box) พร้อมแผ่นเสียงหมุน",
      "ระบบยิงประกายทอง (Golden Confetti) ภายในกรอบพรีวิว",
    ],
    aliases: [
      "vintage-wax-seal",
      "wax-seal",
      "parchment",
      "vintage",
      "royal",
      "ครั่ง",
      "ตราประทับ",
      "10000000-0000-4000-8000-000000000010",
    ],
    defaults: defaultVintageWaxSealData,
  },
  {
    id: "midnight-cinema",
    slug: "midnight-cinema",
    title: "Midnight Cinema 35mm",
    category: "love",
    priceCredits: 0,
    badge: "CINEMATIC",
    image: "/templates/midnight-cinema.svg",
    gallery: ["/templates/midnight-cinema.svg"],
    longDescription:
      "เทมเพลตภาพยนตร์คลาสสิกยามค่ำคืนในสไตล์ฟิล์ม 35 มม. สัมผัสประสบการณ์ฉีกตั๋วหนังโบราณ (Cinema Ticket Stub) พร้อมเสียงกระดาษฉีกจริง ม้วนฟิล์มหนามเตย 35 มม. เลื่อนดูรูปภาพความทรงจำ บทละครความในใจ และเครื่องเล่นโปรเจกเตอร์แผ่นฟิล์มคู่หมุนวน",
    features: [
      "บรรยากาศโรงหนังคลาสสิกยามค่ำคืน & เลเยอร์เกรนฟิล์ม 35mm",
      "ตั๋วภาพยนตร์วินเทจ แตะฉีกตั๋วพร้อมเสียง Paper Tear แท้",
      "ม้วนฟิล์ม 35 มม. พร้อมช่องหนามเตยสมจริง และเสียงคลิกเลื่อนเฟรม",
      "เลย์เอาต์จดหมายสไตล์บทภาพยนตร์ (Screenplay Typography)",
      "เครื่องเล่นโปรเจกเตอร์แผ่นฟิล์มคู่หมุนวนตามจังหวะเพลง",
    ],
    aliases: [
      "midnight-cinema",
      "cinema",
      "35mm",
      "midnight",
      "film",
      "ภาพยนตร์",
      "ตั๋วหนัง",
      "10000000-0000-4000-8000-000000000011",
    ],
    defaults: defaultMidnightCinemaData,
  },
  {
    id: "starlight-memories",
    slug: "starlight-memories",
    title: "Starlight Memories",
    category: "love",
    priceCredits: 0,
    badge: "IMMERSION",
    image: "/templates/starlight-memories.svg",
    gallery: ["/templates/starlight-memories.svg"],
    longDescription:
      "เทมเพลตดวงดาวแห่งความทรงจำแบบ 2 จังหวะเวลา (2-Phase Experience) — จังหวะที่ 1 ช่วงภาพยนตร์สะกดอารมณ์ 60 วินาที พร้อมเส้นแสงดาว Starlight Progress Line ใต้ผืนฟ้า และจังหวะที่ 2 ปลดล็อกโหมดแกลเลอรีความทรงจำ เลื่อนปาดดูรูปและอ่านข้อความทบทวนได้อย่างอิสระ",
    features: [
      "ระบบ 2 จังหวะเวลา: 60 วินาทีสะกดอารมณ์ + ปลดล็อกแกลเลอรีอิสระ",
      "แถบเส้นแสงดาวเรืองแสง 1px (Starlight Progress Line)",
      "อนิเมชันแสงดาวสว่างวาบตอนปลดล็อกแกลเลอรี",
      "แตะดูภาพซูมขนาดใหญ่และทบทวนข้อความความในใจ",
      "ปุ่มมินิมอล 'ชมเรื่องราวอีกครั้ง' เริ่มรัน 60 วินาทีใหม่ได้ตลอดเวลา",
    ],
    aliases: [
      "starlight-memories",
      "starlight",
      "stars",
      "memories",
      "แสงดาว",
      "ดวงดาว",
      "10000000-0000-4000-8000-000000000012",
    ],
    defaults: defaultStarlightMemoriesData,
  },
  {
    id: "velvet-candle",
    slug: "velvet-candle",
    title: "Velvet Candle & Cake (Interactive Birthday)",
    category: "birthday",
    priceCredits: 0,
    badge: "INTERACTIVE",
    image: "/templates/velvet-candle.svg",
    gallery: ["/templates/velvet-candle.svg"],
    longDescription:
      "เทมเพลตวันเกิดสุดหรูหรา 4 ลูกเล่นอินเทอร์แอคทีฟ — เป่าเทียนดับได้จริงผ่านไมโครโฟนหรือการสัมผัส แสงห้องมืดสลัวอบอุ่น มีดตัดเค้กเซอร์ไพรส์เผยการ์ดลับ ลูกโป่งลอยแตะเพื่อแตกปล่อยคำอวยพร และอัลบั้มโพลารอยด์แห่งความทรงจำ",
    features: [
      "ระบบเป่าเทียนดับจริงผ่านไมโครโฟน Web Audio API พร้อม Fallback ปาดนิ้ว",
      "ห้องแสงเทียน Ambient Candlelight Room ค่อยๆ สว่างเปิดรับความอบอุ่น",
      "มีดทองคำตัดเค้กสองชั้น แยกชั้นเผยของขวัญลับ",
      "ลูกโป่งสีพาสเทลหรู แตะแตกปล่อยการ์ดคำอวยพร",
      "คลังภาพวันเกิดโพลารอยด์เรืองแสง และปุ่มเป่าเทียนอีกครั้ง",
    ],
    aliases: [
      "velvet-candle",
      "velvet",
      "cake",
      "เค้ก",
      "เค้กวันเกิด",
      "10000000-0000-4000-8000-000000000013",
    ],
    defaults: defaultVelvetCandleData,
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
  if (lower.includes("velvet") || lower.includes("cake") || lower.includes("เค้ก") || lower.includes("เป่าเทียนวันเกิด")) {
    return "velvet-candle";
  }
  if (lower.includes("cinema") || lower.includes("35mm") || lower.includes("midnight") || lower.includes("film") || lower.includes("ภาพยนตร์") || lower.includes("ตั๋วหนัง")) {
    return "midnight-cinema";
  }
  if (lower.includes("wax") || lower.includes("seal") || lower.includes("parchment") || lower.includes("vintage") || lower.includes("royal") || lower.includes("ครั่ง") || lower.includes("ตราประทับ")) {
    return "vintage-wax-seal";
  }
  if (lower.includes("retro") || lower.includes("y2k") || lower.includes("windows 98") || lower.includes("windows98") || lower.includes("win98")) {
    return "retro-y2k";
  }
  if (lower.includes("storyline") || lower.includes("story-line") || lower.includes("เรื่องราว")) {
    return "storyline";
  }
  if (lower.includes("blow candles") || lower.includes("candles") || lower.includes("วันเกิด")) {
    return "candles";
  }
  if (lower.includes("starlight") || lower.includes("stars") || lower.includes("ดวงดาว") || lower.includes("แสงดาว")) {
    return "starlight-memories";
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
