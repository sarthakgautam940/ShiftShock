import { prepare, type Prepared, type PlantParams, DEFAULT_PARAMS, type Weather } from "./plant";
import { run } from "./run";

/**
 * The one day the tabletop rig replays, scaled to millilitres. The Pi controller
 * reads this file; it runs the same per-day optimizer on these numbers and does
 * no physics of its own. Contract: docs/PROMPT-pi-controller.md, section 5.
 */
export interface PlantDayHour {
  h: number;
  tempC: number;
  hybridWet: boolean;
  aMl: number;
  bKWh: number;
  wMin: number;
}

export interface PlantDay {
  version: 1;
  source: string;
  date: string;
  galPerMl: number;
  capMl: number;
  peakLimitMW: number;
  normal: { hours: PlantDayHour[] };
  heatWave: { deltaC: number; hours: PlantDayHour[] };
}

const HYBRID_TARGET_ML = 415; // what the rig's hybrid cup should hold at the end of the day
const CAP_MGD = 0.52;
const HEAT_WAVE_C = 3;

function hoursOf(prep: Prepared, day: number, galPerMl: number, peak: number): PlantDayHour[] {
  const p = prep.params;
  return Array.from({ length: 24 }, (_, i) => {
    const h = day * 24 + i;
    const over = p.itMW + p.pBaseMW + prep.dP[h]! - peak;
    const wMin = over > 0 && prep.dP[h]! > 0 ? Math.min(1, over / prep.dP[h]!) : 0;
    return {
      h: i,
      tempC: round(prep.t[h]!, 1),
      hybridWet: prep.t[h]! > p.switchC,
      aMl: round(prep.aTower[h]! / galPerMl, 2),
      bKWh: round(prep.dP[h]! * 1000, 1),
      wMin: round(wMin, 4),
    };
  });
}

export function buildPlantDay(weather: Weather, params: PlantParams = DEFAULT_PARAMS): PlantDay {
  const prep = prepare(weather, params);
  const hybrid = run(prep, { kind: "design", design: "hybrid" });
  const day = hybrid.maxDay;
  // Round the scale so the cap line lands on a whole number of millilitres.
  const galPerMl = Math.round(hybrid.maxDayGal / HYBRID_TARGET_ML / 10) * 10;
  const hot: Weather = { ...weather, t: Array.from(weather.t, (t, h) => (Math.floor(h / 24) === day ? t + HEAT_WAVE_C : t)) };
  const prepHot = prepare(hot, params);
  const date = new Date(Date.UTC(weather.year, 0, 1 + day)).toISOString().slice(0, 10);
  return {
    version: 1,
    source: `Max Day engine, KOFP measured weather ${date}, ${params.itMW} MW IT campus`,
    date,
    galPerMl,
    capMl: Math.round((CAP_MGD * 1e6) / galPerMl),
    peakLimitMW: round(hybrid.peakMW, 1),
    normal: { hours: hoursOf(prep, day, galPerMl, hybrid.peakMW) },
    heatWave: { deltaC: HEAT_WAVE_C, hours: hoursOf(prepHot, day, galPerMl, hybrid.peakMW) },
  };
}

function round(x: number, digits: number): number {
  const k = 10 ** digits;
  return Math.round(x * k) / k;
}
