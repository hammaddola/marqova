/** Marqova operates in Pakistan only: provinces, delivery cities and phone rules live here. */

export const PROVINCES = [
  "Punjab",
  "Sindh",
  "Khyber Pakhtunkhwa",
  "Balochistan",
  "Islamabad Capital Territory",
  "Gilgit-Baltistan",
  "Azad Jammu and Kashmir",
] as const;

/** Cities offered in "Deliver to" and suggested in address forms (any Pakistani city is accepted). */
export const CITIES = [
  "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta", "Hyderabad", "Gujranwala",
  "Sialkot", "Bahawalpur", "Sargodha", "Sukkur", "Abbottabad", "Mardan", "Muzaffarabad", "Gilgit", "Skardu", "Gwadar",
] as const;

/**
 * Normalises a Pakistani phone number to +92 form, or returns null if it isn't one.
 * Accepts mobiles (03XX XXXXXXX) and landlines (0XX XXXXXXX) with or without +92 / 0092.
 */
export function normalizePkPhone(input: string): string | null {
  const digits = input.replace(/[\s()-]/g, "");
  const m = digits.match(/^(?:\+92|0092|92|0)(\d{9,10})$/);
  if (!m) return null;
  const rest = m[1];
  // Mobiles are 3 + 9 digits; landlines start 2–9 with 8–9 more digits.
  const ok = /^3\d{9}$/.test(rest) || /^[2-9]\d{8,9}$/.test(rest);
  return ok ? `+92${rest}` : null;
}

export const PK_POSTAL_CODE = /^\d{5}$/;
