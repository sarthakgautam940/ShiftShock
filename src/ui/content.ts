/**
 * Fixed figures and copy from the build handoff (sections 4, 8 and 15). These
 * are sourced public-record values and planning inputs, never engine output.
 * In Phase 2 the county figures move to public/data/context.json and are
 * parsed with zod at load.
 */

export type DesignId = "tower" | "closed" | "hybrid" | "dry";

export interface Design {
  id: DesignId;
  label: string;
  short: string;
  rule: string;
}

export const DESIGNS: readonly Design[] = [
  { id: "tower", label: "Cooling tower", short: "Tower", rule: "Fully evaporative, wet every hour." },
  {
    id: "closed",
    label: "Closed-circuit evaporative",
    short: "Closed loop",
    rule: "The \"closed loop\" that still evaporates on the outside of the coil.",
  },
  { id: "hybrid", label: "Adiabatic hybrid", short: "Hybrid", rule: "Wet only above the switch temperature." },
  { id: "dry", label: "Dry", short: "Dry", rule: "Air cooled with chiller trim, no evaporation." },
];

export type PresetId = "iron-horse" | "mountain-road" | "hickory-hill";

export interface Preset {
  id: PresetId;
  name: string;
  itLoadMW: number;
  record: string;
  status: string;
}

export const PRESETS: readonly Preset[] = [
  {
    id: "iron-horse",
    name: "Iron Horse",
    itLoadMW: 100,
    record: "Up to 1.2 MGD of water on record, plus 250,000 gallons a day of wastewater.",
    status: "Iron Horse: recommended 5 to 2 on Aug 20. Board vote not scheduled.",
  },
  {
    id: "mountain-road",
    name: "Mountain Road",
    itLoadMW: 900,
    record: "About 600,000 gallons a day, up to 90% of its zone's supply.",
    status: "Mountain Road Tech Park: denied 4 to 3 on May 27, 2026.",
  },
  {
    id: "hickory-hill",
    name: "Tract Hickory Hill",
    itLoadMW: 2400,
    record: "1,200 acres approved March 2024, sized for 2.4 GW.",
    status: "Tract Hickory Hill: approved March 2024, sized for 2.4 GW.",
  },
];

/** Hanover suburban supply, in MGD: Richmond contract, Doswell plant, Henrico. */
export const HANOVER = {
  richmond: 20,
  doswell: 4.0,
  henrico: 0.775,
  capacity: 24.775,
  capacityRichmondDown: 4.775,
  peakUse: 11.7,
  source: "Hanover County utility figures",
} as const;

export const HYBRID_SWITCH_DEFAULT_C = 27;
export const CYCLES_DEFAULT = 5;
export const PEAK_LIMIT_DEFAULT_MW = 120;

export const FOOTER_LINE = "Modeled, not measured. Hourly weather: Hanover County Airport (KOFP), 2025.";

export const CONDITION_TEMPLATE = {
  before: "Cooling water use shall not exceed ",
  after:
    " gallons on any calendar day. Daily cooling water use shall be reported monthly. During a declared water emergency, cooling shall run in dry mode.",
} as const;
