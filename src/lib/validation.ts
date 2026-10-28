import { z } from "zod";
import { PK_POSTAL_CODE, PROVINCES, normalizePkPhone } from "@/lib/pakistan";

// Pakistan only: numbers are stored normalised to +92 form.
const pkPhone = z
  .string()
  .trim()
  .refine((v) => normalizePkPhone(v) !== null, "Enter a Pakistani number, e.g. 0300 1234567")
  .transform((v) => normalizePkPhone(v)!);

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: z.email("Enter a valid email").transform((e) => e.toLowerCase()),
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(128)
    .regex(/[A-Za-z]/, "Include a letter")
    .regex(/\d/, "Include a number"),
});

export const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export const addressSchema = z.object({
  label: z.string().trim().max(30).default("Home"),
  fullName: z.string().trim().min(2, "Enter the recipient's name").max(80),
  phone: pkPhone,
  line1: z.string().trim().min(3, "Enter a street address").max(120),
  line2: z.string().trim().max(120).optional().default(""),
  city: z.string().trim().min(2, "Enter a city").max(60),
  region: z.string().refine((v) => (PROVINCES as readonly string[]).includes(v), "Choose a province or territory"),
  postalCode: z.string().trim().regex(PK_POSTAL_CODE, "Enter a 5-digit postal code"),
  country: z.string().default("PK").refine((v) => v.toUpperCase() === "PK", "We deliver within Pakistan only"),
});

export const checkoutSchema = z.object({
  email: z.email("Enter a valid email for your receipt"),
  address: addressSchema,
  deliveryId: z.enum(["standard", "express", "pickup"]),
  paymentMethod: z.string().min(1, "Choose a payment method"),
  saveAddress: z.boolean().optional(),
});

export const reviewSchema = z.object({
  orderItemId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().min(3, "Add a short headline").max(120),
  body: z.string().trim().min(20, "Tell other shoppers a bit more (20+ characters)").max(5000),
  fit: z.enum(["RUNS_SMALL", "TRUE_TO_SIZE", "RUNS_LARGE"]).optional().or(z.literal("").transform(() => undefined)),
  reviewerHeightCm: z.coerce.number().int().min(80).max(230).optional().or(z.literal("").transform(() => undefined)),
  sizeBought: z.string().trim().max(20).optional(),
});

export const questionSchema = z.object({ productId: z.string().min(1), body: z.string().trim().min(10, "Ask a complete question").max(500) });
export const answerSchema = z.object({ questionId: z.string().min(1), body: z.string().trim().min(2).max(2000) });

export const avatarSchema = z.object({
  name: z.string().trim().min(1).max(40).default("My avatar"),
  body: z.enum(["MEN", "WOMEN", "KIDS"]),
  heightCm: z.coerce.number().int().min(80).max(220),
  weightKg: z.coerce.number().int().min(12).max(200),
  shape: z.enum(["SLIM", "ATHLETIC", "REGULAR", "BROAD"]),
  consent: z.literal(true, { error: "Consent is required to save measurements" }),
});

export const sellerApplicationSchema = z.object({
  tier: z.enum(["INDIVIDUAL", "BUSINESS", "BRAND"]),
  legalName: z.string().trim().min(2, "Enter your legal name").max(120),
  businessName: z.string().trim().max(120).optional().default(""),
  registrationNumber: z.string().trim().max(60).optional().default(""),
  phone: pkPhone,
  storeName: z.string().trim().min(3, "Store name is too short").max(60),
  bankAccountName: z.string().trim().min(2, "Enter the account holder").max(120),
  bankName: z.string().trim().min(2, "Enter the bank").max(80),
  iban: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s+/g, "").toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9]{10,34}$/, "Enter a valid IBAN or account number")),
  agree: z.literal(true, { error: "You must accept the seller agreement" }),
});

export const productInputSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().min(1, "Choose a category"),
  title: z.string().trim().min(8, "Title should be at least 8 characters").max(200),
  brand: z.string().trim().max(80).optional().default(""),
  description: z.string().trim().min(20, "Description should be at least 20 characters").max(20_000),
  bullets: z.array(z.string().trim().max(250)).max(10).default([]),
  attributes: z.record(z.string(), z.union([z.string(), z.array(z.string())])).default({}),
  tags: z.array(z.string().trim().max(40)).max(30).default([]),
  shippingFee: z.coerce.number().min(0).max(1_000_000).default(0),
  deliveryMinDays: z.coerce.number().int().min(0).max(30).default(2),
  deliveryMaxDays: z.coerce.number().int().min(0).max(60).default(5),
  returnWindowDays: z.coerce.number().int().min(0).max(90).default(30),
  variants: z
    .array(
      z.object({
        id: z.string().optional(),
        sku: z.string().trim().min(1, "SKU is required").max(64),
        options: z.record(z.string(), z.string()),
        price: z.coerce.number().positive("Price must be above 0").max(100_000_000),
        compareAtPrice: z.coerce.number().min(0).optional().nullable(),
        stock: z.coerce.number().int().min(0).max(1_000_000),
        isActive: z.boolean().default(true),
      }),
    )
    .min(1, "Add at least one variant"),
  media: z.array(z.object({ url: z.string().min(1), alt: z.string().max(200), type: z.enum(["IMAGE", "VIDEO", "MODEL_3D"]) })).max(20).default([]),
  publish: z.boolean().default(false),
});
export type ProductInput = z.infer<typeof productInputSchema>;

export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export type ActionResult<T = unknown> = { ok: true; data?: T; message?: string } | { ok: false; error: string; fields?: Record<string, string> };
