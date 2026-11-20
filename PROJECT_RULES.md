# SurpriseQR Project Guidelines & Coding Rules

STRICT UI RULE: Do NOT use raw Unicode emojis (e.g. 🎂, 🎉, 👑, ✨, ⚡) anywhere in UI text, badges, buttons, or titles. ALWAYS use vector icons from lucide-react or clean inline SVGs with sleek typography instead.

## Key Design Principles:
1. **Typography & Vector Icons over Emojis**: All buttons, badges, labels, and status indicators must use `lucide-react` vector icons or custom clean SVG components.
2. **Badge Standards**:
   - "VIRAL Y2K": Use `<Zap className="w-3 h-3 mr-1 inline" />`
   - "LUXURY": Use `<Gem className="w-3 h-3 mr-1 inline" />`
   - "ใช้งานฟรี": Use CSS Dot `<span className="w-2 h-2 rounded-full bg-emerald-400 inline-block mr-1.5" />`
   - "พรีเมียม": Use `<Crown className="w-3 h-3 mr-1 inline" />`
   - "CINEMATIC": Use monochrome serif typography with gold border
3. **Button Wording**: Never use instructional parentheses like `(Play)`, `(Tear)`, `(Replay)`, or `(Confetti)`. Use natural, editorial Thai words such as "ฉีกตั๋ว", "ชมอีกครั้ง", "จุดพลุฉลอง", "เลือกเทมเพลต".
4. **Action Buttons**: Pair with vector icons like `<Wand2 className="w-3.5 h-3.5 mr-1.5" />` or `<ArrowRight className="w-3.5 h-3.5 ml-1.5" />`.
5. **No Clutter or Unnecessary Explanatory Text in Templates**: Do NOT add decorative/technical badges (e.g., `PRIVATE MEMORY SCREENING`, `HD 16:9`) or instructional/explanatory copy (e.g., "เพิ่มลิงก์ YouTube หรือไฟล์วิดีโอในช่องแก้ไข...") inside template screens or empty-state placeholders. Keep templates clean, atmospheric, and focused solely on the gift content and clean icons.
6. **Never Show Instructional "How-To-Tap / How-To-Return" Prompts**: Do NOT render tutorial or instructional hints telling the user how to tap the screen, close a modal, or go back (e.g., "แตะหน้าจอเพื่อกลับ...", "แตะหน้าจอเพื่อปล่อยกลับ...", "หมุนสำรวจ 360° • แตะรูปเพื่อเปิดดู..."). Users intuitively know to tap the screen or backdrop on their own.

## Template System Architecture & Checklist

SurpriseQR templates are **interactive web experiences** delivered via shareable links and QR codes (`/c/[hash_id]`), not static images (e.g., microphone candle-blowing, cake slicing, ticket tearing, 35mm film strips, envelope opening, and background music).

### Core Layers
1. **Registry & Defaults (`src/data/templates.ts`, `src/lib/template-resolution.ts`, `src/lib/template-components.ts`)**
   - Define the `TemplateSlug`, `default*Data` (using `SurpriseQRData`), ID/title-to-slug resolution, and `dynamic(..., { ssr: false })` component mapping.
2. **Template Component (`src/components/templates/<Name>/` & `src/components/cards/templates/`)**
   - Accept standard props: `config`, `isEditing`, `studio`, `activeScreen`, `refreshToken`, `expectedPin`, `hashId`, and `onSelectField?: (tabIndex: number, fieldId?: string) => void`.
   - Sync `activeScreen` with internal template stages so the editor tabs drive the Live Preview automatically.
   - Every editable element in Studio mode must wire `onClick` with `e.stopPropagation()` + `onSelectField(tabIndex, fieldId)` and include `title="คลิกเพื่อแก้ไข..."` (so `.studio-live-preview [title*="คลิกเพื่อแก้ไข"]:hover` in `src/app/globals.css` highlights it with a dashed gold frame).
3. **Studio Editor & Live Preview (`src/app/dashboard/create/page.tsx`, `src/components/dashboard/template-card.tsx`)**
   - Group form fields into template-specific `*_STEPS` tabs matching `activeScreen` and `fieldId` targets; keep form helpers concise and DRY.
   - All preview viewports include `<PreviewWatermark />` (`src/components/ui/preview-watermark.tsx`, `pointer-events-none`) for a subtle `SurpriseQR` watermark.
4. **Recipient Viewer (`src/components/cards/card-viewer.tsx`)**
   - Loads saved card data in `isEditing={false}` mode and maps defaults via `getDefaultDataForSlug`.

### Mandatory Checklist When Adding or Updating a Template
- [ ] Register slug, default data, and dynamic component in `src/data/templates.ts` and `src/lib/template-components.ts`.
- [ ] Wire `onSelectField(tabIndex, fieldId)` + `title="คลิกเพื่อแก้ไข..."` + `e.stopPropagation()` on **every** editable text, image, audio, and finale element in the template preview.
- [ ] Add matching editor tabs and inputs (with matching `id={fieldId}`) in `src/app/dashboard/create/page.tsx`.
- [ ] Verify `getPreviewConfig` in `src/components/dashboard/template-card.tsx` and `getDefaultDataForSlug` in `src/components/cards/card-viewer.tsx` support the template slug.


