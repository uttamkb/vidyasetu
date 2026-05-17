import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to mock process.env before importing the config module
// or use a helper function to re-evaluate it.
// Since the module is evaluated on import, we'll use dynamic imports.

describe('Inngest Configuration Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should enable DEVELOPMENT mode when INNGEST_DEV=true', async () => {
    vi.stubEnv('INNGEST_DEV', 'true');
    vi.stubEnv('NODE_ENV', 'development');
    
    const { inngestConfig } = await import('./config');
    
    expect(inngestConfig.isDev).toBe(true);
    expect(inngestConfig.mode).toBe('DEVELOPMENT');
    expect(inngestConfig.signatureValidation).toBe('BYPASSED');
  });

  it('should enable PRODUCTION mode when INNGEST_DEV=false and keys are present', async () => {
    vi.stubEnv('INNGEST_DEV', 'false');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('INNGEST_EVENT_KEY', 'test-event-key');
    vi.stubEnv('INNGEST_SIGNING_KEY', 'test-signing-key');
    
    const { inngestConfig } = await import('./config');
    
    expect(inngestConfig.isDev).toBe(false);
    expect(inngestConfig.mode).toBe('PRODUCTION');
    expect(inngestConfig.signatureValidation).toBe('ENFORCED');
  });

  it('should fallback to DEVELOPMENT mode when INNGEST_DEV=true in production NODE_ENV without keys', async () => {
    vi.stubEnv('INNGEST_DEV', 'true');
    vi.stubEnv('NODE_ENV', 'production');

    const { inngestConfig } = await import('./config');

    expect(inngestConfig.isDev).toBe(true);
    expect(inngestConfig.mode).toBe('DEVELOPMENT');
  });

  it('should fallback to DEVELOPMENT mode for invalid INNGEST_DEV value', async () => {
    vi.stubEnv('INNGEST_DEV', 'maybe');

    const { inngestConfig } = await import('./config');

    expect(inngestConfig.isDev).toBe(true);
    expect(inngestConfig.mode).toBe('DEVELOPMENT');
  });

  it('should fallback to DEVELOPMENT mode when production secrets are missing', async () => {
    vi.stubEnv('INNGEST_DEV', 'false');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('INNGEST_EVENT_KEY', '');
    vi.stubEnv('INNGEST_SIGNING_KEY', '');

    const { inngestConfig } = await import('./config');

    expect(inngestConfig.isDev).toBe(true);
    expect(inngestConfig.mode).toBe('DEVELOPMENT');
  });
});
