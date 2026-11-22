const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Mengekstrak 11 karakter YouTube Video ID dari berbagai format URL:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube-nocookie.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 */
export function extractYouTubeVideoId(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  const normalizedInput = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(normalizedInput);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const segments = parsed.pathname.split("/").filter(Boolean);

  let candidate: string | null = null;

  if (host === "youtu.be") {
    candidate = segments[0] ?? null;
  } else if (
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com" ||
    host === "youtube-nocookie.com"
  ) {
    if (segments[0] === "watch") {
      candidate = parsed.searchParams.get("v");
    } else if (
      segments[0] === "embed" ||
      segments[0] === "shorts" ||
      segments[0] === "live" ||
      segments[0] === "v"
    ) {
      candidate = segments[1] ?? null;
    }
  }

  if (!candidate || !YOUTUBE_ID_PATTERN.test(candidate)) {
    return null;
  }

  return candidate;
}

/**
 * Mengonversi tautan YouTube mentah (watch, youtu.be, shorts, embed)
 * menjadi URL iframe embed YouTube yang valid.
 */
export function toYouTubeEmbedUrl(rawUrl: string | null | undefined): string | null {
  const videoId = extractYouTubeVideoId(rawUrl);
  if (!videoId) return null;
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
}
