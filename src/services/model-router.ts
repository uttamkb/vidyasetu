import { UserRole, SubscriptionPlan } from "@prisma/client";

export interface ModelRoutingConfig {
  role: UserRole;
  plan: SubscriptionPlan;
  taskType: "EVALUATION" | "GENERATION" | "FEEDBACK";
  isSubjective?: boolean;
}

/**
 * Smart Model Router — selects the optimal Gemini model tier based on user tier and task.
 */
export function selectBestModel(config: ModelRoutingConfig): "PRO" | "FLASH" {
  const { role, plan, taskType, isSubjective } = config;

  // 1. Admins/Super-Admins always get the best models
  if (role === "ADMIN" || role === "SUPER_ADMIN") {
    return "PRO";
  }

  // 2. Pro Users
  if (plan === "PRO") {
    // Pro users get Gemini Pro for subjective evaluations
    if (taskType === "EVALUATION" && isSubjective) {
      return "PRO";
    }
    // For general feedback or simple generation, Flash is still better/faster
    return "FLASH";
  }

  // 3. Free Users / Defaults
  // Free users always use Flash to minimize costs and RPM impact on the single key
  return "FLASH";
}

/**
 * Priority Level for Inngest jobs.
 * 0 = High (Pro users), 1 = Standard (Free users)
 */
export function getQueuePriority(plan: SubscriptionPlan): number {
  return plan === "PRO" ? 0 : 1;
}

/**
 * Batch timeout for Inngest.
 * Pro users have shorter wait times for background tasks.
 */
export function getBatchTimeout(plan: SubscriptionPlan): string {
  return plan === "PRO" ? "5s" : "30s";
}
