import { RawContent } from './content-scraper';

export interface RelevanceConfig {
  keywords: string[];
  minScore: number;
  subjectWeights: Record<string, number>;
  autoApproveThreshold: number;
}

export interface QualityMetrics {
  readabilityScore: number;
  lengthScore: number;
  multimediaScore: number;
  overallScore: number;
}

export interface ClassificationResult {
  subject: string;
  confidence: number;
  topics: string[];
}

class RelevanceEngine {
  private config: RelevanceConfig;
  
  // CBSE Class 9 specific keywords and topics
  private cbseKeywords = {
    Mathematics: [
      'number system', 'polynomials', 'coordinate geometry', 'linear equations',
      'euclid geometry', 'lines angles', 'triangles', 'quadrilaterals', 'area',
      'circles', 'constructions', 'heron formula', 'surface areas', 'volumes',
      'statistics', 'probability', 'algebra', 'geometry', 'mensuration'
    ],
    Science: [
      'matter', 'atom', 'molecule', 'cell', 'tissues', 'diversity', 'motion',
      'force', 'laws of motion', 'gravitation', 'work', 'energy', 'sound',
      'disease', 'natural resources', 'food resources', 'chemistry', 'physics',
      'biology', 'structure of atom', 'is matter around us pure'
    ],
    'Social Science': [
      'history', 'geography', 'civics', 'economics', 'french revolution',
      'socialism', 'nazism', 'forest society', 'pastoralists', 'india',
      'democracy', 'constitution', 'electoral politics', 'poverty', 'food security'
    ],
    English: [
      'beehive', 'moments', 'prose', 'poetry', 'grammar', 'writing', 'letter',
      'article', 'report', 'comprehension', 'vocabulary', 'literature'
    ],
    Hindi: [
      'kshitij', 'kritika', 'vyakaran', 'nibandh', 'patra', 'hindi literature',
      'sandhi', 'samas', 'hindI grammar'
    ]
  };

  // Educational quality indicators
  private qualityIndicators = {
    positive: [
      'explained', 'tutorial', 'guide', 'lesson', 'chapter', 'exercise',
      'practice', 'examples', 'solutions', 'notes', 'summary', 'key points',
      'important', 'cbse', 'ncert', 'curriculum', 'syllabus', 'exam',
      'study', 'learn', 'education', 'academic', 'concept', 'understand'
    ],
    negative: [
      'clickbait', 'sensational', 'viral', 'shocking', 'scandal', 'gossip',
      'entertainment', 'celebrity', 'drama', 'controversy', 'fake', 'misleading'
    ]
  };

  constructor(config?: Partial<RelevanceConfig>) {
    this.config = {
      keywords: [],
      minScore: 0.3,
      subjectWeights: {
        Mathematics: 1.0,
        Science: 1.0,
        'Social Science': 1.0,
        English: 1.0,
        Hindi: 1.0,
      },
      autoApproveThreshold: 0.8,
      ...config,
    };
  }

  async calculateRelevance(content: RawContent, targetSubject?: string): Promise<number> {
    const text = this.extractText(content);
    const lowerText = text.toLowerCase();

    // Base relevance score from keyword matching
    let score = this.calculateKeywordScore(lowerText, targetSubject);

    // Apply subject weight if target subject specified
    if (targetSubject && this.config.subjectWeights[targetSubject]) {
      score *= this.config.subjectWeights[targetSubject];
    }

    // Quality bonus
    score *= this.calculateQualityBonus(lowerText);

    // Recency bonus (if published date available)
    if (content.publishedAt) {
      score *= this.calculateRecencyBonus(content.publishedAt);
    }

    // Length appropriateness
    score *= this.calculateLengthScore(text);

    // Ensure score is between 0 and 1
    return Math.max(0, Math.min(1, score));
  }

  async classifySubject(content: RawContent): Promise<ClassificationResult> {
    const text = this.extractText(content).toLowerCase();
    const scores: Record<string, number> = {};

    // Calculate score for each subject
    for (const [subject, keywords] of Object.entries(this.cbseKeywords)) {
      let subjectScore = 0;
      const totalKeywords = keywords.length;

      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${this.escapeRegex(keyword)}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches) {
          subjectScore += matches.length;
        }
      }

