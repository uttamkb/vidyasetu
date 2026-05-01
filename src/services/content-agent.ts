import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { contentScraper, RawContent } from './content-scraper';
import { relevanceEngine, ClassificationResult } from './relevance-engine';
import { contentValidator } from './content-validator';

export interface AgentConfig {
  enabled: boolean;
  interval: number; // milliseconds between runs
  maxConcurrentScrapers: number;
  autoApproveThreshold: number;
  minRelevanceScore: number;
}

export interface AgentRunResult {
  runId: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  itemsFound: number;
  itemsApproved: number;
  itemsRejected: number;
  errors: string[];
  startedAt: Date;
  completedAt?: Date;
}

export interface SourceStats {
  sourceId: string;
  sourceName: string;
  itemsFound: number;
  itemsApproved: number;
  itemsRejected: number;
  avgRelevanceScore: number;
}

class ContentAgent {
  private config: AgentConfig;
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private currentRunId: string | null = null;

  constructor(config?: Partial<AgentConfig>) {
    this.config = {
      enabled: process.env.CONTENT_AGENT_ENABLED !== 'false',
      interval: parseInt(process.env.CONTENT_AGENT_INTERVAL || '3600000'), // 1 hour default
      maxConcurrentScrapers: parseInt(process.env.MAX_CONCURRENT_SCRAPERS || '5'),
      autoApproveThreshold: parseFloat(process.env.AUTO_APPROVE_THRESHOLD || '0.8'),
      minRelevanceScore: parseFloat(process.env.MIN_RELEVANCE_SCORE || '0.3'),
      ...config,
    };
  }

