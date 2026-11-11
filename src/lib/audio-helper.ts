/**
 * Utility helper functions for handling audio and YouTube audio playback
 * across all SurpriseQR templates.
 */

/**
 * Extracts a YouTube Video ID (11 characters) from various YouTube URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

/**
 * Checks if a given URL is a valid YouTube video URL.
 */
export function isYouTubeUrl(url: string): boolean {
  return Boolean(extractYouTubeId(url));
}

/**
 * Builds a standardized YouTube embed URL for background audio playback.
 */
export function buildYouTubeAudioEmbedUrl(
  videoId: string,
  options: {
    autoplay?: boolean;
    loop?: boolean;
    enableJsApi?: boolean;
  } = {},
): string {
  const { autoplay = true, loop = true, enableJsApi = true } = options;
  const params = new URLSearchParams({
    autoplay: autoplay ? "1" : "0",
    loop: loop ? "1" : "0",
    playlist: videoId, // Required for loop=1 to work in YouTube embed
    controls: "0",
    disablekb: "1",
    fs: "0",
    modestbranding: "1",
    rel: "0",
    playsinline: "1",
    origin: typeof window !== "undefined" ? window.location.origin : "",
  });

  if (enableJsApi) {
    params.set("enablejsapi", "1");
  }

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

