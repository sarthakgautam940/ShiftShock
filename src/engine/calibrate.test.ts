import { readFileSync } from "node:fs";
import { describe, it } from "vitest";
import { DEFAULT_PARAMS, prepare, type PlantParams } from "./plant";
import { run } from "./run";

/**
 * Not a test of correctness: a search that prints plant parameters which reproduce
 * the targets from the team's original engine run. Run with CALIBRATE=1.
 * Targets: tower worst day 1.25 MGD and 433 M gal a year; hybrid 120.0 MW peak and
 * about 1,000,624 MWh a year.
 */
const weather = JSON.parse(readFileSync("public/data/kofp-2025.json", "utf8"));

describe.runIf(process.env.CALIBRATE)("calibrate", () => {
  it("searches", () => {
    let best: { err: number; p: PlantParams; note: string } | null = null;
    for (const kHeat of [1.05, 1.1, 1.15, 1.2])
      for (const etaBase of [0.74, 0.78, 0.82, 0.86, 0.9])
        for (const etaSlope of [0, 0.004, 0.008, 0.012, 0.016]) {
          const p = { ...DEFAULT_PARAMS, kHeat, etaBase, etaSlope };
          const tower = run(prepare(weather, p), { kind: "design", design: "tower" });
          const err = Math.abs(tower.maxDayGal / 1.25e6 - 1) + Math.abs(tower.annualGal / 433e6 - 1);
          if (!best || err < best.err) best = { err, p, note: `tower max ${(tower.maxDayGal / 1e6).toFixed(3)} annual ${(tower.annualGal / 1e6).toFixed(1)}M` };
        }
    let water = best!.p;
    console.log("water fit", best!.note, JSON.stringify({ kHeat: water.kHeat, etaBase: water.etaBase, etaSlope: water.etaSlope }));

    let best2: { err: number; p: PlantParams; note: string } | null = null;
    for (const copDry0 of [6, 7, 8, 9, 10])
      for (const copDrySlope of [0.06, 0.09, 0.12, 0.15, 0.18])
        for (const pBaseMW of [4, 6, 8, 10, 12]) {
          const p = { ...water, copDry0, copDrySlope, pBaseMW };
          const hy = run(prepare(weather, p), { kind: "design", design: "hybrid" });
          const err = Math.abs(hy.peakMW / 120 - 1) * 10 + Math.abs(hy.annualMWh / 1000624 - 1) * 10;
          if (!best2 || err < best2.err) best2 = { err, p, note: `hybrid peak ${hy.peakMW.toFixed(1)} MWh ${Math.round(hy.annualMWh)} max ${(hy.maxDayGal / 1e6).toFixed(3)} annual ${(hy.annualGal / 1e6).toFixed(1)}M` };
        }
    water = best2!.p;
    console.log("power fit", best2!.note, JSON.stringify({ copDry0: water.copDry0, copDrySlope: water.copDrySlope, pBaseMW: water.pBaseMW }));
  });
});
