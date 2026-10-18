import { DEFAULT_PARAMS, type Design } from "../engine/plant";

export interface Campus {
  id: string;
  name: string;
  short: string;
  mw: number;
  site: string;
  status: string;
}

/** Sizes come from the public record; Iron Horse's 1.2 MGD figure implies about 100 MW. */
export const CAMPUSES: Campus[] = [
  { id: "iron-horse", name: "Iron Horse", short: "IH", mw: 100, site: "Route 54 at Mount Hermon Rd", status: "Board vote not scheduled" },
  { id: "mountain-road", name: "Mountain Road", short: "MR", mw: 900, site: "Tech park, 430 acres", status: "Denied 4 to 3, May 27, 2026" },
  { id: "hickory-hill", name: "Hickory Hill", short: "HH", mw: 2400, site: "Tract park, 1,200 acres", status: "Approved March 2024" },
];

export function customCampus(mw: number): Campus {
  return { id: "custom", name: "Custom campus", short: "CU", mw, site: "Entered by hand", status: "Scenario" };
}

export const DESIGNS: { id: Design; label: string; short: string; rule: string }[] = [
  { id: "tower", label: "Cooling tower", short: "Tower", rule: "Wet every hour" },
  { id: "closed", label: "Closed loop", short: "Closed loop", rule: "Closed-circuit, still evaporates" },
  { id: "hybrid", label: "Adiabatic hybrid", short: "Hybrid", rule: `Wet above ${DEFAULT_PARAMS.switchC} °C` },
  { id: "dry", label: "Dry", short: "Dry", rule: "Air-cooled, chiller trim" },
];

export const designLabel = (d: Design) => DESIGNS.find((x) => x.id === d)!.label;

/** Hanover County suburban system, gallons per day. Richmond's contract is about 80% of supply. */
export const HANOVER = {
  richmond: 20e6,
  doswell: 4.0e6,
  henrico: 0.775e6,
  supply: 24.775e6,
  peakUse: 11.7e6,
};

export function countySupply(richmondDown: boolean): number {
  return richmondDown ? HANOVER.supply - HANOVER.richmond : HANOVER.supply;
}

/** What is left of the county's supply on the campus's worst day, gallons. Negative is a shortfall. */
export function headroom(campusGal: number, richmondDown: boolean): number {
  return countySupply(richmondDown) - HANOVER.peakUse - campusGal;
}

/** The record's 0.52 / 0.89: the starting cap for any campus, as a share of the hybrid's worst day. */
export const DEFAULT_CAP_SHARE = 0.583;

export interface WeatherFile {
  station: string;
  name: string;
  source: string;
  year: number;
  filledHours: number;
  longGaps: [number, number][];
  t: number[];
  rh: number[];
}

/** The year of measured weather ships with the app; nothing is fetched from anywhere else. */
export async function loadWeather(): Promise<WeatherFile> {
  const res = await fetch("/data/kofp-2025.json");
  if (!res.ok) throw new Error(`The weather file could not be loaded (HTTP ${res.status}).`);
  const data: unknown = await res.json();
  if (!isWeather(data)) throw new Error("The weather file is not 8,760 hours of temperature and humidity.");
  return data;
}

function isWeather(x: unknown): x is WeatherFile {
  if (typeof x !== "object" || x === null) return false;
  const w = x as Partial<WeatherFile>;
  const hours = (a: unknown) => Array.isArray(a) && a.length === 8760 && a.every((v) => typeof v === "number" && Number.isFinite(v));
  return typeof w.year === "number" && typeof w.station === "string" && hours(w.t) && hours(w.rh);
}
