import { describe, expect, it } from "vitest";
import { canTransition, haversineKm, STATUS_TRANSITIONS } from "../shared/types";

describe("FixNow request lifecycle", () => {
  it("accepts only defined request-state edges", () => {
    expect(canTransition("PENDING", "TECHNICIAN_ASSIGNED")).toBe(true);
    expect(canTransition("TECHNICIAN_ASSIGNED", "TECHNICIAN_ACCEPTED")).toBe(true);
    expect(canTransition("IN_PROGRESS", "COMPLETED")).toBe(true);
    expect(canTransition("COMPLETED", "PAID")).toBe(true);
    expect(canTransition("PAID", "REVIEWED")).toBe(true);
    expect(canTransition("PENDING", "COMPLETED")).toBe(false);
    expect(canTransition("CANCELLED", "PENDING")).toBe(false);
    expect(STATUS_TRANSITIONS.REVIEWED).toHaveLength(0);
  });

  it("calculates a symmetric distance for matching", () => {
    const amman = { latitude: 31.9539, longitude: 35.9106 };
    const nearby = { latitude: 31.967, longitude: 35.923 };
    const forward = haversineKm(amman, nearby);
    const reverse = haversineKm(nearby, amman);
    expect(forward).toBeGreaterThan(1);
    expect(forward).toBeLessThan(3);
    expect(forward).toBeCloseTo(reverse, 8);
  });
});
