/** Request-time date helpers (kept out of render bodies so components stay pure). */
export const DAY_MS = 86_400_000;

export function now() {
  return new Date();
}

export function daysAgo(days: number) {
  return new Date(Date.now() - days * DAY_MS);
}

export function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 3_600_000);
}

export function isWithinDays(date: Date, days: number) {
  return Date.now() - date.getTime() < days * DAY_MS;
}
