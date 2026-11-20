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
  | "velvet-candle"
  | "new-year-grand-celebration"
  | "songkran-splendor"
  | "halloween-haunted-scroll"
  | "love-os"
  | "pixel-gacha"
  | "lunar-3d"
  | "orbit-of-us";

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
    warpDurationEnvelopeMs: 3600,
    warpDurationOptionMs: 2800,
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
      title: "ช่อดอกไม้แห่งความรัก",
      message: "มอบช่อดอกไม้นี้แทนความรู้สึกดีๆ ขอบคุณที่คอยเติมเต็มรอยยิ้มและความอบอุ่นให้กันในทุกๆ วัน",
      highlightText: "ความรักและการเติบโตเคียงข้างกันตลอดไป",
      wishes: [
        "ขอให้ทุกวันของเธอเต็มไปด้วยรอยยิ้มและความสุข",
        "ไม่ว่าจะเจอเรื่องอะไร จะมีฉันคอยอยู่ข้างๆ เสมอ",
        "ขอให้ความรักของเราเติบโตและงดงามแบบนี้ตลอดไป",
      ],
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
    enablePin: true,
    pinCode: "1234",
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
      anniversaryDate: "2024-02-14",
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
      card1Title: "ACT 1: THE ENCOUNTER",
      card1Desc: "SCENE 01",
      card2Icon: "image",
      card2Title: "ACT 2: JOURNEY IN TIME",
      card2Desc: "SCENE 02",
      card3Icon: "music",
      card3Title: "ACT 3: THE HEARTBEAT",
      card3Desc: "SCENE 03",
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
      sectionTitle: "CINEMATIC 21:9 WIDESCREEN EXPERIENCE",
      filmstripImages: [
        { type: "url", src: "/templates/galaxy-1.png" },
        { type: "url", src: "/templates/galaxy-2.png" },
        { type: "url", src: "/templates/starlight-memories.svg" },
      ],
      polaroidImages: [
        { type: "url", src: "/templates/galaxy-1.png" },
        { type: "url", src: "/templates/galaxy-2.png" },
      ],
      description: "ปาดเลือกหยิบดูภาพโพลารอยด์ หรือแตะเพื่ออ่านข้อความความในใจ",
    },
    flowers: {
      ...defaultSurpriseQRData.content.flowers,
      subTitle: "ชมคัดซีนภาพยนตร์อีกครั้ง",
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

export interface GrandNewYearConfig {
  recipientName: string;
  senderName: string;
  targetYear: string;
  openingTagline: string;
  photo1Url: string;
  photo1Caption: string;
  mainWishTitle: string;
  mainWishMessage: string;
  photo2Url: string;
  photo2Caption: string;
  fortuneList: string[];
  bgmUrl?: string;
}

export const defaultGrandNewYearConfig: GrandNewYearConfig = {
  recipientName: "เพื่อนคนพิเศษ",
  senderName: "จากใจผู้ส่ง",
  targetYear: "2027",
  openingTagline: "ช่วงเวลาแห่งการเริ่มต้นใหม่ที่สว่างไสวและเปี่ยมด้วยความหมาย",
  photo1Url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80",
  photo1Caption: "ขอบคุณทุกความทรงจำและรอยยิ้มที่มีให้กันตลอดทั้งปี",
  mainWishTitle: "สวัสดีปีใหม่ สุขสันต์ ร่ำรวย และสดใส",
  mainWishMessage:
    "ขอให้ปีใหม่นี้นำพาความสุข ความสำเร็จ และพลังบวกมาสู่ชีวิต คิดสิ่งใดขอให้สมความปรารถนา สุขภาพกายใจแข็งแรงตลอดปีและตลอดไป",
  photo2Url: "https://images.unsplash.com/photo-1482517967863-00e15c9b44be?w=800&auto=format&fit=crop&q=80",
  photo2Caption: "ก้าวสู่บทใหม่ของชีวิตไปด้วยกันอย่างงดงาม",
  fortuneList: [
    "ปีนี้การงานจะราบรื่น ก้าวหน้าสู่โอกาสที่ยิ่งใหญ่",
    "โชคลาภเงินทองไหลมาเทมา มีเรื่องให้ยิ้มได้ทุกวัน",
    "จะได้พบเจอผู้คนดี ๆ และความสัมพันธ์ที่อบอุ่นหัวใจ",
    "สุขภาพกายใจแข็งแกร่ง มีพลังสร้างสรรค์สิ่งใหม่สำเร็จ",
    "ทุกความตั้งใจที่ลงมือทำจะผลิดอกออกผลอย่างงดงาม",
  ],
  bgmUrl: "",
};

/** Default SurpriseQRData wrapper for the Grand New Year Celebration template. */
export const defaultGrandNewYearData: SurpriseQRData = {
  ...defaultSurpriseQRData,
  settings: {
    ...defaultSurpriseQRData.settings,
    enablePin: false,
    pinCode: "",
  },
  content: {
    ...defaultSurpriseQRData.content,
    title: "Grand New Year Celebration",
    menu: {
      ...defaultSurpriseQRData.content.menu,
      subTitle: defaultGrandNewYearConfig.recipientName,
      title: defaultGrandNewYearConfig.targetYear,
      card1Title: defaultGrandNewYearConfig.openingTagline,
      card1Desc: defaultGrandNewYearConfig.senderName,
    },
    letter: {
      ...defaultSurpriseQRData.content.letter,
      title: defaultGrandNewYearConfig.mainWishTitle,
      paragraphs: [defaultGrandNewYearConfig.mainWishMessage],
    },
    memories: {
      ...defaultSurpriseQRData.content.memories,
      sectionTitle: defaultGrandNewYearConfig.photo1Caption,
      description: defaultGrandNewYearConfig.photo2Caption,
      filmstripImages: [
        { type: "url", src: defaultGrandNewYearConfig.photo1Url },
        { type: "url", src: defaultGrandNewYearConfig.photo2Url },
      ],
    },
    flowers: {
      ...defaultSurpriseQRData.content.flowers,
      message: defaultGrandNewYearConfig.fortuneList.join("\n"),
    },
    songMedia: {
      ...defaultSurpriseQRData.content.songMedia,
      audioSrc: "",
    },
    bgMusic: {
      ...defaultSurpriseQRData.content.bgMusic,
      src: "",
    },
    finale: {
      ...defaultSurpriseQRData.content.finale,
      heroImage: { type: "url", src: defaultGrandNewYearConfig.photo2Url },
      mainText: "สวัสดีปีใหม่",
      subText: defaultGrandNewYearConfig.photo2Caption,
    },
  },
};

export interface SongkranSplendorConfig {
  recipientName: string;
  senderName: string;
  festivalYear: string;
  openingTagline: string;
  photo1Url: string;
  photo1Caption: string;
  mainBlessingTitle: string;
  mainBlessingMessage: string;
  photo2Url: string;
  photo2Caption: string;
  blessingsList: string[];
  bgmUrl?: string;
}

export const defaultSongkranSplendorConfig: SongkranSplendorConfig = {
  recipientName: "เพื่อนคนพิเศษ",
  senderName: "ส่งความชุ่มฉ่ำจากใจ",
  festivalYear: "สงกรานต์ 2569",
  openingTagline: "คลายร้อนรับความสุข สาดความสดชื่นให้ชุ่มฉ่ำหัวใจตลอดปีใหม่ไทย",
  photo1Url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80",
  photo1Caption: "เก็บภาพรอยยิ้มและช่วงเวลาแห่งความสดชื่นไว้ด้วยกัน",
  mainBlessingTitle: "สวัสดีปีใหม่ไทย เย็นกาย สบายใจ",
  mainBlessingMessage:
    "ขอให้ความบริสุทธิ์และความเย็นฉ่ำของสายน้ำ พัดพาความเหนื่อยล้าออกไป นำมาซึ่งความโชคดี สุขภาพแข็งแรง และรอยยิ้มที่เบิกบานตลอดทั้งปี",
  photo2Url: "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&auto=format&fit=crop&q=80",
  photo2Caption: "ก้าวเข้าสู่ปีใหม่ไทยด้วยพลังใจที่สดใสกว่าเดิม",
  blessingsList: [
    "ทรัพย์สินเงินทองไหลมาเทมา ไม่ขาดสายดุจสายน้ำเย็นฉ่ำ",
    "การงานราบรื่นไร้อุปสรรค มีผู้ใหญ่ใจดีคอยเอ็นดูสนับสนุน",
    "สุขภาพกายใจแข็งแรง สดชื่นแจ่มใสรับความสุขทุกเช้าวันใหม่",
    "ได้ท่องเที่ยวพักผ่อนเติมพลังในสถานที่ในฝันสมใจปรารถนา",
    "รายล้อมด้วยกัลยาณมิตรและความรักที่อบอุ่นสบายใจตลอดปี",
  ],
  bgmUrl: "",
};

/** Default SurpriseQRData wrapper for the Songkran Splendor festival template. */
export const defaultSongkranSplendorData: SurpriseQRData = {
  ...defaultSurpriseQRData,
  settings: {
    ...defaultSurpriseQRData.settings,
    enablePin: false,
    pinCode: "",
  },
  content: {
    ...defaultSurpriseQRData.content,
    title: "Songkran Splendor",
    menu: {
      ...defaultSurpriseQRData.content.menu,
      subTitle: defaultSongkranSplendorConfig.recipientName,
      title: defaultSongkranSplendorConfig.festivalYear,
      card1Title: defaultSongkranSplendorConfig.openingTagline,
      card1Desc: defaultSongkranSplendorConfig.senderName,
    },
    letter: {
      ...defaultSurpriseQRData.content.letter,
      title: defaultSongkranSplendorConfig.mainBlessingTitle,
      paragraphs: [defaultSongkranSplendorConfig.mainBlessingMessage],
    },
    memories: {
      ...defaultSurpriseQRData.content.memories,
      sectionTitle: defaultSongkranSplendorConfig.photo1Caption,
      description: defaultSongkranSplendorConfig.photo2Caption,
      filmstripImages: [
        { type: "url", src: defaultSongkranSplendorConfig.photo1Url },
        { type: "url", src: defaultSongkranSplendorConfig.photo2Url },
      ],
    },
    flowers: {
      ...defaultSurpriseQRData.content.flowers,
      message: defaultSongkranSplendorConfig.blessingsList.join("\n"),
    },
    songMedia: {
      ...defaultSurpriseQRData.content.songMedia,
      audioSrc: "",
    },
    bgMusic: {
      ...defaultSurpriseQRData.content.bgMusic,
      src: "",
    },
    finale: {
      ...defaultSurpriseQRData.content.finale,
      heroImage: { type: "url", src: defaultSongkranSplendorConfig.photo2Url },
      mainText: "สุขสันต์วันสงกรานต์",
      subText: defaultSongkranSplendorConfig.photo2Caption,
    },
  },
};

export interface HalloweenHauntedConfig {
  recipientName: string;
  senderName: string;
  festivalYear: string;
  openingTagline: string;
  photo1Url: string;
  photo1Caption: string;
  mainWishTitle: string;
  mainWishMessage: string;
  photo2Url: string;
  photo2Caption: string;
  fortuneList: string[];
  bgmUrl?: string;
}

export const defaultHalloweenHauntedConfig: HalloweenHauntedConfig = {
  recipientName: "คนพิเศษคืนฮาโลวีน",
  senderName: "ส่งตรงความสุขจากใจ",
  festivalYear: "สุขสันต์วันฮาโลวีน 31 ตุลาคม",
  openingTagline: "คืนพระจันทร์สวย ๆ แบบนี้ ลองเลื่อนลงมาไขปริศนาตามหารูปความทรงจำและซองจดหมายลับวันฮาโลวีนกันนะ",
  photo1Url:
    "https://images.unsplash.com/photo-1509557965875-b88c97052f0e?w=800&auto=format&fit=crop&q=80",
  photo1Caption: "ปัดหมอกแสงจันทร์ให้จางลง เพื่อเปิดภาพความทรงจำสุดพิเศษใบแรก",
  mainWishTitle: "Happy Halloween! ขอให้มีแต่รอยยิ้มแสนหวาน",
  mainWishMessage:
    "คืนนี้ภูตผีน่ารักอาจออกมาทักทาย แต่ความปรารถนาดีที่มีให้ไม่มีวันจางหาย ขอให้ฮาโลวีนปีนี้เต็มไปด้วยเสียงหัวเราะ ความอบอุ่น และเรื่องเซอร์ไพรส์แสนหวานยิ่งกว่าลูกอมทั้งตะกร้า",
  photo2Url:
    "https://images.unsplash.com/photo-1508361001413-7a9dca21d08a?w=800&auto=format&fit=crop&q=80",
  photo2Caption: "Trick or Treat! ขอให้ความโชคดีและความสุขอยู่ข้างเธอตลอดค่ำคืนนี้และทุกวัน",
  fortuneList: [
    "คืนนี้จะมีโชคลาภแสนหวานพุ่งเข้าหา เหมือนได้ลูกอมรสโปรดทั้งตะกร้า",
    "พลังความสดใสทำงานเต็มร้อย เรื่องไหนก็ราบรื่นและน่าประทับใจ",
    "คนรอบข้างจะเอ็นดูเป็นพิเศษ มีเกณฑ์ได้ของฝากหรือคำชมแบบไม่ทันตั้งตัว",
    "เรื่องเหนื่อยใจจะลอยหายไปกับสายลม เหลือไว้แต่รอยยิ้มเต็มเปี่ยม",
    "เร็ว ๆ นี้จะมีเหตุการณ์น่าตื่นเต้นชวนยิ้มกว้างกว่าที่คิดแน่นอน",
  ],
  bgmUrl: "",
};

/** Default SurpriseQRData wrapper for the Halloween Midnight Haunted Abyss scroll template. */
export const defaultHalloweenHauntedData: SurpriseQRData = {
  ...defaultSurpriseQRData,
  settings: {
    ...defaultSurpriseQRData.settings,
    enablePin: false,
    pinCode: "",
  },
  content: {
    ...defaultSurpriseQRData.content,
    title: "Midnight Haunted Abyss",
    menu: {
      ...defaultSurpriseQRData.content.menu,
      subTitle: defaultHalloweenHauntedConfig.recipientName,
      title: defaultHalloweenHauntedConfig.festivalYear,
      card1Title: defaultHalloweenHauntedConfig.openingTagline,
      card1Desc: defaultHalloweenHauntedConfig.senderName,
    },
    letter: {
      ...defaultSurpriseQRData.content.letter,
      title: defaultHalloweenHauntedConfig.mainWishTitle,
      paragraphs: [defaultHalloweenHauntedConfig.mainWishMessage],
    },
    memories: {
      ...defaultSurpriseQRData.content.memories,
      sectionTitle: defaultHalloweenHauntedConfig.photo1Caption,
      description: defaultHalloweenHauntedConfig.photo2Caption,
      filmstripImages: [
        { type: "url", src: defaultHalloweenHauntedConfig.photo1Url },
        { type: "url", src: defaultHalloweenHauntedConfig.photo2Url },
      ],
    },
    flowers: {
      ...defaultSurpriseQRData.content.flowers,
      message: defaultHalloweenHauntedConfig.fortuneList.join("\n"),
    },
    songMedia: {
      ...defaultSurpriseQRData.content.songMedia,
      audioSrc: "",
    },
    bgMusic: {
      ...defaultSurpriseQRData.content.bgMusic,
      src: "",
    },
    finale: {
      ...defaultSurpriseQRData.content.finale,
      heroImage: { type: "url", src: defaultHalloweenHauntedConfig.photo2Url },
      mainText: "Happy Halloween",
      subText: defaultHalloweenHauntedConfig.photo2Caption,
    },
  },
};

/** Default content for the Love OS · Desktop Confession Y2K love computer template. */
export const defaultLoveOsData: SurpriseQRData = {
  settings: {
    enablePin: true,
    pinCode: "1234",
    warpDurationEnvelopeMs: 1200,
    warpDurationOptionMs: 1000,
    isPaid: true,
    envelopeStyle: 1,
  },
  content: {
    title: "My Favorite Person",
    menu: {
      subTitle: "Love OS",
      title: "ตรวจพบความรักเกินพิกัด!",
      card1Icon: "heart",
      card1Title: "Secret_For_You.love",
      card1Desc: "ไฟล์นี้มีความรู้สึกพิเศษที่แอบเก็บไว้ให้เธอ ต้องการเปิดอ่านเลยไหม?",
      card2Icon: "check",
      card2Title: "Yes · เปิดเลย",
      card2Desc: "",
      card3Icon: "x",
      card3Title: "Cancel",
      card3Desc: "",
    },
    bgMusic: { type: "url", src: "" },
    letter: {
      title: "ถึงคนพิเศษที่สุดของฉัน",
      paragraphs: [
        "ขอบคุณที่เข้ามาเป็นเรื่องราวดีๆ ในทุกวันของฉันนะ ไม่ว่าจะเหนื่อยแค่ไหน แค่ได้คุยกับเธอก็ยิ้มได้เสมอเลย",
        "บางทีฉันอาจจะไม่ได้พูดบ่อยๆ แต่อยากให้รู้ไว้ว่าเธอคือคนสำคัญที่สุด และดีใจมากที่มีเธออยู่ข้างๆ แบบนี้ไปนานๆ นะ",
      ],
      headerImages: [],
    },
    memories: {
      sectionTitle: "Our Favorite Moments",
      filmstripImages: [],
      polaroidImages: [
        { type: "url", src: "/templates/galaxy-1.png" },
        { type: "url", src: "/templates/galaxy-2.png" },
        { type: "url", src: "" },
        { type: "url", src: "" },
        { type: "url", src: "" },
      ],
      description: "เลื่อนดูภาพความทรงจำของเราทีละรูปนะ",
    },
    flowers: {
      subTitle: "",
      title: "",
      message: "",
      highlightText: "",
      wishes: [],
    },
    songMedia: {
      mediaType: "auto",
      src: "",
      audioSrc: "",
      songTitle: "Our Love Song",
      songArtist: "",
      sectionTitle: "Our_Video.mp4",
      accentImages: [],
    },
    finale: {
      heroImage: { type: "url", src: "" },
      mainText: "Love You Always",
      subText: "อยู่ด้วยกันไปนานๆ นะ",
    },
  },
};

/** Default content for the Pixel Gacha Capsule interactive pixel-art memory gachapon template. */
export const defaultPixelGachaData: SurpriseQRData = {
  settings: {
    enablePin: false,
    pinCode: "",
    warpDurationEnvelopeMs: 1200,
    warpDurationOptionMs: 1000,
    isPaid: true,
    envelopeStyle: 1,
  },
  content: {
    title: "MEMORY GACHA",
    menu: {
      subTitle: "สำหรับคนพิเศษของฉัน",
      title: "Pixel Gacha Capsule",
      card1Icon: "heart",
      card1Title: "คำอธิษฐานถึงเธอ",
      card1Desc: "ขอให้ทุกวันของเธอเต็มไปด้วยรอยยิ้ม เรื่องราวดีๆ และความสุขแบบนี้ตลอดไปนะ",
      card2Icon: "sparkles",
      card2Title: "",
      card2Desc: "",
      card3Icon: "star",
      card3Title: "",
      card3Desc: "",
    },
    bgMusic: { type: "url", src: "" },
    letter: {
      title: "จดหมายลับระดับ SECRET",
      paragraphs: [
        "ขอบคุณที่หมุนตู้กาชาจนครบทุกใบนะ ทุกความทรงจำที่เราผ่านมามีความหมายกับฉันมากจริงๆ",
        "ไม่ว่าจะกี่ปีผ่านไป อยากให้รู้ว่าเธอคือการ์ดที่แรร์ที่สุดในชีวิตของฉันเสมอ",
      ],
      headerImages: [],
    },
    memories: {
      sectionTitle: "สมุดสะสมความทรงจำ",
      filmstripImages: [],
      polaroidImages: [
        { type: "url", src: "/templates/galaxy-1.png" },
        { type: "url", src: "/templates/galaxy-2.png" },
        { type: "url", src: "" },
        { type: "url", src: "" },
      ],
      description: "เปิดแคปซูลให้ครบเพื่อปลดล็อกการ์ดลับระดับ SECRET",
    },
    flowers: {
      subTitle: "",
      title: "",
      message: "",
      highlightText: "",
      wishes: [],
    },
    songMedia: {
      mediaType: "auto",
      src: "",
      audioSrc: "",
      songTitle: "8-Bit Love Melody",
      songArtist: "",
      sectionTitle: "",
      accentImages: [],
    },
    finale: {
      heroImage: { type: "url", src: "" },
      mainText: "YOU ARE MY SSR!",
      subText: "เก็บไว้เป็นความทรงจำดีๆ ตลอดไปนะ",
    },
  },
};

/** Default content for the Lunar Secret 3D interactive WebGL Moon template. */
export const defaultLunar3DData: SurpriseQRData = {
  settings: {
    enablePin: true,
    pinCode: "1234",
    warpDurationEnvelopeMs: 1100,
    warpDurationOptionMs: 1100,
    isPaid: true,
    envelopeStyle: 1,
  },
  content: {
    title: "The Secret Behind The Moon",
    menu: {
      subTitle: "ลองแตะที่ดวงจันทร์",
      title: "Lunar Secret 3D",
      card1Icon: "sparkles",
      card1Title: "",
      card1Desc: "",
      card2Icon: "star",
      card2Title: "",
      card2Desc: "",
      card3Icon: "heart",
      card3Title: "",
      card3Desc: "",
    },
    bgMusic: { type: "url", src: "" },
    letter: {
      title: "ความลับด้านหลังดวงจันทร์",
      paragraphs: [
        "เหมือนกับดวงจันทร์ที่มีด้านลับซ่อนไว้ ฉันก็มีความรู้สึกดีๆ ที่เก็บไว้ให้เธอคนเดียวเหมือนกัน",
        "ขอบคุณที่อยู่เป็นแสงสว่างและเป็นความสบายใจในทุกค่ำคืนของฉันนะ",
      ],
      headerImages: [],
    },
    memories: {
      sectionTitle: "The Far Side of The Moon",
      filmstripImages: [],
      polaroidImages: [{ type: "url", src: "/templates/galaxy-1.png" }],
      description: "",
    },
    flowers: {
      subTitle: "",
      title: "",
      message: "",
      highlightText: "",
      wishes: [],
    },
    songMedia: {
      mediaType: "auto",
      src: "",
      audioSrc: "",
      songTitle: "Moonlight Serenade",
      songArtist: "",
      sectionTitle: "",
      accentImages: [],
    },
    finale: {
      heroImage: { type: "url", src: "" },
      mainText: "Lunar Secret",
      subText: "รักเธอเสมอ",
    },
  },
};

/** Default content for the Orbit of Us 3D interactive WebGL Galaxy & 3D Heart Morph template. */
export const defaultOrbitOfUsData: SurpriseQRData = {
  settings: {
    enablePin: true,
    pinCode: "1234",
    warpDurationEnvelopeMs: 1100,
    warpDurationOptionMs: 1100,
    isPaid: true,
    envelopeStyle: 1,
  },
  content: {
    title: "Orbit of Us",
    menu: {
      subTitle: "ในจักรวาลที่มีดาวนับล้านดวง ขอบคุณที่โคจรมาเจอกันนะ",
      title: "Orbit of Us 3D",
      card1Icon: "rose-nebula",
      card1Title: "2025-11-21",
      card1Desc: "",
      card2Icon: "star",
      card2Title: "",
      card2Desc: "",
      card3Icon: "heart",
      card3Title: "",
      card3Desc: "",
    },
    bgMusic: { type: "url", src: "" },
    letter: {
      title: "ถึงคนที่เป็นทั้งจักรวาลของฉัน",
      paragraphs: [
        "ตั้งแต่วันที่มีเธอเข้ามา โลกและจักรวาลของฉันก็สว่างไสวขึ้นทุกวัน ขอบคุณที่เป็นทั้งความสบายใจ รอยยิ้ม และบ้านที่อบอุ่นที่สุดเสมอมา",
        "อยู่โคจรข้างๆ กันแบบนี้ไปนานๆ เลยนะ",
      ],
      headerImages: [],
    },
    memories: {
      sectionTitle: "Orbit of Us",
      filmstripImages: [
        { type: "url", src: "/templates/galaxy-1.png" },
        { type: "url", src: "/templates/galaxy-2.png" },
        { type: "url", src: "/templates/galaxy-1.png" },
        { type: "url", src: "/templates/galaxy-2.png" },
        { type: "url", src: "/templates/galaxy-1.png" },
        { type: "url", src: "/templates/galaxy-2.png" },
      ],
      polaroidImages: [],
      description: "",
    },
    flowers: {
      subTitle: "",
      title: "",
      message: [
        "รักเธอนะ",
        "อยู่ด้วยกันไปนานๆ",
        "You are my universe",
        "ขอบคุณที่เป็นความสุข",
        "ทุกวันที่มีเธอคือของขวัญ",
        "My favorite orbit",
        "จับมือกันไปทุกจักรวาล",
        "กอดแน่นๆ นะ",
      ].join("\n"),
      highlightText: "",
      wishes: [],
    },
    songMedia: {
      mediaType: "auto",
      src: "",
      audioSrc: "",
      songTitle: "Cosmic Serenade",
      songArtist: "",
      sectionTitle: "",
      accentImages: [],
    },
    finale: {
      heroImage: { type: "url", src: "" },
      mainText: "Orbit of Us",
      subText: "รักเธอที่สุดในจักรวาล",
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
  {
    id: "new-year-grand-celebration",
    slug: "new-year-grand-celebration",
    title: "Grand New Year Celebration",
    category: "thanks",
    priceCredits: 0,
    badge: "FESTIVAL",
    image: "/templates/grand-new-year.svg",
    gallery: ["/templates/grand-new-year.svg"],
    longDescription:
      "ขบวนรถไฟข้ามปี Midnight Time Train 4 ฉากอินเทอร์แอคทีฟ — ฉีกหางตั๋วขึ้นขบวน 2026 → 2027 มองพลุนอกหน้าต่างรถไฟพร้อมพลิกรูปโพลารอยด์ เขย่ากล่องของขวัญเด้งเปิดคำอวยพรกับซองสุ่มพรปีใหม่ และปล่อยโคมลอยที่สถานีปลายทาง",
    features: [
      "ตั๋วรถไฟทองคำข้ามปี ลากหรือแตะเพื่อฉีกหางตั๋วพร้อมประทับตราออกเดินทาง",
      "หน้าต่างรถไฟชมวิวพลุพารัลแลกซ์ แตะจุดพลุเพิ่มได้ พร้อมรูปโพลารอยด์พลิกดูหลังรูป",
      "กล่องของขวัญปีใหม่แตะเขย่าจนเด้งเปิด พร้อมซองนำโชค 3 ใบให้เลือกสุ่มคำทำนาย",
      "สถานีปลายทางปีใหม่ พร้อมกรอบภาพ Shimmer และปล่อยโคมลอยขอพรเต็มฟ้า",
      "รองรับเพลงบรรเลงเฉลิมฉลอง และเสียงเอฟเฟกต์หวูดรถไฟ-ฉีกตั๋ว-เปิดกล่องครบชุด",
    ],
    aliases: [
      "new-year-grand-celebration",
      "grand-new-year",
      "new-year",
      "2027",
      "ปีใหม่",
      "10000000-0000-4000-8000-000000000014",
    ],
    defaults: defaultGrandNewYearData,
  },
  {
    id: "songkran-splendor",
    slug: "songkran-splendor",
    title: "Songkran Splendor",
    category: "thanks",
    priceCredits: 0,
    badge: "FESTIVAL",
    image: "/templates/songkran-splendor.svg",
    gallery: ["/templates/songkran-splendor.svg"],
    longDescription:
      "เทมเพลตเทศกาลมหาสงกรานต์สุดมันส์ไม่ซ้ำใคร 4 ฉากอินเทอร์แอคทีฟ — ปาลูกโป่งน้ำและสาดถังใหญ่เต็มหน้าจอ ลากนิ้วฉีดน้ำและเช็ดกระจกไอน้ำเผยรูปถ่าย เล่นปะแป้งดินสอพองพร้อมเขย่ากระบอกเซียมซี และกดรัวปืนฉีดน้ำคู่คอมโบเต็มจอ",
    features: [
      "สาดน้ำและปาลูกโป่งน้ำแตกกระจายเต็มหน้าจอ พร้อมคราบหยดน้ำไหลบนกระจก",
      "เอฟเฟกต์คลื่นน้ำ Tidal Wave ซัดเต็มจอเปลี่ยนฉากแบบนุ่มนวล",
      "มินิเกมถูเช็ดหยดน้ำบนกระจกเพื่อเผยความคมชัดของรูปภาพที่ 1",
      "ลูกเล่นปะแป้งดินสอพองบนการ์ดและเขย่ากระบอกเซียมซีหน้าร้อน",
      "โหมดปืนฉีดน้ำคู่ยิงคอมโบเต็มหน้าจอ พร้อมเสียงกลองยาวและระนาดเอก Web Audio",
    ],
    aliases: [
      "songkran-splendor",
      "songkran",
      "สงกรานต์",
      "สาดน้ำ",
      "ปีใหม่ไทย",
      "10000000-0000-4000-8000-000000000015",
    ],
    defaults: defaultSongkranSplendorData,
  },
  {
    id: "halloween-haunted-scroll",
    slug: "halloween-haunted-scroll",
    title: "Midnight Haunted Abyss",
    category: "thanks",
    priceCredits: 0,
    badge: "FESTIVAL",
    image: "/templates/halloween-haunted-scroll.svg",
    gallery: ["/templates/halloween-haunted-scroll.svg"],
    longDescription:
      "เทมเพลตฮาโลวีนแนวใหม่แบบเลื่อนลงยาวสู่คฤหาสน์ใต้ดิน มีผีนำทางตอบสนองตามความเร็วเลื่อน ใยแมงมุมยืดหดตามระยะเลื่อน ตาแอบมองตามนิ้ว ส่องไฟฉายไล่หมอกเผยรูป หม้อยาแม่มด ป้ายกลับหัวแกล้งผี และกระดานผีถ้วยแก้ว",
    features: [
      "ประสบการณ์เลื่อนลงยาวต่อเนื่อง พร้อมมาตรวัดความลึกและน้องผีนำทางที่มีอารมณ์เปลี่ยนตามการเลื่อน",
      "แมงมุมโหนใยยืดหดตามระยะเลื่อน และภาพดวงตาที่กลอกมองตามปลายนิ้ว/เมาส์ตลอดทาง",
      "โหมดส่องไฟฉายและปัดหมอกวิญญาณเพื่อเผยรูปความทรงจำที่ 1 ในโถงมืด",
      "กับดักผีแกล้งหมุนข้อความกลับหัว หม้อยาแม่มดเดือด และกระดานคริสตัลผีถ้วยแก้วเสี่ยงทาย",
      "สาดฝนลูกอม Trick or Treat พร้อมค้างคาวบินว่อนและเสียงออร์แกนผีสุดกวน Web Audio",
    ],
    aliases: [
      "halloween-haunted-scroll",
      "halloween",
      "haunted",
      "ฮาโลวีน",
      "ผี",
      "ฟักทอง",
      "10000000-0000-4000-8000-000000000016",
    ],
    defaults: defaultHalloweenHauntedData,
  },
  {
    id: "love-os",
    slug: "love-os",
    title: "Love OS · Desktop Confession",
    category: "love",
    priceCredits: 0,
    badge: "VIRAL Y2K",
    image: "/templates/love-os.svg",
    gallery: ["/templates/love-os.svg"],
    longDescription:
      "เทมเพลตแนวหน้าจอคอมพิวเตอร์สุดน่ารักสไตล์ Y2K เริ่มจากหน้าใส่รหัสปลดล็อก Windows เข้ามาเจอไฟล์ลับ 1 ไฟล์ พอกดเปิดจะมีป๊อปอัป Error สุดกวนที่ปุ่ม Cancel หลบเมาส์และย้ายที่หนีบนมือถือ พอกด Yes เพลงจะเล่นอัตโนมัติพร้อมเผยข้อความความรู้สึกและแกลเลอรีรูปความทรงจำด้านล่าง",
    features: [
      "หน้าจอล็อกอิน Windows สไตล์ Y2K ใส่รหัสปลดล็อกพร้อมเสียงเปิดเครื่องสุดน่ารัก",
      "หน้า Desktop พร้อมไฟล์ลับ 1 ไฟล์ที่เปล่งประกายชวนกดเปิด",
      "ป๊อปอัป Error สุดกวนพร้อมปุ่ม Cancel ที่หลบเมาส์บนคอมและย้ายที่หนีเมื่อแตะบนมือถือ",
      "กด Yes แล้วเพลงเล่นอัตโนมัติพร้อมเอฟเฟกต์พลุหัวใจและเปิดหน้าต่างข้อความความรู้สึก",
      "เลื่อนลงต่อจากข้อความเพื่อชมแกลเลอรีรูปความทรงจำพร้อมกดขยายดูเต็มจอ",
    ],
    aliases: [
      "love-os",
      "loveos",
      "desktop-confession",
      "10000000-0000-4000-8000-000000000017",
    ],
    defaults: defaultLoveOsData,
  },
  {
    id: "pixel-gacha",
    slug: "pixel-gacha",
    title: "Pixel Gacha Capsule",
    category: "love",
    priceCredits: 0,
    badge: "VIRAL Y2K",
    image: "/templates/pixel-gacha.svg",
    gallery: ["/templates/pixel-gacha.svg"],
    longDescription:
      "ตู้กาชาปองพิกเซลสุดน่ารักสไตล์ 8-bit หยอดเหรียญหมุนตู้สุ่มแคปซูลความทรงจำทีละใบ พร้อมเสียงเอฟเฟกต์เกม 8-bit เปิดการ์ดคำหวานระดับ SR การ์ดรูปความทรงจำโฮโลแกรมระดับ SSR และปลดล็อกจดหมายลับระดับ SECRET ลงสมุดสะสม",
    features: [
      "ตู้กาชาปองพิกเซลสุดอลังการ พร้อมลูกแคปซูลเด้งดึ๋งและคันโยกหมุนได้จริง",
      "เสียงเอฟเฟกต์ 8-bit Chiptune ครบทั้งหยอดเหรียญ หมุนตู้ แคปซูลตก และเปิดตัวการ์ดหายาก",
      "การ์ดสะสมโฮโลแกรมระดับ SR, SSR และ SECRET พร้อมพลุพิกเซลและสมุดสะสมความทรงจำ",
      "รองรับเพลงประกอบ .mp3, ลิงก์ YouTube หรือดนตรี 8-bit จากเทมเพลตอัตโนมัติ",
    ],
    aliases: [
      "pixel-gacha",
      "gacha",
      "pixel",
      "กาชา",
      "พิกเซล",
      "10000000-0000-4000-8000-000000000018",
    ],
    defaults: defaultPixelGachaData,
  },
  {
    id: "lunar-3d",
    slug: "lunar-3d",
    title: "Lunar Secret 3D",
    category: "love",
    priceCredits: 0,
    badge: "CINEMATIC",
    image: "/templates/lunar-3d.svg",
    gallery: ["/templates/lunar-3d.svg"],
    longDescription:
      "เทมเพลตดวงจันทร์ 3 มิติ (WebGL 3D) ที่เห็นดวงจันทร์เต็มดวงลอยอยู่กลางอวกาศ กดที่ดวงจันทร์จะเกิดเอฟเฟกต์วาร์ปดวงดาวเข้าสู่หน้าใส่รหัสลับ เมื่อใส่รหัสถูกจะวาร์ปพุ่งเข้าใกล้ดวงจันทร์ที่หมุนสำรวจได้ 360 องศา พร้อมความลับรูป 1:1 และข้อความความรู้สึกซ่อนอยู่ด้านหลังดวงจันทร์",
    features: [
      "ดวงจันทร์ 3 มิติสมจริงพร้อมพื้นผิวหลุมอุกกาบาตและรัศมีแสงจันทร์กลางหมู่ดาว",
      "เอฟเฟกต์วาร์ปดวงดาว 3 มิติ 2 จังหวะ (ก่อนใส่รหัส และหลังปลดล็อกเข้าใกล้ดวงจันทร์)",
      "หมุนสำรวจดวงจันทร์ได้อิสระ 360 องศาทั้งเมาส์และนิ้วสัมผัส",
      "ซ่อนรูปภาพสัดส่วน 1:1 ไว้ด้านหลังดวงจันทร์ แตะเพื่อขยายดูและอ่านข้อความความรู้สึกพร้อมเพลงประกอบ",
    ],
    aliases: [
      "lunar-3d",
      "lunar",
      "moon",
      "moon-3d",
      "ดวงจันทร์",
      "10000000-0000-4000-8000-000000000019",
    ],
    defaults: defaultLunar3DData,
  },
  {
    id: "orbit-of-us",
    slug: "orbit-of-us",
    title: "Orbit of Us 3D",
    category: "love",
    priceCredits: 69,
    badge: "CINEMATIC",
    image: "/templates/orbit-of-us.svg",
    gallery: ["/templates/orbit-of-us.svg"],
    longDescription:
      "กาแล็กซีความทรงจำ 3 มิติ (WebGL 3D) หมุนสำรวจได้ 360° และซูมเข้า-ออกได้จริงในอวกาศ — เริ่มจากจุดกำเนิดดาวและข้อความทีละตัวอักษร วาร์ป Big Bang เข้าสู่วงโคจรรูปภาพและคำบอกรักลอยรอบตัว แตะดูรูปพร้อมแคปชัน และแตะแกนกลางให้ดาวนับพันวิ่งรวมร่างเป็นหัวใจ 3 มิติที่เต้นได้จริงพร้อมจดหมายความรู้สึก",
    features: [
      "กาแล็กซีเกลียว 3 มิติ 3,500 อนุภาค หมุนสำรวจได้ 360 องศาและถ่างนิ้วซูมเข้า-ออกได้",
      "วงโคจรข้อความภาษาไทย/อังกฤษเรืองแสง และวงโคจรรูปภาพ 4–12 ใบที่ลอยไร้น้ำหนัก",
      "แตะรูปในวงโคจรเพื่อดึงภาพเข้ามากลางจอพร้อมแสดงแคปชันทีละตัวอักษร",
      "Secret Core Finale แตะแกนกลางหรือไอคอนหัวใจ อนุภาคดาววิ่งรวมร่างเป็นหัวใจ 3 มิติพร้อมเปิดจดหมาย",
      "เลือกธีมสีกาแล็กซีได้ 3 โทน (Rose Nebula, Midnight Gold, Sakura Galaxy) พร้อมเพลงประกอบ",
    ],
    aliases: [
      "orbit-of-us",
      "orbit",
      "galaxy-3d",
      "orbit-3d",
      "กาแล็กซี",
      "10000000-0000-4000-8000-000000000020",
    ],
    defaults: defaultOrbitOfUsData,
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
  if (lower.includes("halloween") || lower.includes("haunted") || lower.includes("ฮาโลวีน") || lower.includes("ฟักทอง") || lower.includes("ปล่อยผี")) {
    return "halloween-haunted-scroll";
  }
  if (lower.includes("songkran") || lower.includes("สงกราน") || lower.includes("สาดน้ำ") || lower.includes("ปีใหม่ไทย")) {
    return "songkran-splendor";
  }
  if (lower.includes("new year") || lower.includes("grand-new-year") || lower.includes("new-year-grand-celebration") || lower.includes("ปีใหม่")) {
    return "new-year-grand-celebration";
  }
  if (lower.includes("cinema") || lower.includes("35mm") || lower.includes("midnight") || lower.includes("film") || lower.includes("ภาพยนตร์") || lower.includes("ตั๋วหนัง")) {
    return "midnight-cinema";
  }
  if (lower.includes("wax") || lower.includes("seal") || lower.includes("parchment") || lower.includes("vintage") || lower.includes("royal") || lower.includes("ครั่ง") || lower.includes("ตราประทับ")) {
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
