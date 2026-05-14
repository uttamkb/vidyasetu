/**
 * Inngest Environment Configuration & Validation
 * 
 * Centralizes all environment handling for Inngest to ensure:
 * 1. Security mode is explicit (INNGEST_DEV=true).
 * 2. Signature validation is NEVER silently downgraded in production.
 * 3. Startup fails fast if production secrets are missing.
 */

export interface InngestConfig {
  readonly isDev: boolean;
  readonly eventKey: string | undefined;
  readonly signingKey: string | undefined;
  readonly mode: 'PRODUCTION' | 'DEVELOPMENT';
  readonly signatureValidation: 'ENFORCED' | 'BYPASSED';
}

/**
 * Validates and returns the Inngest configuration.
 * Throws errors for insecure or invalid configurations.
 */
function validateInngestConfig(): InngestConfig {
  const nodeEnv = process.env.NODE_ENV;
  const inngestDev = process.env.INNGEST_DEV;

  // 1. Validate INNGEST_DEV value
  if (inngestDev !== undefined && inngestDev !== 'true' && inngestDev !== 'false') {
    throw new Error(
      `[Inngest] Invalid INNGEST_DEV value: "${inngestDev}". Expected "true", "false", or undefined.`
    );
  }

  const isDevMode = inngestDev === 'true';

  // 2. Prevent insecure production deployments
  // Allow INNGEST_DEV=true during the build phase to satisfy module evaluation during pre-rendering
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
  if (nodeEnv === 'production' && isDevMode && !isBuildPhase) {
    throw new Error(
      '[Inngest] SECURITY ALERT: Cannot enable INNGEST_DEV in production environment (NODE_ENV=production).'
    );
  }

  const eventKey = process.env.INNGEST_EVENT_KEY;
  const signingKey = process.env.INNGEST_SIGNING_KEY;

  // 3. Enforce secrets in secure mode
  if (!isDevMode) {
    if (!eventKey || !signingKey) {
      throw new Error(
        `[Inngest] Missing Production Secrets: ${
          !eventKey ? 'INNGEST_EVENT_KEY ' : ''
        }${!signingKey ? 'INNGEST_SIGNING_KEY' : ''}. ` +
        'Insecure fallback is disabled. Set INNGEST_DEV=true for local development.'
      );
    }
  }

  const config: InngestConfig = {
    isDev: isDevMode,
    // SDK uses local defaults if keys are undefined in dev mode
    eventKey: isDevMode ? (eventKey || undefined) : eventKey,
    signingKey: isDevMode ? (signingKey || undefined) : signingKey,
    mode: isDevMode ? 'DEVELOPMENT' : 'PRODUCTION',
    signatureValidation: isDevMode ? 'BYPASSED' : 'ENFORCED',
  };

  // Safe startup logging (no secrets logged)
  console.log(
    `[Inngest] Initialization | Mode: ${config.mode} | Signatures: ${config.signatureValidation}`
  );

  return Object.freeze(config);
}

export const inngestConfig = validateInngestConfig();
