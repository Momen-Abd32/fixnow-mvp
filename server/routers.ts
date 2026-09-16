import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { AI_DISCLAIMER, canTransition, REQUEST_STATUSES, type RequestStatus } from "../shared/types";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { storagePut } from "./storage";

const mediaSchema = z.object({ url: z.string().max(1024), key: z.string().max(512), mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "video/mp4", "application/pdf"]) });
const locationSchema = z.object({ latitude: z.number().gte(-90).lte(90), longitude: z.number().gte(-180).lte(180) });
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Administrator access is required." });
  return next({ ctx });
});

const rateWindows = new Map<string, number[]>();
function enforceRateLimit(key: string, maxRequests = 6, windowMs = 60_000) {
  const now = Date.now();
  const relevant = (rateWindows.get(key) ?? []).filter((at) => now - at < windowMs);
  if (relevant.length >= maxRequests) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Please wait a minute before trying again." });
  relevant.push(now);
  rateWindows.set(key, relevant);
}

function cleanAIText(raw: unknown) {
  if (typeof raw !== "string") return "";
  return raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
}

function fallbackDiagnosis(description: string) {
  const text = description.toLowerCase();
  const isAC = /ac|air.?condition|cool|heat/.test(text);
  const isElectrical = /spark|outlet|breaker|electric/.test(text);
  const isPlumbing = /leak|drain|pipe|water|tap/.test(text);
  const category = isAC ? "AC repair" : isElectrical ? "Electrical" : isPlumbing ? "Plumbing" : "Home maintenance";
  const urgency = /smoke|fire|spark|gas|flood/.test(text) ? "emergency" : /no power|overflow|not cooling/.test(text) ? "priority" : "standard";
  return {
    possibleProblem: "A preliminary assessment needs an on-site inspection to confirm the exact cause.",
    recommendedCategory: category,
    urgency,
    estimatedMin: urgency === "emergency" ? 25 : 15,
    estimatedMax: urgency === "emergency" ? 70 : 50,
    safeSteps: ["Avoid dismantling electrical, gas, or pressurized equipment.", "Turn off the relevant appliance only if it is safe to do so.", "Keep the affected area accessible for the technician."],
    disclaimer: AI_DISCLAIMER,
  };
}

async function assertRequestAccess(userId: number, requestId: number) {
  const detail = await db.getRequestDetail(requestId);
  if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "Service request not found." });
  if (detail.request.customerId === userId) return detail;
  const profile = await db.getTechnicianProfileByUser(userId);
  if (profile?.id === detail.request.technicianId) return detail;
  throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this service request." });
}

