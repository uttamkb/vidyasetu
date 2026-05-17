/**
 * Video Curator Service — Phase 2: AI-Driven Video Curation
 * 
 * Responsibilities:
 * 1. Find live, high-quality YouTube videos for any topic.
 * 2. Screen videos for Grade/Board appropriateness.
 * 3. Generate 'Smart Timestamps' (Key Moments).
 */

import { prisma } from "@/lib/db";
import { callGemini } from "@/lib/gemini";
import { fetchYouTubeMeta } from "@/lib/youtube";

export interface CuratedVideo {
  videoId: string;
  title: string;
  description: string;
  channelName: string;
  relevanceScore: number;
  keyMoments: Array<{ timestamp: string; label: string }>;
}

/**
 * Searches and screens videos for a specific topic.
 */
export async function curateVideosForTopic(
  topicName: string, 
  grade: string, 
  subject: string
): Promise<CuratedVideo[]> {
  console.log(`[VideoCurator] Curating videos for ${topicName} (Grade ${grade} ${subject})...`);

  const prompt = `
You are an expert educational media curator for CBSE students.
Find the top 3 most effective, high-quality YouTube videos for this topic:

TOPIC: ${topicName}
GRADE: ${grade}
SUBJECT: ${subject}
CURRICULUM: NCERT (CBSE) 2024-2025

For each video, provide:
1. The real YouTube Video ID (Verify it is PUBLIC and EDUCATIONAL).
2. A punchy, student-friendly title.
3. A short description of why this video is good for Grade ${grade}.
4. 3 "Key Moments" (Timestamps) that cover critical parts of the topic.
5. A relevance score (1-100) based on curriculum alignment.

Return a JSON object in this EXACT format:
{
  "videos": [
    {
      "videoId": "string",
      "title": "string",
      "description": "string",
      "channelName": "string",
      "relevanceScore": 95,
      "keyMoments": [
        { "timestamp": "0:45", "label": "Definition of Concept" },
        { "timestamp": "5:20", "label": "Solved Example" }
      ]
    }
  ]
}

STRICT GUIDELINES:
- Prioritize channels: Khan Academy India, LearnoHub, Magnet Brains, ExamFear, Dear Sir.
- Ensure the video is specifically for Grade ${grade} students.
- Avoid videos that are too long (>30 mins) or too short (<3 mins).
- DO NOT hallucinate IDs. Only provide IDs that you are confident exist.
`;

  const fallback = { videos: [] };
  
  // Use Pro model for better search/reasoning
  const result = await callGemini<{ videos: CuratedVideo[] }>(
    "PRO",
    prompt,
    fallback
  );

  // Verification Step: Ping the oEmbed/Thumbnail for each result
  const verifiedVideos: CuratedVideo[] = [];
  
  for (const v of result.videos) {
    const meta = await fetchYouTubeMeta(`https://youtube.com/watch?v=${v.videoId}`);
    if (meta) {
      verifiedVideos.push({
        ...v,
        title: meta.title || v.title // Use official title if available
      });
    }
  }

  return verifiedVideos;
}

/**
 * Saves curated videos to the database for a topic.
 */
export async function saveCuratedVideos(topicId: string, videos: CuratedVideo[]) {
  const topic = await prisma.topic.findUniqueOrThrow({
    where: { id: topicId },
    include: { chapter: { include: { subject: true } } }
  });

  const subject = topic.chapter.subject;

  for (const v of videos) {
    const momentsHtml = v.keyMoments.map(m => `* **${m.timestamp}**: ${m.label}`).join("\n");
    const descriptionWithMoments = `${v.description}\n\n**Key Moments:**\n${momentsHtml}`;

    await prisma.studyMaterial.upsert({
      where: { id: `ai-video-${topicId}-${v.videoId}` },
      create: {
        id: `ai-video-${topicId}-${v.videoId}`,
        title: v.title,
        description: descriptionWithMoments,
        type: "VIDEO",
        youtubeUrl: `https://www.youtube.com/watch?v=${v.videoId}`,
        thumbnailUrl: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
        subjectId: subject.id,
        chapterId: topic.chapterId,
        topicId,
        isAIGenerated: true,
        aiGeneratedAt: new Date(),
        isPublished: v.relevanceScore > 70, // Only publish high-quality matches
      },
      update: {
        title: v.title,
        description: descriptionWithMoments,
        aiGeneratedAt: new Date(),
      }
    });
  }
}
