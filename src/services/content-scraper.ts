import Parser from 'rss-parser';
import * as cheerio from 'cheerio';

export interface RawContent {
  title: string;
  description?: string;
  url: string;
  publishedAt?: Date;
  content?: string;
  metadata?: Record<string, unknown>;
  type: 'ARTICLE' | 'VIDEO' | 'PDF' | 'INTERACTIVE';
}

export interface ScraperConfig {
  url: string;
  type: 'RSS' | 'API' | 'WEBSITE' | 'YOUTUBE';
  selectors?: {
    title?: string;
    description?: string;
    content?: string;
    publishedDate?: string;
  };
  headers?: Record<string, string>;
  rateLimit?: number;
  config?: unknown;
}

class ContentScraper {
  private parser: Parser;
  private lastFetchTimes: Map<string, number> = new Map();

  constructor() {
    this.parser = new Parser({
      customFields: {
        item: [
          ['content:encoded', 'content'],
          ['media:content', 'media'],
        ],
      },
    });
  }

  async fetchFromSource(config: ScraperConfig): Promise<RawContent[]> {
    const { url, type } = config;

    // Rate limiting
    const now = Date.now();
    const lastFetch = this.lastFetchTimes.get(url) || 0;
    if (now - lastFetch < (config.rateLimit || 5000)) {
      const waitTime = (config.rateLimit || 5000) - (now - lastFetch);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastFetchTimes.set(url, Date.now());

    try {
      switch (type) {
        case 'RSS':
          return await this.fetchRSS(url);
        case 'YOUTUBE':
          return await this.fetchYouTube(url, config);
        case 'WEBSITE':
          return await this.fetchWebsite(url, config);
        case 'API':
          return await this.fetchAPI(url, config);
        default:
          throw new Error(`Unsupported source type: ${type}`);
      }
    } catch (error) {
      console.error(`Error fetching from ${url}:`, error);
      return [];
    }
  }

  private async fetchRSS(url: string): Promise<RawContent[]> {
    try {
      const feed = await this.parser.parseURL(url);
      
      return feed.items.map(item => ({
        title: item.title || 'Untitled',
        description: item.contentSnippet || item.description || '',
        url: item.link || '',
        publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
        content: item.content || '',
        type: this.detectContentType(item.link || '', item.content || ''),
        metadata: {
          creator: item.creator,
          categories: item.categories || [],
        },
      }));
    } catch (error) {
      console.error(`RSS fetch error for ${url}:`, error);
      return [];
    }
  }

  private async fetchYouTube(channelUrl: string, config: ScraperConfig): Promise<RawContent[]> {
    // Extract channel ID from URL
    const channelId = this.extractYouTubeChannelId(channelUrl);
    if (!channelId) {
      console.error('Invalid YouTube channel URL');
      return [];
    }

    // Use YouTube RSS feed as fallback (no API key required)
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    return await this.fetchRSS(rssUrl);
  }

  private extractYouTubeChannelId(url: string): string | null {
    const patterns = [
      /channel\/(UC[a-zA-Z0-9_-]{22})/,
      /\/c\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/@([a-zA-Z0-9_.]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  private async fetchWebsite(url: string, config: ScraperConfig): Promise<RawContent[]> {
    try {
      const response = await fetch(url, {
        headers: config.headers || {
          'User-Agent': 'VidyaSetu-ContentBot/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const contents: RawContent[] = [];

      // Try to find article links
      const selectors = config.selectors || {
        title: 'h1, h2, h3',
        description: 'meta[name="description"], p',
        content: 'article, .content, main',
      };

      // Extract main content
      const title = $(selectors.title || 'h1').first().text().trim();
      const description = $(selectors.description || 'meta[name="description"]').attr('content') || 
                         $(selectors.description || 'p').first().text().trim();
      const content = $(selectors.content || 'article').html() || '';

      if (title) {
        contents.push({
          title,
          description,
          url,
          publishedAt: new Date(),
          content,
          type: this.detectContentType(url, content),
          metadata: {
            source: url,
            scraped: true,
          },
        });
      }

      return contents;
    } catch (error) {
      console.error(`Website fetch error for ${url}:`, error);
      return [];
    }
  }

  private async fetchAPI(url: string, config: ScraperConfig): Promise<RawContent[]> {
    try {
      const response = await fetch(url, {
        headers: config.headers || {},
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // This is a generic API handler - specific APIs should have their own handlers
      return this.parseAPIResponse(data, url);
    } catch (error) {
      console.error(`API fetch error for ${url}:`, error);
      return [];
    }
  }

  private parseAPIResponse(data: unknown, url: string): RawContent[] {
    // Generic parser - should be customized for specific APIs
    if (Array.isArray(data)) {
      return data.map((item: Record<string, unknown>) => ({
        title: String(item.title || item.name || 'Untitled'),
        description: String(item.description || item.summary || ''),
        url: String(item.url || item.link || item.id || url),
        publishedAt: item.publishedAt ? new Date(String(item.publishedAt)) : undefined,
        content: String(item.content || item.body || ''),
        type: this.detectContentType(String(item.url || url), String(item.content || '')),
        metadata: item,
      }));
    }

    if (typeof data === 'object' && data !== null && 'items' in data && Array.isArray((data as Record<string, unknown>).items)) {
      return ((data as Record<string, unknown>).items as Record<string, unknown>[]).map((item) => ({
        title: String(item.title || item.name || 'Untitled'),
        description: String(item.description || item.summary || ''),
        url: String(item.url || item.link || item.id || url),
        publishedAt: item.publishedAt ? new Date(String(item.publishedAt)) : undefined,
        content: String(item.content || item.body || ''),
        type: this.detectContentType(String(item.url || url), String(item.content || '')),
        metadata: item,
      }));
    }

    return [];
  }

  private detectContentType(url: string, content: string): RawContent['type'] {
    const urlLower = url.toLowerCase();
    const contentLower = content.toLowerCase();

    if (urlLower.includes('youtube') || urlLower.includes('vimeo') || contentLower.includes('<video')) {
      return 'VIDEO';
    }
    if (urlLower.endsWith('.pdf') || contentLower.includes('application/pdf')) {
      return 'PDF';
    }
    if (urlLower.includes('interactive') || contentLower.includes('simulation') || contentLower.includes('quiz')) {
      return 'INTERACTIVE';
    }
    return 'ARTICLE';
  }

  extractMetadata(html: string): Record<string, string | undefined> {
    const $ = cheerio.load(html);
    const metadata: Record<string, string | undefined> = {};

    // Extract Open Graph metadata
    metadata.ogTitle = $('meta[property="og:title"]').attr('content');
    metadata.ogDescription = $('meta[property="og:description"]').attr('content');
    metadata.ogImage = $('meta[property="og:image"]').attr('content');
    metadata.ogType = $('meta[property="og:type"]').attr('content');

    // Extract Twitter Card metadata
    metadata.twitterCard = $('meta[name="twitter:card"]').attr('content');
    metadata.twitterTitle = $('meta[name="twitter:title"]').attr('content');
    metadata.twitterDescription = $('meta[name="twitter:description"]').attr('content');

    // Extract basic metadata
    metadata.title = $('title').text();
    metadata.description = $('meta[name="description"]').attr('content');
    metadata.keywords = $('meta[name="keywords"]').attr('content');
    metadata.author = $('meta[name="author"]').attr('content');
    metadata.language = $('html').attr('lang');

    return metadata;
  }

  async downloadContent(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      console.error(`Error downloading content from ${url}:`, error);
      return '';
    }
  }
}

export const contentScraper = new ContentScraper();