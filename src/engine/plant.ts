import { GAL_PER_MWH, wetBulb } from "./psychro";

export type Design = "tower" | "closed" | "hybrid" | "dry";

/**
 * Planning assumptions for the cooling plant. These are not measured; they are
 * calibrated so the cooling tower reproduces the public record (about 1.2 MGD on
 * the worst day for Iron Horse) and are shown as assumptions on the Method page.
 */
export interface PlantParams {
  /** IT load, MW. */
  itMW: number;
  /** Heat to reject per MW of IT load (IT plus electrical losses and fans). */
  kHeat: number;
  /** Share of heat leaving as evaporation when wet: etaBase + etaSlope × (Tw − 15), clamped. */
  etaBase: number;
  etaSlope: number;
  /** Cycles of concentration; blowdown is evaporation / (N − 1). */
  cycles: number;
  /** Closed-circuit coolers recirculate spray water longer, so they run more cycles. */
  closedCycles: number;
  /** Fans, pumps and the wet-mode chiller baseline, MW. */
  pBaseMW: number;
  /** Dry chiller efficiency falls with dry-bulb: max(copDryMin, copDry0 − copDrySlope × T). */
  copDry0: number;
  copDrySlope: number;
  copDryMin: number;
  /** Wet (evaporative) efficiency falls with wet-bulb: max(copWetMin, copWet0 − copWetSlope × Tw). */
  copWet0: number;
  copWetSlope: number;
  copWetMin: number;
  /** The adiabatic hybrid runs wet above this dry-bulb, °C. */
  switchC: number;
}

export const DEFAULT_PARAMS: PlantParams = {
  itMW: 100,
  kHeat: 1.19,
  etaBase: 0.86,
  etaSlope: 0.004,
  cycles: 5,
  closedCycles: 7,
  pBaseMW: 6.3,
  copDry0: 7,
  copDrySlope: 0.09,
  copDryMin: 2,
  copWet0: 12,
  copWetSlope: 0.15,
  copWetMin: 3,
  switchC: 27,
};

export interface Weather {
  /** Dry-bulb °C, one value per hour of the year. */
  t: ArrayLike<number>;
  /** Relative humidity %, one value per hour. */
  rh: ArrayLike<number>;
  year: number;
}

/**
 * Everything that does not depend on the operating policy, computed once per
 * campus: per hour, the water a fully wet hour would draw and the power a fully
 * wet hour saves. Every policy (a design rule or the Max Day optimizer) only
 * chooses w_h, the wet share of each hour.
 */
export interface Prepared {
  params: PlantParams;
  hours: number;
  t: Float64Array;
  tw: Float64Array;
  /** Heat to reject, MW. */
  q: Float64Array;
  /** Makeup water if fully wet, gallons in that hour (evaporation plus blowdown). */
  aTower: Float64Array;
  aClosed: Float64Array;
  /** Extra power of dry versus wet in that hour, MW (equals MWh saved by one wet hour). */
  dP: Float64Array;
}

export function eta(p: PlantParams, tw: number): number {
  return Math.min(1, Math.max(0.6, p.etaBase + p.etaSlope * (tw - 15)));
}

export function copDry(p: PlantParams, t: number): number {
  return Math.max(p.copDryMin, p.copDry0 - p.copDrySlope * t);
}

export function copWet(p: PlantParams, tw: number): number {
  return Math.max(p.copWetMin, p.copWet0 - p.copWetSlope * tw);
}

export function prepare(weather: Weather, params: PlantParams = DEFAULT_PARAMS): Prepared {
  const n = weather.t.length;
  const t = new Float64Array(n), tw = new Float64Array(n), q = new Float64Array(n);
  const aTower = new Float64Array(n), aClosed = new Float64Array(n), dP = new Float64Array(n);
  const towerMakeup = params.cycles / (params.cycles - 1);
  const closedMakeup = params.closedCycles / (params.closedCycles - 1);
  for (let h = 0; h < n; h++) {
    const T = weather.t[h]!, RH = weather.rh[h]!;
    const Tw = wetBulb(T, RH);
    const Q = params.kHeat * params.itMW;
    const evap = eta(params, Tw) * Q * GAL_PER_MWH;
    t[h] = T;
    tw[h] = Tw;
    q[h] = Q;
    aTower[h] = evap * towerMakeup;
    aClosed[h] = evap * closedMakeup;
    dP[h] = Math.max(0, Q * (1 / copDry(params, T) - 1 / copWet(params, Tw)));
  }
  return { params, hours: n, t, tw, q, aTower, aClosed, dP };
}

/** Power drawn in an hour at wet share w, MW. */
export function power(prep: Prepared, h: number, w: number): number {
  return prep.params.itMW + prep.params.pBaseMW + (1 - w) * prep.dP[h]!;
}
