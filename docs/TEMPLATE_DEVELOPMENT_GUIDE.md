# TEMPLATE_DEVELOPMENT_GUIDE.md

มาตรฐานการสร้างและเพิ่มเทมเพลตใหม่ในโปรเจกต์ SurpriseQR

เอกสารนี้เขียนขึ้นเพื่อให้ AI Agent หรือนักพัฒนาสามารถเพิ่มเทมเพลตใหม่ได้อย่างถูกต้อง
โดยไม่ทำให้เทมเพลตเดิมซ้ำหรือระบบอื่นเสียหาย อ่านให้ครบถ้วนก่อนเริ่มเขียนโค้ด

---

## 1. Project Architecture

ระบบเทมเพลตของ SurpriseQR ทำงานเป็นชั้นๆ ตั้งแต่ฐานข้อมูลจนถึง Card Viewer:

```
Database (Supabase public.templates)
        |
        v
src/lib/templates.ts          getAllTemplates() / getTemplateById() (อ่านจาก DB)
        |
        v
src/data/templates.ts         Static catalog, TemplateSlug type, getTemplateById(), getTemplateSlugById()
        |
        v
src/lib/template-components.ts Component registry (COMPONENT_BY_SLUG, getTemplateComponent())
        |
        v
src/lib/template-resolution.ts Render strategy resolution (resolveTemplateRenderStrategy())
        |
        v
src/components/cards/templates/ Template-specific components (AnniversaryTemplate, BlowCandlesTemplate, ...)
        |
        v
src/components/cards/card-viewer.tsx      Card Viewer (公開หน้า /c/[hash_id])
src/components/cards/card-preview.tsx     Card Preview (สำหรับ Create/Edit)
src/components/cards/card-builder.tsx     Create Card Form
src/components/cards/card-editor.tsx      Edit Card Form
src/components/dashboard/template-showcase.tsx Template Catalog
```

ข้อมูลไหล:
1. ผู้ใช้เลือกเทมเพลตใน Template Showcase → link ไป `/dashboard/create?template=<id>`
2. Create page โหลด template options จาก `/api/templates/list` (Supabase)
3. หน้า Create แสดง Live Preview ผ่าน `CardPreview` → template component
4. บันทึกการ์ด → `cards.template_id` เก็บ id ของเทมเพลตที่เลือก
5. Card Viewer (`/c/[hash_id]`) อ่าน `cards.template_id` → หา component → เรนเดอร์เทมเพลตนั้น

---

## 2. File Structure

```
src/
├── data/
│   └── templates.ts              # Static catalog + TemplateSlug type + lookup functions
├── lib/
│   ├── template-components.ts    # Component registry + getTemplateComponent()
│   └── template-resolution.ts    # Render strategy resolution
├── components/
│   ├── cards/
│   │   ├── templates/            # Template-specific components (สร้างใหม่ที่นี่)
│   │   │   ├── AnniversaryTemplate.tsx
│   │   │   ├── BlowCandlesTemplate.tsx
│   │   │   └── <YourTemplate>.tsx
│   │   ├── card-viewer.tsx       # Card Viewer (公開)
│   │   ├── card-preview.tsx      # Card Preview (สร้าง/แก้ไข)
│   │   ├── card-builder.tsx      # Create Card
│   │   ├── card-editor.tsx       # Edit Card
│   │   └── SurpriseQR.tsx        # Anniversary iframe engine (เดิม ไม่แก้ไข)
│   ├── dashboard/
│   │   ├── template-showcase.tsx # Template catalog
│   │   └── template-card.tsx     # Individual template card
│   └── admin/
│       └── template-manager.tsx  # Admin CRUD templates
├── types/
│   ├── database.ts               # Card, Template, CardScene types
│   └── templates.ts              # SurpriseQRData (Anniversary spec schema)
├── app/
│   ├── dashboard/create/page.tsx # Create Card page
│   ├── cards/[id]/edit/page.tsx  # Edit Card page
│   └── c/[hash_id]/page.tsx      # Card Viewer page
└── supabase/migrations/*.sql     # DB schema + seed data
```

### หน้าที่ของไฟล์สำคัญ

