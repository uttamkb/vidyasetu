/**
 * Inngest Environment Configuration & Validation
 *
 * Supports three runtime modes:
 * 1. DEVELOPMENT — local dev server (INNGEST_DEV=true or unset)
 * 2. PRODUCTION — cloud Inngest with keys (INNGEST_EVENT_KEY + INNGEST_SIGNING_KEY)
 * 3. LOCAL-PROD — NODE_ENV=production for local testing, falls back to dev mode
 *
 * Never crashes at module load — always returns a valid config.
 */

export interface InngestConfig {
  readonly isDev: boolean;
  readonly eventKey: string | undefined;
  readonly signingKey: string | undefined;
  readonly mode: 'PRODUCTION' | 'DEVELOPMENT';
  readonly signatureValidation: 'ENFORCED' | 'BYPASSED';
}

function validateInngestConfig(): InngestConfig {
  const nodeEnv = process.env.NODE_ENV;
  const inngestDev = process.env.INNGEST_DEV;
  const eventKey = process.env.INNGEST_EVENT_KEY;
  const signingKey = process.env.INNGEST_SIGNING_KEY;

  // 1. Normalize INNGEST_DEV
  let isDevMode = inngestDev === 'true' || inngestDev === undefined;

  if (inngestDev !== undefined && inngestDev !== 'true' && inngestDev !== 'false') {
    console.warn(
      `[Inngest] Invalid INNGEST_DEV value: "${inngestDev}". Expected "true", "false", or undefined. Defaulting to dev mode.`
    );
    isDevMode = true;
  }

  // 2. Production mode requested but keys missing → graceful fallback to dev
  const hasProdKeys = !!eventKey && !!signingKey;
  if (nodeEnv === 'production' && isDevMode) {
    const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
    if (!isBuildPhase) {
      if (hasProdKeys) {
        // Keys present but INNGEST_DEV=true — respect keys, override to prod
        console.warn('[Inngest] Production keys detected but INNGEST_DEV=true. Using PRODUCTION mode.');
        isDevMode = false;
      } else {
        // Local prod testing — no keys, INNGEST_DEV=true. Allow it with warning.
        console.warn('[Inngest] Local production testing detected (no keys, INNGEST_DEV=true). Using DEVELOPMENT mode.');
      }
    }
  }

  // 3. If not in dev mode and no keys → fallback to dev (don't crash)
  if (!isDevMode && !hasProdKeys) {
    console.warn('[Inngest] Production mode requested but keys missing. Falling back to DEVELOPMENT mode.');
    isDevMode = true;
  }

  const config: InngestConfig = {
    isDev: isDevMode,
    eventKey: isDevMode ? undefined : eventKey,
    signingKey: isDevMode ? undefined : signingKey,
    mode: isDevMode ? 'DEVELOPMENT' : 'PRODUCTION',
    signatureValidation: isDevMode ? 'BYPASSED' : 'ENFORCED',
  };

  console.log(
    `[Inngest] Mode: ${config.mode} | Signatures: ${config.signatureValidation}`
  );

  return Object.freeze(config);
}

export const inngestConfig = validateInngestConfig();