      scores[subject] = subjectScore / totalKeywords;
    }

    // Find highest scoring subject
    let maxSubject = 'General';
    let maxScore = 0;
    const topics: string[] = [];

    for (const [subject, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        maxSubject = subject;
      }
      if (score > 0.1) { // Include subjects with some relevance
        topics.push(subject);
      }
    }

    return {
      subject: maxSubject,
      confidence: maxScore,
      topics,
    };
  }

  async detectQuality(content: RawContent): Promise<QualityMetrics> {
    const text = this.extractText(content).toLowerCase();
    
    const readabilityScore = this.calculateReadability(text);
    const lengthScore = this.calculateLengthScore(text);
    const multimediaScore = this.calculateMultimediaScore(content);
    
    const overallScore = (readabilityScore + lengthScore + multimediaScore) / 3;

    return {
      readabilityScore,
      lengthScore,
      multimediaScore,
      overallScore,
    };
  }

  private calculateKeywordScore(text: string, targetSubject?: string): number {
    let totalMatches = 0;
    let totalKeywords = 0;

    if (targetSubject && this.cbseKeywords[targetSubject as keyof typeof this.cbseKeywords]) {
      // Score for specific subject
      const keywords = this.cbseKeywords[targetSubject as keyof typeof this.cbseKeywords];
      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${this.escapeRegex(keyword)}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches) totalMatches += matches.length;
      }
      totalKeywords = keywords.length;
    } else {
      // Score across all subjects
      for (const keywords of Object.values(this.cbseKeywords)) {
        for (const keyword of keywords) {
          const regex = new RegExp(`\\b${this.escapeRegex(keyword)}\\b`, 'gi');
          const matches = text.match(regex);
          if (matches) totalMatches += matches.length;
        }
        totalKeywords += keywords.length;
      }
    }

    // Also check for general educational terms
    const educationalTerms = ['cbse', 'class 9', 'ncert', 'curriculum', 'syllabus', 'exam'];
    for (const term of educationalTerms) {
      const regex = new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) totalMatches += matches.length * 2; // Weight educational terms higher
    }

    return Math.min(1, totalMatches / Math.max(totalKeywords * 0.1, 1));
  }

  private calculateQualityBonus(text: string): number {
    let bonus = 1.0;

    // Positive indicators
    for (const indicator of this.qualityIndicators.positive) {
      const regex = new RegExp(`\\b${this.escapeRegex(indicator)}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) bonus += matches.length * 0.02;
    }

    // Negative indicators
    for (const indicator of this.qualityIndicators.negative) {
      const regex = new RegExp(`\\b${this.escapeRegex(indicator)}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) bonus -= matches.length * 0.05;
    }

    return Math.max(0.1, Math.min(1.5, bonus));
  }

  private calculateRecencyBonus(publishedAt: Date): number {
    const now = new Date();
    const daysDiff = (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60 * 24);

    // Recent content gets a bonus, but evergreen content is still valuable
    if (daysDiff < 30) return 1.2; // Very recent
    if (daysDiff < 90) return 1.1; // Recent
    if (daysDiff < 365) return 1.0; // Within a year
    if (daysDiff < 730) return 0.9; // 1-2 years
    return 0.8; // Older content
  }

  private calculateLengthScore(text: string): number {
    const wordCount = text.split(/\s+/).length;

    // Educational content should be substantial but not overwhelming
    if (wordCount < 100) return 0.3; // Too short
    if (wordCount < 300) return 0.7; // Short but acceptable
    if (wordCount < 1000) return 1.0; // Good length
    if (wordCount < 3000) return 0.9; // Long but okay
    return 0.7; // Very long - might be too dense
  }

  private calculateReadability(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim()).length;
    const words = text.split(/\s+/).length;
    const syllables = this.countSyllables(text);

    if (sentences === 0 || words === 0) return 0.5;

    // Flesch Reading Ease (simplified)
    const avgSentenceLength = words / sentences;
    const avgSyllablesPerWord = syllables / words;

    const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);

    // Normalize to 0-1 range
    return Math.max(0, Math.min(1, (score + 30) / 130));
  }

  private countSyllables(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    let total = 0;

    for (const word of words) {
      // Simple syllable counting
      const vowels = word.match(/[aeiouy]+/g);
      total += vowels ? vowels.length : 1;
      
      // Adjust for silent e
      if (word.endsWith('e')) total--;
      if (word.endsWith('le') && word.length > 2 && !/[aeiouy]le$/.test(word)) total++;
    }

    return Math.max(total, words.length);
  }

  private calculateMultimediaScore(content: RawContent): number {
    let score = 0.5; // Base score

    if (content.type === 'VIDEO') score += 0.3;
    if (content.type === 'INTERACTIVE') score += 0.4;
    if (content.metadata?.hasImages) score += 0.1;
    if (content.metadata?.hasDiagrams) score += 0.2;

    return Math.min(1, score);
  }

  private extractText(content: RawContent): string {
    let text = `${content.title} ${content.description || ''} ${content.content || ''}`;
    
    // Remove HTML tags
    text = text.replace(/<[^>]*>/g, ' ');
    
    // Remove extra whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  shouldAutoApprove(score: number): boolean {
    return score >= this.config.autoApproveThreshold;
  }

  getRejectionReason(score: number, classification: ClassificationResult): string {
    if (score < this.config.minScore) {
      return `Low relevance score: ${score.toFixed(2)} (minimum: ${this.config.minScore})`;
    }
    if (classification.confidence < 0.1) {
      return 'Content does not match any CBSE Class 9 subject';
    }
    return 'Unknown reason';
  }
}

export const relevanceEngine = new RelevanceEngine();