| ไฟล์ | หน้าที่ |
|------|--------|
| `src/data/templates.ts` | กำหนด `TemplateSlug` type, `templateCatalog[]`, ฟังก์ชันค้นหาเทมเพลต (slug, id, title) |
| `src/lib/template-components.ts | ลงทะเบียน component ต่อ slug, ฟังก์ชัน `getTemplateComponent()` คืน component หรือ null |
| `src/lib/template-resolution.ts` | ตัดสินใจว่าการ์ดควรเรนเดอร์ด้วย strategy ใด (anniversary-surprise / candles / generic) |
| `src/components/cards/templates/*.tsx` | Component ของแต่ละเทมเพลต ต้องรับ props ตาม `TemplatePreviewComponent` |
| `src/components/cards/card-viewer.tsx` | เรนเดอร์ template component ตาม `card.template_id`, จัดการ PIN gate |
| `src/components/cards/card-preview.tsx` | แสดงตัวอย่างในหน้า Create/Edit, ใช้ template component เมื่อมี |
| `src/app/dashboard/create/page.tsx` | หน้าสร้างการ์ด, เลือกเทมเพลต, แสดง Live Preview |
| `src/app/cards/[id]/edit/page.tsx` | หน้าแก้ไขการ์ด, โหลดเทมเพลตเดิมจาก DB |
| `supabase/migrations/*.sql` | เพิ่มแถวใน `public.templates` (seed data) |

---

## 3. Template Naming Convention

กำหนดมาตรฐานชื่อเพื่อความสอดคล้องและป้องกันการชนกัน

### 3.1 Template ID (UUID)
ใช้ UUID แบบ deterministic ตาม convention เดิม:
```
10000000-0000-4000-8000-0000000000XX
```
โดย XX คือตัวเลขต่อท้ายที่ยังไม่ถูกใช้ ตรวจสอบใน `supabase/migrations/` ก่อนกำหนด ID ใหม่

### 3.2 Template Slug
- ใช้ lowercase, kebab-case, ไม่มีเว้นวรรค
- ต้องตรงกับ `slug` คอลัมน์ใน `public.templates`
- ต้องไม่ซ้ำกับ slug ที่มีอยู่แล้ว
- ตัวอย่าง: `anniversary-surprise`, `candles`, `heart-warp`, `fairy-garden`, `ocean`, `galactic-gift`

### 3.3 Component Name
- PascalCase + `Template` suffix
- ตัวอย่าง: `AnniversaryTemplate`, `BlowCandlesTemplate`, `HeartWarpTemplate`
- ไฟล์: `src/components/cards/templates/<ComponentName>.tsx`

### 3.4 Display Name
- ชื่อที่แสดงให้ผู้ใช้เห็นใน Template Showcase
- ตัวอย่าง: "Anniversary Surprise", "Blow Candles", "Heart Warp"

### 3.5 ตรวจสอบก่อนเพิ่ม
ก่อนกำหนด slug ใหม่ ให้รันคำสั่งนี้เพื่อตรวจสอบว่ายังไม่ซ้ำ:

```bash
grep -r "your-new-slug" src/ supabase/migrations/
```

---

## 4. Template Component Standard

ทุก template component ต้องรับ props ตาม interface ด้านล่าง และต้องไม่ hardcode ข้อความของผู้ใช้

### 4.1 TemplatePreviewComponent Props

```typescript
interface TemplatePreviewComponentProps {
  config: unknown;              // ข้อมูลการ์ด (recipient, sender, message, media, ฯลฯ)
  isEditing?: boolean;          // โหมดแก้ไข (ซ่อนปุ่มแก้ไขถ้า false)
  studio?: boolean;             # โหมดสตูดิโอ (ซ่อน admin drawer / FAB)
  activeScreen?: number;        # หน้าจอที่ต้องการให้กระโดดไป (1-based)
  refreshToken?: number;        # บังคับให้รีเฟรช preview เมื่อค่าเปลี่ยน
}
```

### 4.2 ตัวอย่าง Component ที่ถูกต้อง

```tsx
"use client";

import { useEffect } from "react";

interface YourTemplateConfig {
  recipientName?: string;
  senderName?: string;
  message?: string;
  audio_url?: string;
  image_url?: string;
  [key: string]: unknown;
}

interface YourTemplateProps {
  config: unknown;
  isEditing?: boolean;
  studio?: boolean;
  activeScreen?: number;
  refreshToken?: number;
}

function extractConfig(config: unknown): YourTemplateConfig {
  if (!config || typeof config !== "object") return {};
  const record = config as Record<string, unknown>;
  return {
    recipientName: (record.recipientName as string) || (record.recipient_name as string) || "",
    senderName: (record.senderName as string) || (record.sender_name as string) || "",
    message: (record.message as string) || "",
    audio_url: (record.audio_url as string) || undefined,
    image_url: (record.image_url as string) || undefined,
  };
}

export default function YourTemplate({
  config,
  isEditing = false,
  studio = false,
  activeScreen,
  refreshToken,
}: YourTemplateProps) {
  const cfg = extractConfig(config);

  useEffect(() => {
    // ตัวอย่าง: 播放เสียงเมื่อเปิดการ์ด (ไม่ใช่โหมดแก้ไข)
    if (cfg.audio_url && !isEditing && !studio) {
      const audio = new Audio(cfg.audio_url);
      audio.play().catch(() => {});
    }
  }, [cfg.audio_url, isEditing, studio]);

  return (
    <div className="w-full h-full min-h-[400px] p-8 flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold">{cfg.recipientName ? `ถึง ${cfg.recipientName}` : "ถึงคุณ"}</h1>
      <p className="text-center">{cfg.message || "ข้อความของคุณจะปรากฏที่นี่"}</p>
    </div>
  );
}
```

### 4.3 ข้อห้าม
- ❌ ห้าม hardcode recipient name, sender name, message ตรงใน component
- ❌ ห้ามใช้ `defaultSurpriseQRData` เป็นข้อมูลหลักสำหรับเทมเพลตที่ไม่ใช่ Anniversary
- ❌ ห้าม fallback เงียบไปเทมเพลตอื่นเมื่อไม่พบข้อมูล
- ✅ ให้อ่านข้อมูลจาก `config` prop เท่านั้น
- ✅ ให้แสดงข้อความ	default (เช่น "ข้อความของคุณจะปรากฏที่นี่") เมื่อยังไม่มีข้อมูล

---

## 5. Template Registry

ลงทะเบียน template ใหม่ใน `src/lib/template-components.ts`:

### 5.1 ขั้นตอน

1. Import component แบบ dynamic (เพื่อกัน SSR error)
2. เพิ่ม entry ใน `COMPONENT_BY_SLUG`
3. component ต้อง cast เป็น `TemplatePreviewComponent`

### 5.2 ตัวอย่าง

```typescript
import dynamic from "next/dynamic";
import type { TemplateSlug } from "@/data/templates";
import { getTemplateSlugById } from "@/data/templates";

const YourTemplate = dynamic(() => import("@/components/cards/templates/YourTemplate"), { ssr: false });

const COMPONENT_BY_SLUG: Partial<Record<TemplateSlug, TemplatePreviewComponent>> = {
  "anniversary-surprise": AnniversaryTemplate as TemplatePreviewComponent,
  candles: BlowCandlesTemplate as TemplatePreviewComponent,
  "your-slug": YourTemplate as TemplatePreviewComponent, // <-- เพิ่มบรรทัดนี้
};
```

### 5.3 getTemplateComponent()
ฟังก์ชันนี้คืน `TemplatePreviewComponent | null` — คืน `null` เมื่อไม่พบ component
Callers ต้องจัดการกรณี null เอง (แสดง error แทนที่จะ fallback เงียบ)

---

## 6. Database Integration

### 6.1 Schema ของตาราง public.templates

| คอลัมน์ | ชนิด | คำอธิบาย |
|--------|------|----------|
| id | UUID | Primary key |
| title | TEXT | ชื่อที่แสดง |
| slug | TEXT | Slug (ต้องไม่ซ้ำ) |
| category | TemplateCategory | birthday \| love \| thanks \| sorry \| event \| general |
| is_premium | BOOLEAN | เป็นเทมเพลตพรีเมียมหรือไม่ |
| price | NUMERIC | ราคา (บาท) |
| preview_url | TEXT | URL รูปตัวอย่าง |
| preview_video_url | TEXT | URL วิดีโอตัวอย่าง (nullable) |
| demo_video_links | JSONB | ลิงก์ภายนอก {tiktok, youtube, facebook, instagram} |
| is_published | BOOLEAN | แสดงใน catalog หรือไม่ |
| created_at | TIMESTAMP | วันที่สร้าง |

### 6.2 การเพิ่ม Template ใน Supabase

สร้าง migration ใหม่ใน `supabase/migrations/` ตั้งชื่อด้วย timestamp:
```
YYYYMMDDHHMMSS_seed_your_template_name.sql
```

ตัวอย่าง:
```sql
INSERT INTO public.templates (id, name, slug, title, category, is_premium, price, preview_url, is_published)
VALUES (
  '10000000-0000-4000-8000-000000000008',
  'Your Template',
  'your-slug',
  'Your Template',
  'birthday',
  FALSE,
  0,
  '/templates/your-preview.png',
  TRUE
)
ON CONFLICT (id) DO NOTHING;
```

### 6.3 ข้อควรระวัง
- ใช้ `ON CONFLICT (id) DO NOTHING` เพื่อกัน migration ซ้ำทำลายข้อมูล
- ไม่ควรลบ template ที่มีการ์ดอ้างอิงอยู่ (จะเกิด NOT NULL constraint error)
- ถ้าต้องลบ ให้ใช้ `reassignCardsAndDeleteTemplate()` จาก `src/lib/admin/template-delete.ts`

---

## 7. Card Data Integration

ข้อมูลการ์ดที่ควรสนับสนุนใน template component:

| ฟิลด์ | แหล่งข้อมูล | คำอธิบาย |
|------|-----------|----------|
| recipient_name | cards.recipient_name | ชื่อผู้รับ |
| sender_name | cards.sender_name | ชื่อผู้ส่ง |
| message | cards.message | ข้อความหลัก |
| image_url | cards.image_url | รูปภาพหลัก |
| audio_url | cards.audio_url | URL เสียง |
| pin_code | cards.pin_code | รหัส PIN (ถ้ามี) |
| hash_id | cards.hash_id | รหัสแชร์การ์ด |

ใน `card-viewer.tsx` ฟังก์ชัน `buildTemplateConfig()` จะแปลง Card record ให้เป็น config object สำหรับแต่ละเทมเพลต:

```typescript
function buildTemplateConfig(card: Card, embeddedContent: Record<string, unknown>): unknown {
  if (slug === "anniversary-surprise") {
    return buildSurpriseQRData(card, embeddedContent); // SurpriseQRData
  }
  if (slug === "candles") {
    return { recipientName, senderName, message, wishMessage, audio_url, image_url };
  }
  return { recipientName, senderName, message, audio_url, image_url };
}
```

---

## 8. Animation & Interaction

ใช้ Framer Motion สำหรับแอนิเมชัน (มีใน dependencies แล้ว):

```tsx
import { motion, AnimatePresence } from "framer-motion";

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.4, ease: "easeInOut" }}
>
  {content}
</motion.div>
```

มาตรฐาน:
- ใช้ `canvas-confetti` สำหรับเอฟเฟกต์ coriander (มีใน dependencies แล้ว)
- รองรับ `prefers-reduced-motion` (ปิดแอนิเมชันเมื่อผู้ใช้ตั้งค่าไว้)
- ปุ่มโต้ตอบต้องมี `whileHover`, `whileTap` สำหรับ feedback
- เสียงต้องขออนุญาตจาก browser ก่อนเล่น (Autoplay policy)

---

## 9. Preview Integration

เทมเพลตใหม่ต้องแสดงในทุกจุดต่อไปนี้:

| จุดแสดง | ไฟล์ | การเชื่อมต่อ |
|---------|------|-------------|
| Template Showcase | `template-showcase.tsx`, `template-card.tsx` | อ่านจาก `getAllTemplates()` (DB) |
| Create Card | `create/page.tsx`, `card-builder.tsx` | `getTemplateComponent()` → `CardPreview` |
| Live Preview | `card-preview.tsx` | ใช้ template component เมื่อมี |
| Edit Card | `cards/[id]/edit/page.tsx`, `card-editor.tsx` | เดียวกับ Create |
| Card Viewer | `c/[hash_id]/page.tsx`, `card-viewer.tsx` | `getTemplateComponent(card.template_id)` |

ขั้นตอนการเชื่อม Preview:
1. ตรวจสอบว่า `getTemplateSlugById(template.id)` คืน slug ที่ถูกต้อง
2. ตรวจสอบว่า `getTemplateComponent(slug)` คืน component ไม่ใช่ null
3. ใน `card-preview.tsx` ให้ render `TemplateComponent` แทน generic preview
4. ใน `card-viewer.tsx` ให้ render `TemplateComponent` หลังผ่าน PIN gate

---

## 10. Asset Management

| ประเภท | พักที่ | หมายเหตุ |
|-------|-------|----------|
| รูปภาพตัวอย่างเทมเพลต | `public/templates/` | เช่น `/templates/cake-candles.png` |
| วิดีโอตัวอย่างเทมเพลต | Supabase Storage `template-previews` bucket | ผ่าน admin form (max 20 วินาที) |
| เสียงพื้นหลังการ์ด | Supabase Storage `card-media` bucket | อัปโหลดผ่าน MediaUploader |
| ฟอนต์ | Google Fonts (Prompt, Sarabun, ฯลฯ) | ใส่ใน template-engine หรือ Tailwind config |
| รูปภาพในการ์ด | Supabase Storage `card-media` bucket | ผ่าน card creation flow |

### ตัวอย่างการอัปโหลด preview video (Admin)
ใช้ `TemplateMediaFields` component ใน `template-manager.tsx` ซึ่งจัดการ upload ไปยัง `template-previews` bucket โดยอัตโนมัติ

---

## 11. Responsive Design

มาตรฐานสำหรับมือถือและเดสก์ท็อป:

```css
/* Mobile-first */
<div className="max-w-[375px] aspect-[9/19.5] rounded-[40px]">  {/* Mobile */}
/* Desktop */
<div className="max-w-full aspect-[16/9] rounded-2xl">  {/* Desktop */}
```

- ใช้ Tailwind responsive prefixes: `sm:`, `md:`, `lg:`
- จำกัดขนาด preview บนมือถือให้อยู่ใน `max-w-[375px]`
- รองรับการสลับ mobile/desktop mode ใน CardBuilder/CardEditor
- รองรับ dark mode toggle

---

## 12. Performance

| ตัวชี้วัด | มาตรฐาน |
|----------|---------|
| Lazy Loading | ใช้ `next/dynamic` สำหรับ template components (ดูใน template-components.ts) |
| Image Optimization | ใช้ `next/image` สำหรับรูปภาพใน template-card |
| Audio Loading | โหลดเสียงเมื่อจำเป็นเท่านั้น, ใช้ `preload="none"` |
| Animation Performance | ใช้ `transform` และ `opacity` เท่านั้น, หลีกเลี่ยง layout thrashing |
| Bundle Size | แต่ละ template component ควรมีขนาดไม่เกิน 50KB (gzipped) |
| Memory Management | ลบ event listeners, revoke object URLs (`URL.revokeObjectURL`) เมื่อ unmount |

---

## 13. Security

| ประเด็น | ข้อกำหนด |
|----------|----------|
| PIN Protection | ใช้ `verify_card_pin()` RPC server-side ไม่อ่าน `pin_code` โดยตรงจาก client |
| User Uploaded Files | จำกัดขนาดไฟล์ตาม tier (`getMediaLimit()`), ตรวจสอบ MIME type |
| Supabase Storage | ใช้ RLS policy, bucket `card-media` สำหรับการ์ด, `template-previews` สำหรับแอดมินเท่านั้น |
| RLS | ตรวจสอบว่า template ที่ไม่ได้ publish ไม่ปรากฏใน `getAllTemplates()` |
| XSS | Escape ข้อมูลผู้ใช้ก่อนแสดง, ใช้ `dangerouslySetInnerHTML` อย่างระมัดระวัง |
| iframe sandbox | SurpriseQR engine ใช้ `sandbox="allow-same-origin allow-scripts allow-forms allow-modals allow-popups"` ไม่มี `allow-same-origin` ถ้าไม่จำเป็น |
| postMessage | ตรวจสอบ `ev.source` เท่านั้น, validateข้อมูลก่อนใช้ใน engine |

---

## 14. Testing Checklist

ก่อนส่งมอบเทมเพลตใหม่ ต้องทดสอบรายการต่อไปนี้:

- [ ] เทมเพลตแสดงผลแตกต่างจากเทมเพลตอื่นๆ
- [ ] เลือกเทมเพลตใน Create Card แล้ว Live Preview เปลี่ยนตาม
- [ ] สร้างการ์ดใหม่ด้วยเทมเพลตนี้สำเร็จ
- [ ] เปิดการ์ดใน Card Viewer (`/c/[hash_id]`) แสดงเทมเพลตที่ถูกต้อง
- [ ] PIN ทำงานถ้าการ์ดมีการตั้งค่า PIN
- [ ] เสียงพื้นหลังเล่นได้ (หลังจากผู้ใช้โต้ตอบแล้วตาม browser policy)
- [ ] รูปภาพแสดงถูกต้อง
- [ ] Reaction (รัก, ถูกใจ, ยิ้ม) บันทึกได้
- [ ] แสดงผลถูกต้องทั้ง Mobile และ Desktop
- [ ] Dark mode สลับได้
- [ ] TypeScript compile ไม่มี error (`npm run build`)
- [ ] ESLint ผ่าน (`npm run lint`)
- [ ] ไม่มี React key warning
- [ ] ข้อมูลเทมเพลตไม่สูญหายหลังแก้ไข
- [ ] Database migration ไม่ลบหรือเปลี่ยนแปลงข้อมูลเดิม
- [ ] Template Showcase แสดงรูปและชื่อถูกต้อง
- [ ] Premium badge แสดงถูกต้องตาม is_premium
- [ ] Demo link ทำงาน (ถ้ามี)

---

## 15. Step-by-Step: Adding a New Template

### ขั้นตอนที่ 1: ตรวจสอบ slug ว่ายังไม่ซ้ำ
```bash
grep -r "your-slug" src/ supabase/migrations/
```

### ขั้นตอนที่ 2: สร้าง Database Record (Migration)
สร้างไฟล์ `supabase/migrations/YYYYMMDDHHMMSS_seed_your_template.sql`:
```sql
INSERT INTO public.templates (id, name, slug, title, category, is_premium, price, preview_url, is_published)
VALUES ('10000000-0000-4000-8000-0000000000XX', 'Your Template', 'your-slug', 'Your Template', 'birthday', FALSE, 0, '/templates/your-preview.png', TRUE)
ON CONFLICT (id) DO NOTHING;
```

### ขั้นตอนที่ 3: เพิ่ม Template Slug ใน Type
เปิด `src/data/templates.ts` เพิ่ม slug ใน `TemplateSlug` type:
```typescript
export type TemplateSlug = "anniversary-surprise" | "candles" | "your-slug";
```

### ขั้นตอนที่ 4: เพิ่ม Template Definition ใน Catalog
เพิ่ม entry ใน `templateCatalog[]`:
```typescript
{
  id: "your-slug",
  slug: "your-slug",
  title: "Your Template",
  category: "birthday",
  priceCredits: 0,
  image: "/templates/your-preview.png",
  previewVideo: undefined,
  gallery: ["/templates/your-preview.png"],
  longDescription: "...",
  features: [...],
  aliases: ["your-slug"],
  defaults: { ... }, // optional default data
}
```

### ขั้นตอนที่ 5: สร้าง Template Component
สร้างไฟล์ `src/components/cards/templates/YourTemplate.tsx`:
- รับ props ตาม `TemplatePreviewComponent`
- อ่านข้อมูลจาก `config`
- มี Visual Design, สี, Background, Animation ของตัวเอง
- Responsive สำหรับ Mobile และ Desktop

### ขั้นตอนที่ 6: ลงทะเบียนใน Registry
เปิด `src/lib/template-components.ts`:
1. Import component แบบ dynamic
2. เพิ่ม entry ใน `COMPONENT_BY_SLUG`

### ขั้นตอนที่ 7: เชื่อม Card Viewer
ใน `card-viewer.tsx` ฟังก์ชัน `buildTemplateConfig()` เพิ่ม case สำหรับ slug ใหม่:
```typescript
if (slug === "your-slug") {
  return { recipientName, senderName, message, ... };
}
```

### ขั้นตอนที่ 8: เพิ่ม Preview Image
วางรูปตัวอย่างใน `public/templates/your-preview.png`

### ขั้นตอนที่ 9: เชื่อม Template Showcase
Template Showcase อ่านจาก DB อัตโนมัติผ่าน `getAllTemplates()` ไม่ต้องแก้ไขโค้ดเพิ่ม

### ขั้นตอนที่ 10: เชื่อม Create/Edit/Viewer
Create/Edit ใช้ `CardPreview` ซึ่งจะใช้ template component อัตโนมัติเมื่อมีการลงทะเบียนแล้ว

### ขั้นตอนที่ 11: ทดสอบระบบ
ทำตาม Testing Checklist ในส่วนที่ 14

### ขั้นตอนที่ 12: Build
```bash
npm run build
```

### ขั้นตอนที่ 13: Deploy
Deploy ไปยัง production environment

---

## 16. AI Agent Instructions

คำสั่งมาตรฐานสำหรับสั่ง AI Agent ให้สร้างเทมเพลตใหม่:

```
คุณคือ Senior Full-Stack Developer ที่ชำนาญ Next.js 15, React 19, TypeScript, Supabase

