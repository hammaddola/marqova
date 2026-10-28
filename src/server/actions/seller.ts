"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAI } from "@/lib/providers/ai";
import { storeImage } from "@/lib/providers/storage";
import { addBusinessDays } from "@/lib/delivery";
import { randomToken, slugify } from "@/lib/utils";
import { fieldErrors, productInputSchema, sellerApplicationSchema, type ActionResult } from "@/lib/validation";
import { assertSeller, audit, getSessionUser } from "@/server/session";
import { createApiKey, saveProduct } from "@/server/products";
import { enqueue, kickJobs, PRIORITY } from "@/server/jobs";
import { MULTI_SELLER } from "@/lib/marketplace";

const fail = (error: string): ActionResult<never> => ({ ok: false, error });

async function seller() {
  try {
    return await assertSeller();
  } catch {
    return null;
  }
}

// ───────────────────────────── Onboarding ─────────────────────────────

export async function applyAsSeller(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return fail("Please sign in first.");
  if (!MULTI_SELLER) return fail("Marqova isn't accepting new sellers yet.");
  const raw = Object.fromEntries(formData);
  const parsed = sellerApplicationSchema.safeParse({ ...raw, agree: raw.agree === "on" });
  if (!parsed.success) return { ok: false, error: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) };
  const d = parsed.data;
  const existing = await db.sellerProfile.findUnique({ where: { userId: user.id } });
  if (existing && existing.status !== "REJECTED") return fail("You already have a seller application.");

  const idDoc = formData.get("idDocument");
  let documentUrl: string | null = null;
  if (idDoc instanceof File && idDoc.size) {
    try {
      documentUrl = (await storeImage(idDoc, `verifications/${user.id}`)).url;
    } catch (e) {
      return { ok: false, error: (e as Error).message, fields: { idDocument: (e as Error).message } };
    }
  }

  const baseSlug = slugify(d.storeName) || `store-${randomToken(3)}`;
  const slugTaken = await db.store.findUnique({ where: { slug: baseSlug } });
  const profileData = {
    tier: d.tier,
    status: "PENDING" as const,
    legalName: d.legalName,
    businessName: d.businessName || null,
    registrationNumber: d.registrationNumber || null,
    phone: d.phone,
    bankAccountName: d.bankAccountName,
    bankName: d.bankName,
    bankAccountLast4: d.iban.slice(-4),
    rejectionReason: null,
  };
  const profile = existing
    ? await db.sellerProfile.update({ where: { id: existing.id }, data: profileData })
    : await db.sellerProfile.create({ data: { ...profileData, userId: user.id } });
  await db.verification.deleteMany({ where: { sellerProfileId: profile.id, status: "PENDING" } });
  await db.verification.createMany({
    data: [
      { sellerProfileId: profile.id, type: "ID_DOCUMENT", documentUrl },
      { sellerProfileId: profile.id, type: "BANK_ACCOUNT", notes: `${d.bankName} ••••${d.iban.slice(-4)}` },
      ...(d.tier !== "INDIVIDUAL" ? [{ sellerProfileId: profile.id, type: "BUSINESS_REGISTRATION" as const, notes: d.registrationNumber || "Not provided" }] : []),
    ],
  });
  const store = await db.store.findUnique({ where: { sellerId: profile.id } });
  if (!store) await db.store.create({ data: { sellerId: profile.id, name: d.storeName, slug: slugTaken ? `${baseSlug}-${randomToken(2)}` : baseSlug, warehouses: { create: { name: "Main warehouse", city: "Lahore", isDefault: true } } } });
  await audit(user.id, "seller.apply", "SellerProfile", profile.id, { tier: d.tier });
  revalidatePath("/seller/onboarding");
  return { ok: true, message: "Application submitted. We'll review it within 1–2 business days." };
}

// ───────────────────────────── Listings ─────────────────────────────

export async function saveListing(raw: unknown): Promise<ActionResult<{ id: string; status: string; score: number; tips: string[] }>> {
  const s = await seller();
  if (!s) return fail("Seller account required.");
  const parsed = productInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fields: fieldErrors(parsed.error) };
  try {
    const { product, quality } = await saveProduct(s.store.id, parsed.data);
    await audit(s.user.id, parsed.data.id ? "listing.update" : "listing.create", "Product", product.id, { status: product.status });
    after(kickJobs);
    revalidatePath("/seller/listings");
    revalidatePath(`/p/${product.slug}`);
    return { ok: true, data: { id: product.id, status: product.status, score: quality.score, tips: quality.tips } };
  } catch (e) {
    return fail((e as Error).message);
  }
}

