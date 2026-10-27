"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { fieldErrors, type ActionResult } from "@/lib/validation";
import { layoutEmail } from "@/lib/providers/email";
import { assertAdmin, audit } from "@/server/session";
import { enqueue, kickJobs, PRIORITY, runJobs } from "@/server/jobs";

async function admin() {
  try {
    return await assertAdmin();
  } catch {
    return null;
  }
}
const DENIED: ActionResult<never> = { ok: false, error: "Admins only." };

// ───────────────────────────── Sellers ─────────────────────────────

export async function decideSeller(profileId: string, decision: "APPROVED" | "REJECTED" | "SUSPENDED", reason?: string): Promise<ActionResult> {
  const me = await admin();
  if (!me) return DENIED;
  const profile = await db.sellerProfile.findUnique({ where: { id: profileId }, include: { user: true, store: true } });
  if (!profile) return { ok: false, error: "Not found" };
  await db.$transaction([
    db.sellerProfile.update({ where: { id: profileId }, data: { status: decision, approvedAt: decision === "APPROVED" ? new Date() : profile.approvedAt, rejectionReason: decision === "REJECTED" ? reason ?? "Verification failed" : null } }),
    db.verification.updateMany({ where: { sellerProfileId: profileId, status: "PENDING" }, data: { status: decision === "APPROVED" ? "APPROVED" : "REJECTED", reviewedById: me.id, reviewedAt: new Date() } }),
    db.user.update({ where: { id: profile.userId }, data: { role: decision === "APPROVED" ? "SELLER" : profile.user.role === "ADMIN" ? "ADMIN" : "SHOPPER" } }),
    ...(profile.store ? [db.store.update({ where: { id: profile.store.id }, data: { isVerified: decision === "APPROVED" } })] : []),
    ...(decision === "SUSPENDED" && profile.store ? [db.product.updateMany({ where: { storeId: profile.store.id, status: "ACTIVE" }, data: { status: "INACTIVE" } })] : []),
  ]);
  await db.notification.create({ data: { userId: profile.userId, type: "SELLER", title: `Seller application ${decision.toLowerCase()}`, body: decision === "APPROVED" ? "Welcome to Marqova! Your Seller Hub is ready." : reason ?? "", href: "/seller" } });
  await enqueue("email.send", { to: profile.user.email, subject: `Your Marqova seller account: ${decision.toLowerCase()}`, html: layoutEmail(`Seller account ${decision.toLowerCase()}`, decision === "APPROVED" ? "<p>Your store is verified. Sign out and back in, then open Seller Hub to list your first product.</p>" : `<p>${reason ?? ""}</p>`) }, { priority: PRIORITY.high });
  await audit(me.id, `seller.${decision.toLowerCase()}`, "SellerProfile", profileId, { reason });
  after(kickJobs);
  revalidatePath("/admin/sellers");
  return { ok: true, message: `Seller ${decision.toLowerCase()}` };
}

// ───────────────────────────── Moderation ─────────────────────────────

export async function moderateListing(productId: string, decision: "ACTIVE" | "REJECTED" | "INACTIVE", note?: string): Promise<ActionResult> {
  const me = await admin();
  if (!me) return DENIED;
  const p = await db.product.update({ where: { id: productId }, data: { status: decision, moderationNote: note ?? null }, include: { store: { select: { seller: { select: { userId: true } } } } } });
  await enqueue(decision === "ACTIVE" ? "search.index" : "search.remove", { productIds: [p.id] }, { priority: PRIORITY.high });
  if (decision !== "ACTIVE") await db.notification.create({ data: { userId: p.store.seller.userId, type: "MODERATION", title: "Listing needs changes", body: `${p.title}: ${note ?? "removed by moderation"}`, href: `/seller/listings/${p.id}` } });
  await audit(me.id, `listing.${decision.toLowerCase()}`, "Product", p.id, { note });
  after(kickJobs);
  revalidatePath("/admin/listings");
  return { ok: true, message: `Listing ${decision === "ACTIVE" ? "approved" : decision.toLowerCase()}` };
}

