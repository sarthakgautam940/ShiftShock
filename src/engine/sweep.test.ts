import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { prepare } from "./plant";
import { run } from "./run";
import { frontier, lowestFreeCap } from "./sweep";

const weather = JSON.parse(readFileSync("public/data/kofp-2025.json", "utf8"));
const prep = prepare(weather);
const hybrid = run(prep, { kind: "design", design: "hybrid" });

describe("cost-of-cap frontier", () => {
  const points = frontier(prep, hybrid, hybrid.peakMW, 0.1e6, 16);

  it("spans from the low cap to the hybrid's own worst day", () => {
    expect(points[0]!.capGal).toBeCloseTo(0.1e6, 0);
    expect(points.at(-1)!.capGal).toBeCloseTo(hybrid.maxDayGal, 0);
  });
  it("never reaches a worst day above the cap it was given", () => {
    for (const p of points) expect(p.maxDayGal).toBeLessThanOrEqual(p.capGal + 1);
  });
  it("only gets cheaper as the cap loosens", () => {
    for (let i = 1; i < points.length; i++) expect(points[i]!.annualMWh).toBeLessThanOrEqual(points[i - 1]!.annualMWh + 1e-6);
  });
  it("flags caps too tight to spend the year's water", () => {
    expect(points[0]!.budgetShort).toBe(true);
    expect(points.at(-1)!.budgetShort).toBe(false);
  });
});

describe("lowest no-cost cap", () => {
  it("costs no electricity at the cap and some just below it", () => {
    const cap = lowestFreeCap(prep, hybrid, hybrid.peakMW);
    const at = run(prep, { kind: "cap", capGalPerDay: cap, peakLimitMW: hybrid.peakMW, annualGal: hybrid.annualGal });
    const below = run(prep, { kind: "cap", capGalPerDay: cap * 0.95, peakLimitMW: hybrid.peakMW, annualGal: hybrid.annualGal });
    expect(at.annualMWh).toBeLessThanOrEqual(hybrid.annualMWh + 1e-6);
    expect(below.annualMWh).toBeGreaterThan(hybrid.annualMWh);
    expect(cap / 1e6).toBeGreaterThan(0.25);
    expect(cap / 1e6).toBeLessThan(0.35);
  });
});