const bulkSchema = z.object({ ids: z.array(z.string()).min(1).max(500), action: z.enum(["activate", "deactivate", "delete", "price"]), percent: z.number().min(-90).max(500).optional() });

export async function bulkListingAction(input: unknown): Promise<ActionResult<{ count: number }>> {
  const s = await seller();
  if (!s) return fail("Seller account required.");
  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success) return fail("Select at least one listing.");
  const { ids, action, percent } = parsed.data;
  const where = { id: { in: ids }, storeId: s.store.id };
  let count = 0;
  if (action === "activate") {
    // Only complete listings can go live; incomplete ones are flagged.
    const rows = await db.product.findMany({ where, select: { id: true, _count: { select: { media: true } } } });
    const ready = rows.filter((r) => r._count.media > 0).map((r) => r.id);
    count = (await db.product.updateMany({ where: { id: { in: ready } }, data: { status: "ACTIVE" } })).count;
    await db.product.updateMany({ where: { id: { in: rows.filter((r) => !ready.includes(r.id)).map((r) => r.id) } }, data: { status: "NEEDS_ATTENTION", moderationNote: "Add at least one image" } });
    await enqueue("search.index", { productIds: ready }, { priority: PRIORITY.high });
  } else if (action === "deactivate") {
    count = (await db.product.updateMany({ where, data: { status: "INACTIVE" } })).count;
    await enqueue("search.remove", { productIds: ids }, { priority: PRIORITY.high });
  } else if (action === "delete") {
    const sold = await db.orderItem.findMany({ where: { productId: { in: ids } }, select: { productId: true }, distinct: ["productId"] });
    const soldIds = new Set(sold.map((x) => x.productId));
    // Products with order history are archived, never hard-deleted.
    await db.product.updateMany({ where: { ...where, id: { in: [...soldIds] } }, data: { status: "INACTIVE" } });
    count = (await db.product.deleteMany({ where: { ...where, id: { in: ids.filter((i) => !soldIds.has(i)) } } })).count + soldIds.size;
    await enqueue("search.remove", { productIds: ids }, { priority: PRIORITY.high });
  } else if (action === "price" && percent != null) {
    const variants = await db.productVariant.findMany({ where: { product: where }, select: { id: true, price: true, productId: true } });
    for (const v of variants) await db.productVariant.update({ where: { id: v.id }, data: { price: Math.max(100, Math.round((v.price * (100 + percent)) / 100)) } });
    for (const id of ids) {
      const min = await db.productVariant.aggregate({ where: { productId: id, isActive: true }, _min: { price: true } });
      if (min._min.price != null) {
        await db.product.update({ where: { id }, data: { basePrice: min._min.price } });
        await db.priceHistory.create({ data: { productId: id, price: min._min.price } });
        if (percent < 0) await enqueue("price-alerts.check", { productId: id }, { priority: PRIORITY.high });
      }
    }
    count = ids.length;
  }
  await audit(s.user.id, `listing.bulk.${action}`, "Store", s.store.id, { ids: ids.length, percent });
  after(kickJobs);
  revalidatePath("/seller/listings");
  return { ok: true, data: { count }, message: `${count} listing${count === 1 ? "" : "s"} updated` };
}

export async function aiDraftFromPhotos(formData: FormData): Promise<ActionResult<{ draft: Awaited<ReturnType<ReturnType<typeof getAI>["draftListing"]>> & { categoryId: string | null }; images: string[] }>> {
  const s = await seller();
  if (!s) return fail("Seller account required.");
  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 8);
  if (!files.length) return fail("Add at least one photo.");
  const images: string[] = [];
  for (const f of files) images.push((await storeImage(f, `stores/${s.store.id}/images`)).url);
  const categories = await db.category.findMany({ where: { isActive: true, parentId: { not: null } }, select: { id: true, slug: true, name: true } });
  const draft = await getAI().draftListing({ fileNames: files.map((f) => f.name), hint: String(formData.get("hint") ?? "").slice(0, 300), categories });
  const categoryId = categories.find((c) => c.slug === draft.categorySlug)?.id ?? null;
  return { ok: true, data: { draft: { ...draft, categoryId }, images } };
}

