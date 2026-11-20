"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { defaultStorylineModel, type StorylineModel } from "@/types/storyline";

function resolveModel(value: unknown): StorylineModel {
  if (!value || typeof value !== "object") return defaultStorylineModel;
  const config = value as Record<string, unknown>;
  const nested = config.storylineModel;
  const candidate = nested && typeof nested === "object" ? nested as Record<string, unknown> : config;
  if (candidate.meta && candidate.recipient && Array.isArray(candidate.storyScenes) && candidate.finale) {
    return candidate as unknown as StorylineModel;
  }

  const photos = Array.isArray(candidate.photos) ? candidate.photos as Array<{ src?: string }> : [];
  const firstPhoto = photos.find((photo) => typeof photo.src === "string")?.src;
  const message = typeof candidate.message === "string" ? candidate.message : "";
  const letter = message.split(/\n\n+/).filter(Boolean);
  const name = typeof candidate.recipientName === "string" ? candidate.recipientName : "";
  const wish = typeof candidate.wishMessage === "string" ? candidate.wishMessage : "";

  return {
    ...defaultStorylineModel,
    meta: { ...defaultStorylineModel.meta, title: typeof candidate.title === "string" ? candidate.title : defaultStorylineModel.meta.title },
    recipient: {
      ...defaultStorylineModel.recipient,
      name: name || defaultStorylineModel.recipient.name,
      coverMessage: wish || defaultStorylineModel.recipient.coverMessage,
      passcode: typeof candidate.expectedPin === "string" ? candidate.expectedPin : defaultStorylineModel.recipient.passcode,
    },
    storyScenes: [
      { ...defaultStorylineModel.storyScenes[0], mediaUrl: firstPhoto ?? defaultStorylineModel.storyScenes[0].mediaUrl },
      defaultStorylineModel.storyScenes[1],
      { ...defaultStorylineModel.storyScenes[2], bodyParagraphs: letter.length ? letter : defaultStorylineModel.storyScenes[2].bodyParagraphs },
    ],
    finale: { ...defaultStorylineModel.finale, secretMessage: wish || defaultStorylineModel.finale.secretMessage },
  };
}

export default function StorylineTemplate({
  config,
  studio = false,
  activeScreen,
  onSelectField,
}: {
  config: unknown;
  isEditing?: boolean;
  studio?: boolean;
  activeScreen?: number;
  refreshToken?: number;
  expectedPin?: string;
  hashId?: string;
  onSelectField?: (tabIndex: number, fieldId?: string) => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const model = useMemo(() => resolveModel(config), [config]);
  const studioSelect = Boolean(studio && onSelectField);
  const sendModel = useCallback(() => {
    frame.current?.contentWindow?.postMessage(
      {
        type: "surpriseqr-storyline-config",
        config: model,
        studioSelect,
        sceneIndex: studio && typeof activeScreen === "number" ? activeScreen : undefined,
      },
      window.location.origin,
    );
  }, [model, studioSelect, studio, activeScreen]);

  useEffect(() => {
    sendModel();
  }, [sendModel]);

  useEffect(() => {
    if (!studio || typeof activeScreen !== "number") return;
    frame.current?.contentWindow?.postMessage(
      { type: "surpriseqr-storyline-scene", sceneIndex: activeScreen },
      window.location.origin,
    );
  }, [studio, activeScreen]);

  useEffect(() => {
    if (!onSelectField) return;
    const onMessage = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== frame.current?.contentWindow ||
        event.data?.type !== "surpriseqr-storyline-select"
      ) {
        return;
      }
      onSelectField(
        typeof event.data.tabIndex === "number" ? event.data.tabIndex : 1,
        typeof event.data.fieldId === "string" ? event.data.fieldId : undefined,
      );
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onSelectField]);

  useEffect(() => {
    if (!studio) return;
    const onPreviewFocus = (event: Event) => {
      const custom = event as CustomEvent<{ fieldId?: string | null; label?: string }>;
      frame.current?.contentWindow?.postMessage(
        {
          type: "surpriseqr-storyline-focus",
          fieldId: custom.detail?.fieldId ?? null,
          label: custom.detail?.label ?? "",
        },
        window.location.origin,
      );
    };
    window.addEventListener("sq-preview-focus", onPreviewFocus);
    return () => window.removeEventListener("sq-preview-focus", onPreviewFocus);
  }, [studio]);

  return (
    <iframe
      ref={frame}
      src="/templates/storyline.html"
      title="Storyline card"
      onLoad={sendModel}
      className={`block h-screen w-full overflow-hidden border-0 bg-transparent ${studio ? "rounded-3xl" : "rounded-none"}`}
      style={{ height: studio ? "78dvh" : "100dvh" }}
      allow="autoplay; fullscreen"
    />
  );
}
