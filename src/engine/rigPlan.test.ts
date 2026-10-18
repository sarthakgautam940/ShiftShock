import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { PlantDay } from "./plantDay";
import { hybridRigDay, planRigDay } from "./rigPlan";

const day: PlantDay = JSON.parse(readFileSync("rig/plant-day.json", "utf8"));
const ml = (w: number[], hours = day.normal.hours) => w.reduce((s, x, i) => s + x * hours[i]!.aMl, 0);

describe("rig day plan", () => {
  it("never pours past the cap line", () => {
    expect(ml(planRigDay(day.normal.hours, day.capMl))).toBeLessThanOrEqual(day.capMl + 1e-6);
    expect(ml(planRigDay(day.heatWave.hours, day.capMl), day.heatWave.hours)).toBeLessThanOrEqual(day.capMl + 1e-6);
  });
  it("keeps every hour at or above its peak-power floor", () => {
    const w = planRigDay(day.normal.hours, day.capMl);
    day.normal.hours.forEach((x, i) => expect(w[i]!).toBeGreaterThanOrEqual(x.wMin - 1e-9));
  });
  it("leaves the hybrid's cup over the line on its worst day", () => {
    expect(ml(hybridRigDay(day.normal.hours))).toBeGreaterThan(day.capMl);
  });
});
