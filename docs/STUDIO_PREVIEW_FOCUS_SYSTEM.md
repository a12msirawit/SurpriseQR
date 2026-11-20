# ระบบ Two-Way Live Preview Focus & Highlight (Studio Editor)

เอกสารนี้อธิบายสถาปัตยกรรม วิธีการทำงาน และขั้นตอนการนำไปปรับใช้กับเทมเพลตทั้งหมดใน SurpriseQR Studio เพื่อให้ผู้ใช้สามารถโต้ตอบระหว่าง **ฝั่งแก้ไข (Editor)** และ **ฝั่งพรีวิว (Live Preview)** ได้ทั้ง 2 ทิศทาง (รองรับทั้ง Desktop และ Mobile)

---

## 1. ภาพรวมการทำงาน (Two-Way Sync)

1. **Preview -> Editor (คลิกบนพรีวิวเพื่อแก้ไข)**
   - ผู้ใช้คลิกองค์ประกอบบน `.studio-live-preview`
   - เทมเพลตเรียก `onSelectField(tabIndex, fieldId)`
   - [page.tsx](file:///c:/SurpriseQR/src/app/dashboard/create/page.tsx) สลับไปแท็บที่กำหนด (`setActiveStep`), เลื่อนหน้าจอไปยัง `#<fieldId>`, โฟกัส input, และขึ้นวงแหวนไฮไลท์ชั่วคราว (`highlightedFieldId`)

2. **Editor -> Preview (คลิก/แตะ/พิมพ์ฝั่งขวา แล้วพรีวิวขึ้นกรอบชี้จุด)**
   - ผู้ใช้คลิก แตะ หรือโฟกัสช่องกรอกข้อมูลที่มี `id="field-..."` ภายใน `<section>` ของ Editor
   - `handleEditorFocusCapture` (ผูกไว้ทั้ง `onFocusCapture` และ `onClickCapture` เพื่อรองรับมือถือ) จะอ่าน `fieldId` และดึงข้อความป้ายชื่อจาก `<label>`
   - อัปเดต `focusedPreviewField` (แสดงแถบสถานะ `กำลังชี้จุด: ...` บนหัว Live Preview) และยิง `window.dispatchEvent(new CustomEvent("sq-preview-focus", { detail: { fieldId, label } }))`
   - `useEffect` ใน [page.tsx](file:///c:/SurpriseQR/src/app/dashboard/create/page.tsx) ค้นหา `[data-editable-field="<fieldId>"]` ใน `.studio-live-preview`, เลื่อนพรีวิวไปหาจุดนั้น (`scrollIntoView`), และติด class `.sq-preview-focus-ring` + attribute `data-sq-focused="true"` + `data-focus-label`
   - หากจุดนั้นยังไม่ถูก mount ทันที (เช่น รอ `AnimatePresence` สลับฉาก) `MutationObserver` จะรอจับการเปลี่ยนแปลง DOM สูงสุด 1.8 วินาทีแล้วติดกรอบให้ทันที
   - **การยกเลิกกรอบเมื่อกดที่ว่าง:** เมื่อคลิกหรือแตะพื้นที่ว่างนอกช่องแก้ไข (`[id^="field-"]`, `<label>` ของฟิลด์) และนอกจุดแก้ไขบนพรีวิว (`[data-editable-field]`) ตัวดัก `pointerdown` จะเรียก `clearFocusedPreviewField()` เพื่อลบกรอบและป้ายสถานะออกทันทีทั้งบน Desktop และ Mobile

---

## 2. ไฟล์หลักของระบบ

| ไฟล์ | หน้าที่ |
| --- | --- |
| [src/app/dashboard/create/page.tsx](file:///c:/SurpriseQR/src/app/dashboard/create/page.tsx) | จัดการ `focusedPreviewField`, `handleEditorFocusCapture`, `handleEditorBlurCapture`, `MutationObserver`, และยิง `sq-preview-focus` |
| [src/app/globals.css](file:///c:/SurpriseQR/src/app/globals.css) | นิยามสไตล์ `.studio-live-preview .sq-preview-focus-ring` และ `[data-sq-focused="true"]` (วางไว้นอก `@layer components` เพื่อไม่ให้ Tailwind v4 ตัดทิ้ง) |
| `src/components/templates/**` และ `src/components/cards/templates/**` | ใส่ `data-editable-field`, `data-edit-label`, `onSelectField` (และ `data-sq-focused` สำหรับเทมเพลตที่มี animation ซับซ้อน) |

---

## 3. วิธีปรับใช้กับเทมเพลตหรือฟิลด์ใหม่

### ขั้นตอนที่ 1: ตั้ง `id` ใน Editor ([create/page.tsx](file:///c:/SurpriseQR/src/app/dashboard/create/page.tsx))
กำหนด `id` ที่ขึ้นต้นด้วย `field-` ให้กับ `<input>`, `<textarea>`, `<select>` หรือ container ของตัวอัปโหลดสื่อ (เช่น `SurpriseQRMediaInput`):

```tsx
<label className="block text-base font-semibold text-slate-200">
  ข้อความความในใจฉากที่ 2
  <textarea
    id="field-mytemplate-message-2"
    ...
  />
</label>
```

> **หมายเหตุ:** ระบบจะดึงข้อความจาก `<label>` ที่ครอบอยู่มาทำเป็นป้ายชื่อบนพรีวิวให้อัตโนมัติ (ตัดข้อความในปุ่มและ input ออกให้สะอาด)

---

### ขั้นตอนที่ 2: ผูก `data-editable-field` ใน Template
นำ `id` เดียวกันไปใส่เป็น `data-editable-field` และ `data-edit-label` บนองค์ประกอบในเทมเพลต (ควรใส่เฉพาะเมื่อ `onSelectField` ถูกส่งเข้ามา เพื่อไม่ให้แสดงผลบนการ์ดจริงของผู้รับ):

```tsx
<p
  data-editable-field={onSelectField ? "field-mytemplate-message-2" : undefined}
  data-edit-label={onSelectField ? "ข้อความความในใจฉากที่ 2" : undefined}
  onClick={(e) => {
    if (onSelectField) {
      e.stopPropagation();
      onSelectField(2, "field-mytemplate-message-2");
    }
  }}
>
  {message}
</p>
```

---

### ขั้นตอนที่ 3 (แนะนำสำหรับเทมเพลตที่ใช้ `AnimatePresence` หรือมี Sub-state ภายใน)
หากเทมเพลตมีการซ่อน/สลับหน้าด้วย animation หรือมี state ภายใน (เช่น การเลือกใบโพลารอยด์ 1–3 หรือ `motion.*` ที่อาจ re-render บ่อย) ให้ฟัง event `"sq-preview-focus"` ในเทมเพลตเพื่อเก็บ `focusedFieldId` ไว้ใน React state:

```tsx
const [focusedFieldId, setFocusedFieldId] = useState<string | null>(null);

useEffect(() => {
  const handlePreviewFocus = (event: Event) => {
    const custom = event as CustomEvent<{ fieldId?: string | null }>;
    const fieldId = custom.detail?.fieldId ?? null;
    setFocusedFieldId(fieldId);

    // ตัวอย่าง: ถ้าโฟกัส field ของโพลารอยด์ใบที่ n ให้สลับการ์ดไปใบนั้นอัตโนมัติ
    const match = /^field-starlight-scene-badge-(\d+)$/.exec(fieldId || "");
    if (match) {
      setSelectedPolaroidIndex(Number(match[1]) - 1);
    }
  };
  window.addEventListener("sq-preview-focus", handlePreviewFocus);
  return () => window.removeEventListener("sq-preview-focus", handlePreviewFocus);
}, []);
```

จากนั้นเพิ่ม `data-sq-focused` บนองค์ประกอบ:

```tsx
data-sq-focused={focusedFieldId === "field-mytemplate-message-2" ? "true" : undefined}
```

---

## 4. สถานะการรองรับในแต่ละเทมเพลต

- **Starlight Memories** ([StarlightMemoriesTemplate.tsx](file:///c:/SurpriseQR/src/components/templates/StarlightMemories/StarlightMemoriesTemplate.tsx)): รองรับครบทั้ง Two-way sync, `data-editable-field`, `data-sq-focused`, และการสลับโพลารอยด์อัตโนมัติ
- **Midnight Cinema** ([MidnightCinemaTemplate.tsx](file:///c:/SurpriseQR/src/components/templates/MidnightCinema/MidnightCinemaTemplate.tsx), `CinemaTicket.tsx`, `FilmStrip.tsx`, `ProjectorPlayer.tsx`): ผูก `data-editable-field` และ `data-edit-label` ครบทุกจุด
- **Retro Y2K** ([RetroY2KTemplate.tsx](file:///c:/SurpriseQR/src/components/templates/RetroY2K/RetroY2KTemplate.tsx), [RetroWindow.tsx](file:///c:/SurpriseQR/src/components/templates/RetroY2K/RetroWindow.tsx)): ผูก `data-editable-field` และ `titleFieldId` ครบทุกหน้าต่าง
- **Velvet Candle** ([VelvetCandleTemplate.tsx](file:///c:/SurpriseQR/src/components/templates/VelvetCandle/VelvetCandleTemplate.tsx)): ใช้ `editableProps(tab, field)` ที่ส่ง `data-editable-field` ให้อัตโนมัติ
- **Vintage Wax Seal** ([VintageWaxSealTemplate.tsx](file:///c:/SurpriseQR/src/components/templates/VintageWaxSeal/VintageWaxSealTemplate.tsx)): ใช้ `editableProps(tabIndex, fieldId)` ที่ส่ง `data-editable-field` ให้อัตโนมัติ
- **Blow Candles** ([BlowCandlesTemplate.tsx](file:///c:/SurpriseQR/src/components/cards/templates/BlowCandlesTemplate.tsx)): มี `data-editable-field` ผูกไว้แล้ว
- **Grand New Year / Halloween Haunted / Songkran Splendor**: มี `data-editable-field` ผูกไว้แล้ว
- **Storyline** ([StorylineTemplate.tsx](file:///c:/SurpriseQR/src/components/cards/templates/StorylineTemplate.tsx), [storyline.html](file:///c:/SurpriseQR/public/templates/storyline.html)): รองรับการส่งต่อ `sq-preview-focus` เข้า iframe, ตัวนับระยะเวลาความทรงจำแบบเรียลไทม์ (**วัน · ชม. · นาที · วินาที**), การ์ดกระดาษและคำมั่นสัญญาขนาดสมดุล (`max-width: 460px–540px`), วงแหวนแสง `.aura-ring`, และปุ่มควบคุมที่ใช้ไอคอนจาก Phosphor (`ph-arrow-left`, `ph-arrow-right`, `ph-arrow-counter-clockwise`) แทนลูกศรข้อความ

---

## 5. ข้อควรระวังในการพัฒนาต่อ

1. **ห้ามใส่ `.sq-preview-focus-ring` ไว้ใน `@layer components` ของ Tailwind v4** เพราะ class ที่ถูกเพิ่มด้วย JavaScript (`classList.add`) อาจถูก tree-shake หรือลำดับความสำคัญต่ำกว่า utility class ให้วางไว้ระดับ root ใน [globals.css](file:///c:/SurpriseQR/src/app/globals.css) เสมอ
2. **การรองรับมือถือ (Touch Devices)**:
   - ใช้ `onClickCapture` คู่กับ `onFocusCapture` เผื่อกรณีผู้ใช้แตะปุ่มอัปโหลดหรือ container ที่ไม่ใช่ input
   - ไม่ล้าง `focusedPreviewField` เมื่อ `event.relatedTarget === null` จากการพับคีย์บอร์ดมือถือ แต่จะล้างกรอบเมื่อผู้ใช้แตะ/คลิกพื้นที่ว่างผ่าน `document.addEventListener("pointerdown", ..., true)` แทน
3. **ความเฉพาะของ `data-editable-field`**: 1 `fieldId` ควรผูกกับองค์ประกอบหลักเพียง 1 จุดบนพรีวิว เพื่อให้ `querySelector` ชี้กรอบและเลื่อนหน้าจอได้แม่นยำที่สุด
4. **มาตรฐานปุ่มและไอคอน (Icon-first UI)**: ใช้ไอคอนจาก `lucide-react` หรือ `@phosphor-icons/web` สำหรับทุกปุ่มควบคุม (เช่น ย้อนกลับ, ไปต่อ, เริ่มเรื่องใหม่, เปิด/ปิดเสียง) และห้ามใช้ Unicode Emoji หรือลูกศรข้อความดิบ (`←`, `→`, `↺`) ใน UI
5. **สัดส่วนการ์ดบนหน้าจอกว้าง**: จำกัด `max-width` ของการ์ดข้อความ/จดหมาย (`460px–540px`) เพื่อไม่ให้กล่องข้อความยืดกว้างเกินไปบนเดสก์ท็อป