งาน: เพิ่มเทมเพลตใหม่ "{TEMPLATE_NAME}" slug "{TEMPLATE_SLUG}" ให้กับโปรเจกต์ SurpriseQR

ขั้นตอนที่ต้องทำ:

1. ตรวจสอบระบบเดิมก่อนเสมอ:
   - อ่าน docs/TEMPLATE_DEVELOPMENT_GUIDE.md
   - อ่าน src/data/templates.ts ว่า slug "{TEMPLATE_SLUG}" ซ้ำหรือไม่
   - อ่าน src/lib/template-components.ts ว่า component registry มีอะไรบ้าง
   - อ่าน supabase/migrations/ ว่า template ID ใดยังไม่ถูกใช้

2. สร้าง Database Migration:
   - สร้างไฟล์ supabase/migrations/YYYYMMDDHHMMSS_seed_{TEMPLATE_NAME}.sql
   - ใช้ UUID แบบ 10000000-0000-4000-8000-0000000000XX
   - ใช้ ON CONFLICT (id) DO NOTHING
   - กำหนด is_published = TRUE, category ที่เหมาะสม

3. อัปเดต src/data/templates.ts:
   - เพิ่ม "{TEMPLATE_SLUG}" ใน TemplateSlug type
   - เพิ่ม entry ใน templateCatalog[] พร้อม title, category, image, aliases

