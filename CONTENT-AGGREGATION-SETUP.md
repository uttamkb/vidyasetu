# Content Aggregation System - Setup Guide

## Overview

The Content Aggregation System is an automated background agent that continuously discovers, validates, and curates educational content from the web specifically for CBSE Class 9 students. It uses AI-powered relevance filtering to ensure only high-quality, curriculum-aligned content reaches students.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

This will install the required packages:
- `rss-parser` - For RSS feed parsing
- `cheerio` - For web scraping
- `node-cron` - For scheduled tasks

### 2. Update Database Schema

```bash
npx prisma migrate dev --name add_content_aggregation
npx prisma generate
```

This creates the following new tables:
- `ContentSource` - Configured content sources
- `ContentItem` - Discovered content items
- `ContentCurationLog` - Audit trail of content processing
- `AgentRun` - Background agent execution logs

### 3. Seed Default Sources

```bash
npx tsx src/scripts/seed-content-sources.ts
```

This adds pre-configured educational sources:
- Khan Academy (Math & Science)
- NCERT official website (All subjects)

### 4. Configure Environment Variables

Add to your `.env.local`:

```env
# Content Agent Configuration
CONTENT_AGENT_ENABLED=true
CONTENT_AGENT_INTERVAL=3600000  # 1 hour in milliseconds
MAX_CONCURRENT_SCRAPERS=5
AUTO_APPROVE_THRESHOLD=0.8
MIN_RELEVANCE_SCORE=0.3
```

### 5. Start the Application

```bash
npm run dev
```

The content agent will automatically start if `CONTENT_AGENT_ENABLED=true`.

## 📋 Manual Setup Steps

### Step 1: Database Migration

Run the Prisma migration to create the new tables:

```bash
npx prisma migrate dev
```

### Step 2: Start Content Agent Manually

If you want to manually control the agent:

```bash
# Start the agent
curl -X POST http://localhost:3000/api/content/agent \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'

# Trigger immediate run
curl -X POST http://localhost:3000/api/content/agent \
  -H "Content-Type: application/json" \
  -d '{"action": "trigger"}'

# Stop the agent
curl -X POST http://localhost:3000/api/content/agent \
  -H "Content-Type: application/json" \
  -d '{"action": "stop"}'
```

### Step 3: Add Content Sources

Add sources via API:

```bash
curl -X POST http://localhost:3000/api/content/sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Example Educational Site",
    "url": "https://example.com/education",
    "type": "WEBSITE",
    "subjectId": "subject-uuid-here"
  }'
```

### Step 4: Review Content Queue

Check pending content:

