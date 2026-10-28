"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Flower,
  Gift,
  Grid2X2,
  Image as ImageIcon,
  Info,
  Key,
  Lock,
  Mail,
  RefreshCw,
  Save,
  Sparkles,
  Star,
  Video,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { StoragePricing } from "@/types/database";
import type {
  SurpriseQRData,
  SurpriseQRMedia,
} from "@/types/templates";
import { compressImage, compressDataUrl } from "@/lib/image-compression";
import {
  defaultSurpriseQRData,
  getTemplateById,
  getTemplateSlugById,
  matchTemplateSlugByTitle,
  type TemplateDefinition,
  type TemplateSlug,
} from "@/data/templates";
import { getTemplateComponent } from "@/lib/template-components";
import type { UnifiedTemplate } from "@/lib/templates";

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

interface SceneFormData {
  title: string;
  body: string;
  media_url?: string;
}

/** Read an uploaded media file into an inline data URL (images get compressed). */
async function surpriseQRFileToSrc(file: File): Promise<string> {
  const MAX_INLINE_BYTES = 6 * 1024 * 1024;
  if (file.size > MAX_INLINE_BYTES) {
    throw new Error("ไฟล์ใหญ่เกิน 6MB — กรุณาใช้ลิงก์ URL แทน");
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
}: {
  label: string;
  value: string;
  onChange: (src: string) => void;
  accept?: string;
  placeholder?: string;
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
        <input
          value={value}
          onChange={handleTextChange}
          placeholder={placeholder ?? "https://... (หรือกดอัปโหลดไฟล์)"}
          className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
        />
      </label>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "กำลังแปลงไฟล์..." : "📂 อัปโหลดไฟล์"}
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/20"
          >
            ล้างค่า
          </button>
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
          surpriseQRFileToSrc(file)
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
function resolveOptionStrategy(option: DashboardTemplateOption | null): TemplateSlug {
  return getTemplateSlugById(option?.id) ?? ANNIVERSARY_TEMPLATE_SLUG;
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
  const fallback = getTemplateById(ANNIVERSARY_TEMPLATE_SLUG);
  // The Anniversary Surprise fallback option is always offered first. When the
  // live DB row for it exists in the remote results, its authoritative
  // `price` / `is_premium` values are merged in so the default selection shows
  // the real (admin-set) price — e.g. ฿9 — instead of the static catalog's
  // hardcoded 0. Without this, selectedTemplate.cost falls back to 0 even when
  // the DB/API (`/api/templates/list`) carries the true price.
  const remoteFallback = remoteOptions.find(
    (opt) =>
      opt.id === fallback.id ||
      getTemplateSlugById(opt.id) === ANNIVERSARY_TEMPLATE_SLUG ||
      getTemplateSlugById(opt.systemDef?.id) === ANNIVERSARY_TEMPLATE_SLUG,
  );
  const fallbackOption: DashboardTemplateOption = {
    id: fallback.id,
    name: fallback.title,
    cost: remoteFallback?.cost ?? fallback.priceCredits,
    preview_url: remoteFallback?.preview_url ?? fallback.image,
    category: remoteFallback?.category ?? fallback.category,
    is_premium: remoteFallback?.is_premium ?? fallback.priceCredits > 0,
    systemDef: fallback,
  };

  if (remoteOptions.length === 0) return [fallbackOption];

  // Keep only remote templates that resolve to a known slug (or have a valid
  // systemDefinition). Remote rows resolving to the same slug as the fallback
  // (e.g. the DB row for the Anniversary template) are skipped — they are
  // already represented by the merged fallbackOption above, so including them
  // again would create duplicate options for the same template.
  const seen = new Set<string>([fallback.id, ANNIVERSARY_TEMPLATE_SLUG]);
  const validOptions: DashboardTemplateOption[] = [];
  for (const opt of remoteOptions) {
    const slug = getTemplateSlugById(opt.id);
    const resolved = slug || (opt.systemDef ? getTemplateSlugById(opt.systemDef.id) : null);
    if (resolved && !seen.has(opt.id) && !seen.has(resolved)) {
      seen.add(opt.id);
      seen.add(resolved);
      validOptions.push({
        ...opt,
        // Attach the static-catalog systemDef when the remote option did not
        // carry one (e.g. it came from the DB without a matching catalog entry).
        systemDef: opt.systemDef ?? getTemplateById(opt.id, opt.name),
      });
    }
  }

  return [fallbackOption, ...validOptions];
}

function CreateStoryCardPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cardTitle, setCardTitle] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [scenes, setScenes] = useState<SceneFormData[]>([
    { title: "ปก", body: "", media_url: "" },
    { title: "ความทรงจำ", body: "", media_url: "" },
    { title: "เกม", body: "", media_url: "" },
    { title: "ความปรารถนาหลัก", body: "", media_url: "" },
  ]);
  const [templateOptions, setTemplateOptions] = useState<DashboardTemplateOption[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DashboardTemplateOption | null>(null);
  const [selectedStorage, setSelectedStorage] = useState<StoragePricing>(
    storageOptions[0],
  );
  const [userCredits, setUserCredits] = useState(0);
  const [permanentQuota, setPermanentQuota] = useState(0);
  const [premiumQuota, setPremiumQuota] = useState(0);
  const [userTier, setUserTier] = useState("free");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [surpriseQRData, setSurpriseQRData] = useState<SurpriseQRData>(
    defaultSurpriseQRData,
  );
  const [activeStep, setActiveStep] = useState(1);
  const [previewRefreshToken, setPreviewRefreshToken] = useState(0);
  const selectedStrategy: TemplateSlug = resolveOptionStrategy(selectedTemplate);
  // Preview jumps to the screen whose step is currently active.
  const activeStepScreen = EDITOR_STEPS.find((s) => s.id === activeStep)?.screen ?? 1;
  const activeConfig = surpriseQRData;
  const PreviewComponent = getTemplateComponent(selectedStrategy);

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
  const [envelopeStyle, setEnvelopeStyle] = useState<1 | 2 | 3>(surpriseQRData.settings.envelopeStyle || 1);
  // Full-screen Live Preview modal (desktop viewport) rendering the selected
  // template component in its recipient-facing mode (isEditing={false}).
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    setSurpriseQRData((current) => ({
      ...current,
      settings: { ...current.settings, envelopeStyle },
    }));
  }, [envelopeStyle]);

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
      ? (userTier === "pro" || userTier === "vip" ? 0 : 25)
      : 0;
  // The quota radio applies whenever the template `is_premium`. It is disabled
  // when there are no remaining quota slots (premiumQuota <= 0).
  const templateHasFreeQuota = premiumTemplate && premiumQuota > 0;
  const canUsePremiumQuota = templateHasFreeQuota && usePremiumQuota;
  const templatePayable = canUsePremiumQuota ? 0 : templatePrice;
  const storageHasFreeQuota =
    selectedStorage.type === "permanent" &&
    userTier !== "pro" &&
    userTier !== "vip" &&
    permanentQuota > 0;
  const canUsePermanentQuota = storageHasFreeQuota && usePermanentQuota;
  const storagePayable = canUsePermanentQuota ? 0 : storagePrice;
  const summaryCost = templatePayable + storagePayable;
  const hasEnoughCredits = userCredits >= summaryCost;
  const summaryCanAfford = hasEnoughCredits;
  const permanentIsFree = permanentQuota > 0 || userTier === "pro" || userTier === "vip";
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
      const label = String(t.name || "").toLowerCase();

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

    // Anniversary Surprise is the only creation template. The full spec
    // schema is persisted verbatim so the viewer can rebuild the identical
    // 7-screen experience (including uploaded data-URLs).
    return {
      ...base,
      title: cardTitle || surpriseQRData.content.title || recipientName || base.title,
      content: {
        templateId,
        recipientName,
        title: surpriseQRData.content.title,
        settings: { ...surpriseQRData.settings },
        content: { ...surpriseQRData.content, title: surpriseQRData.content.title },
        config: JSON.parse(JSON.stringify(surpriseQRData)),
      },
      config: JSON.parse(JSON.stringify(surpriseQRData)),
    };
  }

  async function submitCard(isDraft = false, confirmed = false) {
    if (!selectedTemplate) {
      setError("กำลังโหลดรายการเทมเพลต กรุณารอสักครู่");
      return;
    }
    // Anniversary Surprise stores the PIN inside the template settings.
    const effectivePin = surpriseQRData.settings.enablePin
      ? surpriseQRData.settings.pinCode
      : "";
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
      localStorage.setItem(GUEST_CARD_IDS_KEY, JSON.stringify([...guestIds, id]));
      const guestCards = JSON.parse(localStorage.getItem(GUEST_CARDS_KEY) || "[]") as typeof guestCard[];
      localStorage.setItem(GUEST_CARDS_KEY, JSON.stringify([...guestCards, guestCard]));
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
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-base font-bold text-slate-200 transition-colors hover:bg-white/20 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> กลับแดชบอร์ด
          </Link>
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
                  <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setShowPreviewModal(true)} className="rounded-xl border border-space-border bg-white/10 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-white/20">ดูตัวอย่างเต็มจอ</button>
                  </div>
                </div>
               </div>

                <div
                  className={`relative h-[calc(100vh-11rem)] overflow-y-auto pr-2 custom-scrollbar rounded-2xl border border-slate-800 bg-[#06030c] transition-opacity duration-500 ${
                    isEditingActive ? "opacity-100" : "opacity-70"
                  }`}
                >
                 {PreviewComponent && (
                    <PreviewComponent
                      config={activeConfig}
                      isEditing
                      studio
                      activeScreen={activeStepScreen}
                      refreshToken={previewRefreshToken}
                    />
                  )}
                </div>
             </div>
           </div>
         </section>

        <div className="lg:col-span-6 space-y-4 pr-2 custom-scrollbar lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          {/* Step navigation — drives both the preview screen and the visible form fields. */}
          <nav
            aria-label="ขั้นตอนการสร้างการ์ด"
            className="sticky top-2 z-10 flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/10 bg-[#0d071b]/90 p-2 shadow-lg shadow-black/20 backdrop-blur-md"
          >
            {EDITOR_STEPS.map((step) => {
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
                  className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border px-2.5 py-2 text-sm font-bold transition-colors ${
                    isActive
                      ? "border-fuchsia-500 bg-fuchsia-500/20 text-white"
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

<section id="editor-step-panel-1" aria-labelledby="card-info-heading" hidden={activeStep !== 1} className="rounded-2xl border border-white/10 bg-[#120a21]/80 p-5">
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
                  <div className="flex flex-wrap gap-3">
                    {([1, 2, 3] as const).map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => setEnvelopeStyle(style)}
                        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition-colors ${
                          envelopeStyle === style
                            ? "border-fuchsia-500 bg-fuchsia-500/20 text-white"
                            : "border-space-border bg-white/5 text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        <Mail className="h-4 w-4" />
                        {style === 1 && "Classic Pink"}
                        {style === 2 && "Gold Premium"}
                        {style === 3 && "Soft Lavender"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#120a21]/80 p-5">
              <div className="mb-5 flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-fuchsia-400" />
                <h2 className="text-xl font-bold text-slate-100">ฉากและเนื้อหา</h2>
              </div>
              <div id="theme-style" className="mt-6 border-t border-slate-700/60 pt-6">
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
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              surpriseQRData.settings.enablePin ? "bg-fuchsia-500" : "bg-slate-700"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                                surpriseQRData.settings.enablePin ? "translate-x-6" : "translate-x-1"
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
                            className={`w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20 ${
                              !surpriseQRData.settings.enablePin ? "opacity-50 cursor-not-allowed" : ""
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
                       <p className="mb-3 text-sm font-black uppercase tracking-wider text-fuchsia-300">🌷 หน้า 5 — ดอกไม้ & เสียงพื้นหลัง</p>
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
                              placeholder="ช่อดอกไม้เสมือนจริง"
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
                             placeholder="ข้อความมอบดอกไม้..."
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
                             placeholder="ความรักและการเติบโต..."
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
            <div className="sticky bottom-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0d071b]/80 p-4 shadow-xl shadow-black/30 backdrop-blur">
              <div className="flex items-center gap-2 text-base font-semibold text-slate-300">
                <Wallet className="h-5 w-5 text-fuchsia-400" />
                <span>
                  รวม{" "}
                  <strong className="text-lg font-black text-slate-100">฿{summaryCost.toFixed(2)}</strong>
                </span>
              </div>
              <div className="flex gap-2">
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
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-4 py-3 text-base font-semibold text-slate-200 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  บันทึกร่าง
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-5 py-3 text-base font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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
            <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-sm font-medium leading-6 text-amber-300">คำเตือน: เมื่อกดสร้างการ์ดเรียบร้อยแล้ว การ์ดจะถูกเผยแพร่จริงและไม่สามารถกลับมาแก้ไขเนื้อหาหรือเทมเพลตได้อีก (จะแก้ไขได้เฉพาะ Custom URL และ PIN เท่านั้น)</div>
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
                  จัดเก็บถาวร{userTier === "pro" || userTier === "vip" ? " (รวมในแพ็กเกจ - 0 บาท)" : " (25 บาท)"}
                </label>
                {selectedStorage.type === "permanent" && permanentQuota > 0 && userTier !== "pro" && userTier !== "vip" && (
                  <label className="mt-3 flex items-center gap-2 text-slate-300">
                    <input type="checkbox" className="accent-fuchsia-500" checked={usePermanentQuota} onChange={(event) => setUsePermanentQuota(event.target.checked)} />
                    ใช้สิทธิ์จัดเก็บถาวร (หัก 1 สิทธิ์ - 0 บาท) — เหลือ {formatQuotaDisplay(permanentQuota)} สิทธิ์
                  </label>
                )}
              </div>
              {selectedStorage.type === "permanent" && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <label htmlFor="summary-custom-slug" className="font-bold text-slate-300">ตั้งชื่อ Custom URL (เช่น my-special-card)</label>
                  <input id="summary-custom-slug" value={customSlug} onChange={(event) => setCustomSlug(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder:text-slate-500" placeholder="custom-url" />
                </div>
              )}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="font-bold text-slate-200">สรุปรายการ</p>
                <p className="mt-1 text-slate-300">ค่าเทมเพลต: {canUsePremiumQuota ? "หักสิทธิ์เทมเพลต 1 สิทธิ์ - 0 บาท" : `฿${templatePayable}`}</p>
                {selectedStorage.type === "permanent" && (
                  <p className="mt-1 text-slate-300">ค่าจัดเก็บถาวร: {canUsePermanentQuota ? "หักสิทธิ์จัดเก็บถาวร 1 สิทธิ์ - 0 บาท" : userTier === "pro" || userTier === "vip" ? "รวมในแพ็กเกจ - 0 บาท" : "฿25"}</p>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
          role="dialog"
          aria-modal="true"
          aria-label="ตัวอย่างการ์ดแบบเต็มจอ"
        >
          <div className="relative w-full max-w-6xl h-[85vh] rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-700/80 bg-slate-900/95 px-5 py-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-space-accent">Full Preview</p>
                <p className="text-sm font-medium text-slate-400">{selectedTemplate?.name || "การ์ด"} — มุมมองผู้รับการ์ด</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                ✕ ปิดตัวอย่าง
              </button>
            </div>
            <div className="relative h-full w-full flex-1 overflow-y-auto custom-scrollbar bg-[#06030c]">
              {PreviewComponent && <PreviewComponent config={activeConfig} isEditing={false} />}
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
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <CreateStoryCardPageInner />
    </Suspense>
  );
}
