import { eq } from "drizzle-orm";
import { serviceCategories, technicianProfiles, users } from "../drizzle/schema";
import { ensureCatalog, getDb } from "../server/db";

const technicians = [
  { openId: "fixnow-seed-aya", name: "Aya Haddad", email: "aya.demo@fixnow.local", serviceSlugs: ["ac-repair", "appliance-repair"], latitude: 31.9567, longitude: 35.9172, radius: 12, rate: 25, rating: 4.9, jobs: 148, bio: "HVAC and appliance specialist with 8 years of residential experience." },
  { openId: "fixnow-seed-omar", name: "Omar Nasser", email: "omar.demo@fixnow.local", serviceSlugs: ["plumbing", "home-maintenance"], latitude: 31.9498, longitude: 35.9001, radius: 10, rate: 22, rating: 4.8, jobs: 96, bio: "Licensed plumbing specialist for leaks, drains, water pressure and fixtures." },
  { openId: "fixnow-seed-lina", name: "Lina Saleh", email: "lina.demo@fixnow.local", serviceSlugs: ["electrical", "network-install"], latitude: 31.9651, longitude: 35.9321, radius: 14, rate: 28, rating: 4.9, jobs: 121, bio: "Residential electrical and smart-home network installation professional." },
  { openId: "fixnow-seed-khaled", name: "Khaled Mansour", email: "khaled.demo@fixnow.local", serviceSlugs: ["carpentry", "painting", "home-maintenance"], latitude: 31.9412, longitude: 35.9146, radius: 15, rate: 20, rating: 4.7, jobs: 84, bio: "Detail-focused carpenter and interior maintenance technician." },
] as const;

async function seed() {
  await ensureCatalog();
  const connection = await getDb();
  if (!connection) throw new Error("DATABASE_URL is required to seed FixNow development data.");
  const categories = await connection.select().from(serviceCategories);
  const categoryMap = new Map(categories.map((category) => [category.slug, category.id]));

  for (const tech of technicians) {
    const serviceIds = tech.serviceSlugs.map((slug) => categoryMap.get(slug)).filter((id): id is number => Boolean(id));
    await connection.insert(users).values({ openId: tech.openId, name: tech.name, email: tech.email, loginMethod: "seed", accountRole: "technician", role: "user", lastSignedIn: new Date() }).onDuplicateKeyUpdate({ set: { name: tech.name, email: tech.email, accountRole: "technician", lastSignedIn: new Date() } });
    const user = (await connection.select().from(users).where(eq(users.openId, tech.openId)).limit(1))[0];
    if (!user) throw new Error(`Unable to seed technician ${tech.name}.`);
    await connection.insert(technicianProfiles).values({ userId: user.id, serviceIds, verificationStatus: "verified", documents: [{ name: "Seed verification record", url: "seed://verified", key: "seed-verified" }], latitude: tech.latitude, longitude: tech.longitude, serviceRadiusKm: tech.radius, availability: true, rating: tech.rating, completedJobs: tech.jobs, hourlyRate: tech.rate, bio: tech.bio }).onDuplicateKeyUpdate({ set: { serviceIds, verificationStatus: "verified", latitude: tech.latitude, longitude: tech.longitude, serviceRadiusKm: tech.radius, availability: true, rating: tech.rating, completedJobs: tech.jobs, hourlyRate: tech.rate, bio: tech.bio } });
  }
  console.log(`Seeded ${technicians.length} verified, online technicians across ${categories.length} FixNow services.`);
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
