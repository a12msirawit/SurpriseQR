/**
 * Anniversary Surprise — 7-screen envelope + PIN keypad + media card.
 * card. Every field below mirrors the canonical single-file spec schema so a
 * card config can be exported/imported between the hosted app and the
 * standalone HTML bundle losslessly.
 */

/** Settings toggles controlling lock, warp timing and production state. */
export interface SurpriseQRSettings {
  /** When true, the envelope reveals a 4-digit PIN keypad first. */
  enablePin: boolean;
  /** 4-digit PIN code (only relevant when enablePin is true). */
  pinCode: string;
  /** Warp delay (ms) between envelope unlock and the first content screen. */
  warpDurationEnvelopeMs: number;
  /** Warp delay (ms) between a screen transition (e.g. vinyl to song) and its target. */
  warpDurationOptionMs: number;
  /** Production/paid flag: false locks exports. */
  isPaid: boolean;
  /** Optional PromptPay phone/target for the built-in pay modal. */
  promptpayTarget?: string;
  /** Optional PromptPay amount in THB. */
  promptpayAmount?: number;
  /** Envelope visual style preset for Screen 1 (1 = Classic Pink, 2 = Gold Premium, 3 = Soft Lavender). */
  envelopeStyle?: 1 | 2 | 3;
}

/** Media item supporting both direct URLs and local files/data URLs. */
export interface SurpriseQRMedia {
  type?: "url" | "file";
  src: string;
}

/** Heartfelt letter screen (screen 3). */
export interface SurpriseQRLetter {
  title: string;
  paragraphs: string[];
  headerImages: SurpriseQRMedia[];
}

/** Memories screen (screen 4). */
export interface SurpriseQRMemories {
  /** Section heading, e.g. "Memories Made With You". */
  sectionTitle: string;
  filmstripImages: SurpriseQRMedia[];
  polaroidImages: SurpriseQRMedia[];
  description: string;
}

/** Flowers & gift card screen (screen 5). */
export interface SurpriseQRFlowers {
  /** Eyebrow / subtitle above the flower bouquet heading. */
  subTitle: string;
  /** Main heading for the flower screen. */
  title: string;
  message: string;
  highlightText: string;
}

/** Song / video player screen (screen 6). */
export interface SurpriseQRSongMedia {
  /**
   * "auto" detects YouTube links vs. direct media; "youtube" forces the
   * YouTube embed player; "video"/"audio" keep the legacy behavior.
   */
  mediaType: "auto" | "video" | "audio" | "youtube";
  /** YouTube URL, MP4 video URL/data-URL, or cover image. */
  src: string;
  /** MP3 song track (also used by the screen-5 vinyl). */
  audioSrc: string;
  songTitle: string;
  /** Artist / credit line under the song title. */
  songArtist: string;
  /** Section heading, e.g. "Song for you". */
  sectionTitle: string;
  /** Two decorative accent-frame photos beside the player. */
  accentImages: SurpriseQRMedia[];
}

/** Gift menu screen (screen 2) — the three emoji card choices. */
export interface SurpriseQRMenu {
  /** Eyebrow / subtitle above the main title. */
  subTitle: string;
  /** Main heading on the gift menu screen. */
  title: string;
  /** Emoji/icon for gift card 1 (letter screen). */
  card1Icon: string;
  /** Title text for gift card 1. */
  card1Title: string;
  /** Subtitle/description text for gift card 1. */
  card1Desc: string;
  /** Emoji/icon for gift card 2 (memories screen). */
  card2Icon: string;
  card2Title: string;
  card2Desc: string;
  card3Icon: string;
  card3Title: string;
  card3Desc: string;
}

/** Finale hero screen (screen 7). */
export interface SurpriseQRFinale {
  heroImage: SurpriseQRMedia;
  mainText: string;
  subText: string;
}

/** Full content payload of the anniversary card. */
export interface SurpriseQRContent {
  title: string;
  menu: SurpriseQRMenu;
  bgMusic: SurpriseQRMedia;
  letter: SurpriseQRLetter;
  memories: SurpriseQRMemories;
  flowers: SurpriseQRFlowers;
  songMedia: SurpriseQRSongMedia;
  finale: SurpriseQRFinale;
}

/** Complete template data contract = settings + content. */
export interface SurpriseQRData {
  settings: SurpriseQRSettings;
  content: SurpriseQRContent;
}
