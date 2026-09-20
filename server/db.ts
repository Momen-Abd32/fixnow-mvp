import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  messages,
  notifications,
  payments,
  requestMatches,
  reviews,
  serviceCategories,
  serviceRequests,
  technicianProfiles,
  type InsertUser,
  type RequestStatus,
  users,
} from "../drizzle/schema";
import { DEFAULT_CATEGORIES, haversineKm } from "../shared/types";
import { ENV } from "./_core/env";

let dbInstance: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!dbInstance && process.env.DATABASE_URL) {
    try {
      dbInstance = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[database] connection unavailable", error);
      dbInstance = null;
    }
  }
  return dbInstance;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable. Check deployment configuration.");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updates: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updates[field] = user[field] ?? null;
    }
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updates.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updates.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updates });
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const results = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return results[0];
}

export async function createLocalUser(input: {
  openId: string;
  name: string;
  email: string;
  passwordHash: string;
}) {
  const db = await requireDb();
  await db.insert(users).values({
    openId: input.openId,
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash: input.passwordHash,
    loginMethod: "email",
    lastSignedIn: new Date(),
    role: ENV.adminEmail && input.email.toLowerCase() === ENV.adminEmail ? "admin" : "user",
  });
  return getUserByOpenId(input.openId);
}

export async function updateLastSignedIn(openId: string) {
  const db = await requireDb();
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.openId, openId));
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const results = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return results[0];
}

export async function ensureCatalog() {
  const db = await requireDb();
  for (const category of DEFAULT_CATEGORIES) {
    await db
      .insert(serviceCategories)
      .values({ ...category, active: true })
      .onDuplicateKeyUpdate({ set: { name: category.name, description: category.description, icon: category.icon, basePriceMin: category.basePriceMin, basePriceMax: category.basePriceMax } });
  }
}

export async function listCategories(includeInactive = false) {
  await ensureCatalog();
  const db = await requireDb();
  return db.select().from(serviceCategories).where(includeInactive ? undefined : eq(serviceCategories.active, true));
}

export async function getCategory(id: number) {
  await ensureCatalog();
  const db = await requireDb();
  const result = await db.select().from(serviceCategories).where(eq(serviceCategories.id, id)).limit(1);
  return result[0];
}

export async function registerTechnician(input: {
  userId: number;
  serviceIds: number[];
  serviceRadiusKm: number;
  hourlyRate: number;
  bio?: string;
  documents?: Array<{ name: string; url: string; key: string }>;
}) {
  const db = await requireDb();
  await db.update(users).set({ accountRole: "technician" }).where(eq(users.id, input.userId));
  await db.insert(technicianProfiles).values({ ...input, availability: false, verificationStatus: "pending" }).onDuplicateKeyUpdate({
    set: { serviceIds: input.serviceIds, serviceRadiusKm: input.serviceRadiusKm, hourlyRate: input.hourlyRate, bio: input.bio, documents: input.documents },
  });
  return getTechnicianProfileByUser(input.userId);
}

export async function getTechnicianProfileByUser(userId: number) {
  const db = await requireDb();
  const rows = await db.select().from(technicianProfiles).where(eq(technicianProfiles.userId, userId)).limit(1);
  return rows[0];
}

export async function setTechnicianAvailability(userId: number, availability: boolean) {
  const db = await requireDb();
  await db.update(technicianProfiles).set({ availability }).where(eq(technicianProfiles.userId, userId));
  return getTechnicianProfileByUser(userId);
}

export async function updateTechnicianLocation(userId: number, latitude: number, longitude: number) {
  const db = await requireDb();
  await db.update(technicianProfiles).set({ latitude, longitude }).where(eq(technicianProfiles.userId, userId));
}

export async function findMatchingTechnicians(serviceId: number, location: { latitude: number; longitude: number }) {
  const db = await requireDb();
  const candidates = await db
    .select({ profile: technicianProfiles, user: users })
    .from(technicianProfiles)
    .innerJoin(users, eq(technicianProfiles.userId, users.id))
    .where(and(eq(technicianProfiles.availability, true), eq(technicianProfiles.verificationStatus, "verified")));

  return candidates
    .filter(({ profile }) => profile.serviceIds.includes(serviceId) && profile.latitude !== null && profile.longitude !== null)
    .map(({ profile, user }) => {
      const distanceKm = haversineKm(location, { latitude: profile.latitude!, longitude: profile.longitude! });
      const isInRange = distanceKm <= profile.serviceRadiusKm;
      const ratingFactor = Math.min(profile.rating / 5, 1) * 25;
      const experienceFactor = Math.min(profile.completedJobs / 100, 1) * 15;
      const distanceFactor = Math.max(0, 1 - distanceKm / Math.max(profile.serviceRadiusKm, 1)) * 45;
      const availabilityFactor = profile.availability ? 15 : 0;
      return {
        technicianId: profile.id,
        name: user.name ?? "Verified technician",
        profileImage: user.profileImage,
        rating: Number(profile.rating),
        completedJobs: profile.completedJobs,
        hourlyRate: profile.hourlyRate,
        distanceKm: Number(distanceKm.toFixed(1)),
        etaMinutes: Math.max(12, Math.round(distanceKm * 5 + 8)),
        score: Number((ratingFactor + experienceFactor + distanceFactor + availabilityFactor).toFixed(1)),
        isInRange,
      };
    })
    .filter((candidate) => candidate.isInRange)
    .sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm)
    .slice(0, 5);
}

