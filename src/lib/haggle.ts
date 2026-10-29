/**
 * Bhao-Taao: bazaar-style bargaining. Pure maths, so the server can replay it
 * and the shopper can never talk the price below the seller's floor.
 * All amounts are paisa; asks are rounded to whole Rs 10.
 */
export const MAX_ROUNDS = 5;
export const DEAL_TTL_MS = 2 * 60 * 60 * 1000;
export const HAGGLE_RESET_MS = 24 * 60 * 60 * 1000;

export type HaggleState = { price: number; floor: number; ask: number; rounds: number; calledBack: boolean };
export type HaggleReply =
  | { kind: "deal"; deal: number; state: HaggleState }
  | { kind: "counter" | "final" | "insulted" | "callback"; state: HaggleState };

const RS10 = 10_00;
const up10 = (n: number) => Math.ceil(n / RS10) * RS10;

/** Lowest price the seller accepts: never below `price` minus `pct` percent. */
export function haggleFloor(price: number, pct: number) {
  return Math.min(price, up10((price * (100 - Math.min(Math.max(pct, 0), 50))) / 100));
}

export function startHaggle(price: number, pct: number): HaggleState {
  return { price, floor: haggleFloor(price, pct), ask: price, rounds: 0, calledBack: false };
}

export function isFinal(s: HaggleState) {
  return s.rounds >= MAX_ROUNDS;
}

/** The seller's answer to an offer: split the difference, never below the floor. */
export function respond(s: HaggleState, offer: number): HaggleReply {
  if (offer >= s.ask) return { kind: "deal", deal: s.ask, state: s };
  const rounds = s.rounds + 1;
  // Lowballing doesn't move the seller, but it does use up a round.
  if (offer < s.floor * 0.6) return { kind: rounds >= MAX_ROUNDS ? "final" : "insulted", state: { ...s, rounds } };
  // Concede half the gap; offers under the floor count only as the floor.
  const ask = Math.max(s.floor, Math.min(s.ask, up10((Math.max(offer, s.floor) + s.ask) / 2)));
  if (offer >= s.floor && ask - offer <= s.price * 0.02) return { kind: "deal", deal: offer, state: { ...s, rounds, ask: offer } };
  return { kind: rounds >= MAX_ROUNDS ? "final" : "counter", state: { ...s, rounds, ask } };
}

/** Walking away earns one last, smaller cut, once. */
export function walkAway(s: HaggleState): HaggleReply | null {
  const ask = Math.max(s.floor, up10(s.ask - (s.ask - s.floor) / 3));
  if (s.calledBack || ask >= s.ask) return null;
  return { kind: "callback", state: { ...s, calledBack: true, ask } };
}
