"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit3, Trash2, Crown, AlertCircle, X, Sparkles, ChevronDown, ChevronUp, Search, Globe, Eye, EyeOff } from "lucide-react";
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/app/admin/actions";
import type { Template } from "@/types/database";
import TemplateMediaFields from "@/components/admin/template-media-fields";
import { ADMIN_CATEGORY_OPTIONS, normalizeAdminCategory } from "@/constants/template-categories";

interface TemplateManagerProps {
  templates: Template[];
}

export default function TemplateManager({ templates: initialTemplates }: TemplateManagerProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);

  useEffect(() => {
    setTemplates(initialTemplates);
  }, [initialTemplates]);
  const [createOpen, setCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // Local publish-status overrides so the toggle updates instantly without
  // waiting for a server revalidation of the parent route.
  const [publishOverrides, setPublishOverrides] = useState<Record<string, boolean>>({});
  const [adminPreviewOverrides, setAdminPreviewOverrides] = useState<Record<string, boolean>>({});
  const [publishingId, setPublishingId] = useState<string | null>(null);

  // Controlled state for the "เพิ่มเทมเพลต" (create) form so the price field
  // can be shown/hidden based on the premium toggle. Publish status is handled
  // by the status toggle badge, so is_published is not part of the form.
  const [createPremium, setCreatePremium] = useState(false);
  const [createPrice, setCreatePrice] = useState("0");
  const [createDiscounted, setCreateDiscounted] = useState(false);
  const [createSalePrice, setCreateSalePrice] = useState("0");
  // Remounts the create-form media fields (clearing the uploaded video/links) after a successful create.
  const [createMediaKey, setCreateMediaKey] = useState(0);

  // Controlled premium/price/discount/category state for the inline edit form.
  const [editForm, setEditForm] = useState<{
    premium: boolean;
    normalPrice: string;
    discounted: boolean;
    salePrice: string;
    category: string;
  } | null>(null);

  function startEdit(template: Template) {
    setEditingId(template.id);
    setError(null);
    const currentPrice = Number(template.price ?? (template.is_premium ? 19 : 0));
    const hasDiscount = Boolean(template.original_price && Number(template.original_price) > currentPrice);
    setEditForm({
      premium: template.is_premium,
      normalPrice: String(hasDiscount ? template.original_price : currentPrice),
      discounted: hasDiscount,
      salePrice: String(currentPrice),
      category: normalizeAdminCategory(template.category),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  async function patchTemplateVisibility(
    template: Template,
    payload: { is_published?: boolean; admin_preview_visible?: boolean },
  ) {
    setError(null);
    setPublishingId(template.id);
    try {
      const response = await fetch(`/api/admin/templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        is_published?: boolean;
        admin_preview_visible?: boolean;
        error?: string;
      };
      if (!response.ok) {
        setError(result.error ?? "ไม่สามารถเปลี่ยนสถานะเทมเพลตได้");
        return;
      }
      if (typeof result.is_published === "boolean") {
        setPublishOverrides((current) => ({ ...current, [template.id]: result.is_published! }));
      }
      if (typeof result.admin_preview_visible === "boolean") {
        setAdminPreviewOverrides((current) => ({
          ...current,
          [template.id]: result.admin_preview_visible!,
        }));
      }
    } catch {
      setError("ไม่สามารถเปลี่ยนสถานะเทมเพลตได้");
    } finally {
      setPublishingId(null);
    }
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await createTemplate(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.template) {
        const createdTemplate = result.template;
        setTemplates((current) => [createdTemplate, ...current]);
      }
      form.reset();
      setCreatePremium(false);
      setCreatePrice("0");
      setCreateDiscounted(false);
      setCreateSalePrice("0");
      setCreateMediaKey((key) => key + 1);
      router.refresh();
    });
  }

  function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const result = await updateTemplate(formData);
        if (result.error) {
          setError(result.error);
          return;
        }
        if (result.template) {
          const updatedTemplate = result.template;
          setTemplates((current) =>
            current.map((template) =>
              template.id === updatedTemplate.id ? updatedTemplate : template
            )
          );
        }
        setEditingId(null);
        setEditForm(null);
        router.refresh();
      } catch {
        setError("ไม่สามารถบันทึกเทมเพลตได้ กรุณาลองใหม่อีกครั้ง");
      }
    });
  }

  function handleDelete(templateId: string) {
    if (!window.confirm("คุณต้องการลบเทมเพลตนี้ใช่หรือไม่?")) {
      return;
    }
    const targetTemplate = templates.find((template) => template.id === templateId);
    if (!targetTemplate) {
      return;
    }
    setError(null);
    // Optimistically remove the row so the table updates instantly.
    setTemplates((current) => current.filter((template) => template.id !== templateId));
    startTransition(async () => {
      try {
        const result = await deleteTemplate(templateId);
        if (result.success === false || result.error) {
          // Restore the row locally if deletion failed.
          setTemplates((current) => [targetTemplate, ...current]);
          const message = result.error ?? "ไม่สามารถลบเทมเพลตได้ กรุณาลองใหม่อีกครั้ง";
          setError(message);
          window.alert(`ไม่สามารถลบ${targetTemplate.title}ได้: ${message}`);
        }
      } catch {
        setTemplates((current) => [targetTemplate, ...current]);
        setError("ไม่สามารถลบเทมเพลตได้ กรุณาลองใหม่อีกครั้ง");
        window.alert("ไม่สามารถลบเทมเพลตได้ กรุณาลองใหม่อีกครั้ง");
      }
    });
  }

  const publishedCount = templates.filter(
    (template) => (publishOverrides[template.id] ?? template.is_published !== false),
  ).length;
  const adminOnlyCount = templates.filter((template) => {
    const isPub = publishOverrides[template.id] ?? template.is_published !== false;
    const showOnDash = adminPreviewOverrides[template.id] ?? template.admin_preview_visible !== false;
    return !isPub && showOnDash;
  }).length;
  const hiddenCount = templates.length - publishedCount - adminOnlyCount;

  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        (t.title ?? "").toLowerCase().includes(q) ||
        (t.category ?? "").toLowerCase().includes(q) ||
        (t.preview_url ?? "").toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q),
    );
  }, [templates, searchQuery]);

  return (
    <div className="space-y-8">
      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/30 p-3 rounded-xl">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Card 1: เพิ่มเทมเพลต (แยกการ์ดอิสระ พับย่อไว้เป็นค่าเริ่มต้น) */}
      <section className="glass-panel rounded-2xl p-6">
        <button
          type="button"
          onClick={() => setCreateOpen((prev) => !prev)}
          aria-expanded={createOpen}
          aria-controls="admin-create-template-form"
          className="w-full flex flex-wrap items-center justify-between gap-3 text-left group rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-400/50"
        >
          <span className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-fuchsia-500/15 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-300 group-hover:bg-fuchsia-500/25 transition-colors">
              <Plus className="w-5 h-5" />
            </span>
            <span>
              <span className="block text-xl font-bold text-white">เพิ่มเทมเพลต</span>
              <span className="block text-xs text-slate-400 mt-0.5">
                {createOpen ? "คลิกพับเก็บเมื่อสร้างเสร็จ" : "พับย่อไว้ — คลิกเพื่อเปิดฟอร์มสร้างเทมเพลตใหม่"}
              </span>
            </span>
          </span>

          <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-space-border text-slate-200 group-hover:bg-white/10 group-hover:border-fuchsia-400/40 transition-all">
            <span>{createOpen ? "พับเก็บ" : "เปิดเพิ่มเทมเพลต"}</span>
            {createOpen ? (
              <ChevronUp className="w-4 h-4 text-fuchsia-300" />
            ) : (
              <ChevronDown className="w-4 h-4 text-fuchsia-300" />
            )}
          </span>
        </button>

        {createOpen && (
          <form
            id="admin-create-template-form"
            onSubmit={handleCreate}
            className="mt-5 pt-5 border-t border-space-border space-y-4"
          >
            <div>
              <label htmlFor="new-title" className="block text-sm font-medium text-slate-300 mb-2">
                ชื่อ
              </label>
              <input
                id="new-title"
                name="title"
                type="text"
                required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-space-border text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label htmlFor="new-category" className="block text-sm font-medium text-slate-300 mb-2">
                ประเภท
              </label>
              <select
                id="new-category"
                name="category"
                required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-space-border text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:border-transparent transition-all"
              >
                {(ADMIN_CATEGORY_OPTIONS || []).map((option) => (
                  <option key={option.value} value={option.value} className="bg-[#06030c]">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="new-preview" className="block text-sm font-medium text-slate-300 mb-2">
                URL ตัวอย่าง
              </label>
              <input
                id="new-preview"
                name="preview_url"
                type="text"
                required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-space-border text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:border-transparent transition-all"
              />
            </div>
            <TemplateMediaFields idPrefix="new" key={createMediaKey} />
            <div className="flex items-center gap-2">
              <input
                id="new-premium"
                name="is_premium"
                type="checkbox"
                checked={createPremium}
                onChange={(event) => {
                  const next = event.target.checked;
                  setCreatePremium(next);
                  if (!next) {
                    setCreatePrice("0");
                    setCreateDiscounted(false);
                    setCreateSalePrice("0");
                  }
                }}
                className="w-5 h-5 rounded border-space-border text-fuchsia-500 focus:ring-fuchsia-400"
              />
              <label htmlFor="new-premium" className="text-sm text-slate-300 flex items-center gap-1">
                <Crown className="w-4 h-4 text-amber-400" />
                เทมเพลตพรีเมียม
              </label>
            </div>
            {createPremium && (
              <div className="space-y-3 rounded-xl border border-amber-400/20 bg-amber-500/5 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="new-normal-price" className="block text-sm font-medium text-slate-300 mb-2">
                      ราคาปกติ (บาท)
                    </label>
                    <input
                      id="new-normal-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={createPrice}
                      onChange={(event) => setCreatePrice(event.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-space-border text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:border-transparent transition-all"
                    />
                  </div>
                  {createDiscounted && (
                    <div>
                      <label htmlFor="new-sale-price" className="block text-sm font-medium text-amber-300 mb-2">
                        ราคาลดเหลือ (บาท)
                      </label>
                      <input
                        id="new-sale-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={createSalePrice}
                        onChange={(event) => setCreateSalePrice(event.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-amber-400/40 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                      />
                    </div>
                  )}
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-medium text-amber-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createDiscounted}
                    onChange={(e) => setCreateDiscounted(e.target.checked)}
                    className="w-4 h-4 rounded border-amber-400/50 text-amber-500 focus:ring-amber-400"
                  />
                  <span>ตั้งค่าลดราคา</span>
                  {createDiscounted && Number(createPrice) > Number(createSalePrice) && Number(createPrice) > 0 && (
                    <span className="ml-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-300">
                      ลด {Math.round(((Number(createPrice) - Number(createSalePrice)) / Number(createPrice)) * 100)}%
                    </span>
                  )}
                </label>
                <input type="hidden" name="price" value={createDiscounted ? createSalePrice : createPrice} />
                <input
                  type="hidden"
                  name="original_price"
                  value={createDiscounted && Number(createPrice) > Number(createSalePrice) ? createPrice : ""}
                />
              </div>
            )}
            {!createPremium && (
              <>
                <input type="hidden" name="price" value="0" />
                <input type="hidden" name="original_price" value="" />
              </>
            )}
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-3 rounded-2xl font-bold text-white bg-gradient-to-r from-fuchsia-500 to-purple-500 shadow-lg shadow-fuchsia-500/25 hover:shadow-fuchsia-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
              เพิ่มเทมเพลต
            </button>
          </form>
        )}
      </section>

      {/* Card 2: เทมเพลตที่มีอยู่ (แยกการ์ดอิสระ แสดงตลอดเวลา ไม่ย่อ) */}
      <section className="glass-panel rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h2 className="text-2xl font-bold text-white">เทมเพลตที่มีอยู่</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-slate-300 border border-space-border">
              {searchQuery.trim() ? `${filteredTemplates.length}/${templates.length}` : templates.length} รายการ
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              เผยแพร่ {publishedCount}
            </span>
            {adminOnlyCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-fuchsia-500/15 text-fuchsia-200 border border-fuchsia-400/30">
                เฉพาะแอดมิน {adminOnlyCount}
              </span>
            )}
            {hiddenCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 text-slate-400 border border-white/10">
                ซ่อน {hiddenCount}
              </span>
            )}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ, ประเภท, URL..."
              aria-label="ค้นหาเทมเพลต"
              className="w-full rounded-xl border border-space-border bg-white/5 py-2.5 pl-10 pr-9 text-sm text-white placeholder:text-slate-400 focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/25 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="ล้างคำค้นหา"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        {templates.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p>ยังไม่มีเทมเพลต</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p>ไม่พบเทมเพลตที่ตรงกับ &ldquo;{searchQuery}&rdquo;</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-space-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">ชื่อ</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">ประเภท</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">พรีเมียม</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">URL ตัวอย่าง</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">สถานะ</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredTemplates.map((template) => (
                  <tr key={template.id} className="border-b border-space-border hover:bg-white/5">
                    {editingId === template.id ? (
                      <td colSpan={6}>
                        <form onSubmit={handleUpdate} className="p-4 space-y-4">
                          <input type="hidden" name="id" value={template.id} />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label htmlFor={`edit-title-${template.id}`} className="block text-sm font-medium text-slate-300 mb-2">
                                ชื่อ
                              </label>
                              <input
                                id={`edit-title-${template.id}`}
                                name="title"
                                type="text"
                                defaultValue={template.title}
                                required
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-space-border text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:border-transparent transition-all"
                              />
                            </div>
                            <div>
                              <label htmlFor={`edit-category-${template.id}`} className="block text-sm font-medium text-slate-300 mb-2">
                                ประเภท
                              </label>
                              <select
                                id={`edit-category-${template.id}`}
                                name="category"
                                value={editForm?.category}
                                onChange={(event) => setEditForm((current) => (current ? { ...current, category: event.target.value } : current))}
                                required
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-space-border text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:border-transparent transition-all"
                              >
                                {(ADMIN_CATEGORY_OPTIONS || []).map((option) => (
                                  <option key={option.value} value={option.value} className="bg-[#06030c]">
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="md:col-span-2">
                              <label htmlFor={`edit-preview-${template.id}`} className="block text-sm font-medium text-slate-300 mb-2">
                                URL ตัวอย่าง
                              </label>
                              <input
                                id={`edit-preview-${template.id}`}
                                name="preview_url"
                                type="text"
                                defaultValue={template.preview_url}
                                required
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-space-border text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:border-transparent transition-all"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <TemplateMediaFields
                                idPrefix={`edit-${template.id}`}
                                templateId={template.id}
                                initialVideoUrl={template.preview_video_url}
                                initialLinks={template.demo_video_links}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              id={`edit-premium-${template.id}`}
                              name="is_premium"
                              type="checkbox"
                              checked={editForm?.premium ?? false}
                              onChange={(event) => {
                                const next = event.target.checked;
                                setEditForm((current) =>
                                  current
                                    ? {
                                      ...current,
                                      premium: next,
                                      normalPrice: next ? current.normalPrice : "0",
                                      discounted: next ? current.discounted : false,
                                      salePrice: next ? current.salePrice : "0",
                                    }
                                    : current,
                                );
                              }}
                              className="w-5 h-5 rounded border-space-border text-fuchsia-500 focus:ring-fuchsia-400"
                            />
                            <label htmlFor={`edit-premium-${template.id}`} className="text-sm text-slate-300 flex items-center gap-1">
                              <Crown className="w-4 h-4 text-amber-400" />
                              เทมเพลตพรีเมียม
                            </label>
                          </div>
                          {editForm?.premium && (
                            <div className="space-y-3 rounded-xl border border-amber-400/20 bg-amber-500/5 p-4">
                              <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                  <label htmlFor={`edit-normal-price-${template.id}`} className="block text-sm font-medium text-slate-300 mb-2">
                                    ราคาปกติ (บาท)
                                  </label>
                                  <input
                                    id={`edit-normal-price-${template.id}`}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={editForm.normalPrice}
                                    onChange={(event) =>
                                      setEditForm((current) => (current ? { ...current, normalPrice: event.target.value } : current))
                                    }
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-space-border text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:border-transparent transition-all"
                                  />
                                </div>
                                {editForm.discounted && (
                                  <div>
                                    <label htmlFor={`edit-sale-price-${template.id}`} className="block text-sm font-medium text-amber-300 mb-2">
                                      ราคาลดเหลือ (บาท)
                                    </label>
                                    <input
                                      id={`edit-sale-price-${template.id}`}
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={editForm.salePrice}
                                      onChange={(event) =>
                                        setEditForm((current) => (current ? { ...current, salePrice: event.target.value } : current))
                                      }
                                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-amber-400/40 text-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                                    />
                                  </div>
                                )}
                              </div>
                              <label className="inline-flex items-center gap-2 text-sm font-medium text-amber-200 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editForm.discounted}
                                  onChange={(e) =>
                                    setEditForm((current) =>
                                      current
                                        ? {
                                          ...current,
                                          discounted: e.target.checked,
                                          salePrice: e.target.checked ? current.salePrice || current.normalPrice : current.normalPrice,
                                        }
                                        : current,
                                    )
                                  }
                                  className="w-4 h-4 rounded border-amber-400/50 text-amber-500 focus:ring-amber-400"
                                />
                                <span>ตั้งค่าลดราคา (หากไม่ติ๊กจะใช้ราคาปกติ)</span>
                                {editForm.discounted &&
                                  Number(editForm.normalPrice) > Number(editForm.salePrice) &&
                                  Number(editForm.normalPrice) > 0 && (
                                    <span className="ml-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-300">
                                      ลด{" "}
                                      {Math.round(
                                        ((Number(editForm.normalPrice) - Number(editForm.salePrice)) /
                                          Number(editForm.normalPrice)) *
                                        100,
                                      )}
                                      %
                                    </span>
                                  )}
                              </label>
                              <input
                                type="hidden"
                                name="price"
                                value={editForm.discounted ? editForm.salePrice : editForm.normalPrice}
                              />
                              <input
                                type="hidden"
                                name="original_price"
                                value={
                                  editForm.discounted && Number(editForm.normalPrice) > Number(editForm.salePrice)
                                    ? editForm.normalPrice
                                    : ""
                                }
                              />
                            </div>
                          )}
                          {!editForm?.premium && (
                            <>
                              <input type="hidden" name="price" value="0" />
                              <input type="hidden" name="original_price" value="" />
                            </>
                          )}
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              disabled={isPending}
                              className="px-4 py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-fuchsia-500 to-purple-500 hover:from-fuchsia-600 hover:to-purple-600 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                              บันทึก
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="px-4 py-2 rounded-xl font-semibold text-slate-300 bg-white/5 hover:bg-white/10 border border-space-border transition-all flex items-center gap-2"
                            >
                              <X className="w-4 h-4" />
                              ยกเลิก
                            </button>
                          </div>
                        </form>
                      </td>
                    ) : (
                      <>
                        <td className="py-4 px-4 text-sm text-white font-medium">{template.title}</td>
                        <td className="py-4 px-4 text-sm text-slate-300 capitalize">{template.category}</td>
                        <td className="py-4 px-4">
                          {template.is_premium ? (
                            <div className="inline-flex flex-wrap items-center gap-1.5">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 shadow-sm whitespace-nowrap">
                                <Crown className="w-3 h-3" />
                                พรีเมียม · ฿{Number(template.price ?? 0).toLocaleString("en-US")}
                              </span>
                              {template.original_price && template.original_price > (template.price ?? 0) && (
                                <span className="inline-flex items-center gap-1 text-xs text-slate-400 whitespace-nowrap">
                                  <span className="line-through">฿{Number(template.original_price).toLocaleString("en-US")}</span>
                                  <span className="rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                                    -{Math.round(((template.original_price - (template.price ?? 0)) / template.original_price) * 100)}%
                                  </span>
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-300 border border-space-border">
                              ฟรี
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-400 truncate max-w-xs">{template.preview_url}</td>
                        <td className="py-4 px-4">
                          {(() => {
                            const isPub = publishOverrides[template.id] ?? template.is_published !== false;
                            const showOnAdminDash =
                              adminPreviewOverrides[template.id] ?? template.admin_preview_visible !== false;
                            const mode: "public" | "admin" | "hidden" = isPub
                              ? "public"
                              : showOnAdminDash
                                ? "admin"
                                : "hidden";
                            const busy = isPending || publishingId === template.id;
                            return (
                              <div
                                role="group"
                                aria-label={`สถานะการเผยแพร่ของ ${template.title}`}
                                className={`inline-flex items-center gap-0.5 rounded-xl border border-white/10 bg-white/[0.03] p-0.5 whitespace-nowrap transition-opacity ${busy ? "opacity-60" : ""
                                  }`}
                              >
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => {
                                    if (mode !== "public") {
                                      void patchTemplateVisibility(template, { is_published: true });
                                    }
                                  }}
                                  title="เผยแพร่ให้ผู้ใช้ทุกคนเห็น"
                                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all whitespace-nowrap ${mode === "public"
                                      ? "border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 shadow-sm"
                                      : "border border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200"
                                    }`}
                                >
                                  <Globe className="h-3.5 w-3.5 shrink-0" />
                                  <span>เผยแพร่</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => {
                                    if (mode !== "admin") {
                                      void patchTemplateVisibility(template, {
                                        is_published: false,
                                        admin_preview_visible: true,
                                      });
                                    }
                                  }}
                                  title="ปิดเผยแพร่ — แสดงบนหน้าแดชบอร์ดเฉพาะแอดมิน"
                                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all whitespace-nowrap ${mode === "admin"
                                      ? "border border-fuchsia-400/40 bg-fuchsia-500/25 text-fuchsia-200 shadow-sm"
                                      : "border border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200"
                                    }`}
                                >
                                  <Eye className="h-3.5 w-3.5 shrink-0" />
                                  <span>แอดมิน</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => {
                                    if (mode !== "hidden") {
                                      void patchTemplateVisibility(template, {
                                        is_published: false,
                                        admin_preview_visible: false,
                                      });
                                    }
                                  }}
                                  title="ปิดเผยแพร่ — ซ่อนจากแดชบอร์ดด้วย"
                                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all whitespace-nowrap ${mode === "hidden"
                                      ? "border border-slate-400/35 bg-slate-500/25 text-slate-100 shadow-sm"
                                      : "border border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200"
                                    }`}
                                >
                                  <EyeOff className="h-3.5 w-3.5 shrink-0" />
                                  <span>ซ่อน</span>
                                </button>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(template)}
                              className="p-2.5 rounded-xl text-slate-300 hover:text-fuchsia-400 hover:bg-fuchsia-500/10 transition-all"
                              title="แก้ไข"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleDelete(template.id)}
                              className="p-2.5 rounded-xl text-slate-300 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                              title="ลบ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
