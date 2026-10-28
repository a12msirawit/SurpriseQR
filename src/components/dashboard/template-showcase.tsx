"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Cake, Crown, Heart, LayoutGrid, PartyPopper, Tag, type LucideIcon } from "lucide-react";
import type { Template } from "@/types/database";
import { CATEGORY_META, type CategoryMeta } from "@/constants/template-categories";
import { getTemplateById } from "@/data/templates";
import TemplateCard from "@/components/dashboard/template-card";

interface TemplateShowcaseProps {
  templates: Template[];
}

export default function TemplateShowcase({ templates }: TemplateShowcaseProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryMeta["id"]>("all");
  const [isExpanded, setIsExpanded] = useState(false);
  const templateGridRef = useRef<HTMLDivElement>(null);
  // null = ยังไม่ได้วัด -> ปล่อยความสูงอิสระ (แสดงเต็มที่) ป้องกันกริดพับซ่อนเป็น 0
  const [templateGridHeight, setTemplateGridHeight] = useState<number | null>(null);

  const filteredTemplates = useMemo(() => {
    if (activeCategory === "all") return templates;
    return templates.filter((template) => {
      const isPremium = template.is_premium || (template.price ?? 0) > 0;
      if (activeCategory === "free") return !isPremium;
      if (activeCategory === "premium") return isPremium;
      return template.category === activeCategory;
    });
  }, [activeCategory, templates]);
  const visibleTemplates = isExpanded ? filteredTemplates : filteredTemplates.slice(0, 5);

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
          {filteredTemplates.length > 5 && (
            <button
              type="button"
              aria-expanded={isExpanded}
              onClick={() => setIsExpanded((expanded) => !expanded)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-base font-bold text-slate-200 transition-colors hover:bg-white/20 hover:text-white"
            >
              {isExpanded ? "ซ่อนบางส่วน" : "ดูทั้งหมด"}
              <ArrowRight className={`h-4 w-4 transition-transform ${isExpanded ? "-rotate-90" : ""}`} />
            </button>
          )}
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
          <div ref={templateGridRef} className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {visibleTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                fallbackImage={getTemplateById(template.id).image || "/templates/surprise-qr.svg"}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}