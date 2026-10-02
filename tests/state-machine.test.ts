import { describe, expect, it } from "vitest";
import { canTransition } from "../shared/state-machine";

describe("request state machine", () => {
  it("allows the normal service lifecycle", () => {
    expect(canTransition("PENDING", "TECHNICIAN_ASSIGNED")).toBe(true);
    expect(canTransition("TECHNICIAN_ASSIGNED", "TECHNICIAN_ACCEPTED")).toBe(true);
    expect(canTransition("IN_PROGRESS", "COMPLETED")).toBe(true);
    expect(canTransition("COMPLETED", "PAID")).toBe(true);
    expect(canTransition("PAID", "REVIEWED")).toBe(true);
  });

  it("blocks invalid lifecycle jumps", () => {
    expect(canTransition("PENDING", "COMPLETED")).toBe(false);
    expect(canTransition("COMPLETED", "REVIEWED")).toBe(false);
    expect(canTransition("REVIEWED", "IN_PROGRESS")).toBe(false);
  });

  it("allows cancellation only before terminal states", () => {
    expect(canTransition("IN_PROGRESS", "CANCELLED")).toBe(true);
    expect(canTransition("PAID", "CANCELLED")).toBe(false);
    expect(canTransition("REVIEWED", "CANCELLED")).toBe(false);
  });
});
