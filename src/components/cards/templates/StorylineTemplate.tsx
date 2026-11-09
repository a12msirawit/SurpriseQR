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

export default function StorylineTemplate({ config, studio = false }: {
  config: unknown;
  isEditing?: boolean;
  studio?: boolean;
  activeScreen?: number;
  refreshToken?: number;
  expectedPin?: string;
  hashId?: string;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const model = useMemo(() => resolveModel(config), [config]);
  const sendModel = useCallback(() => {
    frame.current?.contentWindow?.postMessage(
      { type: "surpriseqr-storyline-config", config: model },
      window.location.origin,
    );
  }, [model]);

  useEffect(() => {
    sendModel();
  }, [sendModel]);

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
