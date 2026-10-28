"use client";

import { useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { Edit3, Plus, Search, X } from "lucide-react";
import { createTemplate, updateTemplate } from "@/app/admin/actions";
import { ADMIN_CATEGORY_OPTIONS, normalizeAdminCategory } from "@/constants/template-categories";
import type { Template, TemplateDemoLinks } from "@/types/database";
import TemplateMediaFields from "@/components/admin/template-media-fields";

interface AdminTemplateTableProps {
  templates: Template[];
}

type FormValues = {
  id?: string;
  title: string;
  preview_url: string;
  preview_video_url: string;
  demo_video_links: TemplateDemoLinks | null;
  price: string;
  is_premium: boolean;
  category: Template["category"];
};

const emptyForm: FormValues = {
  title: "",
  preview_url: "",
  preview_video_url: "",
  demo_video_links: null,
  price: "0",
  is_premium: false,
  category: "birthday",
};

export default function AdminTemplateTable({ templates: initialTemplates }: AdminTemplateTableProps) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [form, setForm] = useState<FormValues | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const previousPriceRef = useRef<string>("0");

  const filteredTemplates = useMemo(() => templates.filter((template) => {
    const text = template.title.toLowerCase();
    return (category === "all" || template.category === category) && text.includes(query.toLowerCase());
  }), [category, query, templates]);

  function openEdit(template: Template) {
    setError(null);
    const price = String(template.price ?? 0);
    previousPriceRef.current = price;
    setForm({
      id: template.id,
      title: template.title,
      preview_url: template.preview_url,
      preview_video_url: template.preview_video_url ?? "",
      demo_video_links: template.demo_video_links ?? null,
      price: price,
      is_premium: template.is_premium,
      category: normalizeAdminCategory(template.category) as Template["category"],
    });
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    setError(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        const result = form.id ? await updateTemplate(formData) : await createTemplate(formData);
        if (result.error) {
          setError(result.error);
          return;
        }
        setForm(null);
        window.location.reload();
      } catch {
        setError("ไม่สามารถบันทึกเทมเพลตได้ กรุณาลองใหม่อีกครั้ง");
      }
    });
  }

  function togglePublished(template: Template) {
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/admin/templates/${template.id}`, { method: "PATCH" });
      const result = await response.json() as { is_published?: boolean; error?: string };
      if (!response.ok) {
        setError(result.error ?? "ไม่สามารถเปลี่ยนสถานะเทมเพลตได้");
        return;
      }
      setTemplates((current) => current.map((item) => item.id === template.id ? { ...item, is_published: result.is_published } : item));
    });
  }

  return (
    <div className="space-y-5">
      {error && <p className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm font-medium text-red-400">{error}</p>}
      <div className="flex flex-col gap-3 md:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาชื่อเทมเพลต" className="w-full rounded-xl border border-space-border bg-white/5 px-10 py-3 text-white outline-none focus:ring-2 focus:ring-fuchsia-400" />
        </label>
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-space-border bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-fuchsia-400">
          <option value="all" className="bg-[#06030c]">ทุกหมวดหมู่</option>
          {(ADMIN_CATEGORY_OPTIONS || []).map((option) => <option key={option.value} value={option.value} className="bg-[#06030c]">{option.label}</option>)}
        </select>
        <button type="button" onClick={() => { setError(null); setForm(emptyForm); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-500 px-5 py-3 font-bold text-white hover:from-fuchsia-600 hover:to-purple-600 transition-all">
          <Plus className="h-5 w-5" />เพิ่มเทมเพลต
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-space-border">
        <table className="w-full min-w-[900px] bg-white/5 text-left">
          <thead className="bg-white/5 text-xs font-bold uppercase text-slate-400"><tr><th className="p-4">ชื่อ</th><th className="p-4">หมวดหมู่</th><th className="p-4">ราคา</th><th className="p-4">เผยแพร่</th><th className="p-4 text-right">จัดการ</th></tr></thead>
          <tbody>
            {filteredTemplates.map((template) => <tr key={template.id} className="border-t border-space-border text-sm text-slate-300 hover:bg-white/5">
              <td className="p-4"><strong className="block text-white">{template.title}</strong></td>
              <td className="p-4 capitalize text-slate-400">{template.category}</td>
              <td className="p-4 text-slate-300">฿{Number(template.price ?? 0).toFixed(2)}</td>
              <td className="p-4"><button type="button" onClick={() => togglePublished(template)} disabled={isPending} className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${template.is_published ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/10 text-slate-400 border border-space-border"}`}>{template.is_published ? "เปิดแสดงผล" : "ปิดแสดงผล"}</button></td>
              <td className="p-4 text-right"><button type="button" onClick={() => openEdit(template)} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 font-semibold text-fuchsia-400 hover:bg-fuchsia-500/10 transition-all"><Edit3 className="h-4 w-4" />แก้ไข</button></td>
            </tr>)}
          </tbody>
        </table>
        {filteredTemplates.length === 0 && <p className="bg-white/5 py-10 text-center text-slate-400">ไม่พบเทมเพลต</p>}
      </div>

      {form && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
        <form onSubmit={submitForm} className="w-full max-w-2xl space-y-4 glass-panel rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between"><h3 className="text-xl font-bold text-white">{form.id ? "แก้ไขเทมเพลต" : "เพิ่มเทมเพลตใหม่"}</h3><button type="button" onClick={() => setForm(null)} aria-label="ปิด" className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-all"><X className="h-5 w-5" /></button></div>
          <input type="hidden" name="id" value={form.id ?? ""} />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-300 sm:col-span-2">ชื่อเทมเพลต<input name="title" required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-1 w-full rounded-lg border border-space-border bg-white/5 p-3 font-normal text-white focus:ring-2 focus:ring-fuchsia-400 focus:border-transparent outline-none" /></label>
            <label className="text-sm font-semibold text-slate-300 sm:col-span-2">Preview URL<input name="preview_url" required value={form.preview_url} onChange={(event) => setForm({ ...form, preview_url: event.target.value })} className="mt-1 w-full rounded-lg border border-space-border bg-white/5 p-3 font-normal text-white focus:ring-2 focus:ring-fuchsia-400 focus:border-transparent outline-none" /></label>
            <div className="sm:col-span-2">
              <TemplateMediaFields
                idPrefix={form.id ?? "new"}
                templateId={form.id}
                initialVideoUrl={form.preview_video_url}
                initialLinks={form.demo_video_links}
              />
            </div>
             <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 sm:col-span-2"><input name="is_premium" type="checkbox" checked={form.is_premium} onChange={(event) => {
               const checked = event.target.checked;
               if (checked) {
                 // Restore previous price when checking
                 setForm({ ...form, is_premium: true, price: previousPriceRef.current });
               } else {
                 // Save current price before setting to "0"
                 previousPriceRef.current = form.price;
                 setForm({ ...form, is_premium: false, price: "0" });
               }
             }} className="rounded border-space-border" />เทมเพลตพรีเมียม</label>
            {form.is_premium && <label className="text-sm font-semibold text-slate-300">ราคา (บาท)<input name="price" type="number" min="0" step="0.01" required value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className="mt-1 w-full rounded-lg border border-space-border bg-white/5 p-3 font-normal text-white focus:ring-2 focus:ring-fuchsia-400 focus:border-transparent outline-none" /></label>}
            {!form.is_premium && <input type="hidden" name="price" value="0" />}
            <label className="text-sm font-semibold text-slate-300 sm:col-span-2">หมวดหมู่<select name="category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as Template["category"] })} className="mt-1 w-full rounded-lg border border-space-border bg-white/5 p-3 font-normal text-white focus:ring-2 focus:ring-fuchsia-400 focus:border-transparent outline-none">{(ADMIN_CATEGORY_OPTIONS || []).map((option) => <option key={option.value} value={option.value} className="bg-[#06030c]">{option.label}</option>)}</select></label>
          </div>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setForm(null)} className="rounded-lg border border-space-border px-4 py-2 font-semibold text-slate-300 hover:bg-white/10 transition-all">ยกเลิก</button><button type="submit" disabled={isPending} className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-purple-500 px-5 py-2 font-bold text-white disabled:opacity-50 hover:from-fuchsia-600 hover:to-purple-600 transition-all">บันทึก</button></div>
        </form>
      </div>}
    </div>
  );
}
