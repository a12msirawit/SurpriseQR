# TEMPLATE_AUDIT_REPORT - รายงานผลการตรวจสอบระบบเทมเพลต SurpriseQR

## 1. โครงสร้างระบบเดิม

ระบบเทมเพลตของ SurpriseQR ประกอบด้วยชั้นต่างๆ ดังนี้:

```
ชั้นที่ 1 (Database):  Supabase public.templates (ไฟล์ template_id, slug, title, category, is_premium, price, preview_url, is_published)
ชั้นที่ 2 (Static Catalog): src/data/templates.ts (templateCatalog[], TemplateSlug type)
ชั้นที่ 3 (Component Registry): src/lib/template-components.ts (COMPONENT_BY_SLUG, getTemplateComponent())
ชั้นที่ 4 (Resolution): src/lib/template-resolution.ts (resolveTemplateRenderStrategy(), looksLikeSurpriseQRData())
ชั้นที่ 5 (Viewer): src/components/cards/card-viewer.tsx (anniversary-surprise iframe / generic fallback)
ชั้นที่ 6 (Create/Edit): src/app/dashboard/create/page.tsx, card-builder.tsx, card-editor.tsx
ชั้นที่ 7 (Preview): src/components/cards/card-preview.tsx (generic)
ชั้นที่ 8 (Showcase): src/components/dashboard/template-showcase.tsx, template-card.tsx
```

### ไฟล์ที่เกี่ยวข้องทั้งหมดที่ตรวจสอบแล้ว

| ไฟล์ | บทบาท |
|------|--------|
| `src/data/templates.ts` | Static catalog, TemplateSlug type, getTemplateById(), getTemplateSlugById() |
| `src/lib/template-components.ts` | Component registry, getTemplateComponent() |
| `src/lib/template-resolution.ts` | Render strategy resolution |
| `src/lib/templates.ts` | getAllTemplates(), getTemplateById() from Supabase |
| `src/types/templates.ts` | SurpriseQRData type (Anniversary spec schema) |
| `src/types/database.ts` | Card, Template, CardScene, Reaction types |
| `src/components/cards/SurpriseQR.tsx` | Anniversary Surprise iframe engine wrapper |
| `src/components/cards/BlowCandlesTemplate.tsx` | Blow Candles template (props แยกต่างหาก) |
| `src/components/cards/card-viewer.tsx` | Card viewer (anniversary-surprise / generic) |
| `src/components/cards/card-preview.tsx` | Generic preview (ไม่เจาะจงเทมเพลต) |
| `src/components/cards/card-builder.tsx` | Create card form + live preview |
| `src/components/cards/card-editor.tsx` | Edit card form + live preview |
| `src/app/dashboard/create/page.tsx` | Create page, resolveOptionStrategy() |
| `src/app/cards/[id]/edit/page.tsx` | Edit page |
| `src/app/c/[hash_id]/page.tsx` | Card viewer page |
| `src/components/dashboard/template-showcase.tsx` | Template catalog showcase |
| `src/components/dashboard/template-card.tsx` | Individual template card |
| `src/components/admin/template-manager.tsx` | Admin template CRUD |
| `src/lib/admin/template-delete.ts` | Template deletion + reassignment |
| `supabase/migrations/*.sql` | DB schema + seed data |

## 2. รายการเทมเพลตทั้งหมดที่พบจริง

### ในฐานข้อมูล (จาก migration seeds)

| ID (UUID) | Slug | Title | Category | Premium | Price | Status |
|-----------|------|-------|----------|---------|-------|--------|
| `...0006` | `anniversary-surprise` | Anniversary Surprise | love | true | 0 | published |
| `...0007` | `candles` | Blow Candles | birthday | false | 0 | published |

เทมเพลตที่ถูกลบโดย migration `20260830000001_purge_removed_templates.sql` (การ์ดทั้งหมดถูกย้ายไป `anniversary-surprise`):
- `...0001` "3D Cosmic Galaxy" (purged)
- `...0002` "Interactive Gift Box" (purged)
- `...0003` "Minimal Test" (purged)
- `...0004` "Premium Minimal" (purged)
- `...0005` "Heart Warp Surprise" slug `heart-warp-surprise` (purged)

### ใน static catalog (src/data/templates.ts)

| Slug | Title | Component |
|------|-------|-----------|
| `anniversary-surprise` | Anniversary Surprise | SurpriseQR (iframe engine) |
| `candles` | Blow Candles | BlowCandlesTemplate |

