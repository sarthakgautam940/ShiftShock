import { DEFAULT_PARAMS, type Design } from "../engine/plant";

export interface Campus {
  id: string;
  name: string;
  mw: number;
  record: string;
}

/** Sizes come from the public record; Iron Horse's 1.2 MGD figure implies about 100 MW. */
export const CAMPUSES: Campus[] = [
  { id: "iron-horse", name: "Iron Horse", mw: 100, record: "On record at up to 1.2 MGD. Board vote not scheduled." },
  { id: "mountain-road", name: "Mountain Road", mw: 900, record: "900 MW. Denied 4 to 3, May 27, 2026." },
  { id: "hickory-hill", name: "Hickory Hill", mw: 2400, record: "Sized for 2.4 GW. Approved March 2024." },
];

export const DESIGNS: { id: Design; label: string; rule: string }[] = [
  { id: "tower", label: "Cooling tower", rule: "Wet every hour" },
  { id: "closed", label: "Closed loop", rule: "Still evaporates" },
  { id: "hybrid", label: "Hybrid", rule: `Wet above ${DEFAULT_PARAMS.switchC} °C` },
  { id: "dry", label: "Dry", rule: "No water, more power" },
];

/** Hanover County suburban supply, million gallons per day. */
export const HANOVER = { capacity: 24.775, richmond: 20, doswell: 4.0, henrico: 0.775, peakUse: 11.7 };

/** The hybrid-to-Max-Day ratio from the record: 0.52 / 0.89. Sets the starting cap for any campus. */
export const DEFAULT_CAP_SHARE = 0.583;

export interface WeatherFile {
  station: string;
  name: string;
  source: string;
  year: number;
  filledHours: number;
  t: number[];
  rh: number[];
}

/** The year of measured weather ships with the app; nothing is fetched from anywhere else. */
export async function loadWeather(): Promise<WeatherFile> {
  const res = await fetch("/data/kofp-2025.json");
  if (!res.ok) throw new Error(`Weather file missing (${res.status}).`);
  const data: unknown = await res.json();
  if (!isWeather(data)) throw new Error("Weather file is not 8,760 hours of temperature and humidity.");
  return data;
}

function isWeather(x: unknown): x is WeatherFile {
  if (typeof x !== "object" || x === null) return false;
  const w = x as Partial<WeatherFile>;
  const hours = (a: unknown) => Array.isArray(a) && a.length === 8760 && a.every((v) => typeof v === "number" && Number.isFinite(v));
  return typeof w.year === "number" && hours(w.t) && hours(w.rh);
}

export const mgd = (gal: number) => gal / 1e6;
export const fmtMgd = (gal: number, digits = 2) => mgd(gal).toFixed(digits);
export const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");
