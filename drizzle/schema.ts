import {
  boolean,
  double,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const requestStatuses = [
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

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  profileImage: varchar("profileImage", { length: 1024 }),
  addresses: json("addresses").$type<Array<{ label: string; address: string; latitude?: number; longitude?: number }>>(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  accountRole: mysqlEnum("accountRole", ["customer", "technician", "admin"]).default("customer").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const serviceCategories = mysqlTable("service_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 48 }).notNull(),
  basePriceMin: int("basePriceMin").notNull(),
  basePriceMax: int("basePriceMax").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const technicianProfiles = mysqlTable(
  "technician_profiles",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    serviceIds: json("serviceIds").$type<number[]>().notNull(),
    verificationStatus: mysqlEnum("verificationStatus", ["pending", "verified", "rejected"]).default("pending").notNull(),
    documents: json("documents").$type<Array<{ name: string; url: string; key: string }>>(),
    latitude: double("latitude"),
    longitude: double("longitude"),
    serviceRadiusKm: int("serviceRadiusKm").default(10).notNull(),
    availability: boolean("availability").default(false).notNull(),
    rating: double("rating").default(0).notNull(),
    completedJobs: int("completedJobs").default(0).notNull(),
    hourlyRate: int("hourlyRate").notNull(),
    bio: text("bio"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex("technician_profiles_user_id_unique").on(table.userId)],
);

export const serviceRequests = mysqlTable("service_requests", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  technicianId: int("technicianId"),
  serviceId: int("serviceId").notNull(),
  description: text("description").notNull(),
  media: json("media").$type<Array<{ url: string; key: string; mimeType: string }>>(),
  address: text("address").notNull(),
  latitude: double("latitude").notNull(),
  longitude: double("longitude").notNull(),
  urgency: mysqlEnum("urgency", ["standard", "priority", "emergency"]).default("standard").notNull(),
  status: mysqlEnum("status", requestStatuses).default("PENDING").notNull(),
  estimatedMin: int("estimatedMin").notNull(),
  estimatedMax: int("estimatedMax").notNull(),
  finalPrice: int("finalPrice"),
  scheduledAt: timestamp("scheduledAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  acceptedAt: timestamp("acceptedAt"),
  completedAt: timestamp("completedAt"),
});

export const requestMatches = mysqlTable(
  "request_matches",
  {
    id: int("id").autoincrement().primaryKey(),
    requestId: int("requestId").notNull(),
    technicianId: int("technicianId").notNull(),
    score: double("score").notNull(),
    distanceKm: double("distanceKm").notNull(),
    etaMinutes: int("etaMinutes").notNull(),
    estimatedPrice: int("estimatedPrice").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("request_technician_match_unique").on(table.requestId, table.technicianId)],
);

export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull(),
  senderId: int("senderId").notNull(),
  receiverId: int("receiverId").notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const reviews = mysqlTable(
  "reviews",
  {
    id: int("id").autoincrement().primaryKey(),
    customerId: int("customerId").notNull(),
    technicianId: int("technicianId").notNull(),
    requestId: int("requestId").notNull(),
    rating: int("rating").notNull(),
    comment: text("comment"),
    media: json("media").$type<Array<{ url: string; key: string; mimeType: string }>>(),
    visible: boolean("visible").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("reviews_request_unique").on(table.requestId)],
);

export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull(),
  customerId: int("customerId").notNull(),
  technicianId: int("technicianId").notNull(),
  amount: int("amount").notNull(),
  method: mysqlEnum("method", ["cash", "card", "wallet"]).notNull(),
  status: mysqlEnum("status", ["pending", "authorized", "paid", "failed", "refunded"]).default("pending").notNull(),
  transactionId: varchar("transactionId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  recipientId: int("recipientId").notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  body: text("body").notNull(),
  type: varchar("type", { length: 48 }).notNull(),
  requestId: int("requestId"),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type TechnicianProfile = typeof technicianProfiles.$inferSelect;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type RequestStatus = (typeof requestStatuses)[number];
export type PaymentMethod = "cash" | "card" | "wallet";