  async start(): Promise<void> {
    if (!this.config.enabled) {
      console.log('Content Agent is disabled');
      return;
    }

    if (this.isRunning) {
      console.log('Content Agent is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting Content Agent...');

    // Run initial cycle immediately
    await this.runCycle();

    // Schedule regular runs
    this.intervalId = setInterval(async () => {
      if (!this.isRunning) {
        this.stop();
        return;
      }
      await this.runCycle();
    }, this.config.interval);

    console.log(`Content Agent started with interval: ${this.config.interval}ms`);
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('Content Agent stopped');
  }

  async runCycle(): Promise<AgentRunResult> {
    const runId = await this.createAgentRun();
    this.currentRunId = runId;

    const result: AgentRunResult = {
      runId,
      status: 'RUNNING',
      itemsFound: 0,
      itemsApproved: 0,
      itemsRejected: 0,
      errors: [],
      startedAt: new Date(),
    };

    try {
      console.log(`Starting content aggregation cycle (Run ID: ${runId})`);

      // Get active sources
      const sources = await this.getActiveSources();
      console.log(`Found ${sources.length} active sources`);

      // Process each source
      for (const source of sources) {
        if (!this.isRunning) {
          result.status = 'COMPLETED';
          result.completedAt = new Date();
          await this.completeAgentRun(runId, result);
          return result;
        }

        try {
          const sourceStats = await this.processSource(source);
          result.itemsFound += sourceStats.itemsFound;
          result.itemsApproved += sourceStats.itemsApproved;
          result.itemsRejected += sourceStats.itemsRejected;
        } catch (error) {
          const errorMessage = `Error processing source ${source.name}: ${error}`;
          console.error(errorMessage);
          result.errors.push(errorMessage);
        }
      }

      result.status = 'COMPLETED';
      result.completedAt = new Date();
      console.log(`Content aggregation cycle completed. Found: ${result.itemsFound}, Approved: ${result.itemsApproved}, Rejected: ${result.itemsRejected}`);

    } catch (error) {
      result.status = 'FAILED';
      result.completedAt = new Date();
      result.errors.push(`Cycle failed: ${error}`);
      console.error('Content aggregation cycle failed:', error);
    }

    await this.completeAgentRun(runId, result);
    return result;
  }

  private async processSource(source: { id: string; name: string; url: string; type: string; config?: unknown }): Promise<SourceStats> {
    const stats: SourceStats = {
      sourceId: source.id,
      sourceName: source.name,
      itemsFound: 0,
      itemsApproved: 0,
      itemsRejected: 0,
      avgRelevanceScore: 0,
    };

    console.log(`Processing source: ${source.name} (${source.url})`);

    // Fetch content from source
    const rawContents = await contentScraper.fetchFromSource({
      url: source.url,
      type: source.type as 'RSS' | 'API' | 'WEBSITE' | 'YOUTUBE',
      config: source.config,
    });

    stats.itemsFound = rawContents.length;
    console.log(`Found ${rawContents.length} items from ${source.name}`);

    // Process each content item
    let totalRelevanceScore = 0;
    for (const rawContent of rawContents) {
      try {
        const processed = await this.processContentItem(rawContent, source);
        if (processed.approved) {
          stats.itemsApproved++;
          totalRelevanceScore += processed.relevanceScore;
        } else {
          stats.itemsRejected++;
        }
      } catch (error) {
        console.error(`Error processing content item: ${error}`);
        stats.itemsRejected++;
      }
    }

    // Update average relevance score
    if (stats.itemsApproved > 0) {
      stats.avgRelevanceScore = totalRelevanceScore / stats.itemsApproved;
    }

    // Update source last fetched time
    await prisma.contentSource.update({
      where: { id: source.id },
      data: { lastFetched: new Date() },
    });

    return stats;
  }

  private async processContentItem(
    rawContent: RawContent,
    source: { id: string; name: string; url: string }
  ): Promise<{ approved: boolean; relevanceScore: number }> {
    // 1. Validate content
    const validation = await contentValidator.validateContent(rawContent);
    
    if (!validation.isValid) {
      console.log(`Content rejected by validator: ${rawContent.title} - ${validation.issues.join(', ')}`);
      await this.logContentAction('REJECTED', rawContent, validation.issues.join('; '));
      return { approved: false, relevanceScore: 0 };
    }

    // 2. Classify subject
    const classification = await relevanceEngine.classifySubject(rawContent);
    
    // 3. Calculate relevance score
    const relevanceScore = await relevanceEngine.calculateRelevance(
      rawContent,
      classification.subject !== 'General' ? classification.subject : undefined
    );

    // 4. Check if meets minimum threshold
    if (relevanceScore < this.config.minRelevanceScore) {
      const reason = relevanceEngine.getRejectionReason(relevanceScore, classification);
      console.log(`Content rejected due to low relevance: ${rawContent.title} (Score: ${relevanceScore.toFixed(2)})`);
      await this.logContentAction('REJECTED', rawContent, reason);
      return { approved: false, relevanceScore };
    }

    // 5. Determine if auto-approve
    const shouldAutoApprove = relevanceEngine.shouldAutoApprove(relevanceScore);

    // 6. Save to database
    const contentItem = await this.saveContentItem(rawContent, source, classification, relevanceScore, shouldAutoApprove);
    
    if (contentItem) {
      const action = shouldAutoApprove ? 'APPROVED' : 'PENDING_REVIEW';
      await this.logContentAction(action, rawContent, `Relevance: ${relevanceScore.toFixed(2)}, Subject: ${classification.subject}`);
      
      if (shouldAutoApprove) {
        console.log(`Content auto-approved: ${rawContent.title} (Score: ${relevanceScore.toFixed(2)})`);
      } else {
        console.log(`Content queued for review: ${rawContent.title} (Score: ${relevanceScore.toFixed(2)})`);
      }
    }

    return { approved: shouldAutoApprove, relevanceScore };
  }

  private async saveContentItem(
    rawContent: RawContent,
    source: { id: string },
    classification: ClassificationResult,
    relevanceScore: number,
    shouldAutoApprove: boolean
  ) {
    try {
      // Find subject ID if classified
      let subjectId: string | null = null;
      if (classification.subject !== 'General') {
        const subject = await prisma.subject.findFirst({
          where: { name: classification.subject },
        });
        subjectId = subject?.id || null;
      }

      const contentItem = await prisma.contentItem.create({
        data: {
          title: rawContent.title,
          description: rawContent.description,
          url: rawContent.url,
          sourceId: source.id,
          subjectId,
          type: rawContent.type,
          relevanceScore,
          isApproved: shouldAutoApprove,
          isAutoApproved: shouldAutoApprove,
          publishedAt: rawContent.publishedAt,
          metadata: (rawContent.metadata ? JSON.parse(JSON.stringify(rawContent.metadata)) : undefined) as unknown as Prisma.InputJsonValue,
          content: rawContent.content ? rawContent.content.substring(0, 10000) : null, // Limit content length
        },
      });

      return contentItem;
    } catch (error) {
      // Handle duplicate URL error gracefully
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        console.log(`Duplicate content skipped: ${rawContent.url}`);
        return null;
      }
      throw error;
    }
  }

