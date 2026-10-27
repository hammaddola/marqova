/** Delivery estimates. Business days only (Sunday is skipped). */
export type DeliveryOption = { id: "standard" | "express" | "pickup"; label: string; fee: number; minDays: number; maxDays: number };

export const FREE_DELIVERY_THRESHOLD = 2_500_00; // Rs 2,500

export function addBusinessDays(from: Date, days: number) {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) added++;
  }
  return d;
}

export function deliveryWindow(minDays: number, maxDays: number, from = new Date()) {
  return { earliest: addBusinessDays(from, minDays), latest: addBusinessDays(from, maxDays) };
}

export function formatDeliveryWindow(minDays: number, maxDays: number, from = new Date()) {
  const { earliest, latest } = deliveryWindow(minDays, maxDays, from);
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  return minDays === maxDays ? fmt(earliest) : `${fmt(earliest)} – ${fmt(latest)}`;
}

/** Remote cities add days. Kept simple so a courier API can replace it. */
const FAR_CITIES = new Set(["gilgit", "skardu", "quetta", "gwadar", "chitral"]);

export function cityAdjustment(city?: string | null) {
  return city && FAR_CITIES.has(city.trim().toLowerCase()) ? 2 : 0;
}

export function deliveryOptions(subtotal: number, baseShipping: number): DeliveryOption[] {
  const standardFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : baseShipping;
  return [
    { id: "standard", label: "Standard delivery", fee: standardFee, minDays: 2, maxDays: 5 },
    { id: "express", label: "Express delivery", fee: standardFee + 350_00, minDays: 1, maxDays: 2 },
    { id: "pickup", label: "Pick up from a Marqova point", fee: 0, minDays: 3, maxDays: 6 },
  ];
}
