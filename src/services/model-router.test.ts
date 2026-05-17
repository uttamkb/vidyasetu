import { describe, it, expect } from "vitest";
import { selectBestModel, getQueuePriority, getBatchTimeout } from "./model-router";

describe("model-router", () => {
  describe("selectBestModel", () => {
    it("returns PRO for ADMIN role regardless of plan", () => {
      expect(selectBestModel({ role: "ADMIN", plan: "FREE", taskType: "EVALUATION" })).toBe("PRO");
    });

    it("returns PRO for SUPER_ADMIN role", () => {
      expect(selectBestModel({ role: "SUPER_ADMIN", plan: "FREE", taskType: "GENERATION" })).toBe("PRO");
    });

    it("returns PRO for PRO plan + subjective EVALUATION", () => {
      expect(selectBestModel({ role: "STUDENT", plan: "PRO", taskType: "EVALUATION", isSubjective: true })).toBe("PRO");
    });

    it("returns FLASH for PRO plan + non-subjective EVALUATION", () => {
      expect(selectBestModel({ role: "STUDENT", plan: "PRO", taskType: "EVALUATION", isSubjective: false })).toBe("FLASH");
    });

    it("returns FLASH for PRO plan + GENERATION task", () => {
      expect(selectBestModel({ role: "STUDENT", plan: "PRO", taskType: "GENERATION" })).toBe("FLASH");
    });

    it("returns FLASH for PRO plan + FEEDBACK task", () => {
      expect(selectBestModel({ role: "STUDENT", plan: "PRO", taskType: "FEEDBACK" })).toBe("FLASH");
    });

    it("returns FLASH for FREE plan + subjective EVALUATION (cost control)", () => {
      expect(selectBestModel({ role: "STUDENT", plan: "FREE", taskType: "EVALUATION", isSubjective: true })).toBe("FLASH");
    });

    it("returns FLASH for FREE plan + GENERATION", () => {
      expect(selectBestModel({ role: "STUDENT", plan: "FREE", taskType: "GENERATION" })).toBe("FLASH");
    });

    it("returns FLASH when isSubjective is undefined for PRO plan evaluation", () => {
      expect(selectBestModel({ role: "STUDENT", plan: "PRO", taskType: "EVALUATION" })).toBe("FLASH");
    });
  });

  describe("getQueuePriority", () => {
    it("returns 0 (high priority) for PRO plan", () => {
      expect(getQueuePriority("PRO")).toBe(0);
    });

    it("returns 1 (standard priority) for FREE plan", () => {
      expect(getQueuePriority("FREE")).toBe(1);
    });

    it("returns 1 for BASIC plan", () => {
      expect(getQueuePriority("FREE")).toBe(1);
    });
  });

  describe("getBatchTimeout", () => {
    it("returns 5s for PRO plan", () => {
      expect(getBatchTimeout("PRO")).toBe("5s");
    });

    it("returns 30s for FREE plan", () => {
      expect(getBatchTimeout("FREE")).toBe("30s");
    });

    it("returns 30s for BASIC plan", () => {
      expect(getBatchTimeout("FREE")).toBe("30s");
    });
  });
});
