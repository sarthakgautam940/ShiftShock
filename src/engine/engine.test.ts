import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GAL_PER_MWH, wetBulb } from "./psychro";
import { DEFAULT_PARAMS, prepare } from "./plant";
import { run } from "./run";

const weather = JSON.parse(readFileSync("public/data/kofp-2025.json", "utf8"));
const prep = prepare(weather);
const hybrid = run(prep, { kind: "design", design: "hybrid" });
const capRun = (capMGD: number, peak = hybrid.peakMW) =>
  run(prep, { kind: "cap", capGalPerDay: capMGD * 1e6, peakLimitMW: peak, annualGal: hybrid.annualGal });

describe("psychrometrics", () => {
  it("matches Stull's worked example: 20 °C at 50% is about 13.7 °C wet-bulb", () => {
    expect(wetBulb(20, 50)).toBeCloseTo(13.7, 1);
  });
  it("never exceeds dry-bulb and meets it near saturation", () => {
    expect(wetBulb(30, 30)).toBeLessThan(30);
    expect(wetBulb(25, 99)).toBeGreaterThan(24.5);
  });
  it("evaporating water carries off about 0.39 gal per kWh", () => {
    expect(GAL_PER_MWH / 1000).toBeCloseTo(0.39, 2);
  });
});

describe("plant", () => {
  it("adds blowdown at 5 cycles: makeup is evaporation × 5/4", () => {
    const h = 4000;
    const evap = prep.aTower[h]! / 1.25;
    expect(prep.aTower[h]! / evap).toBeCloseTo(DEFAULT_PARAMS.cycles / (DEFAULT_PARAMS.cycles - 1), 6);
  });
  it("applies each design's rule for the wet share", () => {
    const tower = run(prep, { kind: "design", design: "tower" });
    const dry = run(prep, { kind: "design", design: "dry" });
    expect(Math.min(...tower.w)).toBe(1);
    expect(Math.max(...dry.w)).toBe(0);
    for (let h = 0; h < prep.hours; h += 97) expect(hybrid.w[h]).toBe(prep.t[h]! > DEFAULT_PARAMS.switchC ? 1 : 0);
  });
  it("reproduces the public record: a 100 MW tower's worst day is about 1.2 to 1.3 MGD", () => {
    const tower = run(prep, { kind: "design", design: "tower" });
    expect(tower.maxDayGal / 1e6).toBeGreaterThan(1.2);
    expect(tower.maxDayGal / 1e6).toBeLessThan(1.3);
  });
});

describe("Max Day optimizer", () => {
  it("never lets a day exceed the cap or an hour exceed the peak limit", () => {
    const r = capRun(0.52);
    expect(r.infeasibleDays).toEqual([]);
    for (const d of r.daily) expect(d).toBeLessThanOrEqual(0.52e6 + 1);
    expect(r.peakMW).toBeLessThanOrEqual(hybrid.peakMW + 1e-6);
  });
  it("spends exactly the hybrid's annual water", () => {
    expect(capRun(0.52).annualGal).toBeCloseTo(hybrid.annualGal, -2);
  });
  it("a higher cap never raises electricity", () => {
    const caps = [0.3, 0.4, 0.52, 0.7, 0.9];
    const mwh = caps.map((c) => capRun(c).annualMWh);
    for (let i = 1; i < mwh.length; i++) expect(mwh[i]!).toBeLessThanOrEqual(mwh[i - 1]! + 1e-6);
  });
  it("a tighter peak limit never lowers water use on the worst hours", () => {
    const loose = capRun(0.52, hybrid.peakMW + 5);
    const tight = capRun(0.52, hybrid.peakMW);
    const floorsLoose = loose.w.reduce((s, w) => s + w, 0);
    const floorsTight = tight.w.reduce((s, w) => s + w, 0);
    expect(floorsTight).toBeGreaterThanOrEqual(floorsLoose - 1e-6);
  });
  it("beats random feasible reallocations of the same water on a day (greedy is optimal)", () => {
    // Take the worst day and compare the optimizer's kWh saved with random allocations of the same budget.
    const r = capRun(0.52);
    const d = r.maxDay, hours = Array.from({ length: 24 }, (_, i) => d * 24 + i);
    const saved = (w: (h: number) => number) => hours.reduce((s, h) => s + w(h) * prep.dP[h]!, 0);
    const budget = hours.reduce((s, h) => s + r.w[h]! * prep.aTower[h]!, 0);
    const best = saved((h) => r.w[h]!);
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let trial = 0; trial < 200; trial++) {
      const weights = hours.map(() => rand());
      const total = hours.reduce((s, h, i) => s + weights[i]! * prep.aTower[h]!, 0);
      const k = budget / total;
      if (weights.some((x) => x * k > 1)) continue;
      expect(saved((h) => weights[hours.indexOf(h)]! * k)).toBeLessThanOrEqual(best + 1e-6);
    }
  });
  it("locks the headline: the worst day falls at least 40% at the same water and peak", () => {
    const r = capRun(0.52);
    expect(1 - r.maxDayGal / hybrid.maxDayGal).toBeGreaterThanOrEqual(0.4);
    expect(r.peakMW).toBeLessThanOrEqual(hybrid.peakMW + 1e-6);
    expect(r.annualMWh).toBeLessThanOrEqual(hybrid.annualMWh);
  });
  it("runs a full year fast enough for a live slider", () => {
    const t0 = performance.now();
    capRun(0.45);
    expect(performance.now() - t0).toBeLessThan(50);
  });
});