export async function createRequest(input: {
  customerId: number;
  serviceId: number;
  description: string;
  media?: Array<{ url: string; key: string; mimeType: string }>;
  address: string;
  latitude: number;
  longitude: number;
  urgency: "standard" | "priority" | "emergency";
  notes?: string;
  scheduledAt?: Date;
}) {
  const db = await requireDb();
  const category = await getCategory(input.serviceId);
  if (!category?.active) throw new Error("The selected service category is unavailable.");
  const urgencyMultiplier = input.urgency === "emergency" ? 1.5 : input.urgency === "priority" ? 1.2 : 1;
  const estimatedMin = Math.round(category.basePriceMin * urgencyMultiplier);
  const estimatedMax = Math.round(category.basePriceMax * urgencyMultiplier);
  const result = await db.insert(serviceRequests).values({ ...input, estimatedMin, estimatedMax });
  const requestId = Number(result[0].insertId);
  const matches = await findMatchingTechnicians(input.serviceId, input);
  if (matches.length) {
    await db.insert(requestMatches).values(matches.map((match) => ({
      requestId,
      technicianId: match.technicianId,
      score: match.score,
      distanceKm: match.distanceKm,
      etaMinutes: match.etaMinutes,
      estimatedPrice: Math.max(estimatedMin, Math.min(estimatedMax, match.hourlyRate)),
    })));
  }
  await createNotification(input.customerId, "Request received", matches.length ? `${matches.length} qualified technicians are ready to review your request.` : "We are expanding the nearby search for your request.", "request", requestId);
  return { requestId, estimatedMin, estimatedMax, matchCount: matches.length };
}

export async function getRequestMatches(requestId: number) {
  const db = await requireDb();
  return db
    .select({ match: requestMatches, profile: technicianProfiles, user: users })
    .from(requestMatches)
    .innerJoin(technicianProfiles, eq(requestMatches.technicianId, technicianProfiles.id))
    .innerJoin(users, eq(technicianProfiles.userId, users.id))
    .where(eq(requestMatches.requestId, requestId))
    .orderBy(desc(requestMatches.score));
}

export async function getRequestDetail(requestId: number) {
  const db = await requireDb();
  const rows = await db
    .select({ request: serviceRequests, category: serviceCategories, technician: technicianProfiles, technicianUser: users })
    .from(serviceRequests)
    .innerJoin(serviceCategories, eq(serviceRequests.serviceId, serviceCategories.id))
    .leftJoin(technicianProfiles, eq(serviceRequests.technicianId, technicianProfiles.id))
    .leftJoin(users, eq(technicianProfiles.userId, users.id))
    .where(eq(serviceRequests.id, requestId))
    .limit(1);
  return rows[0];
}

export async function listRequestsForCustomer(customerId: number) {
  const db = await requireDb();
  return db
    .select({ request: serviceRequests, category: serviceCategories, technician: technicianProfiles, technicianUser: users })
    .from(serviceRequests)
    .innerJoin(serviceCategories, eq(serviceRequests.serviceId, serviceCategories.id))
    .leftJoin(technicianProfiles, eq(serviceRequests.technicianId, technicianProfiles.id))
    .leftJoin(users, eq(technicianProfiles.userId, users.id))
    .where(eq(serviceRequests.customerId, customerId))
    .orderBy(desc(serviceRequests.updatedAt));
}

export async function listRequestsForTechnician(userId: number) {
  const profile = await getTechnicianProfileByUser(userId);
  if (!profile) return [];
  const db = await requireDb();
  return db
    .select({ request: serviceRequests, category: serviceCategories, customer: users })
    .from(serviceRequests)
    .innerJoin(serviceCategories, eq(serviceRequests.serviceId, serviceCategories.id))
    .innerJoin(users, eq(serviceRequests.customerId, users.id))
    .where(eq(serviceRequests.technicianId, profile.id))
    .orderBy(desc(serviceRequests.updatedAt));
}

export async function assignTechnician(requestId: number, technicianId: number) {
  const db = await requireDb();
  await db.update(serviceRequests).set({ technicianId, status: "TECHNICIAN_ASSIGNED" }).where(and(eq(serviceRequests.id, requestId), eq(serviceRequests.status, "PENDING")));
  const profile = await db.select().from(technicianProfiles).where(eq(technicianProfiles.id, technicianId)).limit(1);
  if (!profile[0]) throw new Error("Technician was not found.");
  await createNotification(profile[0].userId, "New job opportunity", "A customer selected you for a nearby service request.", "request", requestId);
  return getRequestDetail(requestId);
}

