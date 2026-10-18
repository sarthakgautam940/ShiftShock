import type { Model, Scenario } from "./workspace";
import { toHash } from "./workspace";
import { DESIGNS, HANOVER } from "./model";

function download(name: string, type: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const slug = (m: Model) => `headroom-${m.campus.id}-${m.campus.mw}mw-${m.year}`;

/** One row per day: every design and the plan, in gallons, with the day's high temperature. */
export function downloadDailyCsv(m: Model) {
  const head = ["date", "high_c", ...DESIGNS.map((d) => `${d.id}_gal`), "optimized_plan_gal"];
  const lines = [head.join(",")];
  for (let d = 0; d < m.plan.daily.length; d++) {
    let hi = -Infinity;
    for (let h = d * 24; h < d * 24 + 24; h++) hi = Math.max(hi, m.prep.t[h]!);
    const date = new Date(Date.UTC(m.year, 0, 1 + d)).toISOString().slice(0, 10);
    lines.push([date, hi.toFixed(1), ...DESIGNS.map((x) => Math.round(m.designs[x.id].daily[d]!)), Math.round(m.plan.daily[d]!)].join(","));
  }
  download(`${slug(m)}-daily.csv`, "text/csv", lines.join("\n"));
}

/** The scenario and its headline figures, for a staff report or a second tool. */
export function downloadScenarioJson(m: Model, s: Scenario) {
  const summary = (r: Model["plan"]) => ({
    worstDayGal: Math.round(r.maxDayGal),
    worstDayIndex: r.maxDay,
    averageDayGal: Math.round(r.avgDayGal),
    annualGal: Math.round(r.annualGal),
    annualMWh: Math.round(r.annualMWh),
    peakMW: Number(r.peakMW.toFixed(2)),
    co2Tons: Math.round(r.co2Tons),
  });
  const body = {
    generatedBy: "Headroom",
    modeled: true,
    link: `${window.location.origin}/${toHash(s)}`,
    campus: { name: m.campus.name, itMW: m.campus.mw },
    weather: { station: m.weather.station, name: m.weather.name, year: m.year, source: m.weather.source },
    county: { supplyGal: m.supply, peakUseGal: HANOVER.peakUse, richmondDown: s.richmondDown },
    plan: { capGalPerDay: Math.round(m.capGal), peakLimitMW: Number(m.peakLimitMW.toFixed(2)), ...summary(m.plan) },
    designs: Object.fromEntries(DESIGNS.map((d) => [d.id, summary(m.designs[d.id])])),
    params: m.prep.params,
  };
  download(`${slug(m)}.json`, "application/json", JSON.stringify(body, null, 2));
}