export async function startBulkUpload(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const s = await seller();
  if (!s) return fail("Seller account required.");
  const file = formData.get("file");
  const categoryId = String(formData.get("categoryId") ?? "");
  if (!(file instanceof File) || !file.size) return fail("Choose a CSV file.");
  if (file.size > 10 * 1024 * 1024) return fail("CSV files are limited to 10 MB per upload.");
  if (!/\.(csv|txt)$/i.test(file.name)) return fail("Save your Excel sheet as CSV (File → Save as → CSV UTF-8) and upload that.");
  if (!(await db.category.findUnique({ where: { id: categoryId } }))) return fail("Choose a category.");
  const csv = await file.text();
  const upload = await db.bulkUpload.create({ data: { storeId: s.store.id, categoryId, fileName: file.name.slice(0, 120) } });
  await enqueue("bulk.import", { uploadId: upload.id, csv }, { priority: PRIORITY.normal });
  after(kickJobs);
  revalidatePath("/seller/bulk");
  return { ok: true, data: { id: upload.id }, message: "Upload queued — processing in the background." };
}

// ───────────────────────────── Inventory ─────────────────────────────

export async function setInventory(inventoryId: string, quantity: number): Promise<ActionResult> {
  const s = await seller();
  if (!s) return fail("Seller account required.");
  const inv = await db.inventory.findFirst({ where: { id: inventoryId, warehouse: { storeId: s.store.id } } });
  if (!inv) return fail("Not found");
  const q = Math.max(0, Math.min(1_000_000, Math.floor(quantity)));
  await db.inventory.update({ where: { id: inv.id }, data: { quantity: q } });
  const sum = await db.inventory.aggregate({ where: { variantId: inv.variantId }, _sum: { quantity: true, reserved: true } });
  await db.productVariant.update({ where: { id: inv.variantId }, data: { stock: Math.max(0, (sum._sum.quantity ?? 0) - (sum._sum.reserved ?? 0)) } });
  revalidatePath("/seller/inventory");
  return { ok: true, message: "Stock updated" };
}

export async function addWarehouse(name: string, city: string): Promise<ActionResult> {
  const s = await seller();
  if (!s) return fail("Seller account required.");
  if (name.trim().length < 2 || city.trim().length < 2) return fail("Enter a name and city.");
  await db.warehouse.create({ data: { storeId: s.store.id, name: name.trim().slice(0, 60), city: city.trim().slice(0, 60) } });
  revalidatePath("/seller/inventory");
  return { ok: true, message: "Warehouse added" };
}

// ───────────────────────────── Orders ─────────────────────────────

