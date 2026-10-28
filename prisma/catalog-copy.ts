/**
 * Listing copy for the preview catalog: descriptions, bullets, specs and attribute rules per
 * sub-category, so every preview listing reads like a complete, internally consistent product page.
 */

type Attrs = Record<string, string | string[]>;

export type SubCopy = {
  /** Two short paragraphs; `t` is the product title, `s` the store name. */
  about: (t: string, s: string) => string[];
  bullets: (t: string, a: Attrs) => string[];
  /** Shipping weight range in kg; `weightOf` overrides it per title when the range is too wide. */
  weight: [number, number];
  weightOf?: (t: string) => number;
  origin: string;
  care?: string;
  warranty?: string;
  /** Attribute keys that don't apply to this sub-category (removed from values and variant axes). */
  skip?: string[];
  /** Fixed or per-title attribute values that replace random picks; "" removes the attribute. */
  attrs?: (t: string) => Attrs;
};

export const STORE_PROFILES: Record<string, { tagline: string; description: string }> = {
  Northline: {
    tagline: "Considered everyday clothing",
    description:
      "Northline makes wardrobe staples in natural fabrics: shirts, trousers and knitwear cut for Pakistani weather and built to be worn for years, not seasons. Every garment is measured against our published size chart before it ships.",
  },
  "Shahpar Tech": {
    tagline: "Electronics, tested and explained",
    description:
      "Shahpar Tech sells phones, audio and computers with plain-language specifications and an honest warranty. Every device is checked and sealed before dispatch, and we answer setup questions after you buy.",
  },
  "Hearth & Loom": {
    tagline: "Furniture and decor for calm homes",
    description:
      "Hearth & Loom brings together solid-wood furniture, kitchenware and textiles chosen for durability. Large items are delivered in protective packaging, and every listing states its exact dimensions.",
  },
  "Indus Craft": {
    tagline: "Handmade by artisans",
    description:
      "Indus Craft works directly with artisans in Multan, Hala and Peshawar. Blue pottery, truck art, woodwork and jewellery are made by hand in small batches, so every piece varies slightly from the photos.",
  },
  Fieldhouse: {
    tagline: "Sport, outdoors and play",
    description:
      "Fieldhouse stocks fitness, outdoor and play equipment chosen by people who use it. Product pages list real weights and dimensions, and we include assembly guides with everything that needs one.",
  },
  "Daily Pantry": {
    tagline: "Groceries and essentials",
    description:
      "Daily Pantry delivers pantry staples, snacks, pet supplies and books. Food items ship sealed with their best-before date at least three months away.",
  },
  "Gulnar Beauty": {
    tagline: "Clean beauty and care",
    description:
      "Gulnar Beauty makes fragrance-free skincare, perfumes and hair care in small batches. Every product lists its full ingredients, and none are tested on animals.",
  },
  Roadwise: {
    tagline: "Car and bike care",
    description:
      "Roadwise sells car care, accessories and motorbike safety gear that we use on Pakistani roads ourselves. Helmets and riding gear come with a fit guide.",
  },
};

const has = (t: string, ...words: string[]) => words.some((w) => t.toLowerCase().includes(w));

const APPAREL_MATERIAL = (t: string) =>
  has(t, "linen") ? "Linen" : has(t, "denim", "jean") ? "Denim" : has(t, "merino", "knit") ? "Wool blend" : has(t, "quilted", "travel") ? "Polyester" : has(t, "silk") ? "Silk blend" : "Cotton";

const SLEEVE = (t: string) =>
  has(t, "gilet") ? "Sleeveless" : has(t, "tee", "polo", "camp-collar") ? "Short" : has(t, "wrap", "kurti", "tunic") ? "Three-quarter" : "Long";

