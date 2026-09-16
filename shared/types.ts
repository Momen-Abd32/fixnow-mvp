export const REQUEST_STATUSES = [
  "PENDING",
  "TECHNICIAN_ASSIGNED",
  "TECHNICIAN_ACCEPTED",
  "ON_THE_WAY",
  "ARRIVED",
  "IN_PROGRESS",
  "COMPLETED",
  "PAID",
  "REVIEWED",
  "CANCELLED",
  "DISPUTED",
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type Urgency = "standard" | "priority" | "emergency";

export const STATUS_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  PENDING: ["TECHNICIAN_ASSIGNED", "CANCELLED"],
  TECHNICIAN_ASSIGNED: ["TECHNICIAN_ACCEPTED", "CANCELLED"],
  TECHNICIAN_ACCEPTED: ["ON_THE_WAY", "CANCELLED"],
  ON_THE_WAY: ["ARRIVED", "CANCELLED"],
  ARRIVED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: ["PAID", "DISPUTED"],
  PAID: ["REVIEWED", "DISPUTED"],
  REVIEWED: [],
  CANCELLED: [],
  DISPUTED: [],
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: "Finding specialists",
  TECHNICIAN_ASSIGNED: "Awaiting technician",
  TECHNICIAN_ACCEPTED: "Accepted",
  ON_THE_WAY: "On the way",
  ARRIVED: "Arrived",
  IN_PROGRESS: "In progress",
  COMPLETED: "Awaiting payment",
  PAID: "Paid",
  REVIEWED: "Reviewed",
  CANCELLED: "Cancelled",
  DISPUTED: "Disputed",
};

export const DEFAULT_CATEGORIES = [
  { id: 1, name: "AC repair", slug: "ac-repair", description: "Cooling, heating, filters and routine maintenance.", icon: "ac-unit", basePriceMin: 15, basePriceMax: 40 },
  { id: 2, name: "Plumbing", slug: "plumbing", description: "Leaks, drains, fixtures and water pressure.", icon: "plumbing", basePriceMin: 12, basePriceMax: 45 },
  { id: 3, name: "Electrical", slug: "electrical", description: "Safe diagnostics for outlets, lighting and breakers.", icon: "bolt", basePriceMin: 15, basePriceMax: 50 },
  { id: 4, name: "Appliance repair", slug: "appliance-repair", description: "Washers, refrigerators, ovens and more.", icon: "kitchen", basePriceMin: 15, basePriceMax: 55 },
  { id: 5, name: "Internet & network", slug: "network-install", description: "Router setup, wiring and Wi-Fi troubleshooting.", icon: "router", basePriceMin: 10, basePriceMax: 30 },
  { id: 6, name: "Painting", slug: "painting", description: "Walls, touch-ups and interior finishing.", icon: "format-paint", basePriceMin: 20, basePriceMax: 80 },
  { id: 7, name: "Carpentry", slug: "carpentry", description: "Furniture, doors, fittings and custom repairs.", icon: "handyman", basePriceMin: 18, basePriceMax: 65 },
  { id: 8, name: "Home maintenance", slug: "home-maintenance", description: "Multi-task visits and general fixes.", icon: "home-repair-service", basePriceMin: 15, basePriceMax: 50 },
] as const;

export const AI_DISCLAIMER = "This is a preliminary estimate based on the information you shared. It does not replace an on-site professional inspection. If you notice fire, smoke, sparking, gas smell, flooding, or an immediate safety risk, move to a safe area and contact emergency services.";

export function haversineKm(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
  const radius = 6371;
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((from.latitude * Math.PI) / 180) * Math.cos((to.latitude * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function canTransition(from: RequestStatus, to: RequestStatus) {
  return STATUS_TRANSITIONS[from].includes(to);
}
