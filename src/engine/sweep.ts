import type { Prepared } from "./plant";
import { run, type Result } from "./run";

export interface FrontierPoint {
  /** The daily cap asked for, gallons. */
  capGal: number;
  /** The worst day the plan actually reached, gallons (never above the cap). */
  maxDayGal: number;
  annualGal: number;
  annualMWh: number;
  peakMW: number;
  /** True when the cap left part of the year's water budget unspendable. */
  budgetShort: boolean;
}

/**
 * The cost of a cap: re-plan the year at evenly spaced caps between `loGal` and
 * the hybrid's own worst day, against the hybrid's annual water and a peak limit.
 * Each run is a few milliseconds, so the whole frontier redraws when the peak
 * limit or the campus changes.
 */
export function frontier(prep: Prepared, hybrid: Result, peakLimitMW: number, loGal: number, steps = 32): FrontierPoint[] {
  const hi = hybrid.maxDayGal;
  const points: FrontierPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const capGal = loGal + ((hi - loGal) * i) / steps;
    const r = run(prep, { kind: "cap", capGalPerDay: capGal, peakLimitMW, annualGal: hybrid.annualGal });
    points.push({
      capGal,
      maxDayGal: r.maxDayGal,
      annualGal: r.annualGal,
      annualMWh: r.annualMWh,
      peakMW: r.peakMW,
      budgetShort: r.annualGal < hybrid.annualGal * 0.999,
    });
  }
  return points;
}

/**
 * The lowest cap that costs no electricity against the hybrid rule: below it, every
 * further gallon taken off the worst day has to be bought back with chiller power.
 * Bisection on a curve that only rises as the cap falls.
 */
export function lowestFreeCap(prep: Prepared, hybrid: Result, peakLimitMW: number): number {
  const cost = (capGal: number) =>
    run(prep, { kind: "cap", capGalPerDay: capGal, peakLimitMW, annualGal: hybrid.annualGal }).annualMWh - hybrid.annualMWh;
  let lo = 0, hi = hybrid.maxDayGal;
  if (cost(hi) > 0) return hi;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    if (cost(mid) <= 0) hi = mid;
    else lo = mid;
  }
  return hi;
}
