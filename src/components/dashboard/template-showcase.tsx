"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Cake, Crown, Heart, LayoutGrid, PartyPopper, Search, Tag, X, type LucideIcon } from "lucide-react";
import type { Template } from "@/types/database";
import { CATEGORY_META, type CategoryMeta } from "@/constants/template-categories";
import { getTemplateById } from "@/data/templates";
import TemplateCard from "@/components/dashboard/template-card";

interface TemplateShowcaseProps {
  templates: Template[];
}

export default function TemplateShowcase({ templates }: TemplateShowcaseProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryMeta["id"]>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const templateGridRef = useRef<HTMLDivElement>(null);
  // null = ยังไม่ได้วัด -> ปล่อยความสูงอิสระ (แสดงเต็มที่) ป้องกันกริดพับซ่อนเป็น 0
  const [templateGridHeight, setTemplateGridHeight] = useState<number | null>(null);

  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return templates.filter((template) => {
      if (activeCategory !== "all") {
        const isPremium = template.is_premium || (template.price ?? 0) > 0;
        if (activeCategory === "free" && isPremium) return false;
        if (activeCategory === "premium" && !isPremium) return false;
        if (activeCategory !== "free" && activeCategory !== "premium" && template.category !== activeCategory) {
          return false;
        }
      }
      if (!q) return true;
      return (
        (template.title ?? "").toLowerCase().includes(q) ||
        (template.category ?? "").toLowerCase().includes(q)
      );
    });
  }, [activeCategory, searchQuery, templates]);
  const visibleTemplates = isExpanded || searchQuery.trim() ? filteredTemplates : filteredTemplates.slice(0, 5);

  useLayoutEffect(() => {
    const element = templateGridRef.current;
    if (!element) return;
    const updateHeight = () => setTemplateGridHeight(element.scrollHeight);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => observer.disconnect();
  }, [isExpanded, filteredTemplates.length]);

  return (
    <>
      <section id="template-section" className="glass-panel scroll-mt-24 rounded-3xl border-space-border p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
          <div>
            <p className="mb-2 text-base font-bold text-slate-300">เทมเพลตยอดนิยม</p>
            <h2 className="text-2xl font-extrabold text-white">เลือกเทมเพลตสร้างการ์ดเซอร์ไพรส์</h2>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาเทมเพลต..."
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

        <div className="mb-6 flex flex-nowrap gap-2 overflow-x-auto pb-2 no-scrollbar md:flex-wrap md:overflow-visible md:pb-0">
          {CATEGORY_META.map((category) => {
            const iconMap: Record<CategoryMeta["id"], LucideIcon> = {
              all: LayoutGrid,
              birthday: Cake,
              love: Heart,
              thanks: PartyPopper,
              sorry: Heart,
              event: PartyPopper,
              free: Tag,
              premium: Crown,
            };
            const CategoryIcon = iconMap[category.id];
            return (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveCategory(category.id)}
              className={`inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-base font-bold transition-all ${
                activeCategory === category.id
                  ? "btn-gradient text-white shadow-sm"
                  : category.id === "free"
                    ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                    : category.id === "premium"
                      ? "border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                      : "border border-space-border bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              <CategoryIcon className="h-4 w-4" />
              {category.label}
            </button>
            );
          })}
        </div>

        <div
          className="overflow-hidden transition-[max-height] duration-500"
          style={{ maxHeight: templateGridHeight == null ? undefined : `${templateGridHeight}px` }}
        >
          <div ref={templateGridRef} className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {visibleTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                fallbackImage={(getTemplateById(template.id)?.image) || "/templates/surprise-qr.svg"}
              />
            ))}
          </div>
        </div>

        {filteredTemplates.length > 5 && (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              aria-expanded={isExpanded}
              onClick={() => setIsExpanded((expanded) => !expanded)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-white/10 px-6 py-2.5 text-base font-bold text-slate-200 transition-colors hover:bg-white/20 hover:text-white"
            >
              {isExpanded ? "ซ่อนบางส่วน" : "ดูทั้งหมด"}
              <ArrowRight className={`h-4 w-4 transition-transform ${isExpanded ? "-rotate-90" : ""}`} />
            </button>
          </div>
        )}
      </section>
    </>
  );
}