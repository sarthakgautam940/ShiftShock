import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildPlantDay } from "./plantDay";

const weather = JSON.parse(readFileSync("public/data/kofp-2025.json", "utf8"));

describe("plant day for the rig", () => {
  const day = buildPlantDay(weather);

  it("has 24 valid hours in both tables", () => {
    for (const table of [day.normal.hours, day.heatWave.hours]) {
      expect(table).toHaveLength(24);
      for (const h of table) {
        expect(h.aMl).toBeGreaterThanOrEqual(0);
        expect(h.bKWh).toBeGreaterThanOrEqual(0);
        expect(h.wMin).toBeGreaterThanOrEqual(0);
        expect(h.wMin).toBeLessThanOrEqual(1);
      }
    }
  });

  it("scales the hybrid's worst day to about 415 mL and the cap to about 242 mL", () => {
    const hybridMl = day.normal.hours.filter((h) => h.hybridWet).reduce((s, h) => s + h.aMl, 0);
    expect(hybridMl).toBeGreaterThan(395);
    expect(hybridMl).toBeLessThan(435);
    expect(day.capMl).toBeGreaterThan(230);
    expect(day.capMl).toBeLessThan(255);
  });

  it("keeps the floors inside the cap, so the rig's cap is feasible", () => {
    const floors = day.normal.hours.reduce((s, h) => s + h.wMin * h.aMl, 0);
    expect(floors).toBeLessThanOrEqual(day.capMl);
  });

  // Writing here keeps rig/plant-day.json in step with the engine on every test run.
  it("writes rig/plant-day.json", () => {
    mkdirSync("rig", { recursive: true });
    writeFileSync("rig/plant-day.json", JSON.stringify(day, null, 2) + "\n");
  });
});