export const SUB_COPY: Record<string, SubCopy> = {
  "Men's Clothing": {
    about: (t) => [
      `The ${t} is cut for everyday wear in a warm climate: a clean shape that works with chinos or jeans, and a fabric that breathes through a full day.`,
      "Seams are double-stitched, buttons are sewn on with a shank so they sit flat, and the fabric is pre-washed so it keeps its shape after laundering.",
    ],
    bullets: (t, a) => [`${a.material} fabric, pre-washed to limit shrinkage`, `${a.fit} fit; see the size chart for exact chest and length`, "Double-stitched seams at stress points", "Machine wash cold, line dry"],
    weight: [0.2, 0.6], origin: "Pakistan", care: "Machine wash cold with similar colours. Line dry in shade. Warm iron.",
    attrs: (t) => ({ material: APPAREL_MATERIAL(t), sleeve: SLEEVE(t) }),
  },
  "Women's Clothing": {
    about: (t) => [
      `The ${t} has an easy, flattering line that moves well and doesn't cling in the heat. It's lined where it needs to be and finished with neat French seams inside.`,
      "Dress it up with heels for an evening or wear it with flats and a cardigan for work. The fabric is pre-washed, so the size you order is the size it stays.",
    ],
    bullets: (t, a) => [`${a.material}, soft and breathable`, `${a.fit} fit with room through the hip`, "Fully finished inside: no raw edges", "Gentle machine wash or hand wash"],
    weight: [0.25, 0.7], origin: "Pakistan", care: "Gentle machine wash cold or hand wash. Do not tumble dry. Iron on reverse.",
    attrs: (t) => ({ material: APPAREL_MATERIAL(t), sleeve: SLEEVE(t) }),
  },
  Bottoms: {
    about: (t) => [
      `The ${t} sits comfortably at the natural waist with a straight, tidy line through the leg. Deep front pockets hold a phone without pulling the fabric.`,
      "A hidden stretch thread gives freedom to move, and the hem is left with extra allowance so a tailor can adjust the length.",
    ],
    bullets: (t, a) => [`${a.material} with a little stretch for comfort`, `${a.fit} fit; inseam listed in the size chart`, "Deep front pockets and back welt pockets", "Extra hem allowance for alterations"],
    weight: [0.35, 0.8], origin: "Pakistan", care: "Machine wash cold inside out. Line dry.",
    skip: ["sleeve"], attrs: (t) => ({ material: APPAREL_MATERIAL(t) }),
  },
  Sneakers: {
    about: (t) => [
      `The ${t} pairs a cushioned footbed with a grippy rubber outsole for long days on your feet. The heel counter is firm enough to keep your foot stable without rubbing.`,
      "Sizes follow EU sizing. If you're between sizes, choose the larger one; the size guide lists the insole length for every size.",
    ],
    bullets: (t, a) => [`${a.upper} upper`, "Removable cushioned insole", "Non-marking rubber outsole", `${a.closure === "Laces" ? "Lace-up" : a.closure} closure`],
    weight: [0.6, 1.0], origin: "Pakistan", care: "Wipe clean with a damp cloth. Air dry away from direct heat.",
    attrs: (t) => ({ upper: has(t, "leather") ? "Leather" : has(t, "suede") ? "Suede" : has(t, "canvas") ? "Canvas" : "Mesh", closure: "Laces" }),
  },
  "Formal Shoes": {
    about: (t) => [
      `The ${t} is made on a classic last with a leather lining that breathes and moulds to your foot over the first few wears.`,
      "The stitched sole can be resoled by any cobbler, so with care these shoes last for many years.",
    ],
    bullets: (t, a) => [`${a.upper} upper with full leather lining`, "Stitched leather sole, resoleable", "Cushioned heel pad", `${a.closure === "Laces" ? "Lace-up" : a.closure} closure`],
    weight: [0.9, 1.4], origin: "Pakistan", care: "Use shoe trees and polish regularly. Let them rest a day between wears.",
    attrs: (t) => ({ upper: has(t, "suede") ? "Suede" : "Leather", closure: has(t, "loafer", "chelsea") ? "Slip-on" : has(t, "monk") ? "Buckle" : "Laces" }),
  },
  Watches: {
    about: (t) => [
      `The ${t} has a scratch-resistant mineral glass face, a legible dial with luminous hands, and a case sized to sit comfortably on most wrists.`,
      "It's water resistant to 50 metres, which is fine for handwashing, rain and swimming but not diving. The strap is easy to swap without tools.",
    ],
    bullets: () => ["Scratch-resistant mineral glass", "Water resistant to 50 m (5 ATM)", "Luminous hands and indices", "Quick-release strap"],
    weight: [0.15, 0.3], origin: "Imported", warranty: "1 year against manufacturing defects",
    attrs: (t) => ({ material: has(t, "mesh", "diver") ? "Stainless steel" : "Leather" }),
  },
  Eyewear: {
    about: (t) => [
      `The ${t} has a lightweight frame with spring hinges that keep the fit comfortable without pinching.`,
      "Comes with a hard case and a microfibre cloth. The lenses block 100% of UVA and UVB light; reading glasses filter blue light from screens.",
    ],
    bullets: () => ["100% UVA/UVB protection", "Spring hinges for a comfortable fit", "Hard case and cleaning cloth included", "Lightweight acetate frame"],
    weight: [0.1, 0.25], origin: "Imported", care: "Clean with the cloth provided. Store in the case.",
    attrs: () => ({ material: "Acetate" }),
  },
  Bags: {
    about: (t) => [
      `The ${t} is sized for real days: a padded laptop or document section, an inside zip pocket for valuables and a quick-access front pocket.`,
      "Hardware is solid metal, the base is reinforced so it stands upright, and the strap is adjustable.",
    ],
    bullets: (t, a) => [`${a.material} body with reinforced base`, "Inside zip pocket for valuables", "Solid metal hardware", "Adjustable strap"],
    weight: [0.4, 1.4], origin: "Pakistan", care: "Spot clean. Condition leather twice a year.",
    attrs: (t) => ({ material: has(t, "leather") ? "Leather" : "Canvas" }),
  },
  "Phones & Tablets": {
    about: (t) => [
      `The ${t} has a bright, sharp display, a battery that lasts a full day of heavy use, and fast charging over USB-C.`,
      "It ships with the latest software, a charging cable and a SIM tool. It is PTA-approved, so it works on every Pakistani network.",
    ],
    bullets: () => ["PTA-approved for all Pakistani networks", "All-day battery with fast charging", "USB-C cable and SIM tool included", "Official warranty"],
    weight: [0.3, 0.8], origin: "Imported", warranty: "1 year official warranty",
    attrs: (t) => ({ connectivity: has(t, "tab ") ? ["Wi-Fi", "Bluetooth", "USB-C"] : ["5G", "Wi-Fi", "Bluetooth", "NFC", "USB-C"], battery: has(t, "tab ") ? "14" : "30", warranty: "1 year" }),
  },
  Audio: {
    about: (t) => [
      `The ${t} delivers clear, balanced sound with deep bass that doesn't drown out vocals. Pairing takes seconds, and it remembers your last device.`,
      "Charges over USB-C, and a short charge gives hours of playback.",
    ],
    bullets: (t, a) => [`Up to ${a.battery} hours of playback`, "Bluetooth 5.3 with quick pairing", "USB-C fast charging", "Built-in microphone for calls"],
    weight: [0.2, 2.2], origin: "Imported", warranty: "1 year",
    weightOf: (t) => (has(t, "boombox") ? 2 : has(t, "party") ? 1.6 : has(t, "over-ear") ? 0.3 : 0.1),
    skip: ["storage"], attrs: (t) => ({ connectivity: ["Bluetooth", "USB-C"], battery: has(t, "boombox", "party") ? "12" : has(t, "earbuds") ? "28" : "35", warranty: "1 year" }),
  },
  "Laptops & Computers": {
    about: (t) => [
      `The ${t} is built for everyday work and study, with a fast SSD, a sharp anti-glare screen and a full set of ports, so you need fewer adapters.`,
      "It comes with Windows installed and activated, a charger and an official warranty.",
    ],
    bullets: () => ["Fast SSD storage", "Anti-glare display", "USB-C, USB-A and HDMI ports", "Windows installed and activated"],
    weight: [1.2, 6.5], origin: "Imported", warranty: "1 year official warranty",
    weightOf: (t) => (has(t, "monitor") ? 5.4 : has(t, "mini pc") ? 1.1 : has(t, "studio 16") ? 2.1 : 1.3),
    attrs: (t) => (has(t, "monitor", "mini pc") ? { connectivity: ["USB-C", "Wi-Fi"], battery: "", warranty: "2 years" } : { connectivity: ["Wi-Fi", "Bluetooth", "USB-C"], battery: has(t, "studio 16") ? "9" : "14", warranty: "1 year" }),
  },
  Furniture: {
    about: (t) => [
      `The ${t} pairs a solid frame with materials chosen to last. It's proportioned for Pakistani homes and photographed at true scale.`,
      "Large pieces arrive wrapped and corner-protected. If assembly is needed, the fittings and a printed guide are in the box.",
    ],
    bullets: (t, a) => [`${a.material} construction`, a.assembly === "Yes" ? "Simple assembly, tools included" : "Arrives fully assembled", "Protective corner packaging for delivery", "Exact dimensions listed in specifications"],
    weight: [8, 55], origin: "Pakistan",
    weightOf: (t) => (has(t, "sofa") ? 48 : has(t, "coffee") ? 22 : has(t, "shelf") ? 6 : has(t, "rattan") ? 9 : 14),
    attrs: (t) => ({ material: has(t, "rattan") ? "Rattan" : has(t, "oak", "shelf") ? "Solid wood" : "Engineered wood", room: "Living room", assembly: has(t, "shelf", "table") ? "Yes" : "No" }),
  },
  "Kitchen & Dining": {
    about: (t) => [
      `The ${t} is made for everyday Pakistani cooking: it handles high heat, long simmering and daily washing.`,
      "Every piece is food-safe and free of lead and cadmium. Care instructions are printed on the box.",
    ],
    bullets: () => ["Food-safe, lead- and cadmium-free", "Built for daily use at high heat", "Easy to clean", "Care guide included"],
    weight: [0.8, 6], origin: "Pakistan", care: "Hand wash recommended to keep the finish. Dry fully before storing.",
    attrs: (t) => ({ material: has(t, "ceramic", "dinner") ? "Ceramic" : has(t, "glass", "knife") ? "" : "Stainless steel", room: "Kitchen", assembly: "No" }),
  },
  "Home Decor": {
    about: (t) => [
      `The ${t} adds warmth to a room without fuss: natural materials, quiet colours and solid construction.`,
      "Each piece is checked for finish before it's packed, and fragile items ship double-boxed.",
    ],
    bullets: (t, a) => [`${a.material} construction`, "Checked for finish before dispatch", "Fragile items ship double-boxed", "Easy to clean"],
    weight: [0.8, 7], origin: "Pakistan",
    attrs: (t) => ({ material: has(t, "ceramic", "vase") ? "Ceramic" : "Cotton", room: has(t, "curtain") ? "Bedroom" : "Living room", assembly: "No" }),
  },
  Skincare: {
    about: (t) => [
      `The ${t} is fragrance-free and tested on sensitive skin. It absorbs quickly without leaving a film, so it layers well under make-up or sunscreen.`,
      "The full ingredient list is printed on the pack. Patch test before first use.",
    ],
    bullets: () => ["Fragrance-free; suitable for sensitive skin", "Absorbs quickly with no greasy film", "Dermatologically tested", "Cruelty-free"],
    weight: [0.08, 0.3], origin: "Pakistan",
    attrs: () => ({ crueltyFree: "Yes", skinType: "All" }),
  },
  Fragrance: {
    about: (t) => [
      `The ${t} opens bright and settles into a warm, lasting base. It's blended in small batches and rested before bottling.`,
      "A few sprays last most of the day. Store it away from sunlight to keep the scent true.",
    ],
    bullets: () => ["Long-lasting concentration", "Blended and rested in small batches", "Glass bottle with fine-mist spray", "Cruelty-free"],
    weight: [0.15, 0.45], origin: "Pakistan",
    attrs: () => ({ crueltyFree: "Yes", skinType: "All" }),
  },
  "Hair Care": {
    about: (t) => [
      `The ${t} cleans and conditions without stripping natural oils, and it's gentle enough for daily use and colour-treated hair.`,
      "Free from sulphates and parabens. The full ingredient list is on the bottle.",
    ],
    bullets: () => ["Sulphate- and paraben-free", "Safe for colour-treated hair", "Gentle enough for daily use", "Cruelty-free"],
    weight: [0.15, 0.5], origin: "Pakistan",
    attrs: () => ({ crueltyFree: "Yes", skinType: "All" }),
  },
  Fitness: {
    about: (t) => [
      `The ${t} is built for home workouts: sturdy, easy to store and comfortable to use from your first session.`,
      "Every item is checked before dispatch, and a quick-start guide with exercises is included.",
    ],
    bullets: () => ["Sturdy build for daily training", "Compact for home storage", "Non-slip surfaces", "Quick-start exercise guide"],
    weight: [0.5, 40], origin: "Imported",
    attrs: (t) => ({ level: has(t, "treadmill", "dumbbell") ? "Intermediate" : "Beginner", weight: has(t, "treadmill") ? "38" : has(t, "dumbbell") ? "20" : "1" }),
  },
  "Outdoor & Cycling": {
    about: (t) => [
      `The ${t} is made for Pakistani weather, from summer heat to monsoon rain. It's tough, easy to maintain and backed by a clear warranty.`,
      "Larger items ship part-assembled with tools and a printed guide.",
    ],
    bullets: () => ["Weather-resistant materials", "Easy to maintain", "Tools and guide included where needed", "Warranty against defects"],
    weight: [0.4, 16], origin: "Pakistan", warranty: "6 months",
    attrs: (t) => ({ level: has(t, "bicycle", "bat") ? "Intermediate" : "Beginner", weight: has(t, "bicycle") ? "14" : has(t, "tent") ? "3" : "1" }),
  },
  "Toys & Games": {
    about: (t) => [
      `The ${t} is designed for open-ended play: sturdy enough for daily use and safe for little hands.`,
      "All materials are non-toxic, and the age guidance on this page follows the safety rating.",
    ],
    bullets: () => ["Non-toxic, child-safe materials", "No small detachable parts for the listed age", "Built for daily play", "Gift-ready packaging"],
    weight: [0.2, 1.5], origin: "Pakistan",
    attrs: (t) => ({ age: has(t, "robot", "board game") ? "9–12 years" : has(t, "car") ? "6–8 years" : "3–5 years", safety: "Yes" }),
  },
  "Baby Gear": {
    about: (t) => [
      `The ${t} is made for the early years: easy to clean, simple to use one-handed, and tested to safety standards.`,
      "Instructions are printed in English and Urdu.",
    ],
    bullets: () => ["Tested to infant safety standards", "Easy to clean", "One-hand operation", "Instructions in English and Urdu"],
    weight: [0.3, 9], origin: "Imported", warranty: "1 year",
    attrs: () => ({ age: "0–2 years", safety: "Yes" }),
  },
  "Pantry Staples": {
    about: (t) => [
      `${t}: the everyday essential, sourced from trusted mills and farms and packed fresh in sealed bags.`,
      "Every pack ships with its best-before date at least three months away.",
    ],
    bullets: () => ["Packed fresh and sealed", "Best-before at least 3 months on delivery", "Halal certified", "Store in a cool, dry place"],
    weight: [0.5, 5.2], origin: "Pakistan",
    attrs: () => ({ diet: ["Halal"], origin: "Pakistan" }),
  },
  "Snacks & Beverages": {
    about: (t) => [
      `${t}: everyday treats, chosen for taste and ingredients you can read.`,
      "Fresh items are packed to arrive in good condition; shelf-stable items ship with a best-before date at least three months away.",
    ],
    bullets: () => ["Carefully packed for freshness", "Clear ingredient labels", "Halal certified", "Store as directed on pack"],
    weight: [0.2, 1.2], origin: "Pakistan",
    skip: ["pack"], attrs: (t) => ({ diet: has(t, "avocado", "almond", "tea") ? ["Halal", "Vegan"] : ["Halal"], origin: has(t, "avocado") ? "Imported" : "Pakistan" }),
  },
  "Car Care": {
    about: (t) => [
      `The ${t} helps keep your car in good shape between workshop visits. It's simple to use and comes with clear instructions.`,
      "It works with most hatchbacks, sedans and SUVs sold in Pakistan.",
    ],
    bullets: () => ["Works with most cars", "Clear step-by-step instructions", "Workshop-grade quality", "Compact for boot storage"],
    weight: [0.3, 1.5], origin: "Imported", warranty: "6 months",
    attrs: () => ({ compatibility: "Universal" }),
  },
  "Motorbike Gear": {
    about: (t) => [
      `The ${t} is made for daily riding in traffic, sun and rain, with a fit that stays put at speed.`,
      "Check the size guide before ordering: protective gear only protects when it fits well.",
    ],
    bullets: () => ["Built for daily riding", "Weather-resistant", "Reflective details for night visibility", "Fit guide included"],
    weight: [0.2, 1.6], origin: "Pakistan",
    attrs: () => ({ compatibility: "Motorbike" }),
  },
  Fiction: {
    about: (t) => [
      `${t} is a story about family, place and the choices that shape a life, told with warmth and an eye for detail.`,
      "Printed on cream paper with a sewn binding that lies open easily.",
    ],
    bullets: () => ["Printed on cream, acid-free paper", "Sewn binding that lies flat", "English edition", "Ships in a protective mailer"],
    weight: [0.3, 0.7], origin: "Pakistan",
    attrs: () => ({ language: "English", pages: "312" }),
  },
  "Non-fiction": {
    about: (t) => [
      `${t} is a clear, practical guide that explains its subject without jargon, with examples drawn from everyday life in South Asia.`,
      "Includes an index and further-reading list.",
    ],
    bullets: () => ["Clear, jargon-free writing", "Index and further reading", "English edition", "Ships in a protective mailer"],
    weight: [0.3, 0.9], origin: "Pakistan",
    attrs: () => ({ language: "English", pages: "264" }),
  },
  "Crafts & Pottery": {
    about: (t, s) => [
      `The ${t} is made by hand by artisans working with ${s}. Each piece is finished individually, so colours and patterns vary slightly; that's the mark of handwork.`,
      "Wrapped in recycled paper and double-boxed for delivery.",
    ],
    bullets: () => ["Handmade by Pakistani artisans", "Each piece is unique", "Double-boxed for safe delivery", "Wipe clean with a damp cloth"],
    weight: [0.5, 2.5], origin: "Pakistan",
    attrs: (t) => ({ technique: has(t, "woven", "basket") ? "Hand-woven" : has(t, "carved") ? "Hand-carved" : "Hand-painted", madeToOrder: "No" }),
  },
  "Handmade Jewellery": {
    about: (t, s) => [
      `The ${t} is made by hand by artisans working with ${s}, using traditional techniques passed down through families.`,
      "Comes in a gift box with a care card. Keep it away from perfume and water to preserve the finish.",
    ],
    bullets: () => ["Handmade in small batches", "Nickel-free", "Gift box included", "Care card included"],
    weight: [0.05, 0.2], origin: "Pakistan",
    skip: ["technique"], attrs: () => ({ madeToOrder: "No" }),
  },
  "Dog Supplies": {
    about: (t) => [
      `The ${t} is chosen with vets and dog owners for comfort, safety and durability.`,
      "Check the size guide: pet sizes are listed by weight.",
    ],
    bullets: () => ["Durable, pet-safe materials", "Sized by pet weight", "Easy to clean", "Chosen with vet input"],
    weight: [0.3, 4], origin: "Pakistan",
    attrs: () => ({ lifeStage: "Adult" }),
  },
  "Cat Supplies": {
    about: (t) => [
      `The ${t} is made for indoor cats: sturdy, easy to clean and designed around how cats actually play and rest.`,
      "Every item is checked before dispatch.",
    ],
    bullets: () => ["Pet-safe materials", "Easy to clean", "Built for indoor cats", "Checked before dispatch"],
    weight: [0.2, 8], origin: "Pakistan",
    skip: ["petSize"], attrs: () => ({ lifeStage: "Adult" }),
  },
  "Bulk Packaging": {
    about: (t) => [
      `${t} for online sellers and small businesses, priced per carton with clear minimum order quantities.`,
      "Made from recyclable materials and delivered on a fixed schedule to your warehouse.",
    ],
    bullets: () => ["Priced per carton", "Recyclable materials", "Scheduled warehouse delivery", "GST invoice provided"],
    weight: [5, 25], origin: "Pakistan",
    attrs: () => ({ packaging: "Carton" }),
  },
  "Bulk Apparel": {
    about: (t) => [
      `${t} for uniforms, events and printing businesses: consistent sizing across every batch and fabric ready for printing or embroidery.`,
      "Sizes can be mixed within one order. Samples are available before bulk production.",
    ],
    bullets: () => ["Consistent sizing across batches", "Ready for print and embroidery", "Mixed sizes per order", "GST invoice provided"],
    weight: [5, 30], origin: "Pakistan",
    attrs: () => ({ packaging: "Polybag" }),
  },
};
