// DEMO MODE store.
//
// When Supabase is NOT configured, the app still needs to demonstrate real
// auth + persistence + transactions through the UI. This module provides a
// lightweight stand-in:
//   - "users" and "sessions" are kept in a module-level map
//   - the browser holds an opaque session token in an HTTP-only cookie
//   - CMAs are stored per-user in memory
//
// Data here persists for the life of the server process (i.e. across page
// reloads and logout/login within a deployment), which is enough to satisfy
// "persists across sessions" for a demo. In LIVE mode (Supabase configured),
// none of this is used — Postgres + RLS handle everything durably.
//
// NOTE: this is intentionally simple and is NOT a security model for real
// data. The README is explicit that production uses Supabase.

import { randomUUID, scryptSync, timingSafeEqual } from "crypto";

export interface DemoUser {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
}

export interface DemoCMA {
  id: string;
  user_id: string;
  property_address: string;
  generated_cma: string; // JSON string
  listing_copy: string;
  created_at: string;
}

// Module-level singletons (survive across requests in a running process).
const globalForDemo = globalThis as unknown as {
  __demoUsers?: Map<string, DemoUser>;
  __demoSessions?: Map<string, string>; // token -> userId
  __demoCmas?: Map<string, DemoCMA>;
};

const users = (globalForDemo.__demoUsers ??= new Map());
const sessions = (globalForDemo.__demoSessions ??= new Map());
const cmas = (globalForDemo.__demoCmas ??= new Map());

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

export function demoSignUp(email: string, password: string): DemoUser {
  const normalized = email.trim().toLowerCase();
  if ([...users.values()].some((u) => u.email === normalized)) {
    throw new Error("An account with this email already exists.");
  }
  const salt = randomUUID();
  const user: DemoUser = {
    id: randomUUID(),
    email: normalized,
    salt,
    passwordHash: hashPassword(password, salt),
  };
  users.set(user.id, user);
  return user;
}

export function demoSignIn(email: string, password: string): DemoUser {
  const normalized = email.trim().toLowerCase();
  const user = [...users.values()].find((u) => u.email === normalized);
  if (!user) throw new Error("Invalid email or password.");
  const attempt = Buffer.from(hashPassword(password, user.salt), "hex");
  const stored = Buffer.from(user.passwordHash, "hex");
  if (
    attempt.length !== stored.length ||
    !timingSafeEqual(attempt, stored)
  ) {
    throw new Error("Invalid email or password.");
  }
  return user;
}

export function demoCreateSession(userId: string): string {
  const token = randomUUID();
  sessions.set(token, userId);
  return token;
}

export function demoDestroySession(token: string): void {
  sessions.delete(token);
}

export function demoGetUserByToken(token: string | undefined): DemoUser | null {
  if (!token) return null;
  const userId = sessions.get(token);
  if (!userId) return null;
  return users.get(userId) ?? null;
}

export function demoListCmas(userId: string): DemoCMA[] {
  return [...cmas.values()]
    .filter((c) => c.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function demoInsertCma(
  userId: string,
  propertyAddress: string,
  generatedCma: string,
  listingCopy: string
): DemoCMA {
  const cma: DemoCMA = {
    id: randomUUID(),
    user_id: userId,
    property_address: propertyAddress,
    generated_cma: generatedCma,
    listing_copy: listingCopy,
    created_at: new Date().toISOString(),
  };
  cmas.set(cma.id, cma);
  return cma;
}

export function demoDeleteCma(userId: string, id: string): boolean {
  const cma = cmas.get(id);
  // Enforce per-account isolation: a user can only delete their own row.
  if (!cma || cma.user_id !== userId) return false;
  return cmas.delete(id);
}

export const DEMO_COOKIE = "homeiq_demo_session";
