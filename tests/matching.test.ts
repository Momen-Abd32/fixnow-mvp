import { describe, expect, it } from "vitest";
import { rankTechnicians, scoreTechnician } from "../shared/matching";

describe("technician matching", () => {
  const location = { latitude: 31.95, longitude: 35.91 };

  it("excludes technicians outside their service radius", () => {
    const result = scoreTechnician(
      {
        technicianId: 1,
        rating: 5,
        completedJobs: 100,
        serviceRadiusKm: 2,
        availability: true,
        latitude: 32.1,
        longitude: 35.91,
      },
      location,
    );

    expect(result).toBeNull();
  });

  it("keeps the score explainable and bounded", () => {
    const result = scoreTechnician(
      {
        technicianId: 1,
        rating: 5,
        completedJobs: 100,
        serviceRadiusKm: 10,
        availability: true,
        latitude: 31.96,
        longitude: 35.91,
      },
      location,
    );

    expect(result).not.toBeNull();
    expect(result!.score).toBeGreaterThan(0);
    expect(result!.score).toBeLessThanOrEqual(100);
    expect(result!.distanceKm).toBeGreaterThanOrEqual(0);
  });

  it("ranks by score and uses distance as the tie-breaker", () => {
    const candidates = [
      { technicianId: 1, rating: 5, completedJobs: 100, serviceRadiusKm: 10, availability: true, latitude: 31.96, longitude: 35.91 },
      { technicianId: 2, rating: 5, completedJobs: 100, serviceRadiusKm: 10, availability: true, latitude: 31.955, longitude: 35.91 },
    ].map((candidate) => scoreTechnician(candidate, location)!);

    expect(rankTechnicians(candidates).map((item) => item.technicianId)).toEqual([2, 1]);
  });
});