`TemplateSlug` type กำหนดไว้แค่ 2 ค่า: `"anniversary-surprise" | "candles"`

## 3. รายการ Component ที่แต่ละเทมเพลตใช้งาน

| Slug | Component | Path | หมายเหตุ |
|------|-----------|------|---------|
| `anniversary-surprise` | `SurpriseQR` | `src/components/cards/SurpriseQR.tsx` | Iframe engine, 7-screen, receive `config: SurpriseQRData` |
| `candles` | `BlowCandlesTemplate` | `src/components/cards/BlowCandlesTemplate.tsx` | Receive `data?: { recipientName?, wishMessage? }` (ไม่ตรงกับ `TemplatePreviewComponent`) |

ปัญหา: `BlowCandlesTemplate` ใช้ props interface ต่างจาก `TemplatePreviewComponent` ซึ่งคาดหวัง `{ config: unknown; isEditing?: boolean; studio?: boolean; activeScreen?: number; refreshToken?: number }` จึงไม่สามารถส่งผ่าน `getTemplateComponent()` ได้โดยตรง

## 4. สาเหตุของปัญหาเทมเพลตซ้ำ

### Root Cause 1: getTemplateComponent() ตกทอดเงียบไป Anniversary Surprise
ไฟล์: `src/lib/template-components.ts:33-41`

```typescript
export function getTemplateComponent(templateOrIdentifier): TemplatePreviewComponent {
  const id = typeof templateOrIdentifier === "string" ? templateOrIdentifier : templateOrIdentifier.id;
  const slug = getTemplateSlugById(id);
  return COMPONENT_BY_SLUG[slug ?? "anniversary-surprise"] ?? COMPONENT_BY_SLUG["anniversary-surprise"];
}
```

เมื่อ `slug` เป็น `null` (ไม่พบเทมเพลตใน catalog) หรือ `COMPONENT_BY_SLUG[slug]` ไม่มี component ลงทะเบียน จะตกทอดไปยัง `"anniversary-surprise"` เสมอโดยไม่แจ้งข้อผิดพลาด

### Root Cause 2: getTemplateById() ตกทอดไป templateCatalog[0]
ไฟล์: `src/data/templates.ts:246-256`

```typescript
const match = (byKeywords ? templateCatalog.find((item) => item.slug === byKeywords) : undefined) ?? templateCatalog[0];
return { ...match, image: getTemplateThumbnail(match.image) };
```

เมื่อไม่พบ template ตาม id หรือ title จะคืน `templateCatalog[0]` ซึ่งคือ Anniversary Surprise เสมอ

### Root Cause 3: getTemplateSlugByTitle() ตกทอดไป "anniversary-surprise"
ไฟล์: `src/data/templates.ts:243-244`

```typescript
export const getTemplateSlugByTitle = (title?: string): TemplateSlug =>
  matchTemplateSlugByTitle(title) ?? "anniversary-surprise";
```

### Root Cause 4: resolveTemplateRenderStrategy() รองรับแค่ 2 กลยุทธ์
ไฟล์: `src/lib/template-resolution.ts:48-63`

คืนค่าได้แค่ `"anniversary-surprise"` หรือ `"generic"` เท่านั้น เทมเพลต `candles` และอื่นๆ ตกเข้าสู่ generic viewer ซึ่งแสดงผลแค่ข้อความธรรมดา ไม่มีแอนิเมชันหรือดีไซน์ของเทมเพลตนั้นๆ

### Root Cause 5: Create page ล็อกเทมเพลตหลักเป็น Anniversary Surprise
ไฟล์: `src/app/dashboard/create/page.tsx:215, 218-220`

```typescript
const ANNIVERSARY_TEMPLATE_SLUG: TemplateSlug = "anniversary-surprise";
function resolveOptionStrategy(option): TemplateSlug {
  return getTemplateSlugById(option?.id) ?? ANNIVERSARY_TEMPLATE_SLUG;
}
```

เมื่อเลือกเทมเพลตอื่นแล้วระบบหา slug ไม่พบ จะตกทอดเป็น Anniversary Surprise โดยไม่แจ้งผู้ใช้

### Root Cause 6: CardPreview แสดงผลแบบ generic
ไฟล์: `src/components/cards/card-preview.tsx`

แสดงเฉพาะ recipient, sender, message, images, audio, QR code โดยไม่คำนึงถึงเทมเพลตที่เลือก Live Preview ในหน้า Create/Edit จึงแสดงผลเหมือนกันทุกเทมเพลต

