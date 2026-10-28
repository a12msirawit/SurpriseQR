"use client";

import dynamic from "next/dynamic";
import type { TemplateSlug } from "@/data/templates";
import { getTemplateSlugById } from "@/data/templates";

const SurpriseQR = dynamic(() => import("@/components/cards/SurpriseQR"), { ssr: false });

export type TemplatePreviewComponent = React.ComponentType<{
  config: unknown;
  isEditing?: boolean;
  /** Studio live-preview: no pencil FAB / admin drawer inside the preview. */
  studio?: boolean;
  /** 1-based template screen to display (synced with the editor steps). */
  activeScreen?: number;
  /** Bump to force a fresh preview update ("อัพเดตพรีวิว" fallback). */
  refreshToken?: number;
}>;

const COMPONENT_BY_SLUG: Record<TemplateSlug, TemplatePreviewComponent> = {
  "anniversary-surprise": SurpriseQR as TemplatePreviewComponent,
};

/**
 * Resolve the render component for a template identifier.
 *
 * Accepts a canonical slug, a production DB id, a legacy id/slug, a template
 * title, or an { id, title } pair. Falls back to the Anniversary Surprise
 * component when the identifier cannot be resolved to a known slug.
 */
export function getTemplateComponent(
  templateOrIdentifier: { title?: string; id?: string } | string,
): TemplatePreviewComponent {
  const id =
    typeof templateOrIdentifier === "string"
      ? templateOrIdentifier
      : templateOrIdentifier.id;
  const slug = getTemplateSlugById(id);
  return COMPONENT_BY_SLUG[slug ?? "anniversary-surprise"] ?? COMPONENT_BY_SLUG["anniversary-surprise"];
}
