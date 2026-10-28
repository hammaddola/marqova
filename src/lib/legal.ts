/**
 * Legal page TEMPLATES. Every document marked `template: true` must be reviewed
 * by a qualified lawyer before launch (see CONTENT_TODO.md).
 */
type Doc = { title: string; template: boolean; sections: { heading: string; body: string[] }[] };

export const LEGAL_DOCS: Record<string, Doc> = {
  terms: {
    title: "Terms of use",
    template: true,
    sections: [
      { heading: "1. Who we are", body: ["Marqova operates an online marketplace that connects shoppers with independent, verified sellers. Sellers are responsible for their listings and the products they sell."] },
      { heading: "2. Your account", body: ["You must provide accurate information and keep your password secure. You are responsible for activity on your account."] },
      { heading: "3. Prices and payment", body: ["Prices shown include all taxes and fees, and delivery charges are shown before checkout. We never store full card numbers; payments are processed by licensed payment providers."] },
      { heading: "4. Reviews and content", body: ["Only buyers with a delivered order can review a product. Reviews must be honest and must not be paid for. We may remove content that breaks these rules."] },
      { heading: "5. Liability", body: ["[To be completed by counsel: limitation of liability, governing law, dispute resolution.]"] },
    ],
  },
  privacy: {
    title: "Privacy notice",
    template: true,
    sections: [
      { heading: "What we collect", body: ["Account details, delivery addresses, order history and, only with your explicit consent, body measurements and try-on photos."] },
      { heading: "Body measurements and photos", body: ["Avatar measurements are private to you, never shared with sellers, and deleted permanently when you remove them. Try-on photos are processed to create a preview and are not stored by Marqova."] },
      { heading: "How we use data", body: ["To fulfil orders, prevent fraud, compute Trust Scores, and improve recommendations. We do not sell personal data."] },
      { heading: "Your rights", body: ["You can access, correct, export or delete your data from your account or by contacting us. [Counsel: add applicable law, retention periods and contact details.]"] },
    ],
  },
  "seller-agreement": {
    title: "Seller agreement",
    template: true,
    sections: [
      { heading: "Verification", body: ["Sellers must pass identity, business and bank verification before listing. Marqova may suspend sellers who fail to meet standards."] },
      { heading: "Fees", body: ["A category commission, a fixed per-item fee and payment processing are deducted from each sale. The fee calculator in Seller Hub shows the exact amount before you list."] },
      { heading: "Listings", body: ["Listings must be accurate, legal and not counterfeit. Prices must include all fees the shopper pays except delivery, which is shown separately."] },
      { heading: "Payouts", body: ["Payouts are made weekly to the verified bank account, net of fees, refunds and chargebacks. [Counsel: add reserve and dispute terms.]"] },
    ],
  },
  returns: {
    title: "Returns & refund policy",
    template: true,
    sections: [
      { heading: "Return window", body: ["Each product shows its return window (typically 7–30 days from delivery). Items must be unused and in original packaging unless faulty."] },
      { heading: "How to return", body: ["Start a return from Orders in your account. The seller responds within 2 business days. If they don't, Marqova steps in."] },
      { heading: "Refunds", body: ["Refunds are issued to the original payment method within 5 business days of the seller receiving the item. Cash-on-delivery refunds are sent to your bank or wallet."] },
      { heading: "Buyer Protection", body: ["If an item doesn't arrive or is significantly not as described, Marqova Buyer Protection guarantees a full refund."] },
    ],
  },
  "trust-score": {
    title: "How the Trust Score works",
    template: false,
    sections: [
      { heading: "What it measures", body: ["The Trust Score (0–100) blends five signals from the last 180 days: on-time delivery (30 points), return rate (15), cancellation rate (15), verified review rating (25) and response time (15)."] },
      { heading: "Why it's transparent", body: ["Hover over any Trust Score to see the exact breakdown. Sellers can't buy a better score — they earn it by delivering on their promises."] },
    ],
  },
};