### Root Cause 7: BlowCandlesTemplate props ไม่สอดคล้องกับระบบ preview
`BlowCandlesTemplateProps` ใช้ `{ data?: { recipientName?, wishMessage? } }` แต่ `TemplatePreviewComponent` คาดหวัง `{ config: unknown; isEditing?: boolean; studio?: boolean; activeScreen?: number; refreshToken?: number }`

## 5. ไฟล์ที่ต้องแก้ไข

| ไฟล์ | การแก้ไข |
|------|----------|
| `src/data/templates.ts` | ขยาย TemplateSlug type, ลบ silent fallback ใน getTemplateById/getTemplateSlugByTitle, เพิ่ม template definitions สำหรับทุกเทมเพลตใน DB |
| `src/lib/template-components.ts` | ลบ silent fallback ใน getTemplateComponent(), เพิ่ม fallback component ที่แสดงข้อผิดพลาด, เพิ่ม type safety |
| `src/lib/template-resolution.ts` | เพิ่ม render strategy สำหรับ candles และเทมเพลตอื่นๆ |
| `src/components/cards/templates/BlowCandlesTemplate.tsx` | เขียนใหม่ให้รับ props ตาม TemplatePreviewComponent, ใช้ข้อมูลจาก card |
| `src/components/cards/templates/AnniversaryTemplate.tsx` | สร้าง wrapper component สำหรับ SurpriseQR ให้รองรับ TemplatePreviewComponent |
| `src/components/cards/card-viewer.tsx` | เชื่อม template component ตาม slug ของการ์ด, รองรับ template-specific rendering |
| `src/components/cards/card-preview.tsx` | รองรับ template-specific preview |
| `src/components/cards/card-builder.tsx` | เชื่อม template-specific preview แทน generic CardPreview |
| `src/components/cards/card-editor.tsx` | เชื่อม template-specific preview แทน generic CardPreview |
| `src/app/dashboard/create/page.tsx` | ลบ silent fallback, แจ้งข้อผิดพลาดเมื่อเทมเพลตไม่มี component |

## 6. แนวทางแก้ไข

1. **Registry แบบไม่มี silent fallback** - `getTemplateComponent()` คืนค่า `null` หรือ fallback component ที่แสดงข้อผิดพลาดเมื่อไม่พบ component ที่ลงทะเบียน ไม่ตกทอดไป Anniversary Surprise โดยอัตโนมัติ
2. **Component แยกต่อเทมเพลต** - แต่ละเทมเพลตมี component ของตัวเองภายใต้ `src/components/cards/templates/`
3. **Props มาตรฐาน** - ทุก template component รับ `{ config: unknown; isEditing?: boolean; studio?: boolean; activeScreen?: number; refreshToken?: number }`
4. **Template-specific viewer** - card-viewer.tsx ใช้ `getTemplateComponent()` เพื่อเรนเดอร์ component ที่ถูกต้องตาม template_id ของการ์ด
5. **Type safety** - ขยาย `TemplateSlug` type ให้ครอบคลุมทุก slug ใน DB, ใช้ discriminated union สำหรับ props ของแต่ละเทมเพลต

## 7. ความเสี่ยงต่อระบบเดิม

| ความเสี่ยง | ระดับ | การบรรเทา |
|-----------|-------|-----------|
| การเปลี่ยน fallback behavior อาจส่งผลต่อการ์ดเก่าที่ template_id ไม่ตรงกับ catalog | สูง | ทดสอบกับการ์ดที่มีอยู่, ใช้ fallback component แทนการเงียบ |
| การเปลี่ยน props ของ BlowCandlesTemplate อาจกระทบผู้ใช้ที่ import โดยตรง | กลาง | ตรวจสอบการ import ทั้งหมดก่อนแก้ไข |
| การเปลี่ยน card-viewer อาจส่งผลต่อการแสดงผลการ์ดเก่า | สูง | รักษา generic viewer เป็น fallback สำหรับเทมเพลตที่ไม่มี component |
| Database schema ไม่เปลี่ยนแปลง | ต่ำ | ไม่ต้องมี migration |

## 8. เทมเพลตที่แก้ไขแล้ว (หลัง Phase 2)

- `anniversary-surprise` - AnniversaryTemplate (wrapper รอบ SurpriseQR iframe engine)
- `candles` - BlowCandlesTemplate (เขียนใหม่รองรับ TemplatePreviewComponent)

เทมเพลตเพิ่มเติมในอนาคตสามารถเพิ่มได้โดยทำตาม `docs/TEMPLATE_DEVELOPMENT_GUIDE.md`