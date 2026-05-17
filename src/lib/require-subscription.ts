/**
 * require-subscription.ts — Subscription & feature access control
 *
 * Checks if a user has access to a feature based on their subscription plan.
 * Operates in SHADOW MODE by default — logs violations but does NOT block.
 *
 * To go LIVE (PI 5), set FEATURE_GATES_ENABLED=true and remove shadowMode flag.
 *
 * Usage:
 *   const access = await requireSubscription(userId, "ASSIGNMENT_GENERATION");
 *   if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: 403 });
 */

import { prisma } from "@/lib/db";
import { getRedis, isRedisAvailable } from "./redis";

export type FeatureKey = "ASSIGNMENT_GENERATION" | "EVALUATION" | "CONTENT_ACCESS" | "LEADERBOARD" | "AI_STUDY_NOTES" | "WORKSHEET_GENERATION" | "AI_TUTOR_CHAT";

interface AccessResult {
  allowed: boolean;
  reason: string;
  code: string;
  shadowMode: boolean;
}

// Feature limits by plan
const PLAN_LIMITS: Record<string, Record<FeatureKey, { daily: number; monthly: number }>> = {
  FREE: {
    ASSIGNMENT_GENERATION: { daily: 3, monthly: 10 },
    EVALUATION: { daily: 10, monthly: 50 },
    CONTENT_ACCESS: { daily: 999, monthly: 999 },
    LEADERBOARD: { daily: 999, monthly: 999 },
    AI_STUDY_NOTES: { daily: 5, monthly: 20 },
    WORKSHEET_GENERATION: { daily: 1, monthly: 4 },
    AI_TUTOR_CHAT: { daily: 5, monthly: 30 },
  },
  PRO: {
    ASSIGNMENT_GENERATION: { daily: 50, monthly: 500 },
    EVALUATION: { daily: 100, monthly: 1000 },
    CONTENT_ACCESS: { daily: 999, monthly: 999 },
    LEADERBOARD: { daily: 999, monthly: 999 },
    AI_STUDY_NOTES: { daily: 20, monthly: 100 },
    WORKSHEET_GENERATION: { daily: 3, monthly: 10 },
    AI_TUTOR_CHAT: { daily: 50, monthly: 500 },
  },
};

const DAILY_COST_LIMITS = {
  FREE: 1.00, // $1.00 per day max for free users
  PRO: 10.00, // $10.00 per day max for pro users
  GLOBAL: 100.00, // $100.00 per day total platform budget
};

// Shadow mode: logs what WOULD block, but doesn't actually block
// Enforcement is ON by default. Set FEATURE_GATES_ENABLED=shadow to disable.
function isShadowMode(): boolean {
  return process.env.FEATURE_GATES_ENABLED === "shadow";
}

/**
 * Check if user has access to a feature.
 * In shadow mode, always returns allowed=true but logs violations.
 */
export async function requireSubscription(
  userId: string,
  feature: FeatureKey
): Promise<AccessResult> {
  // Fetch user plan
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionPlan: true,
      subscriptionStatus: true,
      subscriptionExpiresAt: true,
      isActive: true,
    },
  });

  if (!user) {
    return { allowed: false, reason: "User not found", code: "USER_NOT_FOUND", shadowMode: false };
  }

  if (!user.isActive) {
    const result = { allowed: false, reason: "Account disabled", code: "ACCOUNT_DISABLED", shadowMode: isShadowMode() };
    logShadow("ACCOUNT_DISABLED", userId, feature, result);
    return result;
  }

  // Check subscription expiry
  if (user.subscriptionStatus === "EXPIRED" ||
    (user.subscriptionExpiresAt && user.subscriptionExpiresAt < new Date())) {
    const result = { allowed: false, reason: "Subscription expired", code: "SUBSCRIPTION_EXPIRED", shadowMode: isShadowMode() };
    logShadow("SUBSCRIPTION_EXPIRED", userId, feature, result);
    return result;
  }

  const plan = user.subscriptionPlan || "FREE";
  const limits = PLAN_LIMITS[plan]?.[feature];

  if (!limits) {
    // Unknown plan/feature — allow but warn
    console.warn(`[requireSubscription] Unknown plan "${plan}" or feature "${feature}" for user ${userId}`);
    return { allowed: true, reason: "Unknown plan — allowing", code: "UNKNOWN_PLAN", shadowMode: isShadowMode() };
  }

  // Check daily usage
  const dailyUsage = await getDailyUsage(userId, feature);
  if (dailyUsage >= limits.daily) {
    const result = {
      allowed: false,
      reason: `Daily limit reached (${limits.daily} ${feature} per day)`,
      code: "DAILY_LIMIT_REACHED",
      shadowMode: isShadowMode(),
    };
    logShadow("DAILY_LIMIT_REACHED", userId, feature, result, { limit: limits.daily, usage: dailyUsage });
    return result;
  }

  // Check monthly usage
  const monthlyUsage = await getMonthlyUsage(userId, feature);
  if (monthlyUsage >= limits.monthly) {
    const result = {
      allowed: false,
      reason: `Monthly limit reached (${limits.monthly} ${feature} per month)`,
      code: "MONTHLY_LIMIT_REACHED",
      shadowMode: isShadowMode(),
    };
    logShadow("MONTHLY_LIMIT_REACHED", userId, feature, result, { limit: limits.monthly, usage: monthlyUsage });
    return result;
  }

  // Check Daily Token Budget
  const budget = await checkBudget(userId, plan);
  if (!budget.allowed) {
    const result = {
      allowed: false,
      reason: budget.reason,
      code: "BUDGET_EXCEEDED",
      shadowMode: isShadowMode(),
    };
    logShadow("BUDGET_EXCEEDED", userId, feature, result, { cost: budget.currentCost });
    return result;
  }

  return { allowed: true, reason: "Access granted", code: "OK", shadowMode: isShadowMode() };
}