export async function updateRequestStatus(requestId: number, status: RequestStatus, extras: { acceptedAt?: Date; completedAt?: Date; finalPrice?: number } = {}) {
  const db = await requireDb();
  await db.update(serviceRequests).set({ status, ...extras }).where(eq(serviceRequests.id, requestId));
  return getRequestDetail(requestId);
}

export async function createNotification(recipientId: number, title: string, body: string, type: string, requestId?: number) {
  const db = await requireDb();
  await db.insert(notifications).values({ recipientId, title, body, type, requestId });
}

export async function listMessages(requestId: number) {
  const db = await requireDb();
  return db.select().from(messages).where(eq(messages.requestId, requestId)).orderBy(messages.createdAt);
}

export async function addMessage(input: { requestId: number; senderId: number; receiverId: number; message: string }) {
  const db = await requireDb();
  await db.insert(messages).values(input);
  await createNotification(input.receiverId, "New message", "You have a new message about your FixNow request.", "message", input.requestId);
}

export async function createPayment(input: { requestId: number; customerId: number; technicianId: number; amount: number; method: "cash" | "card" | "wallet" }) {
  const db = await requireDb();
  const result = await db.insert(payments).values(input);
  return Number(result[0].insertId);
}

export async function getPaymentForRequest(requestId: number) {
  const db = await requireDb();
  const rows = await db.select().from(payments).where(eq(payments.requestId, requestId)).orderBy(desc(payments.createdAt)).limit(1);
  return rows[0];
}

export async function markCashPaid(requestId: number) {
  const db = await requireDb();
  await db.update(payments).set({ status: "paid", transactionId: `cash-${requestId}-${Date.now()}` }).where(eq(payments.requestId, requestId));
  return updateRequestStatus(requestId, "PAID");
}

export async function createReview(input: { customerId: number; technicianId: number; requestId: number; rating: number; comment?: string }) {
  const db = await requireDb();
  await db.insert(reviews).values(input);
  const scores = await db.select({ rating: reviews.rating }).from(reviews).where(eq(reviews.technicianId, input.technicianId));
  const average = scores.reduce((total, review) => total + review.rating, 0) / scores.length;
  await db.update(technicianProfiles).set({ rating: average }).where(eq(technicianProfiles.id, input.technicianId));
  return updateRequestStatus(input.requestId, "REVIEWED");
}

export async function listNotifications(userId: number) {
  const db = await requireDb();
  return db.select().from(notifications).where(eq(notifications.recipientId, userId)).orderBy(desc(notifications.createdAt)).limit(30);
}

export async function adminSummary() {
  const db = await requireDb();
  const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const [techCount] = await db.select({ count: sql<number>`count(*)` }).from(technicianProfiles);
  const [requestCount] = await db.select({ count: sql<number>`count(*)` }).from(serviceRequests);
  const [completed] = await db.select({ count: sql<number>`count(*)` }).from(serviceRequests).where(inArray(serviceRequests.status, ["COMPLETED", "PAID", "REVIEWED"]));
  const [revenue] = await db.select({ total: sql<number>`coalesce(sum(${payments.amount}), 0)` }).from(payments).where(eq(payments.status, "paid"));
  const [rating] = await db.select({ average: sql<number>`coalesce(avg(${reviews.rating}), 0)` }).from(reviews).where(eq(reviews.visible, true));
  return { users: Number(userCount.count), technicians: Number(techCount.count), requests: Number(requestCount.count), completed: Number(completed.count), revenue: Number(revenue.total), rating: Number(rating.average).toFixed(1) };
}

export async function listTechniciansForAdmin() {
  const db = await requireDb();
  return db.select({ profile: technicianProfiles, user: users }).from(technicianProfiles).innerJoin(users, eq(technicianProfiles.userId, users.id)).orderBy(desc(technicianProfiles.createdAt));
}

export async function setVerification(technicianId: number, verificationStatus: "pending" | "verified" | "rejected") {
  const db = await requireDb();
  await db.update(technicianProfiles).set({ verificationStatus }).where(eq(technicianProfiles.id, technicianId));
}

export async function listAllRequests() {
  const db = await requireDb();
  return db
    .select({ request: serviceRequests, category: serviceCategories, customer: users })
    .from(serviceRequests)
    .innerJoin(serviceCategories, eq(serviceRequests.serviceId, serviceCategories.id))
    .innerJoin(users, eq(serviceRequests.customerId, users.id))
    .orderBy(desc(serviceRequests.updatedAt))
    .limit(100);
}

export async function listReviewsForAdmin() {
  const db = await requireDb();
  return db.select().from(reviews).orderBy(desc(reviews.createdAt)).limit(100);
}

export async function setReviewVisibility(reviewId: number, visible: boolean) {
  const db = await requireDb();
  await db.update(reviews).set({ visible }).where(eq(reviews.id, reviewId));
}