4. สร้าง Template Component:
   - สร้างไฟล์ src/components/cards/templates/{ComponentName}Template.tsx
   - รับ props ตาม TemplatePreviewComponent (config, isEditing, studio, activeScreen, refreshToken)
   - อ่าน recipientName, senderName, message, audio_url, image_url จาก config
   - มี Visual Design, สี, Background, Animation ของตัวเอง
   - Responsive สำหรับ Mobile และ Desktop
   - ห้าม hardcode ข้อความผู้ใช้

5. ลงทะเบียนใน Registry:
   - เปิด src/lib/template-components.ts
   - Import component แบบ dynamic (ssr: false)
   - เพิ่ม entry ใน COMPONENT_BY_SLUG

6. เชื่อม Card Viewer:
   - เปิด src/components/cards/card-viewer.tsx
   - เพิ่ม case สำหรับ slug ใหม่ใน buildTemplateConfig()

7. เชื่อม Card Preview:
   - ตรวจสอบว่า src/components/cards/card-preview.tsx ใช้ getTemplateComponent() แล้ว
   - ไม่ต้องแก้ไขเพิ่มถ้า card-preview ใช้ registry อยู่แล้ว

8. เชื่อม Database:
   - ตรวจสอบว่ามี migration seed template ใน DB แล้ว
   - getAllTemplates() จะอ่านจาก DB อัตโนมัติ

