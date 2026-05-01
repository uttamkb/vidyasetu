# Content Aggregation Skill

## Overview
This skill enables the Agent to manage the automated content aggregation system that procures relevant educational content from the web for CBSE Class 9 students.

## System Architecture

### Components
1. **Content Scraper** - Fetches content from various sources (RSS, YouTube, Websites, APIs)
2. **Relevance Engine** - AI-powered filtering based on CBSE Class 9 curriculum
3. **Content Validator** - Safety checks, duplicate detection, quality assessment
4. **Background Agent** - Orchestrates the entire pipeline on a schedule

### Data Flow
```
Sources → Scraper → Validator → Relevance Engine → Database → Dashboard
```

## Commands

### Agent Control
```bash
# Start the content agent
POST /api/content/agent { "action": "start" }

# Stop the content agent
POST /api/content/agent { "action": "stop" }

# Trigger immediate run
POST /api/content/agent { "action": "trigger" }

# Get agent status
GET /api/content/agent
```

### Source Management
```bash
# List all sources
GET /api/content/sources

# Add new source
POST /api/content/sources
{
  "name": "Source Name",
  "url": "https://source-url.com",
  "type": "RSS", // RSS, API, WEBSITE, YOUTUBE
  "subjectId": "subject-uuid",
  "config": {} // Optional source-specific config
}

# Remove source
DELETE /api/content/sources?id=source-uuid
```

### Content Queue Management
```bash
# Get content queue
GET /api/content/queue?status=PENDING

# Approve content
POST /api/content/queue
{
  "contentId": "content-uuid",
  "action": "approve"
}

# Reject content
POST /api/content/queue
{
  "contentId": "content-uuid",
  "action": "reject",
  "reason": "Not relevant to CBSE Class 9"
}
```

## Configuration

### Environment Variables
```env
# Content Agent
CONTENT_AGENT_ENABLED=true
CONTENT_AGENT_INTERVAL=3600000  # 1 hour in ms
MAX_CONCURRENT_SCRAPERS=5
AUTO_APPROVE_THRESHOLD=0.8
MIN_RELEVANCE_SCORE=0.3
```

### Relevance Scoring
Content is scored based on:
- **Keyword Matching (40%)** - CBSE Class 9 topic keywords
- **Source Authority (20%)** - Trusted educational sources
- **Content Quality (25%)** - Readability, length, multimedia
- **Recency (15%)** - Recent content gets bonus

### Auto-Approval Thresholds
- **Score ≥ 0.8**: Auto-approve, publish immediately
- **Score 0.6-0.8**: Queue for manual review
- **Score < 0.6**: Reject automatically

## Default Sources

The system comes pre-configured with these educational sources:

### Mathematics
- Khan Academy - Mathematics
- NCERT Mathematics Class 9

### Science
- Khan Academy - Science
- NCERT Science Class 9

### Social Science
- NCERT Social Science Class 9

### English
- NCERT English Class 9

### Hindi
- NCERT Hindi Class 9

## Content Types

The system supports:
- **ARTICLE** - Text-based educational content
- **VIDEO** - Educational videos (YouTube, etc.)
- **PDF** - Downloadable study materials
- **INTERACTIVE** - Interactive learning resources

## Safety Features

### Content Validation
- **Malware Detection** - Scans for malicious scripts
- **Inappropriate Content** - Filters adult, violent, harmful content
- **Misleading Information** - Detects clickbait and spam
- **URL Validation** - Blocks suspicious domains

### Quality Assurance
- **Duplicate Detection** - Prevents duplicate content
- **Educational Value** - Assesses learning potential
- **Readability Score** - Ensures age-appropriate content
- **Source Reputation** - Tracks source quality over time

## Monitoring

### Agent Runs
Track aggregation cycles with:
- Items found
- Items approved/rejected
- Average relevance scores
- Error logs

### Content Logs
Full audit trail of:
- When content was fetched
- Validation results
- Approval/rejection decisions
- Manual overrides

## Best Practices

### DO's
✅ Review pending content regularly  
✅ Add trusted educational sources  
✅ Monitor relevance scores  
✅ Update source configurations  
✅ Check agent logs for errors  

### DON'Ts
❌ Don't add untrusted sources  
❌ Don't disable safety checks  
❌ Don't set threshold too low  
❌ Don't ignore error logs  
❌ Don't add too many sources at once  

## Troubleshooting

### Common Issues

#### Agent Not Running
```bash
# Check if enabled
GET /api/content/agent

# Start if stopped
POST /api/content/agent { "action": "start" }
```

#### No Content Found
- Check source URLs are valid
- Verify sources are active
- Check agent logs for errors

#### Low Approval Rate
- Lower `MIN_RELEVANCE_SCORE` threshold
- Add more targeted sources
- Review rejection reasons

#### High Memory Usage
- Reduce `MAX_CONCURRENT_SCRAPERS`
- Increase `CONTENT_AGENT_INTERVAL`
- Monitor database size

## Integration with Dashboard

Approved content appears in:
- Study Materials page (filtered by subject)
- Dashboard recent activity
- Subject-specific content feeds

Content can be:
- Bookmarked by students
- Filtered by subject/type
- Searched by topic