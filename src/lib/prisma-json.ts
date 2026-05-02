/**
 * prisma-json.ts — Type-safe helper for Prisma Json fields
 *
 * Prisma's `Json` column type accepts `Prisma.InputJsonValue`, but TypeScript
 * won't accept typed objects directly without a cast. This helper provides a
 * semantically clear, reusable alternative to `as never` or `as any`.
 *
 * Usage:
 *   await prisma.assignment.create({ data: { questions: toJson(questionList) } });
 */
import type { Prisma } from "@prisma/client";

export function toJson<T>(value: T): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}
