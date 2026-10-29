/**
 * Help-centre answers, shared by /help and the shopping assistant.
 * Answers describe what the site does today; update them alongside the feature they describe.
 */
export type FaqItem = { q: string; a: string; link?: { href: string; label: string }; keys: string[] };
export type FaqTopic = { id: string; title: string; items: FaqItem[] };

export const FAQ: FaqTopic[] = [
  {
    id: "orders",
    title: "Ordering and delivery",
    items: [
      {
        q: "How do I know what delivery will cost?",
        a: "Every product card shows its delivery fee and an estimated delivery date for your city. Standard delivery is free on orders of Rs 2,500 or more. Express delivery costs Rs 350 extra and usually arrives in 1–2 business days.",
        keys: ["delivery cost", "delivery fee", "shipping cost", "shipping fee", "free delivery", "free shipping", "express"],
      },
      {
        q: "How long does delivery take?",
        a: "Standard delivery takes 2–5 business days, and each seller's own dispatch time is included in the date you see. Deliveries to Gilgit, Skardu, Quetta, Gwadar and Chitral can take up to 2 days longer. Sundays don't count as business days.",
        keys: ["delivery time", "arrive", "days"],
      },
      {
        q: "Where can I see my order?",
        a: "Go to Your orders. Each order shows its status for every item: placed, accepted by the seller, shipped or delivered.",
        link: { href: "/account/orders", label: "Your orders" },
        keys: ["my order", "order status", "see order"],
      },
      {
        q: "Can I change the delivery city?",
        a: "Yes. Use “Deliver to” at the top of any page. Prices, delivery fees and dates update for the city you choose.",
        keys: ["city", "change address", "deliver to", "location"],
      },
    ],
  },
  {
    id: "payment",
    title: "Payment",
    items: [
      {
        q: "Which payment methods can I use?",
        a: "Cash on delivery is available on every order. Card payments are handled by a licensed payment provider on its own secure page, and Marqova never sees or stores your card number.",
        keys: ["payment", "pay", "cash on delivery", "cod", "card", "jazzcash", "easypaisa"],
      },
      {
        q: "Will I be charged anything extra at checkout?",
        a: "No. The total at checkout is the item price plus the delivery fee you were already shown. Taxes are included in the item price.",
        keys: ["extra", "hidden", "tax", "charges", "fees"],
      },
      {
        q: "How do discount codes work?",
        a: "Enter a code in your cart. Some codes need a minimum order amount, and some only apply to one store. The cart tells you exactly why a code doesn't apply. On items marked Bhao-Taao you can also bargain with the seller for a one-time deal code.",
        keys: ["discount", "coupon", "promo", "code", "voucher", "bargain", "haggle", "bhao"],
      },
    ],
  },
  {
    id: "returns",
    title: "Returns and refunds",
    items: [
      {
        q: "How long do I have to return something?",
        a: "Each product shows its return window next to the Add to Cart button, typically 7–30 days from delivery. Items must be unused and in their original packaging unless they arrived faulty.",
        keys: ["return policy", "return window", "to return", "days to return"],
      },
      {
        q: "How do I start a return?",
        a: "Open the order in Your orders and choose “Return item”. You can follow every return in Returns. The seller has 2 business days to respond. If they don't, Marqova reviews the request itself.",
        link: { href: "/account/returns", label: "Your returns" },
        keys: ["return", "start return", "send back", "exchange"],
      },
      {
        q: "When will I get my money back?",
        a: "Within 5 business days of the seller receiving the item, to the payment method you used. For cash on delivery orders we refund to your bank account or mobile wallet.",
        keys: ["refund", "money back"],
      },
      {
        q: "What if my order never arrives?",
        a: "If an item doesn't arrive, or is significantly different from its description, Marqova Buyer Protection refunds you in full.",
        keys: ["never arrived", "not arrived", "missing", "wrong item", "damaged", "buyer protection", "fake"],
      },
    ],
  },
  {
    id: "sizing",
    title: "Sizing and try-on",
    items: [
      {
        q: "How does the size recommendation work?",
        a: "Save your height, weight and body shape once in the Try-On Studio. Clothing and shoe pages then recommend a size and show where it will feel tight, good or roomy, based on the product's size chart.",
        link: { href: "/try-on", label: "Open the Try-On Studio" },
        keys: ["size", "sizing", "fit", "which size", "try on", "try-on"],
      },
      {
        q: "Who can see my measurements?",
        a: "Only you. Sellers never see them. You can delete them at any time in Sizes and avatars, and they are removed permanently.",
        link: { href: "/account/avatars", label: "Sizes and avatars" },
        keys: ["measurements", "privacy", "who can see"],
      },
      {
        q: "What does “View in 3D” do?",
        a: "Some products include a 3D model you can rotate and zoom. On most phones, the AR button inside the 3D viewer places the item in your room using your camera.",
        keys: ["3d", "ar", "augmented"],
      },
    ],
  },
  {
    id: "trust",
    title: "Reviews and seller trust",
    items: [
      {
        q: "Why does a product have no reviews?",
        a: "Only shoppers whose order was delivered can review a product, so new listings start with none. We never add reviews ourselves or let sellers buy them.",
        keys: ["no reviews", "reviews", "review"],
      },
      {
        q: "What is the Trust Score?",
        a: "A score from 0 to 100 built from on-time delivery, return and cancellation rates, buyer ratings and how quickly the seller replies. Open any score to see its breakdown.",
        link: { href: "/legal/trust-score", label: "How the Trust Score works" },
        keys: ["trust score", "trust", "score"],
      },
      {
        q: "How do I ask a seller something?",
        a: "Ask on the product page under Questions and answers, where the seller and verified owners can reply, or message the seller from their store page. Your conversations are kept in Messages in your account.",
        link: { href: "/account/messages", label: "Your messages" },
        keys: ["contact", "message seller", "ask seller", "customer service", "support", "talk to"],
      },
    ],
  },
  {
    id: "account",
    title: "Your account",
    items: [
      {
        q: "Do I need an account to order?",
        a: "No, you can check out as a guest. With an account you can track orders, save addresses and sizes, keep a wishlist and get price-drop alerts.",
        keys: ["account", "guest", "sign up", "register"],
      },
      {
        q: "How do price alerts work?",
        a: "On any product page, choose “Set a price alert” and pick a target price. You'll find your alerts in Price alerts.",
        link: { href: "/account/alerts", label: "Price alerts" },
        keys: ["price alert", "price drop", "notify"],
      },
      {
        q: "I forgot my password",
        a: "Password reset by email arrives before our full launch. During the preview, create a new account; nothing you've saved so far involves real orders or payments.",
        keys: ["password", "forgot", "reset", "login", "sign in"],
      },
    ],
  },
  {
    id: "selling",
    title: "Selling on Marqova",
    items: [
      {
        q: "Who can sell?",
        a: "Individuals, registered businesses and brand owners. Every seller verifies their ID and bank account before listing.",
        link: { href: "/sell", label: "Start on the Sell page" },
        keys: ["sell", "seller", "become a seller", "vendor"],
      },
      {
        q: "What does it cost?",
        a: "There's no monthly fee. Each sale has a category commission, a fixed per-item fee and a payment processing fee. The fee calculator on the Sell page shows the exact amount before you list.",
        keys: ["commission", "selling fee", "seller fee"],
      },
      {
        q: "When do I get paid?",
        a: "Payouts are weekly to your verified bank account, with a full breakdown of fees and refunds for every order.",
        keys: ["payout", "get paid", "seller payment"],
      },
    ],
  },
];

const STOP = new Set("a an the i me my you your we our is are am do does did can could will would should how what when where why which who to of in on for with and or it this that be have has from at by about any get".split(" "));
const words = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, " ").split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w)).map((w) => w.replace(/(?<=\w{3})s$/, ""));

/** Best help answer for a free-text question, or null when nothing fits well. */
export function matchFaq(question: string, topics: FaqTopic[] = FAQ): FaqItem | null {
  const text = ` ${question.toLowerCase()} `;
  const qWords = new Set(words(question));
  let best: { item: FaqItem; score: number } | null = null;
  for (const item of topics.flatMap((t) => t.items)) {
    // A phrase key is a strong signal; overlapping question words are a weak one.
    const keyHits = item.keys.filter((k) => text.includes(` ${k} `) || text.includes(` ${k}?`) || text.includes(` ${k}s `)).length;
    const overlap = words(item.q).filter((w) => qWords.has(w)).length;
    const score = keyHits * 3 + overlap;
    if (score >= 3 && (!best || score > best.score)) best = { item, score };
  }
  return best?.item ?? null;
}
