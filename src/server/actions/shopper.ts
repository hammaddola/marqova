"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { detectReviewFlags } from "@/lib/review-guard";
import { storeImage } from "@/lib/providers/storage";
import { answerSchema, avatarSchema, fieldErrors, questionSchema, reviewSchema, addressSchema, type ActionResult } from "@/lib/validation";
import { getSessionUser } from "@/server/session";
import { enqueue } from "@/server/jobs";

async function userOrError() {
  const user = await getSessionUser();
  return user ?? null;
}

const SIGN_IN = { ok: false as const, error: "Please sign in first." };

export async function toggleWishlist(productId: string): Promise<ActionResult<{ saved: boolean }>> {
  const user = await userOrError();
  if (!user) return SIGN_IN;
  const existing = await db.wishlist.findUnique({ where: { userId_productId: { userId: user.id, productId } } });
  if (existing) await db.wishlist.delete({ where: { id: existing.id } });
  else await db.wishlist.create({ data: { userId: user.id, productId } });
  revalidatePath("/account/wishlist");
  return { ok: true, data: { saved: !existing } };
}

export async function setPriceAlert(productId: string, targetRupees: number): Promise<ActionResult> {
  const user = await userOrError();
  if (!user) return SIGN_IN;
  const target = Math.round(Number(targetRupees) * 100);
  if (!Number.isFinite(target) || target <= 0) return { ok: false, error: "Enter a target price." };
  await db.priceAlert.upsert({
    where: { userId_productId: { userId: user.id, productId } },
    update: { targetPrice: target, active: true, triggeredAt: null },
    create: { userId: user.id, productId, targetPrice: target },
  });
  revalidatePath("/account/alerts");
  return { ok: true, message: "We'll email you when the price drops." };
}

export async function deletePriceAlert(id: string) {
  const user = await userOrError();
  if (!user) return SIGN_IN;
  await db.priceAlert.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/account/alerts");
  return { ok: true } as ActionResult;
}

export async function submitReview(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await userOrError();
  if (!user) return SIGN_IN;
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Please check your review.", fields: fieldErrors(parsed.error) };
  const d = parsed.data;
  // Verified buyers only: the order item must be theirs and delivered.
  const item = await db.orderItem.findFirst({ where: { id: d.orderItemId, status: "DELIVERED", order: { userId: user.id } }, include: { review: true } });
  if (!item) return { ok: false, error: "You can review items once they have been delivered to you." };
  if (item.review) return { ok: false, error: "You've already reviewed this purchase." };

  const recent = await db.review.findMany({ where: { productId: item.productId }, orderBy: { createdAt: "desc" }, take: 100, select: { body: true, createdAt: true, userId: true } });
  const flags = detectReviewFlags({ body: d.body, createdAt: new Date(), userId: user.id }, recent);
  const photos = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 5);
  const media = [];
  for (const p of photos) media.push({ url: (await storeImage(p, `reviews/${user.id}`)).url });

  await db.review.create({
    data: {
      productId: item.productId,
      userId: user.id,
      orderItemId: item.id,
      rating: d.rating,
      title: d.title,
      body: d.body,
      fit: d.fit,
      reviewerHeightCm: d.reviewerHeightCm,
      sizeBought: d.sizeBought || null,
      status: flags.some((f) => f !== "LOW_EFFORT") ? "FLAGGED" : "PUBLISHED",
      flags,
      media: { create: media },
    },
  });
  const agg = await db.review.aggregate({ where: { productId: item.productId, status: "PUBLISHED" }, _avg: { rating: true }, _count: { _all: true } });
  const product = await db.product.update({
    where: { id: item.productId },
    data: { ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count._all },
    select: { slug: true, storeId: true },
  });
  await enqueue("trust.recompute", { storeId: product.storeId }, { priority: 9 });
  revalidatePath(`/p/${product.slug}`);
  revalidatePath("/account/orders");
  return { ok: true, message: flags.length && flags.some((f) => f !== "LOW_EFFORT") ? "Thanks! Your review will appear after a quick check." : "Thanks for your review!" };
}

export async function askQuestion(productId: string, body: string): Promise<ActionResult> {
  const user = await userOrError();
  if (!user) return SIGN_IN;
  const parsed = questionSchema.safeParse({ productId, body });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const q = await db.question.create({ data: { productId, userId: user.id, body: parsed.data.body }, include: { product: { select: { slug: true, store: { select: { seller: { select: { userId: true } } } } } } } });
  await db.notification.create({ data: { userId: q.product.store.seller.userId, type: "QUESTION", title: "New customer question", body: parsed.data.body.slice(0, 140), href: `/p/${q.product.slug}#qa` } });
  revalidatePath(`/p/${q.product.slug}`);
  return { ok: true, message: "Question posted. The seller and other shoppers can answer." };
}

export async function answerQuestion(questionId: string, body: string): Promise<ActionResult> {
  const user = await userOrError();
  if (!user) return SIGN_IN;
  const parsed = answerSchema.safeParse({ questionId, body });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const q = await db.question.findUnique({ where: { id: questionId }, include: { product: { select: { slug: true, store: { select: { seller: { select: { userId: true } } } } } } } });
  if (!q) return { ok: false, error: "Question not found" };
  await db.answer.create({ data: { questionId, userId: user.id, body: parsed.data.body, isSeller: q.product.store.seller.userId === user.id } });
  revalidatePath(`/p/${q.product.slug}`);
  return { ok: true };
}

const voteSchema = z.object({ targetType: z.enum(["question", "answer", "review"]), targetId: z.string().min(1) });