export async function moderateReview(reviewId: string, decision: "PUBLISHED" | "REJECTED"): Promise<ActionResult> {
  const me = await admin();
  if (!me) return DENIED;
  const r = await db.review.update({ where: { id: reviewId }, data: { status: decision } });
  const agg = await db.review.aggregate({ where: { productId: r.productId, status: "PUBLISHED" }, _avg: { rating: true }, _count: { _all: true } });
  await db.product.update({ where: { id: r.productId }, data: { ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count._all } });
  await audit(me.id, `review.${decision.toLowerCase()}`, "Review", r.id);
  revalidatePath("/admin/reviews");
  return { ok: true, message: decision === "PUBLISHED" ? "Review published" : "Review removed" };
}

export async function resolveDispute(returnId: string, decision: "REFUNDED" | "REJECTED", note: string): Promise<ActionResult> {
  const me = await admin();
  if (!me) return DENIED;
  const r = await db.return.update({ where: { id: returnId }, data: { status: decision, resolution: `Marqova: ${note}` }, include: { orderItem: true } });
  if (decision === "REFUNDED") await db.orderItem.update({ where: { id: r.orderItemId }, data: { status: "RETURNED" } });
  await db.notification.create({ data: { userId: r.userId, type: "DISPUTE", title: "Your dispute was resolved", body: note, href: "/account/returns" } });
  await audit(me.id, `dispute.${decision.toLowerCase()}`, "Return", r.id, { note });
  revalidatePath("/admin/disputes");
  return { ok: true, message: "Dispute resolved" };
}

// ───────────────────────────── Categories & attributes (no-code niches) ─────────────────────────────

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(60),
  parentId: z.string().optional().nullable(),
  icon: z.string().max(30).default("Package"),
  commissionPercent: z.coerce.number().min(0).max(50),
  tryOnType: z.enum(["NONE", "TOP", "BOTTOM", "DRESS", "SHOES", "ACCESSORY"]).default("NONE"),
  isActive: z.coerce.boolean().default(true),
});

export async function saveCategory(input: unknown): Promise<ActionResult<{ id: string }>> {
  const me = await admin();
  if (!me) return DENIED;
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the category fields.", fields: fieldErrors(parsed.error) };
  const d = parsed.data;
  const data = { name: d.name, icon: d.icon, parentId: d.parentId || null, commissionBps: Math.round(d.commissionPercent * 100), tryOnType: d.tryOnType, isActive: d.isActive };
  let id = d.id;
  if (id) await db.category.update({ where: { id }, data });
  else {
    let slug = slugify(d.name);
    if (await db.category.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
    const created = await db.category.create({ data: { ...data, slug, position: await db.category.count({ where: { parentId: d.parentId || null } }) } });
    id = created.id;
    // New sub-categories inherit the parent's attribute template as a starting point.
    if (d.parentId) {
      const tpl = await db.attributeDefinition.findMany({ where: { categoryId: d.parentId } });
      if (tpl.length) await db.attributeDefinition.createMany({ data: tpl.map(({ id: _id, categoryId: _c, ...a }) => ({ ...a, categoryId: id! })) });
    }
  }
  await audit(me.id, d.id ? "category.update" : "category.create", "Category", id);
  revalidateTag("categories", "max");
  revalidatePath("/admin/categories");
  return { ok: true, data: { id }, message: "Category saved" };
}

const attributeSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().min(1),
  key: z.string().trim().regex(/^[a-zA-Z][a-zA-Z0-9]{1,29}$/, "Letters and digits, starting with a letter"),
  label: z.string().trim().min(1).max(40),
  type: z.enum(["TEXT", "NUMBER", "SELECT", "MULTISELECT", "BOOLEAN", "COLOR", "SIZE"]),
  options: z.string().max(2000).default(""),
  unit: z.string().max(12).optional().default(""),
  required: z.coerce.boolean().default(false),
  filterable: z.coerce.boolean().default(true),
  variantAxis: z.coerce.boolean().default(false),
});