export async function advanceOrderItems(orderId: string, to: "ACCEPTED" | "PACKED" | "SHIPPED" | "DELIVERED" | "CANCELLED"): Promise<ActionResult> {
  const s = await seller();
  if (!s) return fail("Seller account required.");
  const items = await db.orderItem.findMany({ where: { orderId, storeId: s.store.id }, include: { order: true, product: { select: { deliveryMaxDays: true } } } });
  if (!items.length) return fail("Order not found");
  const allowed: Record<string, string[]> = { ACCEPTED: ["PENDING"], PACKED: ["ACCEPTED"], SHIPPED: ["PACKED", "ACCEPTED"], DELIVERED: ["SHIPPED"], CANCELLED: ["PENDING", "ACCEPTED"] };
  const movable = items.filter((i) => allowed[to].includes(i.status));
  if (!movable.length) return fail("Nothing to update in this order.");
  if (items[0].order.status === "PENDING_PAYMENT") return fail("Wait for payment before fulfilling.");

  if (to === "SHIPPED") {
    const now = new Date();
    const shipment = await db.shipment.create({
      data: {
        orderId,
        storeId: s.store.id,
        trackingNumber: `MQX${Date.now().toString().slice(-8)}${randomToken(2).toUpperCase()}`,
        status: "IN_TRANSIT",
        shippedAt: now,
        estimatedDelivery: addBusinessDays(now, Math.max(...movable.map((i) => i.product.deliveryMaxDays)) - 1),
        events: [{ at: now.toISOString(), status: "Picked up by courier", location: "Seller warehouse" }],
      },
    });
    await db.orderItem.updateMany({ where: { id: { in: movable.map((i) => i.id) } }, data: { status: "SHIPPED", shipmentId: shipment.id } });
  } else if (to === "DELIVERED") {
    const now = new Date();
    await db.orderItem.updateMany({ where: { id: { in: movable.map((i) => i.id) } }, data: { status: "DELIVERED", deliveredAt: now } });
    for (const sh of await db.shipment.findMany({ where: { orderId, storeId: s.store.id } })) {
      const events = [...((sh.events as object[]) ?? []), { at: now.toISOString(), status: "Delivered", location: (items[0].order.shippingAddress as { city?: string }).city }];
      await db.shipment.update({ where: { id: sh.id }, data: { status: "DELIVERED", deliveredAt: now, events } });
    }
    await db.payment.updateMany({ where: { orderId, provider: "cod", status: "PENDING" }, data: { status: "CAPTURED" } });
    await db.notification.create({ data: { userId: items[0].order.userId ?? s.user.id, type: "DELIVERED", title: "Delivered — how was it?", body: `${movable[0].title} was delivered. Leave a verified review.`, href: `/account/orders/${orderId}` } }).catch(() => {});
  } else if (to === "CANCELLED") {
    for (const i of movable) await db.productVariant.update({ where: { id: i.variantId }, data: { stock: { increment: i.quantity } } });
    await db.orderItem.updateMany({ where: { id: { in: movable.map((i) => i.id) } }, data: { status: "CANCELLED" } });
  } else {
    await db.orderItem.updateMany({ where: { id: { in: movable.map((i) => i.id) } }, data: { status: to } });
  }

  // Roll the order status up from its items.
  const all = await db.orderItem.findMany({ where: { orderId }, select: { status: true } });
  const every = (st: string) => all.every((i) => i.status === st || i.status === "CANCELLED");
  const status = all.every((i) => i.status === "CANCELLED") ? "CANCELLED" : every("DELIVERED") ? "DELIVERED" : all.some((i) => i.status === "SHIPPED" || i.status === "DELIVERED") ? "SHIPPED" : all.some((i) => i.status !== "PENDING") ? "CONFIRMED" : "PLACED";
  await db.order.update({ where: { id: orderId }, data: { status } });
  if (to === "DELIVERED" || to === "CANCELLED") await enqueue("trust.recompute", { storeId: s.store.id }, { priority: PRIORITY.low });
  await audit(s.user.id, `order.${to.toLowerCase()}`, "Order", orderId);
  revalidatePath("/seller/orders");
  return { ok: true, message: `Marked ${to.toLowerCase()}` };
}

export async function decideReturn(returnId: string, decision: "APPROVED" | "REJECTED" | "REFUNDED", note?: string): Promise<ActionResult> {
  const s = await seller();
  if (!s) return fail("Seller account required.");
  const r = await db.return.findFirst({ where: { id: returnId, orderItem: { storeId: s.store.id } }, include: { orderItem: true } });
  if (!r) return fail("Return not found");
  await db.return.update({ where: { id: r.id }, data: { status: decision, resolution: note?.slice(0, 500) || null } });
  if (decision === "REFUNDED") {
    await db.orderItem.update({ where: { id: r.orderItemId }, data: { status: "RETURNED" } });
    await db.productVariant.update({ where: { id: r.orderItem.variantId }, data: { stock: { increment: r.orderItem.quantity } } });
  }
  await db.notification.create({ data: { userId: r.userId, type: "RETURN", title: `Return ${decision.toLowerCase()}`, body: `${r.orderItem.title}${note ? `: ${note}` : ""}`, href: "/account/returns" } });
  await audit(s.user.id, `return.${decision.toLowerCase()}`, "Return", r.id);
  revalidatePath("/seller/returns");
  return { ok: true, message: `Return ${decision.toLowerCase()}` };
}

// ───────────────────────────── Promotions ─────────────────────────────

const couponSchema = z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,20}$/, "4–20 letters or digits"), type: z.enum(["PERCENT", "FIXED", "FREE_SHIPPING"]), value: z.coerce.number().min(0).max(100_000), minSubtotal: z.coerce.number().min(0).default(0), days: z.coerce.number().int().min(1).max(365) });

