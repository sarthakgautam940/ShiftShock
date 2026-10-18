import { power, type Design, type Prepared } from "./plant";

/** EPA eGRID2023, SRVC (SERC Virginia/Carolina) subregion. */
export const CO2_LB_PER_MWH = 593.4;

export type RunSpec =
  | { kind: "design"; design: Design }
  | {
      kind: "cap";
      /** Daily cooling-water cap, gallons. */
      capGalPerDay: number;
      /** No hour may draw more than this, MW. */
      peakLimitMW: number;
      /** Water available across the year, gallons. Matching the hybrid's keeps the comparison fair. */
      annualGal: number;
    };

export interface Result {
  /** Wet share chosen for each hour. */
  w: Float64Array;
  /** Cooling water per hour, gallons. */
  water: Float64Array;
  /** Power per hour, MW. */
  power: Float64Array;
  /** Cooling water per day, gallons. */
  daily: Float64Array;
  maxDay: number;
  maxDayGal: number;
  avgDayGal: number;
  annualGal: number;
  annualMWh: number;
  peakMW: number;
  co2Tons: number;
  /** Days where the peak-power floors alone needed more water than the cap. */
  infeasibleDays: number[];
}

function designW(prep: Prepared, design: Design, h: number): number {
  switch (design) {
    case "tower":
    case "closed":
      return 1;
    case "dry":
      return 0;
    case "hybrid":
      return prep.t[h]! > prep.params.switchC ? 1 : 0;
  }
}

function waterPerHour(prep: Prepared, design: Design): Float64Array {
  return design === "closed" ? prep.aClosed : prep.aTower;
}

export function run(prep: Prepared, spec: RunSpec): Result {
  const n = prep.hours;
  const w = new Float64Array(n);
  const infeasibleDays: number[] = [];
  if (spec.kind === "design") {
    for (let h = 0; h < n; h++) w[h] = designW(prep, spec.design, h);
    return summarize(prep, w, waterPerHour(prep, spec.design), infeasibleDays);
  }
  capPlan(prep, spec, w, infeasibleDays);
  return summarize(prep, w, prep.aTower, infeasibleDays);
}

/**
 * Max Day: choose w_h for every hour of the year to save the most electricity,
 * subject to a daily water cap, the year's water budget, and a peak-power floor.
 *
 * 1. Floors. An hour that would exceed the peak limit if run dry must run at least
 *    w_min = (P_IT + P_base + ΔP − P_lim) / ΔP wet. Floors are spent first.
 * 2. Greedy. Every remaining unit of water goes to the hour with the most kWh saved
 *    per gallon (ΔP / a), skipping hours whose day has reached the cap, until the
 *    year's budget is spent. Daily caps nested inside one annual budget form a
 *    laminar family, so this greedy fill is optimal for the linear objective
 *    (the fractional-knapsack exchange argument, applied per constraint level).
 */
function capPlan(prep: Prepared, spec: Extract<RunSpec, { kind: "cap" }>, w: Float64Array, infeasible: number[]) {
  const n = prep.hours, days = Math.floor(n / 24);
  const a = prep.aTower, dP = prep.dP, p = prep.params;
  const dayUsed = new Float64Array(days);
  let budget = spec.annualGal;

  for (let h = 0; h < n; h++) {
    const over = p.itMW + p.pBaseMW + dP[h]! - spec.peakLimitMW;
    if (over > 0 && dP[h]! > 0) {
      w[h] = Math.min(1, over / dP[h]!);
      const used = w[h]! * a[h]!;
      dayUsed[Math.floor(h / 24)] += used;
      budget -= used;
    }
  }
  for (let d = 0; d < days; d++) if (dayUsed[d]! > spec.capGalPerDay + 1e-6) infeasible.push(d);

  const order = Array.from({ length: n }, (_, h) => h)
    .filter((h) => dP[h]! > 0 && a[h]! > 0)
    .sort((x, y) => dP[y]! / a[y]! - dP[x]! / a[x]!);
  for (const h of order) {
    if (budget <= 0) break;
    const d = Math.floor(h / 24);
    const room = Math.min(spec.capGalPerDay - dayUsed[d]!, budget, (1 - w[h]!) * a[h]!);
    if (room <= 0) continue;
    w[h] = w[h]! + room / a[h]!;
    dayUsed[d] += room;
    budget -= room;
  }
}

function summarize(prep: Prepared, w: Float64Array, a: Float64Array, infeasibleDays: number[]): Result {
  const n = prep.hours, days = Math.floor(n / 24);
  const water = new Float64Array(n), pw = new Float64Array(n), daily = new Float64Array(days);
  let annualGal = 0, annualMWh = 0, peakMW = 0;
  for (let h = 0; h < n; h++) {
    water[h] = w[h]! * a[h]!;
    pw[h] = power(prep, h, w[h]!);
    annualGal += water[h]!;
    annualMWh += pw[h]!;
    if (pw[h]! > peakMW) peakMW = pw[h]!;
    if (h < days * 24) daily[Math.floor(h / 24)] += water[h]!;
  }
  let maxDay = 0;
  for (let d = 1; d < days; d++) if (daily[d]! > daily[maxDay]!) maxDay = d;
  return {
    w,
    water,
    power: pw,
    daily,
    maxDay,
    maxDayGal: daily[maxDay]!,
    avgDayGal: annualGal / days,
    annualGal,
    annualMWh,
    peakMW,
    co2Tons: (annualMWh * CO2_LB_PER_MWH) / 2000,
    infeasibleDays,
  };
}

/** Day index (0 = 1 January) to a date label. */
export function dayLabel(year: number, day: number): string {
  const d = new Date(Date.UTC(year, 0, 1 + day));
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
}
