/**
 * Fit engine for the Try-On Studio. Estimates body measurements from height,
 * weight, body type and shape, then compares them with a garment size chart to
 * produce a per-region fit map and a recommended size.
 *
 * The estimates are deliberately simple and transparent; a real body-scan or AI
 * try-on provider can replace `estimateBody` without touching the UI.
 */
export type AvatarBodyType = "MEN" | "WOMEN" | "KIDS";
export type BodyShapeType = "SLIM" | "ATHLETIC" | "REGULAR" | "BROAD";
export type GarmentKind = "TOP" | "BOTTOM" | "DRESS" | "SHOES" | "ACCESSORY";
export type FitLevel = "good" | "loose" | "tight";

export type BodyInput = { body: AvatarBodyType; heightCm: number; weightKg: number; shape: BodyShapeType };
export type BodyMeasurements = { chest: number; waist: number; hips: number; inseam: number; footLength: number };
export type SizeChart = Record<string, Partial<Record<"chest" | "waist" | "hips" | "footLength", number>>>;

const SHAPE: Record<BodyShapeType, { chest: number; waist: number; hips: number }> = {
  SLIM: { chest: 0.95, waist: 0.93, hips: 0.96 },
  ATHLETIC: { chest: 1.05, waist: 0.97, hips: 1.0 },
  REGULAR: { chest: 1, waist: 1, hips: 1 },
  BROAD: { chest: 1.08, waist: 1.08, hips: 1.05 },
};

export function estimateBody({ body, heightCm, weightKg, shape }: BodyInput): BodyMeasurements {
  const h = Math.min(Math.max(heightCm, 80), 220);
  const w = Math.min(Math.max(weightKg, 12), 200);
  const bmi = w / (h / 100) ** 2;
  const d = bmi - (body === "KIDS" ? 17 : 22);
  const base =
    body === "MEN"
      ? { chest: 0.55 * h + d * 2.3, waist: 0.46 * h + d * 2.9, hips: 0.55 * h + d * 2.0 }
      : body === "WOMEN"
        ? { chest: 0.53 * h + d * 2.2, waist: 0.43 * h + d * 2.6, hips: 0.59 * h + d * 2.4 }
        : { chest: 0.5 * h + d * 1.8, waist: 0.46 * h + d * 2.0, hips: 0.52 * h + d * 1.8 };
  const m = SHAPE[shape];
  return {
    chest: round1(base.chest * m.chest),
    waist: round1(base.waist * m.waist),
    hips: round1(base.hips * m.hips),
    inseam: round1(h * 0.45),
    footLength: round1(h * 0.152),
  };
}

export const DEFAULT_SIZE_CHARTS: Record<Exclude<GarmentKind, "ACCESSORY">, SizeChart> = {
  TOP: {
    XS: { chest: 88, waist: 82 },
    S: { chest: 96, waist: 90 },
    M: { chest: 102, waist: 96 },
    L: { chest: 108, waist: 102 },
    XL: { chest: 116, waist: 110 },
    XXL: { chest: 124, waist: 118 },
  },
  BOTTOM: {
    XS: { waist: 72, hips: 92 },
    S: { waist: 78, hips: 98 },
    M: { waist: 84, hips: 104 },
    L: { waist: 90, hips: 110 },
    XL: { waist: 97, hips: 117 },
    XXL: { waist: 104, hips: 124 },
  },
  DRESS: {
    XS: { chest: 84, waist: 68, hips: 92 },
    S: { chest: 90, waist: 74, hips: 98 },
    M: { chest: 96, waist: 80, hips: 104 },
    L: { chest: 102, waist: 86, hips: 110 },
    XL: { chest: 110, waist: 94, hips: 118 },
  },
  SHOES: {
    "39": { footLength: 24.5 },
    "40": { footLength: 25.2 },
    "41": { footLength: 25.9 },
    "42": { footLength: 26.6 },
    "43": { footLength: 27.3 },
    "44": { footLength: 28.0 },
    "45": { footLength: 28.7 },
  },
};

/** Comfortable ease (garment minus body) per region, in cm. */
const EASE: Record<string, [number, number]> = {
  chest: [2, 12],
  waist: [0, 12],
  hips: [1, 10],
  footLength: [0.3, 1.4],
};

export function regionFit(region: keyof typeof EASE, garment: number, body: number): FitLevel {
  const ease = garment - body;
  const [min, max] = EASE[region];
  if (ease < min) return "tight";
  if (ease > max) return "loose";
  return "good";
}

export type FitResult = {
  size: string;
  regions: { region: string; level: FitLevel; easeCm: number }[];
  overall: FitLevel;
};

export function fitForSize(chart: SizeChart, size: string, m: BodyMeasurements): FitResult {
  const row = chart[size] ?? {};
  const regions = (Object.keys(row) as (keyof typeof row)[]).map((region) => {
    const g = row[region]!;
    const b = m[region];
    return { region, level: regionFit(region, g, b), easeCm: round1(g - b) };
  });
  const overall: FitLevel = regions.some((r) => r.level === "tight") ? "tight" : regions.some((r) => r.level === "loose") ? "loose" : "good";
  return { size, regions, overall };
}

/** Picks the size with the fewest problem regions, preferring tight-free sizes, then the snuggest good fit. */
export function recommendSize(chart: SizeChart, m: BodyMeasurements) {
  const sizes = Object.keys(chart);
  const results = sizes.map((s) => fitForSize(chart, s, m));
  const score = (r: FitResult) => r.regions.reduce((s, x) => s + (x.level === "good" ? 0 : x.level === "loose" ? 1 : 3), 0);
  let best = results[0];
  for (const r of results) if (score(r) < score(best)) best = r;
  return { recommended: best.size, results };
}

export function fitAdvice(result: FitResult) {
  const tight = result.regions.filter((r) => r.level === "tight").map((r) => label(r.region));
  const loose = result.regions.filter((r) => r.level === "loose").map((r) => label(r.region));
  if (!tight.length && !loose.length) return `Size ${result.size} should fit you well with comfortable room to move.`;
  const parts: string[] = [];
  if (tight.length) parts.push(`may feel tight at the ${list(tight)}`);
  if (loose.length) parts.push(`may feel loose at the ${list(loose)}`);
  return `Size ${result.size} ${parts.join(" and ")}.`;
}

function label(region: string) {
  return region === "footLength" ? "toes" : region;
}

function list(xs: string[]) {
  return xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
