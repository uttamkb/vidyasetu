/**
 * feature-gate.ts — Runtime feature toggles with shadow mode support
 *
 * Features can be in one of three states:
 *   - OFF: Feature is disabled for everyone
 *   - SHADOW: Feature runs in background, visible to admins only
 *   - ON: Feature is enabled for everyone
 *
 * Controlled via:
 *   1. Environment variables (default state)
 *   2. Runtime overrides (via admin API)
 *   3. Per-user overrides (future: A/B testing)
 *
 * Usage:
 *   if (isFeatureEnabled("newDashboard")) { ... }
 *   if (isFeatureEnabled("newDashboard", userId)) { ... } // checks user override
 */

import { getRedis, isRedisAvailable } from "./redis";

export type FeatureState = "OFF" | "SHADOW" | "ON";

interface FeatureGateConfig {
  defaultState: FeatureState;
  description: string;
  rolloutPercentage?: number; // 0-100, for gradual rollout
}

// Default feature gates — env vars override these
const DEFAULT_GATES: Record<string, FeatureGateConfig> = {
  newDashboard: {
    defaultState: (process.env.FEATURE_NEW_DASHBOARD as FeatureState) || "OFF",
    description: "Redesigned student dashboard with progress cards",
  },
  aiTutor: {
    defaultState: (process.env.FEATURE_AI_TUTOR as FeatureState) || "OFF",
    description: "AI-powered doubt-solving chat interface",
  },
  gamificationV2: {
    defaultState: (process.env.FEATURE_GAMIFICATION_V2 as FeatureState) || "OFF",
    description: "Enhanced badges, streaks, and leaderboard V2",
  },
  contentCaching: {
    defaultState: (process.env.FEATURE_CONTENT_CACHING as FeatureState) || "ON",
    description: "Cache AI-generated content packs (PI-3)",
  },
  evaluationCaching: {
    defaultState: (process.env.FEATURE_EVALUATION_CACHING as FeatureState) || "ON",
    description: "Cache AI evaluation results (PI-3)",
  },
};

// Runtime overrides (in-memory, lost on restart)
const runtimeOverrides = new Map<string, FeatureState>();

/**
 * Check if a feature is enabled.
 *
 * @param featureName - The feature gate key
 * @param userId - Optional user ID for per-user checks
 * @param isAdmin - Whether the user is an admin (shadow mode visible to admins)
 */
export function isFeatureEnabled(
  featureName: string,
  userId?: string,
  isAdmin = false
): boolean {
  const state = getFeatureState(featureName, userId);

  if (state === "ON") return true;
  if (state === "SHADOW") return isAdmin; // Only visible to admins in shadow mode
  return false;
}

/**
 * Get the current state of a feature gate.
 */
export function getFeatureState(featureName: string, _userId?: string): FeatureState {
  // 1. Check runtime override
  if (runtimeOverrides.has(featureName)) {
    return runtimeOverrides.get(featureName)!;
  }

  // 2. Check Redis (distributed override)
  // Note: Redis check is async, we can't await in sync function.
  // For now, rely on in-memory overrides. Redis sync happens on admin API call.

  // 3. Check env var / default
  const config = DEFAULT_GATES[featureName];
  if (!config) {
    console.warn(`[feature-gate] Unknown feature: ${featureName}`);
    return "OFF";
  }

  return config.defaultState;
}

/**
 * Set a feature gate state (admin API use).
 * Persists to Redis if available.
 */
export async function setFeatureState(featureName: string, state: FeatureState): Promise<void> {
  if (!DEFAULT_GATES[featureName]) {
    throw new Error(`Unknown feature gate: ${featureName}`);
  }

  if (!["OFF", "SHADOW", "ON"].includes(state)) {
    throw new Error(`Invalid state: ${state}. Must be OFF, SHADOW, or ON.`);
  }

  // Update runtime override
  runtimeOverrides.set(featureName, state);

  // Persist to Redis if available
  if (isRedisAvailable()) {
    try {
      const redis = await getRedis();
      if (redis) {
        await redis.set(`feature:${featureName}`, state);
      }
    } catch (err) {
      console.error("[feature-gate] Redis persist failed:", err);
    }
  }

  console.log(`[feature-gate] ${featureName} → ${state}`);
}

/**
 * Get all feature gates with their current states.
 */
export function getAllFeatureGates(): Array<{
  name: string;
  state: FeatureState;
  description: string;
  defaultState: FeatureState;
}> {
  return Object.entries(DEFAULT_GATES).map(([name, config]) => ({
    name,
    state: getFeatureState(name),
    description: config.description,
    defaultState: config.defaultState,
  }));
}

/**
 * Clear all runtime overrides (useful for tests).
 */
export function resetFeatureGates(): void {
  runtimeOverrides.clear();
}

/**
 * Load feature states from Redis on startup.
 */
export async function syncFeatureGatesFromRedis(): Promise<void> {
  if (!isRedisAvailable()) return;

  try {
    const redis = await getRedis();
    if (!redis) return;

    for (const name of Object.keys(DEFAULT_GATES)) {
      const stored = await redis.get(`feature:${name}`);
      if (stored && ["OFF", "SHADOW", "ON"].includes(stored)) {
        runtimeOverrides.set(name, stored as FeatureState);
      }
    }
    console.log("[feature-gate] Synced from Redis:", runtimeOverrides.size, "overrides");
  } catch (err) {
    console.error("[feature-gate] Redis sync failed:", err);
  }
}