export async function saveAttribute(input: unknown): Promise<ActionResult> {
  const me = await admin();
  if (!me) return DENIED;
  const parsed = attributeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message, fields: fieldErrors(parsed.error) };
  const { id, options, unit, ...d } = parsed.data;
  const data = { ...d, unit: unit || null, options: options.split(",").map((o) => o.trim()).filter(Boolean).slice(0, 100) };
  if (["SELECT", "MULTISELECT", "COLOR", "SIZE"].includes(d.type) && !data.options.length) return { ok: false, error: "Add at least one option (comma separated)." };
  try {
    if (id) await db.attributeDefinition.update({ where: { id }, data });
    else await db.attributeDefinition.create({ data: { ...data, position: await db.attributeDefinition.count({ where: { categoryId: d.categoryId } }) } });
  } catch {
    return { ok: false, error: "An attribute with that key already exists in this category." };
  }
  await audit(me.id, "attribute.save", "Category", d.categoryId, { key: d.key });
  revalidatePath("/admin/categories");
  return { ok: true, message: "Attribute saved" };
}

export async function deleteAttribute(id: string): Promise<ActionResult> {
  const me = await admin();
  if (!me) return DENIED;
  await db.attributeDefinition.delete({ where: { id } });
  revalidatePath("/admin/categories");
  return { ok: true, message: "Attribute removed" };
}

// ───────────────────────────── Users, homepage, ops ─────────────────────────────

export async function setUserRole(userId: string, role: "SHOPPER" | "SELLER" | "ADMIN"): Promise<ActionResult> {
  const me = await admin();
  if (!me) return DENIED;
  if (userId === me.id && role !== "ADMIN") return { ok: false, error: "You can't remove your own admin access." };
  await db.user.update({ where: { id: userId }, data: { role } });
  await audit(me.id, "user.role", "User", userId, { role });
  revalidatePath("/admin/users");
  return { ok: true, message: `Role set to ${role.toLowerCase()}` };
}

const sectionSchema = z.object({ id: z.string().optional(), title: z.string().trim().min(2).max(80), subtitle: z.string().max(160).optional(), href: z.string().max(200).optional(), position: z.coerce.number().int().min(0).max(100).default(0), active: z.coerce.boolean().default(true) });

export async function saveHomeSection(input: unknown): Promise<ActionResult> {
  const me = await admin();
  if (!me) return DENIED;
  const parsed = sectionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { id, ...data } = parsed.data;
  if (data.href && !data.href.startsWith("/")) return { ok: false, error: "Links must be internal paths starting with /" };
  if (id) await db.homeSection.update({ where: { id }, data });
  else await db.homeSection.create({ data });
  revalidatePath("/");
  revalidatePath("/admin/homepage");
  return { ok: true, message: "Section saved" };
}

export async function deleteHomeSection(id: string): Promise<ActionResult> {
  const me = await admin();
  if (!me) return DENIED;
  await db.homeSection.delete({ where: { id } });
  revalidatePath("/admin/homepage");
  return { ok: true, message: "Section deleted" };
}

export async function runQueueNow(): Promise<ActionResult> {
  const me = await admin();
  if (!me) return DENIED;
  const res = await runJobs(25);
  revalidatePath("/admin/jobs");
  return { ok: true, message: `Processed ${res.length} job(s)` };
}

export async function retryJob(id: string): Promise<ActionResult> {
  const me = await admin();
  if (!me) return DENIED;
  await db.job.update({ where: { id }, data: { status: "QUEUED", runAt: new Date(), attempts: 0, lastError: null } });
  revalidatePath("/admin/jobs");
  return { ok: true, message: "Job re-queued" };
}
