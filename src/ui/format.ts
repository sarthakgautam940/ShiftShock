/** Million gallons per day from gallons per day. */
export const mgd = (gal: number, digits = 2) => (gal / 1e6).toFixed(digits);

/** Million gallons, one decimal: annual totals. */
export const mgal = (gal: number) => (gal / 1e6).toFixed(1);

export const int = (n: number) => Math.round(n).toLocaleString("en-US");

export const fixed = (n: number, digits = 1) => n.toFixed(digits);

/** Signed whole number with a true minus sign. */
export function signed(n: number, digits = 0): string {
  const r = Number(n.toFixed(digits));
  if (r === 0) return digits ? (0).toFixed(digits) : "0";
  const body = Math.abs(r).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${r < 0 ? "−" : "+"}${body}`;
}

/** Percent change from a to b, signed and rounded. */
export function pctChange(from: number, to: number): string {
  if (from === 0) return "n/a";
  return `${signed(((to - from) / from) * 100)}%`;
}

export function dateLabel(year: number, day: number, withWeekday = false): string {
  const d = new Date(Date.UTC(year, 0, 1 + day));
  return d.toLocaleDateString("en-US", {
    weekday: withWeekday ? "short" : undefined,
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function shortDate(year: number, day: number): string {
  const d = new Date(Date.UTC(year, 0, 1 + day));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export const hourLabel = (h: number) => (h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`);