9. เพิ่ม Preview Image:
   - วางไฟล์ใน public/templates/

10. ทดสอบระบบ:
    - เทมเพลตแสดงผลแตกต่างจากเทมเพลตอื่น
    - Create Card → Live Preview แสดงเทมเพลตที่ถูกต้อง
    - Card Viewer แสดงเทมเพลตตาม template_id
    - PIN, Audio, Image, Reaction ทำงานได้
    - Mobile และ Desktop แสดงถูกต้อง

11. Build:
    - npm run build ต้องผ่าน
    - npm run lint ต้องผ่าน

12. ห้ามทำให้เทมเพลตเดิมเสียหาย:
    - ไม่ลบ component เดิม
    - ไม่เปลี่ยน slug หรือ ID ของเทมเพลตเดิม
    - ไม่แก้ Database Schema
    - ไม่ fallback เงียบไป Anniversary Surprise เมื่อหา component ไม่พบ
```

---

## หมายเหตุสำคัญ

- **ห้าม fallback เงียบไป Anniversary Surprise** เมื่อหา component ไม่พบ ให้แสดง error หรือ fallback component แทน
- **ไม่แก้ Database Schema** เว้นแต่จำเป็นจริงๆ
- **ไม่ลบ Component เดิม** ก่อนตรวจสอบว่าไม่มีส่วนอื่นใช้งาน
- **ทดสอบจริงก่อนส่งมอบ** ไม่อ้างว่าทดสอบผ่านถ้ายังไม่ได้รัน