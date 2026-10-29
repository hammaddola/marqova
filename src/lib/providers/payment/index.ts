import "server-only";
import Stripe from "stripe";
import { randomToken, siteUrl } from "@/lib/utils";

export type PaymentResult = {
  status: "CAPTURED" | "AUTHORIZED" | "PENDING" | "FAILED";
  providerRef: string;
  /** When set, the shopper must be redirected here to finish paying (e.g. Stripe Checkout). */
  redirectUrl?: string;
  message?: string;
};

export type CreatePaymentInput = {
  orderId: string;
  orderNumber: string;
  amount: number; // minor units
  currency: string;
  email: string;
};

export interface PaymentProvider {
  id: string;
  label: string;
  description: string;
  createPayment(input: CreatePaymentInput): Promise<PaymentResult>;
  refund(providerRef: string, amount: number): Promise<{ ok: boolean }>;
}

/** Development provider: approves every payment instantly. Never enable in production. */
const mockProvider: PaymentProvider = {
  id: "mock",
  label: "Test card (development)",
  description: "Instantly approves the payment. No real money moves.",
  async createPayment() {
    return { status: "CAPTURED", providerRef: `mock_${randomToken(8)}` };
  },
  async refund() {
    return { ok: true };
  },
};

const codProvider: PaymentProvider = {
  id: "cod",
  label: "Cash on delivery",
  description: "Pay the courier in cash when your parcel arrives.",
  async createPayment() {
    return { status: "PENDING", providerRef: `cod_${randomToken(8)}`, message: "Pay on delivery" };
  },
  async refund() {
    return { ok: true };
  },
};

function stripeProvider(): PaymentProvider | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  const stripe = new Stripe(key);
  return {
    id: "stripe",
    label: "Credit / debit card",
    description: "Secure card payment by Stripe. Marqova never sees or stores your card number.",
    async createPayment({ orderId, orderNumber, amount, currency, email }) {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: email,
        client_reference_id: orderId,
        metadata: { orderId },
        line_items: [
          {
            quantity: 1,
            price_data: { currency: currency.toLowerCase(), unit_amount: amount, product_data: { name: `Marqova order ${orderNumber}` } },
          },
        ],
        success_url: siteUrl(`/checkout/confirmation/${orderId}?session_id={CHECKOUT_SESSION_ID}`),
        cancel_url: siteUrl(`/checkout?cancelled=1`),
      });
      return { status: "PENDING", providerRef: session.id, redirectUrl: session.url ?? undefined };
    },
    async refund(providerRef, amount) {
      const session = await stripe.checkout.sessions.retrieve(providerRef);
      if (typeof session.payment_intent !== "string") return { ok: false };
      await stripe.refunds.create({ payment_intent: session.payment_intent, amount });
      return { ok: true };
    },
  };
}

/**
 * Returns the providers enabled by PAYMENT_PROVIDERS. Local wallets (JazzCash,
 * Easypaisa…) plug in by implementing PaymentProvider and adding a case here.
 */
export function getPaymentProviders(): PaymentProvider[] {
  const enabled = (process.env.PAYMENT_PROVIDERS ?? "cod").split(",").map((s) => s.trim());
  const all: (PaymentProvider | null)[] = [
    enabled.includes("stripe") ? stripeProvider() : null,
    enabled.includes("cod") ? codProvider : null,
    // The test card approves every payment without moving money, so it never runs in production.
    enabled.includes("mock") && process.env.NODE_ENV !== "production" ? mockProvider : null,
  ];
  return all.filter((p): p is PaymentProvider => !!p);
}

export function getPaymentProvider(id: string) {
  return getPaymentProviders().find((p) => p.id === id) ?? null;
}

export function getStripe() {
  return process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
}
