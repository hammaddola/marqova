/**
 * Marqova seed — SAMPLE DATA ONLY.
 *
 * Every store, product, review, rating and statistic created here is fictional and
 * flagged with `isSample: true`. Store names are prefixed "Sample Store —" and
 * no real brands, logos or reviews are used. See CONTENT_TODO.md for what to
 * replace before launch.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type AttributeType, type TryOnType } from "../src/generated/prisma/client";
import { computeTrustScore } from "../src/lib/trust-score";
import { listingQuality } from "../src/lib/listing-quality";

const ca = process.env.DATABASE_CA;
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, ...(ca && { ssl: { ca } }) }) });

// Deterministic PRNG so every developer gets the same catalog.
let seed = 20261027;
function rand() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
const between = (a: number, b: number) => Math.round(a + rand() * (b - a));
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Set SEED_PASSWORD for any internet-facing database; the default is published in the README.
const PASSWORD = process.env.SEED_PASSWORD || "Marqova123!";

const COLORS: Record<string, string> = {
  Navy: "#1C2A40", Black: "#1A1A1A", White: "#F4F4F2", Olive: "#5B6B3A", Maroon: "#6E1F2A", Sand: "#D8C9A8",
  Sky: "#7FA7C9", Rose: "#C98A94", Charcoal: "#3C4048", Emerald: "#1F7A5A", Gold: "#C8A24A", Silver: "#B8BCC2",
};

type AttrSpec = { key: string; label: string; type: AttributeType; options?: string[]; unit?: string; required?: boolean; variantAxis?: boolean; filterable?: boolean };

const APPAREL_ATTRS: AttrSpec[] = [
  { key: "color", label: "Color", type: "COLOR", options: ["Navy", "Black", "White", "Olive", "Maroon", "Sand", "Sky", "Rose"], variantAxis: true, required: true },
  { key: "size", label: "Size", type: "SIZE", options: ["XS", "S", "M", "L", "XL", "XXL"], variantAxis: true, required: true },
  { key: "material", label: "Material", type: "SELECT", options: ["Cotton", "Linen", "Wool blend", "Polyester", "Denim", "Silk blend"], required: true },
  { key: "fit", label: "Fit", type: "SELECT", options: ["Slim", "Regular", "Relaxed", "Oversized"] },
  { key: "sleeve", label: "Sleeve length", type: "SELECT", options: ["Sleeveless", "Short", "Three-quarter", "Long"] },
];
const SHOE_ATTRS: AttrSpec[] = [
  { key: "color", label: "Color", type: "COLOR", options: ["Black", "White", "Navy", "Sand", "Charcoal"], variantAxis: true, required: true },
  { key: "size", label: "EU size", type: "SIZE", options: ["39", "40", "41", "42", "43", "44", "45"], variantAxis: true, required: true },
  { key: "upper", label: "Upper material", type: "SELECT", options: ["Leather", "Mesh", "Canvas", "Suede"] },
  { key: "closure", label: "Closure", type: "SELECT", options: ["Laces", "Slip-on", "Velcro", "Buckle"] },
];
const ACCESSORY_ATTRS: AttrSpec[] = [
  { key: "color", label: "Color", type: "COLOR", options: ["Black", "Gold", "Silver", "Sand", "Navy"], variantAxis: true },
  { key: "material", label: "Material", type: "SELECT", options: ["Leather", "Stainless steel", "Acetate", "Canvas"] },
];
const ELECTRONICS_ATTRS: AttrSpec[] = [
  { key: "color", label: "Color", type: "COLOR", options: ["Black", "Silver", "Navy", "White"], variantAxis: true },
  { key: "storage", label: "Storage", type: "SELECT", options: ["64 GB", "128 GB", "256 GB", "512 GB", "1 TB"], variantAxis: true },
  { key: "connectivity", label: "Connectivity", type: "MULTISELECT", options: ["Bluetooth", "Wi-Fi", "USB-C", "5G", "NFC"] },
  { key: "warranty", label: "Warranty", type: "SELECT", options: ["6 months", "1 year", "2 years"], required: true },
  { key: "battery", label: "Battery life", type: "NUMBER", unit: "hours", filterable: false },
];
const HOME_ATTRS: AttrSpec[] = [
  { key: "color", label: "Color", type: "COLOR", options: ["Sand", "Charcoal", "Olive", "White", "Navy"], variantAxis: true },
  { key: "material", label: "Material", type: "SELECT", options: ["Solid wood", "Engineered wood", "Ceramic", "Stainless steel", "Cotton", "Rattan"], required: true },
  { key: "room", label: "Room", type: "SELECT", options: ["Living room", "Bedroom", "Kitchen", "Dining", "Outdoor"] },
  { key: "assembly", label: "Assembly required", type: "BOOLEAN" },
];
const BEAUTY_ATTRS: AttrSpec[] = [
  { key: "volume", label: "Size", type: "SELECT", options: ["30 ml", "50 ml", "100 ml", "200 ml"], variantAxis: true },
  { key: "skinType", label: "Skin type", type: "SELECT", options: ["All", "Dry", "Oily", "Combination", "Sensitive"] },
  { key: "crueltyFree", label: "Cruelty-free", type: "BOOLEAN" },
];
const SPORTS_ATTRS: AttrSpec[] = [
  { key: "color", label: "Color", type: "COLOR", options: ["Black", "Navy", "Emerald", "Charcoal"], variantAxis: true },
  { key: "level", label: "Level", type: "SELECT", options: ["Beginner", "Intermediate", "Pro"] },
  { key: "weight", label: "Weight", type: "NUMBER", unit: "kg", filterable: false },
];
const KIDS_ATTRS: AttrSpec[] = [
  { key: "age", label: "Age range", type: "SELECT", options: ["0–2 years", "3–5 years", "6–8 years", "9–12 years"], required: true },
  { key: "color", label: "Color", type: "COLOR", options: ["Sky", "Rose", "Emerald", "Gold"], variantAxis: true },
  { key: "safety", label: "Safety certified", type: "BOOLEAN" },
];
const GROCERY_ATTRS: AttrSpec[] = [
  { key: "pack", label: "Pack size", type: "SELECT", options: ["250 g", "500 g", "1 kg", "5 kg"], variantAxis: true },
  { key: "diet", label: "Dietary", type: "MULTISELECT", options: ["Halal", "Vegan", "Gluten-free", "Organic", "Sugar-free"] },
  { key: "origin", label: "Origin", type: "TEXT", filterable: false },
];
const AUTO_ATTRS: AttrSpec[] = [
  { key: "compatibility", label: "Vehicle type", type: "SELECT", options: ["Universal", "Hatchback", "Sedan", "SUV", "Motorbike"], required: true },
  { key: "color", label: "Color", type: "COLOR", options: ["Black", "Charcoal", "Silver"], variantAxis: true },
];
const BOOK_ATTRS: AttrSpec[] = [
  { key: "format", label: "Format", type: "SELECT", options: ["Paperback", "Hardcover", "E-book"], variantAxis: true, required: true },
  { key: "language", label: "Language", type: "SELECT", options: ["English", "Urdu"] },
  { key: "pages", label: "Pages", type: "NUMBER", filterable: false },
];
const HANDMADE_ATTRS: AttrSpec[] = [
  { key: "color", label: "Color", type: "COLOR", options: ["Sand", "Emerald", "Maroon", "Navy", "Gold"], variantAxis: true },
  { key: "technique", label: "Technique", type: "SELECT", options: ["Hand-woven", "Hand-painted", "Hand-stitched", "Hand-carved"] },
  { key: "madeToOrder", label: "Made to order", type: "BOOLEAN" },
];
const PET_ATTRS: AttrSpec[] = [
  { key: "petSize", label: "Pet size", type: "SELECT", options: ["Small", "Medium", "Large"], variantAxis: true },
  { key: "lifeStage", label: "Life stage", type: "SELECT", options: ["Puppy/Kitten", "Adult", "Senior"] },
];
const WHOLESALE_ATTRS: AttrSpec[] = [
  { key: "moq", label: "Minimum order", type: "SELECT", options: ["10 units", "50 units", "100 units", "500 units"], variantAxis: true, required: true },
  { key: "packaging", label: "Packaging", type: "SELECT", options: ["Carton", "Pallet", "Polybag"] },
];

type Sub = { name: string; kind: string; items: string[]; price: [number, number]; tryOn?: TryOnType; model?: string };
type Root = { name: string; icon: string; commission: number; attrs: AttrSpec[]; subs: Sub[] };

const KHRONOS = (n: string) => `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/${n}/glTF-Binary/${n}.glb`;

const CATALOG: Root[] = [
  {
    name: "Fashion", icon: "Shirt", commission: 1500, attrs: APPAREL_ATTRS, subs: [
      { name: "Men's Clothing", kind: "shirt", tryOn: "TOP", price: [1800, 7500], items: ["Oxford Button-Down Shirt", "Everyday Crew Tee", "Linen Camp-Collar Shirt", "Merino Knit Polo", "Quilted Gilet", "Heritage Kurta"] },
      { name: "Women's Clothing", kind: "dress", tryOn: "DRESS", price: [2200, 9800], items: ["Wrap Midi Dress", "Pleated Lawn Kurti", "Relaxed Linen Shirt Dress", "Tiered Cotton Maxi", "Tailored Day Dress", "Embroidered Tunic"] },
      { name: "Bottoms", kind: "trousers", tryOn: "BOTTOM", price: [2400, 6900], items: ["Straight Chino Trouser", "Tapered Denim Jean", "Pleated Wide-Leg Trouser", "Drawstring Linen Pant", "Stretch Travel Trouser"] },
    ],
  },
  {
    name: "Shoes", icon: "Footprints", commission: 1400, attrs: SHOE_ATTRS, subs: [
      { name: "Sneakers", kind: "shoe", tryOn: "SHOES", model: KHRONOS("MaterialsVariantsShoe"), price: [4500, 14500], items: ["Court Leather Sneaker", "Knit Runner", "Canvas Low-Top", "Trail Running Shoe", "Retro Suede Trainer"] },
      { name: "Formal Shoes", kind: "shoe", tryOn: "SHOES", price: [6500, 18500], items: ["Classic Oxford", "Penny Loafer", "Chelsea Boot", "Monk Strap Shoe"] },
    ],
  },
  {
    name: "Accessories", icon: "Watch", commission: 1500, attrs: ACCESSORY_ATTRS, subs: [
      { name: "Watches", kind: "watch", tryOn: "ACCESSORY", model: KHRONOS("ChronographWatch"), price: [5500, 32000], items: ["Field Chronograph Watch", "Minimalist Mesh Watch", "Diver's Automatic Watch", "Everyday Quartz Watch"] },
      { name: "Eyewear", kind: "glasses", tryOn: "ACCESSORY", model: KHRONOS("SunglassesKhronos"), price: [2500, 9500], items: ["Polarised Wayfarer Sunglasses", "Round Acetate Sunglasses", "Blue-Light Reading Glasses"] },
      { name: "Bags", kind: "bag", price: [3500, 16500], items: ["Leather Weekender Bag", "Canvas Tote", "Slim Laptop Sleeve", "Everyday Crossbody Bag"] },
    ],
  },
  {
    name: "Electronics", icon: "Smartphone", commission: 800, attrs: ELECTRONICS_ATTRS, subs: [
      { name: "Phones & Tablets", kind: "phone", price: [32000, 245000], items: ["Nova 12 Smartphone", "Pixelate A5 Smartphone", "Slate 11 Tablet", "Nova 12 Mini"] },
      { name: "Audio", kind: "headphones", model: KHRONOS("BoomBox"), price: [3500, 48000], items: ["Studio Over-Ear Headphones", "Wireless Earbuds Pro", "Retro Bluetooth Boombox", "Portable Party Speaker", "Sport Neckband Earphones"] },
      { name: "Laptops & Computers", kind: "laptop", price: [95000, 420000], items: ["Aero 14 Ultrabook", "Creator 16 Laptop", "Compact Mini PC", "27-inch QHD Monitor"] },
    ],
  },
  {
    name: "Home & Kitchen", icon: "Sofa", commission: 1200, attrs: HOME_ATTRS, subs: [
      { name: "Furniture", kind: "sofa", model: KHRONOS("GlamVelvetSofa"), price: [18000, 165000], items: ["Velvet Three-Seater Sofa", "Sheen Lounge Chair", "Solid Oak Coffee Table", "Rattan Accent Chair", "Floating Wall Shelf Set"] },
      { name: "Kitchen & Dining", kind: "pot", price: [1500, 28000], items: ["Cast Iron Casserole", "Ceramic Dinner Set (18 pc)", "Stainless Steel Pressure Cooker", "Chef's Knife Set", "Glass Food Storage Set"] },
      { name: "Home Decor", kind: "lamp", price: [1800, 22000], items: ["Linen Drum Table Lamp", "Hand-Knotted Area Rug", "Ceramic Vase Trio", "Blackout Linen Curtains"] },
    ],
  },
  {
    name: "Beauty & Personal Care", icon: "Sparkles", commission: 1300, attrs: BEAUTY_ATTRS, subs: [
      { name: "Skincare", kind: "bottle", price: [900, 6500], items: ["Hydrating Hyaluronic Serum", "Daily Mineral Sunscreen SPF 50", "Gentle Foaming Cleanser", "Niacinamide Night Cream"] },
      { name: "Fragrance", kind: "perfume", price: [2500, 18000], items: ["Oud & Amber Eau de Parfum", "Citrus Vetiver Cologne", "Rose Attar Oil"] },
      { name: "Hair Care", kind: "bottle", price: [700, 4500], items: ["Argan Repair Shampoo", "Rosemary Scalp Oil", "Leave-In Conditioner"] },
    ],
  },
  {
    name: "Sports & Outdoors", icon: "Dumbbell", commission: 1100, attrs: SPORTS_ATTRS, subs: [
      { name: "Fitness", kind: "dumbbell", price: [1500, 38000], items: ["Adjustable Dumbbell Pair", "Non-Slip Yoga Mat", "Resistance Band Set", "Folding Treadmill"] },
      { name: "Outdoor & Cycling", kind: "bottle-sport", model: KHRONOS("WaterBottle"), price: [1200, 85000], items: ["Insulated Steel Water Bottle", "Hybrid City Bicycle", "Two-Person Camping Tent", "Cricket Bat — English Willow"] },
    ],
  },
  {
    name: "Kids & Baby", icon: "Baby", commission: 1100, attrs: KIDS_ATTRS, subs: [
      { name: "Toys & Games", kind: "toy", model: KHRONOS("ToyCar"), price: [900, 12000], items: ["Die-Cast Toy Car", "Wooden Building Blocks (100 pc)", "STEM Robot Kit", "Plush Bear", "Family Board Game"] },
      { name: "Baby Gear", kind: "stroller", price: [2500, 65000], items: ["Lightweight Travel Stroller", "Convertible Car Seat", "Organic Cotton Swaddle Set"] },
    ],
  },
  {
    name: "Grocery", icon: "ShoppingBasket", commission: 600, attrs: GROCERY_ATTRS, subs: [
      { name: "Pantry Staples", kind: "jar", price: [350, 4800], items: ["Extra-Long Grain Basmati Rice", "Cold-Pressed Mustard Oil", "Pink Himalayan Salt", "Stone-Ground Whole Wheat Atta"] },
      { name: "Snacks & Beverages", kind: "fruit", model: KHRONOS("Avocado"), price: [250, 3200], items: ["Hass Avocados (pack of 4)", "Roasted Almonds", "Green Tea Selection", "Dark Chocolate 70%"] },
    ],
  },
  {
    name: "Automotive", icon: "Car", commission: 900, attrs: AUTO_ATTRS, subs: [
      { name: "Car Care", kind: "car", price: [900, 14000], items: ["Ceramic Car Wax", "Microfiber Detailing Kit", "Cordless Tyre Inflator", "Dash Camera 2K"] },
      { name: "Motorbike Gear", kind: "helmet", price: [2500, 22000], items: ["Full-Face Helmet", "Riding Gloves", "Waterproof Bike Cover"] },
    ],
  },
  {
    name: "Books", icon: "BookOpen", commission: 700, attrs: BOOK_ATTRS, subs: [
      { name: "Fiction", kind: "book", price: [800, 3500], items: ["The Lantern Keeper (Sample Novel)", "Monsoon Letters (Sample Novel)", "City of Brass Doors (Sample Novel)"] },
      { name: "Non-fiction", kind: "book", price: [900, 4500], items: ["Practical Personal Finance (Sample)", "A Short History of Trade Routes (Sample)", "Cooking with Spice (Sample)"] },
    ],
  },
  {
    name: "Handmade", icon: "Palette", commission: 1000, attrs: HANDMADE_ATTRS, subs: [
      { name: "Crafts & Pottery", kind: "vase", price: [1200, 18000], items: ["Blue Pottery Serving Bowl", "Hand-Woven Basket Set", "Hand-Painted Truck Art Tray", "Carved Walnut Jewellery Box"] },
      { name: "Handmade Jewellery", kind: "ring", price: [1500, 25000], items: ["Hammered Silver Bangle", "Kundan-Style Earrings", "Beaded Gemstone Necklace"] },
    ],
  },
  {
    name: "Pets", icon: "PawPrint", commission: 1000, attrs: PET_ATTRS, subs: [
      { name: "Dog Supplies", kind: "paw", price: [800, 15000], items: ["Orthopaedic Dog Bed", "Reflective Dog Harness", "Grain-Free Adult Dog Food"] },
      { name: "Cat Supplies", kind: "paw", price: [600, 12000], items: ["Sisal Cat Scratching Tower", "Clumping Cat Litter", "Interactive Feather Wand"] },
    ],
  },
  {
    name: "Wholesale", icon: "Boxes", commission: 500, attrs: WHOLESALE_ATTRS, subs: [
      { name: "Bulk Packaging", kind: "boxes", price: [4500, 60000], items: ["Corrugated Shipping Boxes", "Kraft Paper Mailers", "Bubble Wrap Rolls"] },
      { name: "Bulk Apparel", kind: "shirt", price: [12000, 120000], items: ["Plain Cotton T-Shirts (Bulk)", "Embroidery-Ready Polos (Bulk)"] },
    ],
  },
];

const STORES = [
  { name: "Sample Store — Northline", tagline: "Considered everyday clothing", tier: "BRAND" as const },
  { name: "Sample Store — Kestrel Tech", tagline: "Electronics, tested and explained", tier: "BUSINESS" as const },
  { name: "Sample Store — Hearth & Loom", tagline: "Furniture and decor for calm homes", tier: "BUSINESS" as const },
  { name: "Sample Store — Indus Craft", tagline: "Handmade by artisans", tier: "INDIVIDUAL" as const },
  { name: "Sample Store — Fieldhouse", tagline: "Sport, outdoors and play", tier: "BUSINESS" as const },
  { name: "Sample Store — Daily Pantry", tagline: "Groceries and essentials", tier: "BUSINESS" as const },
  { name: "Sample Store — Lumen Beauty", tagline: "Clean beauty and care", tier: "BRAND" as const },
  { name: "Sample Store — Roadwise", tagline: "Car and bike care", tier: "INDIVIDUAL" as const },
];

// Which store sells each root category (index into STORES).
const STORE_FOR_ROOT: Record<string, number[]> = {
  Fashion: [0, 3], Shoes: [0, 4], Accessories: [0, 3], Electronics: [1], "Home & Kitchen": [2, 3], "Beauty & Personal Care": [6],
  "Sports & Outdoors": [4], "Kids & Baby": [4, 2], Grocery: [5], Automotive: [7], Books: [5, 3], Handmade: [3], Pets: [5, 4], Wholesale: [1, 0],
};

const REVIEW_SNIPPETS = {
  5: ["Excellent quality, exactly as described. Delivery was fast and the packaging was neat.", "Really happy with this purchase. Great value for the price and it looks premium.", "Comfortable and well made. Fits true to size, I would buy again.", "Arrived a day early and the build quality is better than I expected."],
  4: ["Good product overall. The color is slightly different from the photos but still nice.", "Solid value for money. Delivery took a little longer than promised.", "Nice design and good quality, sizing runs a little small so consider one size up."],
  3: ["It's okay. Quality is average for the price, packaging could be better.", "Does the job but the material feels a bit cheap. Delivery was on time."],
  2: ["Not great. The fit was too tight and the stitching came loose after a week."],
  1: ["Disappointed — arrived late and did not match the description."],
} as const;

const QUESTIONS = [
  ["Is this suitable for daily use?", "Yes, it's designed for everyday use. (Sample answer)"],
  ["What is the warranty or return policy?", "Returns are accepted within the window shown in the buy box, in original condition. (Sample answer)"],
  ["Does the color match the photos?", "Colors are photographed in daylight; screens can vary slightly. (Sample answer)"],
];

function sampleImage(kind: string, color: string, n: number) {
  return `/sample/${kind}.svg?c=${encodeURIComponent(color)}&v=${n}`;
}

function variantMatrix(attrs: AttrSpec[]) {
  const axes = attrs.filter((a) => a.variantAxis && a.options?.length);
  if (!axes.length) return [{}] as Record<string, string>[];
  // Keep matrices small: up to 3 colors × 4 sizes, or 3 values of any other axis.
  const limited = axes.map((a) => {
    const opts = a.options!;
    const start = between(0, Math.max(0, opts.length - 3));
    const count = a.key === "size" ? Math.min(4, opts.length) : Math.min(3, opts.length);
    return { key: a.key, values: a.key === "size" ? opts.slice(Math.min(1, opts.length - count), Math.min(1, opts.length - count) + count) : opts.slice(start, start + count) };
  });
  let combos: Record<string, string>[] = [{}];
  for (const axis of limited) combos = combos.flatMap((c) => axis.values.map((v) => ({ ...c, [axis.key]: v })));
  return combos;
}

async function main() {
  console.log("Resetting database…");
  const tables = await db.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length) await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // ── Users ──
  const admin = await db.user.create({ data: { email: "admin@marqova.dev", name: "Avery Admin (demo)", role: "ADMIN", passwordHash, isSample: true } });
  const shopper = await db.user.create({
    data: {
      email: "shopper@marqova.dev", name: "Sam Shopper (demo)", role: "SHOPPER", passwordHash, isSample: true,
      addresses: { create: { fullName: "Sam Shopper", phone: "+92 300 0000000", line1: "House 12, Street 4", line2: "Gulberg III", city: "Lahore", region: "Punjab", postalCode: "54000", isDefault: true } },
      avatars: { create: { name: "Me", body: "MEN", heightCm: 176, weightKg: 74, shape: "REGULAR", consentAt: new Date(), isDefault: true } },
    },
  });
  const reviewers = await Promise.all(
    Array.from({ length: 14 }, (_, i) =>
      db.user.create({ data: { email: `sample.reviewer${i + 1}@marqova.dev`, name: `Sample Shopper ${i + 1}`, isSample: true } }),
    ),
  );

  // ── Stores ──
  const stores = [];
  for (const [i, s] of STORES.entries()) {
    const returnDays = pick([14, 30, 30]);
    const user = await db.user.create({
      data: { email: i === 0 ? "seller@marqova.dev" : `${slug(s.name.replace("Sample Store — ", ""))}@sample.marqova.dev`, name: i === 0 ? "Sky Seller (demo)" : s.name, role: "SELLER", passwordHash, isSample: true },
    });
    const store = await db.store.create({
      data: {
        name: s.name, slug: slug(s.name.replace("Sample Store — ", "")), tagline: s.tagline, isVerified: true, isSample: true,
        description: `${s.tagline}. This is a fictional sample store used to demonstrate Marqova.`,
        responseTimeHours: between(1, 20),
        returnPolicy: `${returnDays}-day free returns on unused items in original packaging. Refunds within 5 business days of receipt.`,
        seller: {
          create: {
            userId: user.id, tier: s.tier, status: "APPROVED", approvedAt: new Date(), legalName: `${s.name} (Sample) Pvt Ltd`, businessName: s.name,
            phone: "+92 300 1111111", bankAccountName: s.name, bankName: "Sample Bank", bankAccountLast4: String(between(1000, 9999)),
            verifications: { create: [{ type: "ID_DOCUMENT", status: "APPROVED", reviewedById: admin.id, reviewedAt: new Date() }, { type: "BANK_ACCOUNT", status: "APPROVED", reviewedById: admin.id, reviewedAt: new Date() }] },
          },
        },
        warehouses: { create: [{ name: "Main warehouse", city: pick(["Lahore", "Karachi", "Islamabad"]), isDefault: true }, { name: "Overflow", city: pick(["Faisalabad", "Rawalpindi", "Multan"]) }] },
      },
      include: { warehouses: true },
    });
    stores.push({ ...store, returnDays });
  }

  // A pending applicant so the admin approval flow has something to review.
  await db.user.create({
    data: {
      email: "pending.seller@marqova.dev", name: "Pat Pending (demo)", role: "SHOPPER", passwordHash, isSample: true,
      sellerProfile: {
        create: {
          tier: "INDIVIDUAL", status: "PENDING", legalName: "Pat Pending", phone: "+92 300 2222222", bankAccountName: "Pat Pending", bankName: "Sample Bank", bankAccountLast4: "4321",
          verifications: { create: [{ type: "ID_DOCUMENT", status: "PENDING", documentUrl: "/sample/id.svg?c=%23C8A24A&v=1" }, { type: "BANK_ACCOUNT", status: "PENDING" }] },
        },
      },
    },
  });

  // ── Fee rules ──
  await db.feeRule.createMany({
    data: [
      { name: "Payment processing", type: "PAYMENT_PROCESSING_BPS", value: 200 },
      { name: "Fixed fee per item", type: "FIXED_PER_ITEM", value: 2500 },
    ],
  });

  // ── Categories, attributes, products ──
  const allProducts: { id: string; storeId: string; price: number; categoryKind: string; tryOn: TryOnType; variants: { id: string; price: number; title: string }[]; title: string; image: string }[] = [];
  let rootPos = 0;
  for (const root of CATALOG) {
    const rootCat = await db.category.create({
      data: { name: root.name, slug: slug(root.name), icon: root.icon, position: rootPos++, commissionBps: root.commission, description: `Shop ${root.name.toLowerCase()} from verified sellers.` },
    });
    await db.attributeDefinition.createMany({ data: root.attrs.map((a, i) => ({ categoryId: rootCat.id, key: a.key, label: a.label, type: a.type, options: a.options ?? [], unit: a.unit, required: !!a.required, variantAxis: !!a.variantAxis, filterable: a.filterable ?? true, position: i })) });
    await db.feeRule.create({ data: { name: `${root.name} commission`, type: "COMMISSION_BPS", value: root.commission, categoryId: rootCat.id } });

    let subPos = 0;
    for (const sub of root.subs) {
      const cat = await db.category.create({
        data: { name: sub.name, slug: slug(sub.name), icon: root.icon, parentId: rootCat.id, position: subPos++, commissionBps: root.commission, tryOnType: sub.tryOn ?? "NONE" },
      });
      await db.attributeDefinition.createMany({ data: root.attrs.map((a, i) => ({ categoryId: cat.id, key: a.key, label: a.label, type: a.type, options: a.options ?? [], unit: a.unit, required: !!a.required, variantAxis: !!a.variantAxis, filterable: a.filterable ?? true, position: i })) });

      for (const [idx, itemName] of sub.items.entries()) {
        const storeIdx = pick(STORE_FOR_ROOT[root.name]);
        const store = stores[storeIdx];
        const base = Math.round(between(sub.price[0], sub.price[1]) / 10) * 10 * 100;
        const discounted = rand() < 0.45;
        const compareAt = discounted ? Math.round((base * (1 + between(10, 40) / 100)) / 1000) * 1000 : null;
        const combos = variantMatrix(root.attrs);
        const colorAttr = combos[0].color;
        const mainColor = COLORS[colorAttr ?? pick(Object.keys(COLORS))] ?? "#1C2A40";
        const brand = `Sample ${pick(["Atelier", "Works", "Co.", "Studio", "Supply", "Goods"])} ${String.fromCharCode(65 + between(0, 25))}`;
        const attrValues: Record<string, string | string[]> = {};
        for (const a of root.attrs) {
          if (a.variantAxis) attrValues[a.key] = [...new Set(combos.map((c) => c[a.key]).filter(Boolean))];
          else if (a.type === "BOOLEAN") attrValues[a.key] = rand() < 0.6 ? "Yes" : "No";
          else if (a.type === "MULTISELECT") attrValues[a.key] = [...new Set([pick(a.options!), pick(a.options!)])];
          else if (a.type === "NUMBER") attrValues[a.key] = String(between(1, 40));
          else if (a.type === "TEXT") attrValues[a.key] = "Pakistan";
          else if (a.options?.length) attrValues[a.key] = pick(a.options);
        }
        const title = `${itemName}`;
        const bullets = [
          `${pick(["Thoughtfully designed", "Carefully made", "Built to last"])} for everyday ${root.name.toLowerCase()} use`,
          `${typeof attrValues.material === "string" ? attrValues.material : "Quality"} construction, inspected before dispatch`,
          "Full price shown upfront — delivery estimate included",
          "Covered by Marqova Buyer Protection",
          "SAMPLE LISTING — content to be replaced before launch",
        ];
        const description = `${title} from ${store.name}. This is fictional sample content created to demonstrate Marqova's product page: gallery, variants, specifications, verified reviews and Q&A. Replace it with real, accurate product information before launch. Materials, dimensions and care instructions belong here, written clearly so shoppers can buy with confidence.`;
        const imgCount = between(4, 6);
        const media: { type: "IMAGE" | "MODEL_3D"; url: string; alt: string; position: number }[] = Array.from({ length: imgCount }, (_, n) => ({
          type: "IMAGE",
          url: sampleImage(sub.kind, mainColor, n),
          alt: `${title} — view ${n + 1}`,
          position: n,
        }));
        const has3d = !!sub.model && idx === 0;
        if (has3d) media.push({ type: "MODEL_3D", url: sub.model!, alt: `${title} 3D model (sample)`, position: 99 });
        const quality = listingQuality({ title, description, bullets, imageCount: imgCount, has3d, attributesFilled: Object.keys(attrValues).length, attributesRequired: root.attrs.length, hasBrand: true });
        const deliveryMin = between(1, 3);
        const product = await db.product.create({
          data: {
            storeId: store.id, categoryId: cat.id, title, slug: `${slug(title)}-${slug(store.slug).slice(0, 8)}-${between(100, 999)}`, brand, description, bullets,
            specs: { Brand: brand, Model: `MQ-${between(1000, 9999)}`, "Country of origin": "Pakistan", Weight: `${between(1, 40) / 10} kg`, "In the box": `1 × ${itemName}` },
            attributes: attrValues, tags: [...new Set([...slug(itemName).split("-"), slug(root.name), slug(sub.name)])].filter((t) => t.length > 2),
            sizeGuide: sub.tryOn && ["TOP", "BOTTOM", "DRESS", "SHOES"].includes(sub.tryOn) ? { type: sub.tryOn } : undefined,
            status: "ACTIVE", basePrice: base, compareAtPrice: compareAt, shippingFee: pick([0, 150_00, 200_00, 250_00]),
            deliveryMinDays: deliveryMin, deliveryMaxDays: deliveryMin + between(1, 3), returnWindowDays: store.returnDays,
            has3d, tryOnType: sub.tryOn ?? "NONE", isSample: true, qualityScore: quality.score, salesCount: between(5, 900), viewCount: between(200, 20000),
            media: { create: media },
          },
        });
        const variants = [];
        for (const [vi, combo] of combos.entries()) {
          const priceBump = combo.storage ? ["64 GB", "128 GB", "256 GB", "512 GB", "1 TB"].indexOf(combo.storage) * 12_000_00 : combo.volume || combo.pack || combo.moq ? vi * Math.round(base * 0.35) : 0;
          const stock = rand() < 0.08 ? 0 : between(2, 60);
          const v = await db.productVariant.create({
            data: {
              productId: product.id, sku: `MQ-${product.id.slice(-6).toUpperCase()}-${vi + 1}`, title: Object.values(combo).join(" / ") || "Standard",
              options: combo, colorHex: combo.color ? COLORS[combo.color] : null, price: base + priceBump, compareAtPrice: compareAt ? compareAt + priceBump : null, stock,
              inventory: { create: [{ warehouseId: store.warehouses[0].id, quantity: Math.ceil(stock * 0.7), lowStockThreshold: 5 }, { warehouseId: store.warehouses[1].id, quantity: Math.floor(stock * 0.3), lowStockThreshold: 3 }] },
            },
          });
          variants.push({ id: v.id, price: v.price, title: v.title });
        }
        // Price history: last 120 days.
        const points = Array.from({ length: 8 }, (_, n) => ({
          productId: product.id,
          price: n === 7 ? base : Math.round((base * (1 + (rand() - 0.35) * 0.25)) / 1000) * 1000,
          recordedAt: new Date(Date.now() - (120 - n * 16) * 86_400_000),
        }));
        await db.priceHistory.createMany({ data: points });
        allProducts.push({ id: product.id, storeId: store.id, price: base, categoryKind: sub.kind, tryOn: sub.tryOn ?? "NONE", variants, title, image: media[0].url });
      }
    }
  }
  console.log(`Created ${allProducts.length} sample products.`);

  // ── Verified sample orders + reviews ──
  const orderRows: object[] = [];
  const itemRows: object[] = [];
  const reviewRows: object[] = [];
  let orderNo = 100000;
  for (const p of allProducts) {
    const n = between(0, 9);
    for (let r = 0; r < n; r++) {
      const reviewer = reviewers[(r + between(0, 13)) % reviewers.length];
      const v = pick(p.variants);
      const created = new Date(Date.now() - between(10, 170) * 86_400_000);
      const delivered = new Date(created.getTime() + between(2, 6) * 86_400_000);
      const orderId = randomUUID();
      const itemId = randomUUID();
      orderRows.push({
        id: orderId, number: `MQ-${orderNo++}`, userId: reviewer.id, email: reviewer.email, status: "DELIVERED", subtotal: v.price, shippingTotal: 0, total: v.price,
        deliveryOption: "standard", paymentMethod: "mock", shippingAddress: { city: "Lahore", sample: true }, isSample: true, placedAt: created, createdAt: created,
      });
      itemRows.push({ id: itemId, orderId, productId: p.id, variantId: v.id, storeId: p.storeId, title: p.title, variantTitle: v.title, imageUrl: p.image, unitPrice: v.price, quantity: 1, status: "DELIVERED", deliveredAt: delivered, createdAt: created });
      const rating = pick([5, 5, 5, 4, 4, 4, 3, 5, 2, 1, 5, 4]) as 1 | 2 | 3 | 4 | 5;
      const apparel = ["TOP", "BOTTOM", "DRESS", "SHOES"].includes(p.tryOn);
      reviewRows.push({
        id: randomUUID(), productId: p.id, userId: reviewer.id, orderItemId: itemId, rating,
        title: rating >= 4 ? pick(["Great buy", "Very happy", "Worth it", "Recommended"]) : rating === 3 ? "It's okay" : "Not as expected",
        body: `${pick(REVIEW_SNIPPETS[rating])} (Sample review — not from a real customer.)`,
        fit: apparel ? pick(["TRUE_TO_SIZE", "TRUE_TO_SIZE", "RUNS_SMALL", "RUNS_LARGE"]) : null,
        reviewerHeightCm: apparel ? between(152, 190) : null,
        sizeBought: apparel ? (v.title.split(" / ")[1] ?? v.title) : null,
        status: "PUBLISHED", helpfulCount: between(0, 40), isSample: true, createdAt: new Date(delivered.getTime() + 2 * 86_400_000),
      });
    }
  }
  await db.order.createMany({ data: orderRows as never });
  await db.orderItem.createMany({ data: itemRows as never });
  await db.review.createMany({ data: reviewRows as never });
  console.log(`Created ${reviewRows.length} sample verified reviews.`);

  // Aggregate ratings onto products.
  const agg = await db.review.groupBy({ by: ["productId"], where: { status: "PUBLISHED" }, _avg: { rating: true }, _count: { _all: true } });
  for (const a of agg) await db.product.update({ where: { id: a.productId }, data: { ratingAvg: Math.round((a._avg.rating ?? 0) * 10) / 10, ratingCount: a._count._all } });

  // ── Q&A ──
  for (const p of allProducts.filter(() => rand() < 0.5)) {
    const [q, a] = pick(QUESTIONS);
    await db.question.create({
      data: { productId: p.id, userId: pick(reviewers).id, body: q, upvotes: between(0, 25), isSample: true, answers: { create: { userId: (await db.sellerProfile.findFirstOrThrow({ where: { store: { id: p.storeId } } })).userId, body: a, isSeller: true, upvotes: between(0, 10) } } },
    });
  }

  // ── Trust scores ──
  for (const s of stores) {
    const inputs = { onTimeRate: 0.82 + rand() * 0.17, returnRate: rand() * 0.08, cancelRate: rand() * 0.04, reviewRating: 3.8 + rand() * 1.1, responseHours: s.responseTimeHours };
    await db.trustScore.create({ data: { storeId: s.id, score: computeTrustScore(inputs), ...inputs } });
  }
  const storeTrust = new Map((await db.trustScore.findMany({ where: { storeId: { not: null } } })).map((t) => [t.storeId!, t]));
  for (const p of await db.product.findMany({ select: { id: true, storeId: true, ratingAvg: true, ratingCount: true } })) {
    const st = storeTrust.get(p.storeId)!;
    const inputs = { onTimeRate: st.onTimeRate, returnRate: st.returnRate, cancelRate: st.cancelRate, reviewRating: p.ratingCount ? p.ratingAvg : st.reviewRating, responseHours: st.responseHours };
    await db.trustScore.create({ data: { productId: p.id, score: computeTrustScore(inputs), ...inputs } });
  }

  // ── Promotions, coupons, sponsored ──
  const dealProducts = [...allProducts].sort(() => rand() - 0.5).slice(0, 14);
  for (const p of dealProducts) {
    const pct = between(10, 35);
    await db.promotion.create({ data: { storeId: p.storeId, productId: p.id, title: "Flash deal", discountPercent: pct, startsAt: new Date(Date.now() - 86_400_000), endsAt: new Date(Date.now() + between(6, 72) * 3_600_000) } });
    const newPrice = Math.round((p.price * (100 - pct)) / 100 / 1000) * 1000;
    await db.product.update({ where: { id: p.id }, data: { basePrice: newPrice, compareAtPrice: p.price } });
    await db.productVariant.updateMany({ where: { productId: p.id }, data: { compareAtPrice: p.price } });
    for (const v of p.variants) await db.productVariant.update({ where: { id: v.id }, data: { price: Math.round((v.price * (100 - pct)) / 100 / 1000) * 1000 } });
    await db.priceHistory.create({ data: { productId: p.id, price: newPrice } });
  }
  await db.coupon.createMany({
    data: [
      { code: "WELCOME10", type: "PERCENT", value: 10, minSubtotal: 0 },
      { code: "FREESHIP", type: "FREE_SHIPPING", value: 0, minSubtotal: 1500_00 },
      { code: "SAVE500", type: "FIXED", value: 500_00, minSubtotal: 5000_00 },
      { code: "NORTHLINE15", type: "PERCENT", value: 15, minSubtotal: 3000_00, storeId: stores[0].id },
    ],
  });
  for (const p of allProducts.filter(() => rand() < 0.06)) {
    await db.sponsoredCampaign.create({ data: { storeId: p.storeId, productId: p.id, cpcBid: between(5, 40) * 100, dailyBudget: between(5, 30) * 100_00, clicks: between(10, 400), impressions: between(1000, 20000), totalSpent: between(500, 9000) * 100 } });
  }

  // ── Demo seller analytics, payouts, orders to fulfil ──
  const demoStore = stores[0];
  const demoProducts = allProducts.filter((p) => p.storeId === demoStore.id);
  const statRows: object[] = [];
  for (const p of demoProducts) {
    for (let d = 0; d < 30; d++) {
      const date = new Date();
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCDate(date.getUTCDate() - d);
      const views = between(20, 260);
      const orders = Math.round(views * (0.01 + rand() * 0.05));
      statRows.push({ id: randomUUID(), productId: p.id, date, views, addToCarts: Math.round(views * 0.12), orders, revenue: orders * p.price, sources: { search: Math.round(views * 0.45), category: Math.round(views * 0.25), direct: Math.round(views * 0.15), sponsored: Math.round(views * 0.1), external: Math.round(views * 0.05) } });
    }
  }
  await db.productDailyStat.createMany({ data: statRows as never });
  for (let w = 1; w <= 4; w++) {
    const gross = between(80_000, 260_000) * 100;
    const fees = Math.round(gross * 0.17);
    await db.payout.create({ data: { storeId: demoStore.id, gross, fees, net: gross - fees, status: "PAID", periodStart: new Date(Date.now() - (w + 1) * 7 * 86_400_000), periodEnd: new Date(Date.now() - w * 7 * 86_400_000), paidAt: new Date(Date.now() - (w * 7 - 2) * 86_400_000), reference: `PO-SAMPLE-${1000 + w}` } });
  }
  // Open orders from the demo shopper for the demo seller to fulfil.
  for (let i = 0; i < 3 && demoProducts[i]; i++) {
    const p = demoProducts[i];
    const v = p.variants[0];
    await db.order.create({
      data: {
        number: `MQ-${orderNo++}`, userId: shopper.id, email: shopper.email, status: i === 2 ? "SHIPPED" : "PLACED", subtotal: v.price, shippingTotal: 0, total: v.price,
        deliveryOption: "standard", paymentMethod: i === 1 ? "cod" : "mock", isSample: true, placedAt: new Date(Date.now() - i * 86_400_000),
        shippingAddress: { fullName: "Sam Shopper", phone: "+92 300 0000000", line1: "House 12, Street 4", line2: "Gulberg III", city: "Lahore", region: "Punjab", postalCode: "54000", country: "PK" },
        items: { create: { productId: p.id, variantId: v.id, storeId: p.storeId, title: p.title, variantTitle: v.title, imageUrl: p.image, unitPrice: v.price, quantity: 1, status: i === 2 ? "SHIPPED" : i === 1 ? "ACCEPTED" : "PENDING" } },
        payments: { create: { provider: i === 1 ? "cod" : "mock", method: i === 1 ? "cod" : "mock", amount: v.price, status: i === 1 ? "PENDING" : "CAPTURED", providerRef: `sample_${i}` } },
      },
    });
  }
  // A delivered order the demo shopper can review (verified purchase flow).
  const reviewable = allProducts.find((p) => p.tryOn === "TOP")!;
  await db.order.create({
    data: {
      number: `MQ-${orderNo++}`, userId: shopper.id, email: shopper.email, status: "DELIVERED", subtotal: reviewable.variants[0].price, shippingTotal: 0, total: reviewable.variants[0].price,
      deliveryOption: "standard", paymentMethod: "mock", isSample: true, placedAt: new Date(Date.now() - 9 * 86_400_000),
      shippingAddress: { fullName: "Sam Shopper", line1: "House 12, Street 4", city: "Lahore", region: "Punjab", postalCode: "54000", country: "PK" },
      items: { create: { productId: reviewable.id, variantId: reviewable.variants[0].id, storeId: reviewable.storeId, title: reviewable.title, variantTitle: reviewable.variants[0].title, imageUrl: reviewable.image, unitPrice: reviewable.variants[0].price, quantity: 1, status: "DELIVERED", deliveredAt: new Date(Date.now() - 5 * 86_400_000) } },
      payments: { create: { provider: "mock", method: "mock", amount: reviewable.variants[0].price, status: "CAPTURED", providerRef: "sample_delivered" } },
    },
  });
  await db.wishlist.createMany({ data: allProducts.slice(3, 7).map((p) => ({ userId: shopper.id, productId: p.id })) });
  await db.priceAlert.create({ data: { userId: shopper.id, productId: allProducts[5].id, targetPrice: Math.round(allProducts[5].price * 0.85) } });

  // A flagged review for the admin moderation queue.
  const flaggedTarget = allProducts[10];
  await db.review.create({
    data: { productId: flaggedTarget.id, userId: reviewers[0].id, rating: 5, title: "Best ever!!!", body: "Best product ever buy now best product ever buy now (Sample flagged review)", status: "FLAGGED", flags: ["DUPLICATE_TEXT", "REVIEW_BURST"], isSample: true },
  });

  await db.homeSection.createMany({
    data: [
      { title: "Try clothes on in 3D", subtitle: "Pick your body shape and see the fit before you buy.", href: "/try-on", position: 0 },
      { title: "Verified sellers only", subtitle: "Every store is checked before it can list.", href: "/sell", position: 1 },
    ],
  });

  console.log("Seed complete.");
  console.log(`Demo logins (password ${PASSWORD}): shopper@marqova.dev · seller@marqova.dev · admin@marqova.dev`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