  private async logContentAction(
    action: string,
    content: RawContent,
    message: string
  ) {
    try {
      // Find the content item if it exists
      const existingItem = await prisma.contentItem.findUnique({
        where: { url: content.url },
      });

      await prisma.contentCurationLog.create({
        data: {
          action,
          contentItemId: existingItem?.id,
          message,
          metadata: {
            title: content.title,
            url: content.url,
          },
        },
      });
    } catch (error) {
      console.error(`Error logging content action: ${error}`);
    }
  }

  private async getActiveSources() {
    return prisma.contentSource.findMany({
      where: { isActive: true },
      include: {
        subject: true,
      },
    });
  }

  private async createAgentRun(): Promise<string> {
    const run = await prisma.agentRun.create({
      data: {
        status: 'RUNNING',
        metadata: {
          config: this.config,
        } as unknown as Prisma.InputJsonValue,
      },
    });
    return run.id;
  }

  private async completeAgentRun(runId: string, result: AgentRunResult): Promise<void> {
    await prisma.agentRun.update({
      where: { id: runId },
      data: {
        status: result.status,
        itemsFound: result.itemsFound,
        itemsApproved: result.itemsApproved,
        itemsRejected: result.itemsRejected,
        completedAt: result.completedAt,
        error: result.errors.length > 0 ? result.errors.join('; ') : null,
      },
    });
  }

  // Public methods for manual control
  async triggerRun(): Promise<AgentRunResult> {
    return await this.runCycle();
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      config: this.config,
      currentRunId: this.currentRunId,
    };
  }

  async addSource(source: {
    name: string;
    url: string;
    type: 'RSS' | 'API' | 'WEBSITE' | 'YOUTUBE';
    subjectId?: string;
    config?: unknown;
  }): Promise<void> {
    await prisma.contentSource.create({
      data: source as Prisma.ContentSourceCreateInput,
    });
  }

  async removeSource(sourceId: string): Promise<void> {
    await prisma.contentSource.update({
      where: { id: sourceId },
      data: { isActive: false },
    });
  }

  async getRecentRuns(limit: number = 10) {
    return prisma.agentRun.findMany({
      take: limit,
      orderBy: { startedAt: 'desc' },
    });
  }

  async getContentQueue(status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
    const where: Prisma.ContentItemWhereInput = {};
    if (status === 'PENDING') {
      where.isApproved = false;
      where.isAutoApproved = false;
    } else if (status === 'APPROVED') {
      where.isApproved = true;
    } else if (status === 'REJECTED') {
      where.isApproved = false;
      where.rejectionReason = { not: null };
    }

    return prisma.contentItem.findMany({
      where,
      include: {
        source: true,
        subject: true,
      },
      orderBy: { fetchedAt: 'desc' },
      take: 50,
    });
  }

  async approveContent(contentId: string): Promise<void> {
    await prisma.contentItem.update({
      where: { id: contentId },
      data: { isApproved: true },
    });
  }

  async rejectContent(contentId: string, reason: string): Promise<void> {
    await prisma.contentItem.update({
      where: { id: contentId },
      data: { 
        isApproved: false,
        rejectionReason: reason 
      },
    });
  }
}

// Export singleton instance
export const contentAgent = new ContentAgent();