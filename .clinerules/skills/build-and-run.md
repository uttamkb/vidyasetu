# Build and Run Skill

## Overview
This skill enables the Agent to build, run, and deploy the VidyaSetu Next.js application, manage development environments, and handle deployment processes.

## Development Environment

### Prerequisites
- **Node.js** v18+ (LTS recommended)
- **npm** v9+ or **pnpm** v8+
- **Git** for version control
- **PostgreSQL** database (Neon serverless recommended)

### Environment Setup

#### 1. Install Dependencies
```bash
npm install
```

#### 2. Environment Variables
Create `.env.local` with required variables:

```env
# Database
DATABASE_URL="postgresql://username:password@host:5432/dbname?sslmode=require"

# Auth (Google OAuth)
AUTH_SECRET="your-random-secret-min-32-chars"
AUTH_GOOGLE_ID="your-google-client-id.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="your-google-client-secret"

# App
NEXTAUTH_URL="http://localhost:3000"
```

#### 3. Database Setup
```bash
# Run migrations
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate

# Seed database with initial data
npm run seed
```

## Development Commands

### Start Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Development Server Options
```bash
# Custom port
npm run dev -- -p 3001

# HTTPS mode
npm run dev -- --experimental-https

# Clear cache and start fresh
rm -rf .next && npm run dev
```

## Build Commands

### Production Build
```bash
npm run build
```

This command:
1. Compiles TypeScript
2. Bundles JavaScript
3. Optimizes images
4. Generates static pages
5. Creates production-ready output

### Build Analysis
```bash
# Analyze bundle size
ANALYZE=true npm run build
```

### Type Checking
```bash
# Check TypeScript types without building
npx tsc --noEmit
```

### Linting
```bash
# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix
```

## Running the Application

### Production Mode
```bash
# Build first
npm run build

# Start production server
npm start
```

### Development Mode
```bash
npm run dev
```

### Debug Mode
```bash
# With Node.js inspector
node --inspect node_modules/.bin/next start
```

## Database Management

### Migrations
```bash
# Create new migration
npx prisma migrate dev --name description

# Apply pending migrations
npx prisma migrate deploy

# Reset database
npx prisma migrate reset
```

### Prisma Studio (Database GUI)
```bash
npx prisma studio
```

Opens at `http://localhost:5555`

### Database Commands
```bash
# Format schema
npx prisma format

# Check schema validity
npx prisma validate

# Generate Prisma Client
npx prisma generate
```

## Deployment

### Vercel Deployment (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Environment Variables for Production
Set in Vercel dashboard or your hosting platform:
- `DATABASE_URL` - Production database connection
- `AUTH_SECRET` - NextAuth secret
- `AUTH_GOOGLE_ID` - Google OAuth client ID
- `AUTH_GOOGLE_SECRET` - Google OAuth client secret
- `NEXTAUTH_URL` - Production URL

### Docker Deployment
```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]
```

```bash
# Build Docker image
docker build -t vidyasetu .

# Run container
docker run -p 3000:3000 -e DATABASE_URL=... vidyasetu
```

## CI/CD Pipeline

### GitHub Actions Example
```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run linter
      run: npm run lint
      
    - name: Type check
      run: npx tsc --noEmit
      
    - name: Build
      run: npm run build
      
    - name: Run tests
      run: npm test -- --coverage --watchAll=false
```

## Performance Optimization

### Build Optimization
```bash
# Enable experimental features
# In next.config.ts:
module.exports = {
  experimental: {
    optimizePackageImports: ['@smithy/util-base64']
  }
}
```

### Caching Strategies
```bash
# Clear Next.js cache
rm -rf .next

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules && npm install
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Kill process on port 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use a different port
npm run dev -- -p 3001
```

#### Database Connection Issues
```bash
# Test database connection
npx prisma db pull

# Reset and reseed
npx prisma migrate reset
npm run seed
```

#### Build Failures
```bash
# Clean build
rm -rf .next node_modules
npm install
npm run build

# Check for TypeScript errors
npx tsc --noEmit
```

#### Memory Issues
```bash
# Increase Node.js memory limit
set NODE_OPTIONS=--max-old-space-size=4096 && npm run build
```

## Monitoring and Logging

### Health Check Endpoint
Create `app/api/health/route.ts`:
```typescript
export async function GET() {
  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  });
}
```

### Environment Validation
```typescript
// lib/env.ts
export function validateEnv() {
  const required = [
    'DATABASE_URL',
    'AUTH_SECRET',
    'AUTH_GOOGLE_ID',
    'AUTH_GOOGLE_SECRET'
  ];

  for (const envVar of required) {
    if (!process.env[envVar]) {
      throw new Error(`Missing environment variable: ${envVar}`);
    }
  }
}
```

## Command Reference

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start development server |
| `npm run build` | Create production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests |
| `npx prisma migrate dev` | Run database migrations |
| `npx prisma studio` | Open Prisma Studio GUI |
| `npm run seed` | Seed database |
| `npx tsc --noEmit` | Type check without building |

## Best Practices

### Pre-commit Checklist
1. Run `npm run lint` to check for style issues
2. Run `npx tsc --noEmit` to verify types
3. Run `npm test` to ensure tests pass
4. Test the changes locally with `npm run dev`

### Pre-deployment Checklist
1. All tests passing
2. No TypeScript errors
3. Build completes successfully
4. Environment variables configured
5. Database migrations applied
6. Performance testing completed

### Production Readiness
- Enable HTTPS
- Set up proper monitoring
- Configure error tracking (Sentry, etc.)
- Set up backup strategies
- Implement rate limiting
- Configure CORS properly