export async function vote(targetType: "question" | "answer" | "review", targetId: string): Promise<ActionResult<{ count: number }>> {
  const user = await userOrError();
  if (!user) return SIGN_IN;
  const parsed = voteSchema.safeParse({ targetType, targetId });
  if (!parsed.success) return { ok: false, error: "Invalid vote" };
  const exists = await db.vote.findUnique({ where: { userId_targetType_targetId: { userId: user.id, targetType, targetId } } });
  if (exists) return { ok: false, error: "You've already voted on this." };
  await db.vote.create({ data: { userId: user.id, targetType, targetId } });
  let count = 0;
  if (targetType === "question") count = (await db.question.update({ where: { id: targetId }, data: { upvotes: { increment: 1 } } })).upvotes;
  if (targetType === "answer") count = (await db.answer.update({ where: { id: targetId }, data: { upvotes: { increment: 1 } } })).upvotes;
  if (targetType === "review") count = (await db.review.update({ where: { id: targetId }, data: { helpfulCount: { increment: 1 } } })).helpfulCount;
  return { ok: true, data: { count } };
}

export async function saveAvatar(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await userOrError();
  if (!user) return SIGN_IN;
  const parsed = avatarSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message, fields: fieldErrors(parsed.error) };
  const { consent: _consent, ...data } = parsed.data;
  const count = await db.avatarProfile.count({ where: { userId: user.id } });
  if (count >= 10) return { ok: false, error: "You can save up to 10 avatars." };
  const avatar = await db.avatarProfile.create({ data: { ...data, userId: user.id, consentAt: new Date(), isDefault: count === 0 } });
  revalidatePath("/account/avatars");
  return { ok: true, data: { id: avatar.id }, message: "Avatar saved to your account (private to you)." };
}

export async function deleteAvatar(id: string): Promise<ActionResult> {
  const user = await userOrError();
  if (!user) return SIGN_IN;
  await db.avatarProfile.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/account/avatars");
  return { ok: true, message: "Avatar and measurements deleted." };
}

export async function deleteAddress(id: string): Promise<ActionResult> {
  const user = await userOrError();
  if (!user) return SIGN_IN;
  await db.address.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/account/addresses");
  return { ok: true };
}

export async function addAddress(input: unknown): Promise<ActionResult> {
  const user = await userOrError();
  if (!user) return SIGN_IN;
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the address fields.", fields: fieldErrors(parsed.error) };
  const count = await db.address.count({ where: { userId: user.id } });
  await db.address.create({ data: { ...parsed.data, userId: user.id, isDefault: count === 0 } });
  revalidatePath("/account/addresses");
  return { ok: true, message: "Address saved" };
}

const returnSchema = z.object({ orderItemId: z.string().min(1), reason: z.string().min(3).max(80), details: z.string().max(2000).optional() });

export async function requestReturn(input: unknown): Promise<ActionResult> {
  const user = await userOrError();
  if (!user) return SIGN_IN;
  const parsed = returnSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Choose a reason for the return." };
  const item = await db.orderItem.findFirst({
    where: { id: parsed.data.orderItemId, order: { userId: user.id }, status: "DELIVERED" },
    include: { product: { select: { returnWindowDays: true } }, returns: true },
  });
  if (!item) return { ok: false, error: "Only delivered items can be returned." };
  if (item.returns.length) return { ok: false, error: "A return is already open for this item." };
  const deliveredAt = item.deliveredAt ?? item.createdAt;
  if (Date.now() - deliveredAt.getTime() > item.product.returnWindowDays * 86_400_000) return { ok: false, error: `The ${item.product.returnWindowDays}-day return window has closed.` };
  await db.return.create({ data: { orderItemId: item.id, userId: user.id, reason: parsed.data.reason, details: parsed.data.details, refundAmount: item.unitPrice * item.quantity } });
  const store = await db.store.findUnique({ where: { id: item.storeId }, select: { seller: { select: { userId: true } } } });
  if (store) await db.notification.create({ data: { userId: store.seller.userId, type: "RETURN", title: "Return requested", body: `${item.title}: ${parsed.data.reason}`, href: "/seller/returns" } });
  revalidatePath("/account/returns");
  revalidatePath("/account/orders");
  return { ok: true, message: "Return requested. The seller will respond within 2 business days." };
}

export async function sendMessageToStore(storeId: string, subject: string, body: string): Promise<ActionResult<{ id: string }>> {
  const user = await userOrError();
  if (!user) return SIGN_IN;
  const text = body.trim().slice(0, 4000);
  if (text.length < 2) return { ok: false, error: "Write a message first." };
  const convo = await db.conversation.create({ data: { userId: user.id, storeId, subject: subject.slice(0, 120) || "Question", messages: { create: { senderId: user.id, body: text } } } });
  revalidatePath("/account/messages");
  return { ok: true, data: { id: convo.id }, message: "Message sent to the seller." };
}

export async function replyInConversation(conversationId: string, body: string): Promise<ActionResult> {
  const user = await userOrError();
  if (!user) return SIGN_IN;
  const convo = await db.conversation.findUnique({ where: { id: conversationId }, include: { store: { select: { seller: { select: { userId: true } } } } } });
  if (!convo || (convo.userId !== user.id && convo.store.seller.userId !== user.id)) return { ok: false, error: "Not found" };
  const text = body.trim().slice(0, 4000);
  if (!text) return { ok: false, error: "Write a message first." };
  await db.message.create({ data: { conversationId, senderId: user.id, body: text } });
  await db.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
  revalidatePath("/account/messages");
  revalidatePath("/seller/messages");
  return { ok: true };
}
