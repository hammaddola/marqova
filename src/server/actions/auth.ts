"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { clientBucket, safeNextPath } from "@/lib/request";
import { fieldErrors, loginSchema, registerSchema, type ActionResult } from "@/lib/validation";

/** True when this client's budget for `action` is exhausted (shared fallback when the IP is unknown). */
async function clientLimited(action: string, limit: number, windowMs = 60_000) {
  const bucket = clientBucket(await headers(), limit);
  return !rateLimit(`${action}:${bucket.key}`, bucket.limit, windowMs).ok;
}

const safeNext = (next: unknown) => safeNextPath(next);

export async function loginAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (await clientLimited("login", 10)) return { ok: false, error: "Too many attempts. Please wait a minute and try again." };
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fields: fieldErrors(parsed.error) };
  try {
    await signIn("credentials", { email: parsed.data.email, password: parsed.data.password, redirectTo: safeNext(formData.get("next")) });
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: "That email and password combination didn't match." };
    throw err; // redirect
  }
}

export async function registerAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (await clientLimited("register", 5) || (await clientLimited("register-hour", 20, 3_600_000))) return { ok: false, error: "Too many attempts. Please wait a minute and try again." };
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fields: fieldErrors(parsed.error) };
  const exists = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return { ok: false, error: "An account with this email already exists.", fields: { email: "Already registered — try signing in" } };
  await db.user.create({ data: { email: parsed.data.email, name: parsed.data.name, passwordHash: await bcrypt.hash(parsed.data.password, 12) } });
  try {
    await signIn("credentials", { email: parsed.data.email, password: parsed.data.password, redirectTo: safeNext(formData.get("next")) });
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: "Account created, but signing in failed. Please sign in." };
    throw err;
  }
}

export async function googleSignInAction(formData: FormData) {
  await signIn("google", { redirectTo: safeNext(formData.get("next")) });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
