/**
 * YouTube oEmbed utility
 *
 * Fetches the thumbnail URL and video title for any YouTube video link.
 * Uses the public oEmbed endpoint — no API key required.
 *
 * @param youtubeUrl - Full YouTube URL (youtube.com/watch?v=xxx or youtu.be/xxx)
 * @returns { thumbnailUrl, title } or null on error
 */
export async function fetchYouTubeMeta(youtubeUrl: string): Promise<{
  thumbnailUrl: string;
  title: string;
} | null> {
  try {
    const url = new URL(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`
    );
    const res = await fetch(url.toString(), {
      next: { revalidate: 86400 }, // cache for 24h in Next.js
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      thumbnail_url: string;
      title: string;
    };

    return {
      thumbnailUrl: data.thumbnail_url,
      title: data.title,
    };
  } catch {
    return null;
  }
}

/**
 * Extract YouTube video ID from any YouTube URL format.
 */
export function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1);
    }
    if (parsed.hostname.includes("youtube.com")) {
      return parsed.searchParams.get("v");
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get a high-quality YouTube thumbnail URL directly from the video ID.
 * Faster than oEmbed — no network call needed if we already have the video ID.
 * Falls back to mqdefault if maxresdefault isn't available.
 */
export function youTubeThumbnailUrl(
  videoId: string,
  quality: "maxresdefault" | "hqdefault" | "mqdefault" = "hqdefault"
): string {
  return `https://i.ytimg.com/vi/${videoId}/${quality}.jpg`;
}
