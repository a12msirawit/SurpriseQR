"use client";

import dynamic from "next/dynamic";
import TemplateNotFoundFallback from "@/components/cards/templates/TemplateNotFoundFallback";
import type { TemplateSlug } from "@/data/templates";
import { getTemplateSlugById, matchTemplateSlugByTitle } from "@/data/templates";

const AnniversaryTemplate = dynamic(() => import("@/components/cards/templates/AnniversaryTemplate"), { ssr: false });
const BlowCandlesTemplate = dynamic(
  () => import("@/components/cards/templates/BlowCandlesTemplate"),
  { ssr: false },
);
const StorylineTemplate = dynamic(
  () => import("@/components/cards/templates/StorylineTemplate"),
  { ssr: false },
);

export type TemplatePreviewComponent = React.ComponentType<{
  config: unknown;
  isEditing?: boolean;
  /** Studio live-preview: no pencil FAB / admin drawer inside the preview. */
  studio?: boolean;
  /** 1-based template screen to display (synced with the editor steps). */
  activeScreen?: number;
  /** Bump to force a fresh preview update ("อัพเดตพรีวิว" fallback). */
  refreshToken?: number;
  /** PIN code required to view the card (non-anniversary templates only). */
  expectedPin?: string;
  /** Public card hash used by template-level reactions. */
  hashId?: string;
  /** Whether this template should render its own server-verified PIN scene. */
  pinRequired?: boolean;
}>;

const COMPONENT_BY_SLUG: Partial<Record<TemplateSlug, TemplatePreviewComponent>> = {
  "anniversary-surprise": AnniversaryTemplate as TemplatePreviewComponent,
  candles: BlowCandlesTemplate as TemplatePreviewComponent,
  storyline: StorylineTemplate as TemplatePreviewComponent,
};

/**
 * Resolve the render component for a template identifier.
 *
 * Accepts a canonical slug, a production DB id, a legacy id/slug, a template
 * title, or an { id, title } pair. Returns null when the identifier cannot be
 * resolved to a known slug or no component is registered for it — callers must
 * handle the missing-component case explicitly instead of silently falling back
 * to Anniversary Surprise.
 */
export function getTemplateComponent(
  templateOrIdentifier: { title?: string; id?: string } | string,
): TemplatePreviewComponent | null {
  const id = typeof templateOrIdentifier === "string" ? templateOrIdentifier : templateOrIdentifier.id;
  const title = typeof templateOrIdentifier === "string" ? undefined : templateOrIdentifier.title;
  const slug = getTemplateSlugById(id) ?? matchTemplateSlugByTitle(title);
  if (!slug) return null;
  const component = COMPONENT_BY_SLUG[slug];
  if (!component) return null;
  return component;
}

/**
 * Resolve the render component for a template identifier with a guaranteed
 * non-null fallback. Use only where a fallback is acceptable (e.g. legacy code
 * paths that cannot render an error state). Prefer getTemplateComponent() and
 * handle null explicitly.
 */
export function getTemplateComponentOrFallback(
  templateOrIdentifier: { title?: string; id?: string } | string,
): TemplatePreviewComponent {
  return (
    getTemplateComponent(templateOrIdentifier) ?? TemplateNotFoundFallback
  );
}

export { TemplateNotFoundFallback };
