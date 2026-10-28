export type UserRole = "user" | "admin";
export type UserTier = "guest" | "free" | "starter" | "value" | "pro" | "god" | "vip";
export type TemplateCategory = "birthday" | "love" | "thanks" | "sorry" | "event" | "general";
export type TemplateTier = "free" | "pro";
export type PaymentStatus = "pending" | "approved" | "rejected";
export type PaymentType = "topup" | "add_on_custom_url" | "add_on_permanent";
export type PackageType = "starter_69" | "value_119" | "pro_199" | "god_269";
export type SceneType = "cover" | "timeline" | "game" | "wish";
export type DatabaseSceneType = "text" | "image" | "audio" | "video";
export type ReactionType = "heart" | "thumbs_up" | "smile" | "love" | "thank_you";
export type StorageType = "14_days" | "permanent";
export type CardStatus = "draft" | "published" | "active" | "hidden" | "flagged";
export type AudioType = "youtube" | "mp3" | "video";

export interface TemplatePricing {
  id: string;
  name: string;
  cost: number;
  isPremium: boolean;
}

export interface StoragePricing {
  type: StorageType;
  name: string;
  cost: number;
  duration: string;
}

export interface CardScene {
  id: string;
  card_id: string;
  scene_order: number;
  scene_type: DatabaseSceneType;
  content: string;
  created_at: string;
}

export interface DatabaseCardScene {
  id: string;
  card_id: string;
  scene_order: number;
  scene_type: DatabaseSceneType;
  content: string;
  created_at: string;
}

export type DB_Card = Card;

export interface Reaction {
  id: string;
  card_id: string;
  reaction_type: ReactionType | null;
  message: string | null;
  created_at: string;
}

export interface SiteVisit {
  id: string;
  session_id: string;
  path: string | null;
  user_id: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  role: UserRole;
  tier: UserTier;
  credits: number;
  custom_url_quota: number;
  premium_quota: number;
  permanent_quota: number;
  quota_expires_at?: string | null;
  quota_reset_at: string;
  /** Active purchased package tier; drives time-boxed media entitlements. */
  package_tier?: string | null;
  /** When the active package's media entitlement lapses (NULL/<=NOW -> free). */
  package_expires_at?: string | null;
  created_at: string;
  is_banned?: boolean;
}

/** External demo links for a template ("" = not set for that platform). */
export interface TemplateDemoLinks {
  tiktok?: string;
  youtube?: string;
  facebook?: string;
  instagram?: string;
}

export interface Template {
  id: string;
  title: string;
  category: TemplateCategory;
  is_premium: boolean;
  price?: number;
  is_active?: boolean;
  is_published?: boolean;
  preview_url: string;
  /** Public URL of the uploaded preview video (template-previews bucket); null falls back to the static image. */
  preview_video_url?: string | null;
  /** External demo links: { tiktok, youtube, facebook, instagram }. */
  demo_video_links?: TemplateDemoLinks | null;
  /** Optional static thumbnail override (not a DB column; card renderers may supply it). */
  thumbnail_url?: string | null;
  created_at: string;
}

export interface Card {
  id: string;
  user_id: string | null;
  template_id: string;
  recipient_name: string;
  sender_name: string;
  message: string;
  image_url: string | null;
  image_1: string | null;
  image_2: string | null;
  audio_url: string | null;
  pin_code: string | null;
  hash_id: string;
  expiry_date: string | null;
  unlock_at: string | null;
  view_count: number;
  template_cost: number;
  storage_type: StorageType;
  storage_cost: number;
  expires_at: string | null;
  is_permanent: boolean;
  custom_slug: string | null;
  has_watermark: boolean;
  audio_type: AudioType | null;
  password: string | null;
  status: CardStatus;
  draft_expires_at: string | null;
  created_at: string;
  scenes?: CardScene[];
}

export interface Payment {
  id: string;
  user_id: string;
  slip_url: string;
  amount: number;
  credits_granted: number;
  payment_type: PaymentType;
  package_type: PackageType | null;
  card_id: string | null;
  add_on_applied_at: string | null;
  status: PaymentStatus;
  reject_reason: string | null;
  approved_at: string | null;
  claimed_transfer_time?: string | null;
  claimed_bank_account_last4?: string | null;
  created_at: string;
}

