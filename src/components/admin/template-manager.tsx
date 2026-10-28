"use client";

import { useState, useTransition } from "react";
import { Plus, Edit3, Trash2, Crown, AlertCircle, X } from "lucide-react";
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
  const [templates, setTemplates] = useState(initialTemplates);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // Local publish-status overrides so the toggle updates instantly without
  // waiting for a server revalidation of the parent route.
  const [publishOverrides, setPublishOverrides] = useState<Record<string, boolean>>({});
  const [publishingId, setPublishingId] = useState<string | null>(null);

  // Controlled state for the "เพิ่มเทมเพลต" (create) form so the price field
  // can be shown/hidden based on the premium toggle. Publish status is handled
  // by the status toggle badge, so is_published is not part of the form.
  const [createPremium, setCreatePremium] = useState(false);
  const [createPrice, setCreatePrice] = useState("0");
  // Remounts the create-form media fields (clearing the uploaded video/links) after a successful create.
  const [createMediaKey, setCreateMediaKey] = useState(0);

  // Controlled premium/price/category state for the inline edit form.
  const [editForm, setEditForm] = useState<{ premium: boolean; price: string; category: string } | null>(null);

  function startEdit(template: Template) {
    setEditingId(template.id);
    setError(null);
    setEditForm({
      premium: template.is_premium,
      price: String(template.price ?? (template.is_premium ? 19 : 0)),
      category: normalizeAdminCategory(template.category),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  async function handleTogglePublish(template: Template) {
    setError(null);
    setPublishingId(template.id);
    try {
      const response = await fetch(`/api/admin/templates/${template.id}`, { method: "PATCH" });
      const result = (await response.json()) as { is_published?: boolean; error?: string };
      if (!response.ok) {
        setError(result.error ?? "ไม่สามารถเปลี่ยนสถานะเทมเพลตได้");
        return;
      }
      setPublishOverrides((current) => ({ ...current, [template.id]: !!result.is_published }));
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
      form.reset();
      setCreatePremium(false);
      setCreatePrice("0");
      setCreateMediaKey((key) => key + 1);
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
        setEditingId(null);
        setEditForm(null);
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
          setTemplates((current) => [...current, targetTemplate]);
          const message = result.error ?? "ไม่สามารถลบเทมเพลตได้ กรุณาลองใหม่อีกครั้ง";
          setError(message);
          window.alert(`ไม่สามารถลบ${targetTemplate.title}ได้: ${message}`);
        }
      } catch {
        setTemplates((current) => [...current, targetTemplate]);
        setError("ไม่สามารถลบเทมเพลตได้ กรุณาลองใหม่อีกครั้ง");
        window.alert("ไม่สามารถลบเทมเพลตได้ กรุณาลองใหม่อีกครั้ง");
      }
    });
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/30 p-3 rounded-xl">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <section className="glass-panel rounded-2xl p-6 space-y-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Plus className="w-5 h-5 text-fuchsia-400" />
          เพิ่มเทมเพลต
        </h3>
        <form onSubmit={handleCreate} className="space-y-4">
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
                if (!next) setCreatePrice("0");
              }}
              className="w-5 h-5 rounded border-space-border text-fuchsia-500 focus:ring-fuchsia-400"
            />
            <label htmlFor="new-premium" className="text-sm text-slate-300 flex items-center gap-1">
              <Crown className="w-4 h-4 text-amber-400" />
              เทมเพลตพรีเมียม
            </label>
          </div>
          {createPremium && (
            <div>
              <label htmlFor="new-price" className="block text-sm font-medium text-slate-300 mb-2">
                ราคา (บาท)
              </label>
              <input
                id="new-price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={createPrice}
                onChange={(event) => setCreatePrice(event.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-space-border text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:border-transparent transition-all"
              />
            </div>
          )}
          {!createPremium && <input type="hidden" name="price" value="0" />}
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-3 rounded-2xl font-bold text-white bg-gradient-to-r from-fuchsia-500 to-purple-500 shadow-lg shadow-fuchsia-500/25 hover:shadow-fuchsia-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
            เพิ่มเทมเพลต
          </button>
        </form>
      </section>

      <section>
        <h3 className="text-xl font-bold text-white mb-4">เทมเพลตที่มีอยู่</h3>
        {templates.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p>ยังไม่มีเทมเพลต</p>
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
                {templates.map((template) => (
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
                                setEditForm((current) => (current ? { ...current, premium: next, price: next ? current.price : "0" } : current));
                              }}
                              className="w-5 h-5 rounded border-space-border text-fuchsia-500 focus:ring-fuchsia-400"
                            />
                            <label htmlFor={`edit-premium-${template.id}`} className="text-sm text-slate-300 flex items-center gap-1">
                              <Crown className="w-4 h-4 text-amber-400" />
                              เทมเพลตพรีเมียม
                            </label>
                          </div>
                          {editForm?.premium && (
                            <div>
                              <label htmlFor={`edit-price-${template.id}`} className="block text-sm font-medium text-slate-300 mb-2">
                                ราคา (บาท)
                              </label>
                              <input
                                id={`edit-price-${template.id}`}
                                name="price"
                                type="number"
                                min="0"
                                step="0.01"
                                value={editForm.price}
                                onChange={(event) => setEditForm((current) => (current ? { ...current, price: event.target.value } : current))}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-space-border text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:border-transparent transition-all"
                              />
                            </div>
                          )}
                          {!editForm?.premium && <input type="hidden" name="price" value="0" />}
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
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 shadow-sm">
                              <Crown className="w-3 h-3" />
                              พรีเมียม
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-300 border border-space-border">
                              ฟรี
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-400 truncate max-w-xs">{template.preview_url}</td>
                        <td className="py-4 px-4">
                          <button
                            type="button"
                            disabled={isPending || publishingId === template.id}
                            onClick={() => handleTogglePublish(template)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all disabled:opacity-50 ${
                              publishOverrides[template.id] ?? template.is_published
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                                : "bg-white/5 text-slate-400 border border-space-border hover:bg-white/10"
                            }`}
                            title="คลิกเพื่อสลับสถานะ"
                          >
                            {(publishOverrides[template.id] ?? template.is_published) ? "เผยแพร่แล้ว" : "ซ่อนอยู่"}
                          </button>
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