export async function createCoupon(input: unknown): Promise<ActionResult> {
  const s = await seller();
  if (!s) return fail("Seller account required.");
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message, fields: fieldErrors(parsed.error) };
  const d = parsed.data;
  if (d.type === "PERCENT" && d.value > 90) return fail("Percent coupons are capped at 90%.");
  if (await db.coupon.findUnique({ where: { code: d.code } })) return fail("That code is taken.");
  await db.coupon.create({ data: { code: d.code, storeId: s.store.id, type: d.type, value: d.type === "FIXED" ? Math.round(d.value * 100) : Math.round(d.value), minSubtotal: Math.round(d.minSubtotal * 100), endsAt: new Date(Date.now() + d.days * 86_400_000) } });
  revalidatePath("/seller/promotions");
  return { ok: true, message: `Coupon ${d.code} created` };
}

const dealSchema = z.object({ productId: z.string().min(1), discountPercent: z.coerce.number().int().min(5).max(80), hours: z.coerce.number().int().min(1).max(168) });

export async function createFlashDeal(input: unknown): Promise<ActionResult> {
  const s = await seller();
  if (!s) return fail("Seller account required.");
  const parsed = dealSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const product = await db.product.findFirst({ where: { id: parsed.data.productId, storeId: s.store.id }, include: { variants: true } });
  if (!product) return fail("Product not found");
  const pct = parsed.data.discountPercent;
  // A deal is a real price cut against the current price; history records it so "was" prices stay honest.
  await db.$transaction([
    db.promotion.create({ data: { storeId: s.store.id, productId: product.id, title: "Flash deal", discountPercent: pct, startsAt: new Date(), endsAt: new Date(Date.now() + parsed.data.hours * 3_600_000) } }),
    ...product.variants.map((v) => db.productVariant.update({ where: { id: v.id }, data: { compareAtPrice: v.price, price: Math.round((v.price * (100 - pct)) / 100) } })),
    db.product.update({ where: { id: product.id }, data: { compareAtPrice: product.basePrice, basePrice: Math.round((product.basePrice * (100 - pct)) / 100) } }),
    db.priceHistory.create({ data: { productId: product.id, price: Math.round((product.basePrice * (100 - pct)) / 100) } }),
  ]);
  await enqueue("price-alerts.check", { productId: product.id }, { priority: PRIORITY.high });
  after(kickJobs);
  revalidatePath("/seller/promotions");
  revalidatePath("/deals");
  return { ok: true, message: `${pct}% flash deal is live` };
}

const campaignSchema = z.object({ productId: z.string().min(1), cpcBid: z.coerce.number().min(1).max(500), dailyBudget: z.coerce.number().min(100).max(1_000_000) });

export async function createCampaign(input: unknown): Promise<ActionResult> {
  const s = await seller();
  if (!s) return fail("Seller account required.");
  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const product = await db.product.findFirst({ where: { id: parsed.data.productId, storeId: s.store.id, status: "ACTIVE" } });
  if (!product) return fail("Choose an active listing.");
  await db.sponsoredCampaign.create({ data: { storeId: s.store.id, productId: product.id, cpcBid: Math.round(parsed.data.cpcBid * 100), dailyBudget: Math.round(parsed.data.dailyBudget * 100) } });
  revalidatePath("/seller/promotions");
  return { ok: true, message: "Sponsored campaign started" };
}

export async function toggleCampaign(id: string): Promise<ActionResult> {
  const s = await seller();
  if (!s) return fail("Seller account required.");
  const c = await db.sponsoredCampaign.findFirst({ where: { id, storeId: s.store.id } });
  if (!c) return fail("Not found");
  await db.sponsoredCampaign.update({ where: { id }, data: { active: !c.active } });
  revalidatePath("/seller/promotions");
  return { ok: true, message: c.active ? "Campaign paused" : "Campaign resumed" };
}

// ───────────────────────────── API keys ─────────────────────────────

export async function createKey(name: string): Promise<ActionResult<{ key: string }>> {
  const s = await seller();
  if (!s) return fail("Seller account required.");
  const clean = name.trim().slice(0, 60) || "API key";
  const key = await createApiKey(s.store.id, clean);
  await audit(s.user.id, "apikey.create", "Store", s.store.id, { name: clean });
  revalidatePath("/seller/api");
  return { ok: true, data: { key } };
}

export async function revokeKey(id: string): Promise<ActionResult> {
  const s = await seller();
  if (!s) return fail("Seller account required.");
  await db.apiKey.updateMany({ where: { id, storeId: s.store.id, revokedAt: null }, data: { revokedAt: new Date() } });
  await audit(s.user.id, "apikey.revoke", "ApiKey", id);
  revalidatePath("/seller/api");
  return { ok: true, message: "Key revoked" };
}
