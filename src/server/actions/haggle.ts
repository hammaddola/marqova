"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { DEAL_TTL_MS, HAGGLE_RESET_MS, MAX_ROUNDS, haggleFloor, isFinal, respond, walkAway, type HaggleReply, type HaggleState } from "@/lib/haggle";
import { randomToken } from "@/lib/utils";
import type { ActionResult } from "@/lib/validation";
import { getOrCreateCart } from "@/server/cart";
import { getSessionUser } from "@/server/session";

const moveSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("open") }),
  z.object({ type: z.literal("offer"), rupees: z.coerce.number().int().min(1).max(100_000_000) }),
  z.object({ type: z.literal("accept") }),
  z.object({ type: z.literal("walk") }),
]);

export type HaggleView = {
  kind: "open" | HaggleReply["kind"] | "gone";
  price: number;
  ask: number;
  rounds: number;
  maxRounds: number;
  final: boolean;
  calledBack: boolean;
  deal: number | null;
  couponCode: string | null;
};

export async function haggle(productId: string, move: z.input<typeof moveSchema>): Promise<ActionResult<HaggleView>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to bargain with the seller." };
  const parsed = moveSchema.safeParse(move);
  if (!parsed.success || typeof productId !== "string") return { ok: false, error: "Invalid offer." };
  if (!rateLimit(`haggle:${user.id}`, 40, 10 * 60_000).ok) return { ok: false, error: "Easy, easy! Take a short break and try again in a few minutes." };

  const product = await db.product.findUnique({ where: { id: productId }, select: { id: true, slug: true, status: true, basePrice: true, bargainPct: true, storeId: true } });
  if (!product || product.status !== "ACTIVE" || product.bargainPct <= 0) return { ok: false, error: "This item has a fixed price." };

  const row = await db.haggle.findUnique({ where: { userId_productId: { userId: user.id, productId } } });
  // A deal holds for its coupon's lifetime; an unfinished haggle resets after a day.
  const stale = !row || row.updatedAt.getTime() < Date.now() - (row.dealPrice != null ? DEAL_TTL_MS : HAGGLE_RESET_MS);
  const price = product.basePrice;
  const state: HaggleState = {
    price,
    floor: haggleFloor(price, product.bargainPct),
    ask: stale ? price : Math.min(row.ask, price),
    rounds: stale ? 0 : row.rounds,
    calledBack: stale ? false : row.calledBack,
  };
  const view = (kind: HaggleView["kind"], s: HaggleState, deal: number | null = null, couponCode: string | null = null): HaggleView => ({
    kind, price, ask: s.ask, rounds: s.rounds, maxRounds: MAX_ROUNDS, final: isFinal(s), calledBack: s.calledBack, deal, couponCode,
  });

  if (!stale && row.dealPrice != null) return { ok: true, data: view("deal", state, row.dealPrice, row.couponCode) };
  const m = parsed.data;
  if (m.type === "open") return { ok: true, data: view("open", state) };

  let reply: HaggleReply | null;
  if (m.type === "accept") reply = { kind: "deal", deal: state.ask, state };
  else if (m.type === "walk") reply = walkAway(state);
  else if (isFinal(state)) return { ok: false, error: "The seller has made a final offer. Take it or walk away." };
  else reply = respond(state, m.rupees * 100);

  if (!reply) {
    if (row) await db.haggle.deleteMany({ where: { id: row.id } });
    return { ok: true, data: view("gone", state) };
  }

  const s = reply.state;
  const save = { ask: s.ask, rounds: s.rounds, calledBack: s.calledBack, dealPrice: null as number | null, couponCode: null as string | null };
  if (reply.kind === "deal") {
    save.dealPrice = reply.deal;
    if (reply.deal < price) save.couponCode = `BHAO-${randomToken(4).toUpperCase()}`;
  }
  // Optimistic lock: of two parallel moves on one haggle, only one is saved, so a
  // double click can't mint two deal codes.
  const claimed = row
    ? (await db.haggle.updateMany({ where: { id: row.id, updatedAt: row.updatedAt }, data: save })).count === 1
    : await db.haggle.create({ data: { userId: user.id, productId, ...save } }).then(() => true, () => false);
  if (!claimed) return { ok: false, error: "One move at a time, please. Try again." };
  if (save.couponCode) {
    await db.coupon.create({
      data: {
        code: save.couponCode, type: "FIXED", value: price - save.dealPrice!, storeId: product.storeId, productId, userId: user.id,
        usageLimit: 1, endsAt: new Date(Date.now() + DEAL_TTL_MS),
      },
    });
    const cart = await getOrCreateCart();
    await db.cart.update({ where: { id: cart.id }, data: { couponCode: save.couponCode } });
    revalidatePath("/cart");
  }
  return { ok: true, data: view(reply.kind, s, save.dealPrice, save.couponCode) };
}