```bash
# Get pending content
curl http://localhost:3000/api/content/queue?status=PENDING

# Approve content
curl -X POST http://localhost:3000/api/content/queue \
  -H "Content-Type: application/json" \
  -d '{
    "contentId": "content-uuid",
    "action": "approve"
  }'

# Reject content
curl -X POST http://localhost:3000/api/content/queue \
  -H "Content-Type: application/json" \
  -d '{
    "contentId": "content-uuid",
    "action": "reject",
    "reason": "Not relevant to CBSE Class 9"
  }'
```

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CONTENT_AGENT_ENABLED` | Enable/disable the agent | `true` |
| `CONTENT_AGENT_INTERVAL` | Time between runs (ms) | `3600000` (1 hour) |
| `MAX_CONCURRENT_SCRAPERS` | Max parallel scrapers | `5` |
| `AUTO_APPROVE_THRESHOLD` | Score for auto-approval | `0.8` |
| `MIN_RELEVANCE_SCORE` | Minimum relevance threshold | `0.3` |

### Relevance Scoring

Content is scored (0-1) based on:
- **40%** - Keyword matching with CBSE Class 9 topics
- **20%** - Source authority and reputation
- **25%** - Content quality (readability, length, multimedia)
- **15%** - Recency (newer content gets bonus)

### Auto-Approval Logic

- **Score ≥ 0.8**: Auto-approved and published immediately
- **Score 0.6-0.8**: Queued for manual review
- **Score < 0.6**: Automatically rejected

## 📊 Monitoring

### Check Agent Status

```bash
curl http://localhost:3000/api/content/agent
```

Response includes:
- Current running status
- Configuration
- Recent run history

### View Recent Runs

```bash
curl http://localhost:3000/api/content/agent | jq '.data.recentRuns'
```

Shows:
- Run ID and status
- Items found/approved/rejected
- Start and completion times
- Any errors encountered

### Content Logs

View the audit trail in the database:

```sql
SELECT * FROM "ContentCurationLog" ORDER BY "createdAt" DESC LIMIT 20;
```

## 🛡️ Safety Features

The system includes multiple safety layers:

### 1. Content Validation
- **Malware Detection** - Scans for malicious scripts
- **Inappropriate Content** - Filters adult, violent, harmful content
- **Misleading Information** - Detects clickbait and spam
- **URL Validation** - Blocks suspicious domains and URL shorteners

### 2. Quality Assurance
- **Duplicate Detection** - Prevents duplicate content
- **Educational Value** - Assesses learning potential
- **Readability Score** - Ensures age-appropriate content
- **Source Reputation** - Tracks source quality over time

### 3. Manual Oversight
- Content below auto-approve threshold requires manual review
- Full audit trail of all decisions
- Easy approve/reject workflow

## 🔄 Daily Operations

### Morning Routine
1. Check agent status: `GET /api/content/agent`
2. Review pending content: `GET /api/content/queue?status=PENDING`
3. Approve/reject queued content

### Weekly Tasks
1. Review agent performance metrics
2. Add new trusted sources
3. Remove underperforming sources
4. Adjust relevance thresholds if needed

### Monthly Review
1. Analyze content engagement
2. Update keyword lists for better relevance
3. Review and optimize source configurations
4. Clean up old rejected content logs

## 🐛 Troubleshooting

### Agent Not Starting
```bash
# Check if enabled
echo $CONTENT_AGENT_ENABLED

# Check logs for errors
tail -f .next/server/app/api/content/agent/route.js
```

### No Content Being Found
1. Verify sources are active: `GET /api/content/sources`
2. Check source URLs are accessible
3. Review agent logs for specific errors
4. Test sources manually with scraper

### High Rejection Rate
1. Lower `MIN_RELEVANCE_SCORE` temporarily
2. Review rejection reasons in logs
3. Add more targeted sources
4. Adjust keyword lists in relevance engine

### Performance Issues
1. Reduce `MAX_CONCURRENT_SCRAPERS`
2. Increase `CONTENT_AGENT_INTERVAL`
3. Monitor database size and optimize
4. Check for memory leaks in long-running processes

## 📚 Best Practices

### Adding Sources
✅ **DO:**
- Start with trusted educational sites (NCERT, Khan Academy)
- Add sources one at a time
- Test each source before enabling
- Monitor performance for first few runs

❌ **DON'T:**
- Add untrusted or unknown sources
- Add too many sources at once
- Enable sources without testing
- Ignore error logs

### Content Review
✅ **DO:**
- Review pending content daily
- Provide specific rejection reasons
- Monitor relevance scores
- Track which sources produce quality content

❌ **DON'T:**
- Auto-approve everything
- Ignore low-quality content
- Forget to check the queue
- Reject without reason

## 🆘 Support

### Common Issues

**Issue**: Prisma client errors about missing models
**Solution**: Run `npx prisma generate` after migration

**Issue**: Agent runs but finds no content
**Solution**: Check source URLs, verify they're accessible, test scraper manually

**Issue**: All content being rejected
**Solution**: Lower `MIN_RELEVANCE_SCORE`, check keyword matching, review source quality

**Issue**: High memory usage
**Solution**: Reduce concurrent scrapers, increase interval, monitor database size

### Getting Help

1. Check agent logs: `GET /api/content/agent`
2. Review content logs in database
3. Test individual components manually
4. Consult the skill documentation: `.clinerules/skills/content-aggregation.md`

## 📈 Future Enhancements

Planned features:
- [ ] AI-powered content summarization
- [ ] Personalized content recommendations
- [ ] Automated content tagging
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Content quality scoring improvements
- [ ] Social media source integration
- [ ] Automated source discovery

---

**Note**: This system is designed to augment, not replace, human curation. Always maintain oversight of automated content selection to ensure quality and relevance for students.