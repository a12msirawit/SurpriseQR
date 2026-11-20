export type BlowCandlesStage =
  | "pin"
  | "intro"
  | "countdown"
  | "blowing"
  | "extinguish_drop"
  | "grand_celebration"
  | "reveal_layer"
  | "viral_closing";

export interface BlowCandlesPhoto {
  src?: string;
}

export interface BlowCandlesConfig {
  recipientName?: string;
  senderName?: string;
  introHeadline?: string;
  introPrompt?: string;
  introButtonCaption?: string;
  blowingHeadline?: string;
  celebrationHeadline?: string;
  celebrationHint?: string;
  revealButtonCaption?: string;
  letterTitle?: string;
  message?: string;
  closingButtonCaption?: string;
  closingBadge?: string;
  closingTitle?: string;
  wishMessage?: string;
  audio_url?: string | null;
  image_url?: string | null;
  videoUrl?: string | null;
  video_url?: string | null;
  photos?: Array<BlowCandlesPhoto | string>;
  data?: {
    recipientName?: string;
    senderName?: string;
    introHeadline?: string;
    introPrompt?: string;
    introButtonCaption?: string;
    blowingHeadline?: string;
    celebrationHeadline?: string;
    celebrationHint?: string;
    revealButtonCaption?: string;
    letterTitle?: string;
    message?: string;
    closingButtonCaption?: string;
    closingBadge?: string;
    closingTitle?: string;
    wishMessage?: string;
    videoUrl?: string | null;
    photos?: Array<BlowCandlesPhoto | string>;
  };
}

export interface BlowCandlesTemplateProps {
  config?: unknown;
  data?: {
    recipientName?: string;
    wishMessage?: string;
    audio_url?: string;
  };
  isEditing?: boolean;
  studio?: boolean;
  activeScreen?: number;
  refreshToken?: number;
  expectedPin?: string;
  hashId?: string;
  pinRequired?: boolean;
  onSelectField?: (tabIndex: number, fieldId?: string) => void;
}

