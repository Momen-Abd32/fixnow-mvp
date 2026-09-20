import crypto from "crypto";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const.js";
import type { Express, Request, Response } from "express";
import { createLocalUser, getUserByEmail, getUserByOpenId } from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function hashPassword(password: string, salt: string) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function makePasswordHash(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  return salt + ":" + hashPassword(password, salt);
}

function verifyPassword(password: string, stored: string) {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const actual = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

function buildUserResponse(user: any) {
  return {
    id: user?.id ?? null,
    openId: user?.openId ?? null,
    name: user?.name ?? null,
    email: user?.email ?? null,
    loginMethod: user?.loginMethod ?? null,
    lastSignedIn: (user?.lastSignedIn ?? new Date()).toISOString(),
    role: user?.role ?? "user",
    accountRole: user?.accountRole ?? "customer",
  };
}

function validateCredentials(email: unknown, password: unknown) {
  if (typeof email !== "string" || !email.trim() || !email.includes("@")) return "A valid email is required.";
  if (typeof password !== "string" || password.length < 6) return "Password must be at least 6 characters.";
  return null;
}

async function issueSession(req: Request, res: Response, user: any) {
  const token = await sdk.createSessionToken(user.openId, { name: user.name || "", expiresInMs: ONE_YEAR_MS });
  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
  return { token, user: buildUserResponse(user) };
}

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { name, email, password } = req.body ?? {};
      const validationError = validateCredentials(email, password);
      if (validationError) {
        res.status(400).json({ error: validationError });
        return;
      }
      if (typeof name !== "string" || !name.trim()) {
        res.status(400).json({ error: "Name is required." });
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const existing = await getUserByEmail(normalizedEmail);
      if (existing) {
        res.status(409).json({ error: "An account with this email already exists." });
        return;
      }

      const user = await createLocalUser({
        openId: `fixnow_${crypto.randomUUID()}`,
        name: name.trim(),
        email: normalizedEmail,
        passwordHash: makePasswordHash(password),
      });
      if (!user) throw new Error("Failed to create user");

      const session = await issueSession(req, res, user);
      res.status(201).json(session);
    } catch (error) {
      console.error("[Auth] Registration failed:", error);
      res.status(500).json({ error: "Registration failed." });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body ?? {};
      const validationError = validateCredentials(email, password);
      if (validationError) {
        res.status(400).json({ error: validationError });
        return;
      }

      const user = await getUserByEmail(email.trim().toLowerCase());
      if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
        res.status(401).json({ error: "Invalid email or password." });
        return;
      }

      const session = await issueSession(req, res, user);
      res.json(session);
    } catch (error) {
      console.error("[Auth] Login failed:", error);
      res.status(500).json({ error: "Login failed." });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      res.json({ user: buildUserResponse(user) });
    } catch {
      res.status(401).json({ error: "Not authenticated", user: null });
    }
  });

  app.post("/api/auth/session", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
        res.status(400).json({ error: "Bearer token required" });
        return;
      }
      const token = authHeader.slice("Bearer ".length).trim();
      const user = await sdk.authenticateRequest(req);
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true, user: buildUserResponse(user) });
    } catch {
      res.status(401).json({ error: "Invalid token" });
    }
  });
}
