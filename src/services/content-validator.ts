import { prisma } from '@/lib/db';
import { RawContent } from './content-scraper';

export interface ValidationResult {
  isValid: boolean;
  isDuplicate: boolean;
  safetyScore: number;
  educationalValue: number;
  issues: string[];
}

export interface SafetyCheck {
  hasMalware: boolean;
  hasInappropriateContent: boolean;
  hasMisleadingInfo: boolean;
  score: number;
}

class ContentValidator {
  // Inappropriate content indicators
  private inappropriatePatterns = [
    /\b(adult|porn|sex|nude|explicit)\b/i,
    /\b(violence|gore|blood|kill|murder)\b/i,
    /\b(drug|cocaine|heroin|marijuana|weed)\b/i,
    /\b(hate|racist|discrimination|slur)\b/i,
    /\b(gambling|casino|betting|poker)\b/i,
    /\b(weapon|gun|bomb|explosive)\b/i,
  ];

  // Misleading content indicators
  private misleadingPatterns = [
    /\b(click here|click now|you won't believe|shocking)\b/i,
    /\b(free|winner|congratulations|you've won)\b/i,
    /\b(limited time|act now|don't miss|last chance)\b/i,
    /\b(miracle|secret|doctors hate|one weird trick)\b/i,
  ];

  // Educational value indicators
  private educationalPatterns = [
    /\b(explained|tutorial|guide|lesson|chapter)\b/i,
    /\b(exercise|practice|examples|solutions)\b/i,
    /\b(notes|summary|key points|important)\b/i,
    /\b(cbse|ncert|curriculum|syllabus|exam)\b/i,
    /\b(concept|theory|principle|formula)\b/i,
  ];

  async validateContent(content: RawContent): Promise<ValidationResult> {
    const issues: string[] = [];
    
    // Check for duplicates
    const isDuplicate = await this.checkDuplicate(content.url);
    if (isDuplicate) {
      issues.push('Content already exists in database');
    }

    // Validate URL
    const isValidUrl = this.validateURL(content.url);
    if (!isValidUrl) {
      issues.push('Invalid or unsafe URL');
    }

    // Check safety
    const safetyCheck = await this.checkSafety(content);
    if (!safetyCheck.hasMalware === false) {
      issues.push('Potential malware detected');
    }
    if (safetyCheck.hasInappropriateContent) {
      issues.push('Inappropriate content detected');
    }

    // Assess educational value
    const educationalValue = await this.assessEducationalValue(content);
    if (educationalValue < 0.3) {
      issues.push('Low educational value');
    }

    return {
      isValid: issues.length === 0,
      isDuplicate,
      safetyScore: safetyCheck.score,
      educationalValue,
      issues,
    };
  }

  async checkDuplicate(url: string): Promise<boolean> {
    try {
      // Check in ContentItem
      const existingContent = await prisma.contentItem.findUnique({
        where: { url },
      });

      if (existingContent) {
        return true;
      }

      // Check in StudyMaterial
      const existingMaterial = await prisma.studyMaterial.findFirst({
        where: { url: { not: null } },
      });

      return !!existingMaterial;
    } catch (error) {
      console.error('Error checking duplicate:', error);
      return false; // Assume not duplicate on error
    }
  }

  validateURL(url: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // Check protocol
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }

      // Check for suspicious domains
      const suspiciousDomains = [
        '.tk', '.ml', '.ga', '.cf', '.gq', // Free TLDs often used for spam
        'bit.ly', 'tinyurl.com', 'goo.gl', // URL shorteners (can hide malicious sites)
      ];

      const hostname = urlObj.hostname.toLowerCase();
      for (const domain of suspiciousDomains) {
        if (hostname.endsWith(domain) || hostname === domain) {
          return false;
        }
      }

      // Check path for suspicious patterns
      const suspiciousPaths = [
        '.exe', '.bat', '.cmd', '.scr', '.pif',
        'download', 'install', 'setup',
      ];

      const pathname = urlObj.pathname.toLowerCase();
      for (const path of suspiciousPaths) {
        if (pathname.includes(path)) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  async checkMalware(content: string): Promise<boolean> {
    // Basic malware detection (in production, use a proper malware scanning service)
    const malwareIndicators = [
      /<script[^>]*>.*?(eval|exec|setTimeout|setInterval)\s*\(.*?['"](atob|unescape|decodeURI)/gi,
      /<iframe[^>]*src\s*=\s*["'][^"']*\.exe[^"']*["']/i,
      /javascript:\s*eval\s*\(/i,
      /document\.write\s*\(\s*unescape/i,
    ];

    for (const pattern of malwareIndicators) {
      if (pattern.test(content)) {
        return true;
      }
    }

    return false;
  }

  async checkSafety(content: RawContent): Promise<SafetyCheck> {
    const text = `${content.title} ${content.description || ''} ${content.content || ''}`;
    let score = 1.0;
    let hasMalware = false;
    let hasInappropriateContent = false;
    let hasMisleadingInfo = false;

    // Check for malware
    if (content.content) {
      hasMalware = await this.checkMalware(content.content);
      if (hasMalware) score -= 0.5;
    }

    // Check for inappropriate content
    for (const pattern of this.inappropriatePatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        hasInappropriateContent = true;
        score -= matches.length * 0.1;
      }
    }

    // Check for misleading content
    for (const pattern of this.misleadingPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 2) { // More than 2 matches indicates clickbait
        hasMisleadingInfo = true;
        score -= matches.length * 0.05;
      }
    }

    return {
      hasMalware,
      hasInappropriateContent,
      hasMisleadingInfo,
      score: Math.max(0, Math.min(1, score)),
    };
  }

  async assessEducationalValue(content: RawContent): Promise<number> {
    const text = `${content.title} ${content.description || ''} ${content.content || ''}`.toLowerCase();
    let score = 0;
    let totalChecks = 0;

    // Check for educational patterns
    for (const pattern of this.educationalPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        score += matches.length;
      }
      totalChecks++;
    }

    // Check for CBSE/NCERT mentions
    const cbseMentions = text.match(/\b(cbse|ncert|class\s+9|ix)\b/i);
    if (cbseMentions) {
      score += cbseMentions.length * 2;
    }

    // Check content length (educational content should be substantial)
    const wordCount = text.split(/\s+/).length;
    if (wordCount > 500) score += 1;
    else if (wordCount > 200) score += 0.5;

    // Check for multimedia (videos, interactives are valuable)
    if (content.type === 'VIDEO' || content.type === 'INTERACTIVE') {
      score += 1;
    }

    // Normalize score
    return Math.max(0, Math.min(1, score / (totalChecks * 2)));
  }

  async validateSource(url: string): Promise<boolean> {
    // Check if source is in our trusted list
    const trustedSources = [
      'ncert.nic.in',
      'khanacademy.org',
      'youtube.com',
      'byjus.com',
      'toppr.com',
      'vedantu.com',
      'teachoo.com',
      'magnetbrains.com',
      '.edu',
      '.ac.in',
      '.gov.in',
    ];

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      for (const source of trustedSources) {
        if (hostname.endsWith(source) || hostname.includes(source)) {
          return true;
        }
      }

      return false; // Not from a trusted source
    } catch {
      return false;
    }
  }

  async getDomainReputation(url: string): Promise<number> {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      // Check if domain exists in our database
      const existingItems = await prisma.contentItem.findMany({
        where: {
          url: {
            startsWith: `https://${hostname}`,
          },
        },
        select: {
          relevanceScore: true,
          isApproved: true,
        },
      });

      if (existingItems.length === 0) {
        return 0.5; // Unknown domain
      }

      // Calculate average relevance score
      const totalScore = existingItems.reduce((sum, item) => 
        sum + (item.isApproved ? item.relevanceScore : 0), 0);
      const avgScore = totalScore / existingItems.length;

      // Bonus for having many approved items
      const approvedCount = existingItems.filter(item => item.isApproved).length;
      const volumeBonus = Math.min(0.2, approvedCount * 0.01);

      return Math.min(1, avgScore + volumeBonus);
    } catch (error) {
      console.error('Error getting domain reputation:', error);
      return 0.5;
    }
  }
}

export const contentValidator = new ContentValidator();