export interface AdminActionLog {
  id: string;
  admin_id: string | null;
  action: "payment_approved" | "payment_rejected" | string;
  payment_id: string | null;
  payment_user_id: string;
  amount: number;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          role?: UserRole;
          tier?: UserTier;
          credits?: number;
          custom_url_quota?: number;
          premium_quota?: number;
          permanent_quota?: number;
          quota_reset_at?: string;
          package_tier?: string | null;
          package_expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          role?: UserRole;
          tier?: UserTier;
          credits?: number;
          custom_url_quota?: number;
          premium_quota?: number;
          permanent_quota?: number;
          quota_reset_at?: string;
          package_tier?: string | null;
          package_expires_at?: string | null;
        };
      };
      templates: {
        Row: Template;
        Insert: {
          id?: string;
          title: string;
          category: TemplateCategory;
          is_premium?: boolean;
          price?: number;
          is_active?: boolean;
          is_published?: boolean;
          preview_url: string;
          preview_video_url?: string | null;
          demo_video_links?: TemplateDemoLinks | null;
          created_at?: string;
        };
        Update: {
          title?: string;
          category?: TemplateCategory;
          is_premium?: boolean;
          price?: number;
          is_active?: boolean;
          is_published?: boolean;
          preview_url?: string;
          preview_video_url?: string | null;
          demo_video_links?: TemplateDemoLinks | null;
        };
      };
      cards: {
        Row: Card;
        Insert: {
          id?: string;
          user_id?: string | null;
          template_id: string;
          recipient_name: string;
          sender_name: string;
          message: string;
          image_url?: string | null;
          image_1?: string | null;
          image_2?: string | null;
          audio_url?: string | null;
          pin_code?: string | null;
          hash_id: string;
          expiry_date?: string | null;
          unlock_at?: string | null;
          view_count?: number;
          template_cost?: number;
          storage_type?: StorageType;
          storage_cost?: number;
          expires_at?: string | null;
          is_permanent?: boolean;
          custom_slug?: string | null;
          has_watermark?: boolean;
          audio_type?: AudioType | null;
          password?: string | null;
          status?: CardStatus;
          draft_expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          template_id?: string;
          recipient_name?: string;
          sender_name?: string;
          message?: string;
          image_url?: string | null;
          image_1?: string | null;
          image_2?: string | null;
          audio_url?: string | null;
          pin_code?: string | null;
          expiry_date?: string | null;
          unlock_at?: string | null;
          view_count?: number;
          template_cost?: number;
          storage_type?: StorageType;
          storage_cost?: number;
          expires_at?: string | null;
          is_permanent?: boolean;
          custom_slug?: string | null;
          has_watermark?: boolean;
          audio_type?: AudioType | null;
          password?: string | null;
          status?: CardStatus;
          draft_expires_at?: string | null;
        };
      };
      card_scenes: {
        Row: DatabaseCardScene;
        Insert: {
          id?: string;
          card_id: string;
          scene_order: number;
          scene_type: DatabaseSceneType;
          content: string;
          created_at?: string;
        };
        Update: {
          scene_order?: number;
          scene_type?: DatabaseSceneType;
          content?: string;
        };
      };
      reactions: {
        Row: Reaction;
        Insert: {
          id?: string;
          card_id: string;
          reaction_type?: ReactionType | null;
          message?: string | null;
          created_at?: string;
        };
        Update: {
          reaction_type?: ReactionType | null;
          message?: string | null;
        };
      };
      site_visits: {
        Row: SiteVisit;
        Insert: {
          id?: string;
          session_id: string;
          path?: string | null;
          user_id?: string | null;
          created_at?: string;
        };
        Update: {
          session_id?: string;
          path?: string | null;
          user_id?: string | null;
        };
      };
      payments: {
        Row: Payment;
        Insert: {
          id?: string;
          user_id: string;
          slip_url: string;
          amount: number;
          credits_granted?: number;
          status?: PaymentStatus;
          reject_reason?: string | null;
          approved_at?: string | null;
          payment_type?: PaymentType;
          package_type?: PackageType | null;
          card_id?: string | null;
          add_on_applied_at?: string | null;
          claimed_transfer_time?: string | null;
          claimed_bank_account_last4?: string | null;
          created_at?: string;
        };
        Update: {
          slip_url?: string;
          amount?: number;
          credits_granted?: number;
          status?: PaymentStatus;
          reject_reason?: string | null;
          approved_at?: string | null;
          payment_type?: PaymentType;
          card_id?: string | null;
          add_on_applied_at?: string | null;
        };
      };
      admin_action_logs: {
        Row: AdminActionLog;
        Insert: {
          id?: string;
          admin_id?: string | null;
          action?: "payment_approved" | "payment_rejected" | string;
          payment_id?: string | null;
          payment_user_id?: string;
          amount?: number;
          reason?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          admin_id?: string | null;
          action?: "payment_approved" | "payment_rejected" | string;
          payment_id?: string | null;
          payment_user_id?: string;
          amount?: number;
          reason?: string | null;
          metadata?: Record<string, unknown> | null;
        };
      };
    };
    Functions: {
      get_card_by_hash: {
        Args: { card_hash_id: string };
        Returns: Card[];
      };
      get_card_with_details: {
        Args: { card_hash_id: string };
        Returns: {
          card: Card;
          scenes: DatabaseCardScene[];
          reactions: Reaction[];
        };
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      increment_credits: {
        Args: { user_id: string; amount: number };
        Returns: void;
      };
      increment_view_count: {
        Args: { card_hash_id: string };
        Returns: void;
      };
      verify_card_pin: {
        Args: { p_hash_id: string; p_pin: string };
        Returns: boolean | null;
      };
      log_site_visit: {
        Args: { p_session_id: string; p_path: string };
        Returns: void;
      };
      approve_payment_transaction: {
        Args: { p_payment_id: string; p_admin_id: string };
        Returns: {
          success: boolean;
          amount: number;
          payment_type?: string | null;
          package_type?: string | null;
          credits?: number;
          tier?: string | null;
          premium_quota?: number;
          permanent_quota?: number;
          custom_url_quota?: number;
          quota_expires_at?: string | null;
        };
      };
    };
  };
}
