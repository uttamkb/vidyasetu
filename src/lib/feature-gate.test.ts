import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isFeatureEnabled,
  getFeatureState,
  setFeatureState,
  getAllFeatureGates,
  resetFeatureGates,
} from "./feature-gate";

describe("feature-gate", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    resetFeatureGates();
  });

  it("returns false for unknown features", () => {
    expect(isFeatureEnabled("unknownFeature")).toBe(false);
  });

  it("returns true when feature is ON", async () => {
    await setFeatureState("contentCaching", "ON");
    expect(isFeatureEnabled("contentCaching")).toBe(true);
  });

  it("returns false when feature is OFF", async () => {
    await setFeatureState("aiTutor", "OFF");
    expect(isFeatureEnabled("aiTutor")).toBe(false);
  });

  it("returns false for SHADOW mode when not admin", async () => {
    await setFeatureState("newDashboard", "SHADOW");
    expect(isFeatureEnabled("newDashboard", undefined, false)).toBe(false);
  });

  it("returns true for SHADOW mode when admin", async () => {
    await setFeatureState("newDashboard", "SHADOW");
    expect(isFeatureEnabled("newDashboard", undefined, true)).toBe(true);
  });

  it("sets and gets feature state", async () => {
    await setFeatureState("contentCaching", "OFF");
    expect(getFeatureState("contentCaching")).toBe("OFF");
  });

  it("throws on invalid feature name", async () => {
    await expect(setFeatureState("invalid", "ON")).rejects.toThrow("Unknown feature gate");
  });

  it("throws on invalid state", async () => {
    await expect(setFeatureState("contentCaching", "INVALID" as any)).rejects.toThrow("Invalid state");
  });

  it("returns all feature gates", () => {
    const gates = getAllFeatureGates();
    expect(gates.length).toBeGreaterThan(0);
    expect(gates[0]).toHaveProperty("name");
    expect(gates[0]).toHaveProperty("state");
    expect(gates[0]).toHaveProperty("description");
  });
});