export const appRouter = router({
  system: systemRouter,
  health: publicProcedure.query(() => ({ status: "ok", service: "FixNow API", timestamp: new Date().toISOString() })),
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  catalog: router({
    list: publicProcedure.input(z.object({ includeInactive: z.boolean().optional() }).optional()).query(({ input }) => db.listCategories(input?.includeInactive)),
    create: adminProcedure.input(z.object({ name: z.string().min(2).max(120), slug: z.string().regex(/^[a-z0-9-]+$/), description: z.string().min(8).max(600), icon: z.string().min(2).max(48), basePriceMin: z.number().int().positive(), basePriceMax: z.number().int().positive() })).mutation(async ({ input }) => {
      if (input.basePriceMin > input.basePriceMax) throw new TRPCError({ code: "BAD_REQUEST", message: "Minimum price cannot exceed maximum price." });
      const connection = await db.getDb();
      if (!connection) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      const { serviceCategories } = await import("../drizzle/schema");
      await connection.insert(serviceCategories).values({ ...input, active: true });
      return { success: true };
    }),
  }),
  profile: router({
    me: protectedProcedure.query(async ({ ctx }) => ({ user: ctx.user, technician: await db.getTechnicianProfileByUser(ctx.user.id), notifications: await db.listNotifications(ctx.user.id) })),
    update: protectedProcedure.input(z.object({ name: z.string().min(2).max(120).optional(), phone: z.string().max(32).optional(), addresses: z.array(z.object({ label: z.string().min(1).max(48), address: z.string().min(4).max(300), latitude: z.number().optional(), longitude: z.number().optional() })).max(10).optional() })).mutation(async ({ ctx, input }) => {
      const connection = await db.getDb();
      if (!connection) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      const { users } = await import("../drizzle/schema");
      await connection.update(users).set(input).where((await import("drizzle-orm")).eq(users.id, ctx.user.id));
      return { success: true };
    }),
  }),
  uploads: router({
    create: protectedProcedure.input(z.object({ filename: z.string().min(1).max(120).regex(/^[a-zA-Z0-9._-]+$/), mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "video/mp4", "application/pdf"]), dataBase64: z.string().min(20).max(7_000_000), purpose: z.enum(["request", "verification", "review", "profile"]) })).mutation(async ({ ctx, input }) => {
      enforceRateLimit(`upload:${ctx.user.id}`, 10);
      const estimatedBytes = Math.floor((input.dataBase64.length * 3) / 4);
      if (estimatedBytes > 5 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Files must be 5 MB or smaller." });
      const bytes = Buffer.from(input.dataBase64.replace(/^data:[^;]+;base64,/, ""), "base64");
      const stored = await storagePut(`fixnow/${ctx.user.id}/${input.purpose}/${input.filename}`, bytes, input.mimeType);
      return { ...stored, mimeType: input.mimeType };
    }),
  }),
  diagnosis: router({
    analyze: protectedProcedure.input(z.object({ description: z.string().min(12).max(1600), imageUrl: z.string().url().max(1024).optional() })).mutation(async ({ ctx, input }) => {
      enforceRateLimit(`diagnosis:${ctx.user.id}`, 4);
      const fallback = fallbackDiagnosis(input.description);
      try {
        const userContent: any = [{ type: "text", text: `Customer problem description: ${input.description}` }];
        if (input.imageUrl) userContent.push({ type: "image_url", image_url: { url: input.imageUrl, detail: "low" } });
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are FixNow's preliminary home-service triage assistant. Return compact JSON only with possibleProblem (string), recommendedCategory (one of AC repair, Plumbing, Electrical, Appliance repair, Internet & network, Painting, Carpentry, Home maintenance), urgency (standard|priority|emergency), estimatedMin (integer in JOD), estimatedMax (integer in JOD), safeSteps (array of at most 3 short strings). Never claim certainty. For smoke, fire, sparks, gas smell, flooding, shocks, or immediate danger, set urgency emergency and tell the user to move safe and call emergency services. Do not give hazardous repair instructions." },
            { role: "user", content: userContent },
          ],
          response_format: { type: "json_object" },
        });
        const parsed = JSON.parse(cleanAIText(response.choices[0]?.message.content));
        const output = z.object({ possibleProblem: z.string().min(8).max(500), recommendedCategory: z.string().min(3).max(80), urgency: z.enum(["standard", "priority", "emergency"]), estimatedMin: z.number().int().min(0).max(500), estimatedMax: z.number().int().min(0).max(700), safeSteps: z.array(z.string().min(4).max(220)).max(3) }).parse(parsed);
        return { ...output, estimatedMax: Math.max(output.estimatedMin, output.estimatedMax), disclaimer: AI_DISCLAIMER };
      } catch {
        return fallback;
      }
    }),
  }),
  technicians: router({
    myProfile: protectedProcedure.query(({ ctx }) => db.getTechnicianProfileByUser(ctx.user.id)),
    register: protectedProcedure.input(z.object({ serviceIds: z.array(z.number().int().positive()).min(1).max(8), serviceRadiusKm: z.number().int().min(1).max(50), hourlyRate: z.number().int().min(5).max(500), bio: z.string().max(600).optional(), documents: z.array(z.object({ name: z.string().max(120), url: z.string().max(1024), key: z.string().max(512) })).max(5).optional() })).mutation(({ ctx, input }) => db.registerTechnician({ ...input, userId: ctx.user.id })),
    availability: protectedProcedure.input(z.object({ availability: z.boolean() })).mutation(({ ctx, input }) => db.setTechnicianAvailability(ctx.user.id, input.availability)),
    updateLocation: protectedProcedure.input(locationSchema).mutation(async ({ ctx, input }) => {
      const profile = await db.getTechnicianProfileByUser(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Create a technician profile before sharing location." });
      await db.updateTechnicianLocation(ctx.user.id, input.latitude, input.longitude);
      return { success: true };
    }),
    nearby: protectedProcedure.input(z.object({ serviceId: z.number().int().positive(), ...locationSchema.shape })).query(({ input }) => db.findMatchingTechnicians(input.serviceId, input)),
    jobs: protectedProcedure.query(({ ctx }) => db.listRequestsForTechnician(ctx.user.id)),
  }),
  requests: router({
    create: protectedProcedure.input(z.object({ serviceId: z.number().int().positive(), description: z.string().min(12).max(1600), media: z.array(mediaSchema).max(5).optional(), address: z.string().min(5).max(300), ...locationSchema.shape, urgency: z.enum(["standard", "priority", "emergency"]), notes: z.string().max(1000).optional(), scheduledAt: z.coerce.date().optional() })).mutation(({ ctx, input }) => db.createRequest({ ...input, customerId: ctx.user.id })),
    listMine: protectedProcedure.query(({ ctx }) => db.listRequestsForCustomer(ctx.user.id)),
    get: protectedProcedure.input(z.object({ requestId: z.number().int().positive() })).query(async ({ ctx, input }) => assertRequestAccess(ctx.user.id, input.requestId)),
    matches: protectedProcedure.input(z.object({ requestId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const detail = await assertRequestAccess(ctx.user.id, input.requestId);
      if (detail.request.customerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Only the customer can view technician choices." });
      return db.getRequestMatches(input.requestId);
    }),
    chooseTechnician: protectedProcedure.input(z.object({ requestId: z.number().int().positive(), technicianId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const detail = await assertRequestAccess(ctx.user.id, input.requestId);
      if (detail.request.customerId !== ctx.user.id || detail.request.status !== "PENDING") throw new TRPCError({ code: "BAD_REQUEST", message: "This request cannot be assigned." });
      const eligible = await db.getRequestMatches(input.requestId);
      if (!eligible.some((entry) => entry.match.technicianId === input.technicianId)) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a technician from the presented matches." });
      return db.assignTechnician(input.requestId, input.technicianId);
    }),
    accept: protectedProcedure.input(z.object({ requestId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const detail = await assertRequestAccess(ctx.user.id, input.requestId);
      const profile = await db.getTechnicianProfileByUser(ctx.user.id);
      if (detail.request.technicianId !== profile?.id || detail.request.status !== "TECHNICIAN_ASSIGNED") throw new TRPCError({ code: "FORBIDDEN", message: "Only the selected technician can accept this job." });
      const result = await db.updateRequestStatus(input.requestId, "TECHNICIAN_ACCEPTED", { acceptedAt: new Date() });
      await db.createNotification(detail.request.customerId, "Technician accepted", "Your technician accepted the request and will share arrival updates.", "status", input.requestId);
      return result;
    }),
    transition: protectedProcedure.input(z.object({ requestId: z.number().int().positive(), nextStatus: z.enum(REQUEST_STATUSES), finalPrice: z.number().int().positive().max(2000).optional() })).mutation(async ({ ctx, input }) => {
      const detail = await assertRequestAccess(ctx.user.id, input.requestId);
      const profile = await db.getTechnicianProfileByUser(ctx.user.id);
      if (detail.request.technicianId !== profile?.id) throw new TRPCError({ code: "FORBIDDEN", message: "Only the assigned technician can update field-work status." });
      const allowedTechnicianStatuses: RequestStatus[] = ["ON_THE_WAY", "ARRIVED", "IN_PROGRESS", "COMPLETED"];
      if (!allowedTechnicianStatuses.includes(input.nextStatus) || !canTransition(detail.request.status, input.nextStatus)) throw new TRPCError({ code: "BAD_REQUEST", message: "This status transition is not allowed." });
      if (input.nextStatus === "COMPLETED" && !input.finalPrice) throw new TRPCError({ code: "BAD_REQUEST", message: "Enter the agreed final price when completing a job." });
      const result = await db.updateRequestStatus(input.requestId, input.nextStatus, { finalPrice: input.finalPrice, completedAt: input.nextStatus === "COMPLETED" ? new Date() : undefined });
      await db.createNotification(detail.request.customerId, `Job update: ${input.nextStatus.replaceAll("_", " ")}`, "Open your request for the latest job information.", "status", input.requestId);
      return result;
    }),
    cancel: protectedProcedure.input(z.object({ requestId: z.number().int().positive(), reason: z.string().min(4).max(500) })).mutation(async ({ ctx, input }) => {
      const detail = await assertRequestAccess(ctx.user.id, input.requestId);
      if (!["PENDING", "TECHNICIAN_ASSIGNED", "TECHNICIAN_ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS"].includes(detail.request.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "This request can no longer be cancelled." });
      const result = await db.updateRequestStatus(input.requestId, "CANCELLED", { });
      if (detail.technician) await db.createNotification(detail.technician.userId, "Request cancelled", "The customer cancelled this request.", "status", input.requestId);
      return result;
    }),
  }),
  messages: router({
    list: protectedProcedure.input(z.object({ requestId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      await assertRequestAccess(ctx.user.id, input.requestId);
      return db.listMessages(input.requestId);
    }),
    send: protectedProcedure.input(z.object({ requestId: z.number().int().positive(), message: z.string().min(1).max(1200) })).mutation(async ({ ctx, input }) => {
      const detail = await assertRequestAccess(ctx.user.id, input.requestId);
      const receiverId = detail.request.customerId === ctx.user.id ? detail.technician?.userId : detail.request.customerId;
      if (!receiverId) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Chat opens after a technician is assigned." });
      await db.addMessage({ requestId: input.requestId, senderId: ctx.user.id, receiverId, message: input.message.trim() });
      return { success: true };
    }),
  }),
  payments: router({
    create: protectedProcedure.input(z.object({ requestId: z.number().int().positive(), method: z.enum(["cash", "card", "wallet"]) })).mutation(async ({ ctx, input }) => {
      const detail = await assertRequestAccess(ctx.user.id, input.requestId);
      if (detail.request.customerId !== ctx.user.id || detail.request.status !== "COMPLETED" || !detail.request.technicianId || !detail.request.finalPrice) throw new TRPCError({ code: "BAD_REQUEST", message: "Payment is available once the technician completes the job." });
      if (input.method !== "cash") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Card and wallet payments are ready for processor integration. Cash is available in this MVP." });
      const id = await db.createPayment({ requestId: input.requestId, customerId: ctx.user.id, technicianId: detail.request.technicianId, amount: detail.request.finalPrice, method: input.method });
      return { paymentId: id, method: input.method, status: "pending" };
    }),
    confirmCash: protectedProcedure.input(z.object({ requestId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const detail = await assertRequestAccess(ctx.user.id, input.requestId);
      if (detail.request.customerId !== ctx.user.id || detail.request.status !== "COMPLETED") throw new TRPCError({ code: "BAD_REQUEST", message: "This cash payment cannot be confirmed." });
      const payment = await db.getPaymentForRequest(input.requestId);
      if (!payment || payment.method !== "cash") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Create a cash payment record first." });
      const result = await db.markCashPaid(input.requestId);
      if (detail.technician) await db.createNotification(detail.technician.userId, "Payment confirmed", "The customer confirmed cash payment for the completed job.", "payment", input.requestId);
      return result;
    }),
  }),
  reviews: router({
    create: protectedProcedure.input(z.object({ requestId: z.number().int().positive(), rating: z.number().int().min(1).max(5), comment: z.string().max(800).optional() })).mutation(async ({ ctx, input }) => {
      const detail = await assertRequestAccess(ctx.user.id, input.requestId);
      if (detail.request.customerId !== ctx.user.id || detail.request.status !== "PAID" || !detail.request.technicianId) throw new TRPCError({ code: "BAD_REQUEST", message: "A review is available after payment." });
      return db.createReview({ customerId: ctx.user.id, technicianId: detail.request.technicianId, ...input });
    }),
  }),
  admin: router({
    overview: adminProcedure.query(() => db.adminSummary()),
    technicians: adminProcedure.query(() => db.listTechniciansForAdmin()),
    setVerification: adminProcedure.input(z.object({ technicianId: z.number().int().positive(), verificationStatus: z.enum(["pending", "verified", "rejected"]) })).mutation(({ input }) => db.setVerification(input.technicianId, input.verificationStatus)),
    requests: adminProcedure.query(() => db.listAllRequests()),
    reviews: adminProcedure.query(() => db.listReviewsForAdmin()),
    setReviewVisibility: adminProcedure.input(z.object({ reviewId: z.number().int().positive(), visible: z.boolean() })).mutation(({ input }) => db.setReviewVisibility(input.reviewId, input.visible)),
  }),
});

export type AppRouter = typeof appRouter;
