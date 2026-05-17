import { cacheClear } from "@/lib/cache";
import { beforeEach } from "vitest";

// Clear memory cache before each test to prevent cross-test pollution
beforeEach(() => {
  cacheClear();
});

// Only load jest-dom matchers when DOM APIs are available
if (typeof window !== "undefined" && typeof document !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@testing-library/jest-dom");
}
