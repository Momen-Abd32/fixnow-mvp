import { haversineKm } from "./types";

export type MatchingCandidateInput = {
  technicianId: number;
  rating: number;
  completedJobs: number;
  serviceRadiusKm: number;
  availability: boolean;
  latitude: number;
  longitude: number;
};

export type MatchingCandidate = MatchingCandidateInput & {
  distanceKm: number;
  etaMinutes: number;
  score: number;
};

export function scoreTechnician(
  candidate: MatchingCandidateInput,
  customerLocation: { latitude: number; longitude: number },
): MatchingCandidate | null {
  const distanceKm = haversineKm(customerLocation, {
    latitude: candidate.latitude,
    longitude: candidate.longitude,
  });

  if (distanceKm > candidate.serviceRadiusKm) return null;

  const ratingFactor = Math.min(Math.max(candidate.rating, 0) / 5, 1) * 25;
  const experienceFactor = Math.min(Math.max(candidate.completedJobs, 0) / 100, 1) * 15;
  const distanceFactor =
    Math.max(0, 1 - distanceKm / Math.max(candidate.serviceRadiusKm, 1)) * 45;
  const availabilityFactor = candidate.availability ? 15 : 0;

  return {
    ...candidate,
    distanceKm: Number(distanceKm.toFixed(1)),
    etaMinutes: Math.max(12, Math.round(distanceKm * 5 + 8)),
    score: Number(
      (ratingFactor + experienceFactor + distanceFactor + availabilityFactor).toFixed(1),
    ),
  };
}

export function rankTechnicians(
  candidates: MatchingCandidate[],
  limit = 5,
) {
  return [...candidates]
    .sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm)
    .slice(0, limit);
}