/**
 * Increment usage counter for a feature.
 * Call this AFTER successful feature use.
 */
export async function incrementUsage(userId: string, feature: FeatureKey): Promise<void> {
  if (!isRedisAvailable()) return;

  try {
    const redis = await getRedis();
    if (!redis) return;

    const dailyKey = `usage:daily:${userId}:${feature}:${getDayKey()}`;
    const monthlyKey = `usage:monthly:${userId}:${feature}:${getMonthKey()}`;

    await redis.incr(dailyKey);
    await redis.incr(monthlyKey);
    await redis.expire(dailyKey, 48 * 60 * 60); // 48h TTL
    await redis.expire(monthlyKey, 35 * 24 * 60 * 60); // 35 days TTL
  } catch (err) {
    console.error("[requireSubscription] Failed to increment usage:", err);
  }
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

async function getDailyUsage(userId: string, feature: FeatureKey): Promise<number> {
  if (!isRedisAvailable()) return 0;

  try {
    const redis = await getRedis();
    if (!redis) return 0;

    const key = `usage:daily:${userId}:${feature}:${getDayKey()}`;
    const val = await redis.get(key);
    return val ? parseInt(val) : 0;
  } catch {
    return 0;
  }
}

async function getMonthlyUsage(userId: string, feature: FeatureKey): Promise<number> {
  if (!isRedisAvailable()) return 0;

  try {
    const redis = await getRedis();
    if (!redis) return 0;

    const key = `usage:monthly:${userId}:${feature}:${getMonthKey()}`;
    const val = await redis.get(key);
    return val ? parseInt(val) : 0;
  } catch {
    return 0;
  }
}

async function checkBudget(userId: string, plan: string): Promise<{ allowed: boolean; reason: string; currentCost: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Check User Daily Spend
  const userUsage = await prisma.userAIUsage.aggregate({
    where: { userId, date: today },
    _sum: { actualCostUsd: true }
  });

  const currentCost = Number(userUsage._sum.actualCostUsd || 0);
  const userLimit = DAILY_COST_LIMITS[plan as keyof typeof DAILY_COST_LIMITS] || DAILY_COST_LIMITS.FREE;

  if (currentCost >= userLimit) {
    return { allowed: false, reason: "Personal daily AI budget exceeded", currentCost };
  }

  // 2. Check Global Daily Spend (optional but recommended)
  // This could be cached in Redis for speed, but querying DB once per feature request is fine for now
  const globalUsage = await prisma.userAIUsage.aggregate({
    where: { date: today },
    _sum: { actualCostUsd: true }
  });

  const totalCost = Number(globalUsage._sum.actualCostUsd || 0);
  if (totalCost >= DAILY_COST_LIMITS.GLOBAL) {
    return { allowed: false, reason: "Global platform AI budget reached. Throttling all requests.", currentCost: totalCost };
  }

  return { allowed: true, reason: "Within budget", currentCost };
}

function getDayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function logShadow(
  violation: string,
  userId: string,
  feature: FeatureKey,
  result: AccessResult,
  extra?: Record<string, any>
): void {
  if (isShadowMode()) {
    console.log(`[SHADOW] Would block: ${violation} | user=${userId} | feature=${feature} | reason="${result.reason}"`, extra ?? "");
  }
}
