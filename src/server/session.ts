import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma/enums";

export const getSessionUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;
  // The JWT can outlive a role change or account deletion, so authorization always uses
  // the current database role, not the one cached in the token.
  const current = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true, name: true } });
  if (!current) return null;
  return { ...session.user, role: current.role, name: current.name ?? session.user.name };
});

export async function requireUser(next = "/account") {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireRole(roles: Role[], next = "/") {
  const user = await requireUser(next);
  if (!roles.includes(user.role)) redirect("/?denied=1");
  return user;
}

export const getSellerContext = cache(async () => {
  const user = await getSessionUser();
  if (!user) return null;
  const profile = await db.sellerProfile.findUnique({ where: { userId: user.id }, include: { store: true } });
  return { user, profile, store: profile?.store ?? null };
});

/** For Seller Hub pages/actions: an approved seller with a store, or redirect to onboarding. */
export async function requireSeller() {
  const user = await requireUser("/seller");
  const ctx = await getSellerContext();
  if (!ctx?.profile || !ctx.store) redirect("/seller/onboarding");
  if (ctx.profile.status !== "APPROVED" && user.role !== "ADMIN") redirect("/seller/onboarding");
  return { user, profile: ctx.profile, store: ctx.store };
}

/** Same check for server actions and route handlers: throws instead of redirecting. */
export async function assertSeller() {
  const ctx = await getSellerContext();
  if (!ctx?.store || !ctx.profile || (ctx.profile.status !== "APPROVED" && ctx.user.role !== "ADMIN")) throw new Error("Not authorised");
  return { user: ctx.user, profile: ctx.profile, store: ctx.store };
}

export async function assertAdmin() {
  const user = await getSessionUser();
  if (user?.role !== "ADMIN") throw new Error("Not authorised");
  return user;
}

export async function audit(actorId: string | null, action: string, entityType: string, entityId: string, meta: Record<string, unknown> = {}) {
  await db.auditLog.create({ data: { actorId, action, entityType, entityId, meta: meta as object } });
}
