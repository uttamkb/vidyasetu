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
  const videoId = extractYouTubeId(youtubeUrl);
  
  // 1. Try Official YouTube oEmbed
  try {
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (res.ok) {
      const data = await res.json();
      return { thumbnailUrl: data.thumbnail_url, title: data.title };
    }
  } catch (e) {
    console.warn(`[YouTubeMeta] Primary oEmbed failed for ${youtubeUrl}`);
  }

  // 2. Try NoEmbed Proxy (Often more resilient to rate limits/UA blocks)
  try {
    const url = `https://noembed.com/embed?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (!data.error) {
        return { 
          thumbnailUrl: data.thumbnail_url || youTubeThumbnailUrl(videoId || ""), 
          title: data.title || "" 
        };
      }
    }
  } catch (e) {
    console.warn(`[YouTubeMeta] NoEmbed proxy failed for ${youtubeUrl}`);
  }

  // 3. Last Resort: Ping Thumbnail (Verifies video existence)
  if (videoId) {
    try {
      const thumbUrl = youTubeThumbnailUrl(videoId, "hqdefault");
      const res = await fetch(thumbUrl, { method: "HEAD" });
      if (res.ok) {
        console.log(`[YouTubeMeta] Verified existence via thumbnail for ${videoId}`);
        return {
          thumbnailUrl: thumbUrl,
          title: "", // Caller should fallback to their own title
        };
      }
    } catch (e) {
      console.warn(`[YouTubeMeta] Thumbnail ping failed for ${videoId}`);
    }
  }

  return null;
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
