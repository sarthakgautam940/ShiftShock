import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_PARAMS, prepare, type Design, type Prepared } from "../engine/plant";
import { run, type Result } from "../engine/run";
import { CAMPUSES, DEFAULT_CAP_SHARE, countySupply, customCampus, type Campus, type WeatherFile } from "./model";

export type View = "overview" | "plan" | "compare" | "condition" | "method" | "rig";

export const VIEWS: { id: View; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "plan", label: "Plan" },
  { id: "compare", label: "Compare" },
  { id: "condition", label: "Condition" },
  { id: "method", label: "Data and method" },
  { id: "rig", label: "Model plant" },
];

const DESIGN_IDS: Design[] = ["tower", "closed", "hybrid", "dry"];

export interface Scenario {
  view: View;
  campusId: string;
  /** IT load for the custom campus, MW. */
  customMW: number;
  design: Design;
  /** Daily cap in MGD; null means the campus default (the record's 0.52 / 0.89 share). */
  capMgd: number | null;
  /** Peak limit in MW; null means the hybrid's own peak. */
  peakMW: number | null;
  richmondDown: boolean;
  /** Hybrid switch temperature, °C; null means the planning default. */
  switchC: number | null;
  /** Cycles of concentration for towers; null means the planning default. */
  cycles: number | null;
}

const LAST_CAMPUS = "md-campus";

function storedCampus(): string {
  try {
    return localStorage.getItem(LAST_CAMPUS) ?? CAMPUSES[0]!.id;
  } catch {
    return CAMPUSES[0]!.id;
  }
}

/** The URL carries the whole scenario, so a link reopens exactly what was on screen. */
export function parseHash(hash: string): Scenario {
  const [path = "", query = ""] = hash.replace(/^#\/?/, "").split("?");
  const q = new URLSearchParams(query);
  const num = (k: string) => {
    const v = q.get(k);
    const n = v === null ? NaN : Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const view = VIEWS.some((v) => v.id === path) ? (path as View) : "overview";
  const campusParam = q.get("campus");
  const campusId = campusParam && (campusParam === "custom" || CAMPUSES.some((c) => c.id === campusParam)) ? campusParam : storedCampus();
  const designParam = q.get("design") as Design | null;
  return {
    view,
    campusId,
    customMW: Math.min(5000, num("mw") ?? 100),
    design: designParam && DESIGN_IDS.includes(designParam) ? designParam : "tower",
    capMgd: num("cap"),
    peakMW: num("peak"),
    richmondDown: q.get("richmond") === "down",
    switchC: inRange(num("switch"), 15, 40),
    cycles: inRange(num("cycles"), 2, 15),
  };
}

function inRange(v: number | null, lo: number, hi: number): number | null {
  return v !== null && v >= lo && v <= hi ? v : null;
}

export function toHash(s: Scenario): string {
  const q = new URLSearchParams();
  q.set("campus", s.campusId);
  if (s.campusId === "custom") q.set("mw", String(s.customMW));
  q.set("design", s.design);
  if (s.capMgd !== null) q.set("cap", s.capMgd.toFixed(4).replace(/0+$/, "").replace(/\.$/, ""));
  if (s.peakMW !== null) q.set("peak", s.peakMW.toFixed(1));
  if (s.richmondDown) q.set("richmond", "down");
  if (s.switchC !== null) q.set("switch", String(s.switchC));
  if (s.cycles !== null) q.set("cycles", String(s.cycles));
  return `#/${s.view}?${q.toString()}`;
}

export interface Model {
  year: number;
  weather: WeatherFile;
  campus: Campus;
  prep: Prepared;
  designs: Record<Design, Result>;
  /** The design picked in the header. */
  shown: Result;
  hybrid: Result;
  tower: Result;
  /** The Max Day plan against the hybrid's water and peak. */
  plan: Result;
  capGal: number;
  defaultCapGal: number;
  /** Slider range for the cap, gallons per day. */
  capRange: [number, number];
  /** Slider step, gallons: 10,000 for real campuses, finer for very small custom ones. */
  capStep: number;
  peakLimitMW: number;
  supply: number;
}

interface WorkspaceValue {
  s: Scenario;
  set: (patch: Partial<Scenario>) => void;
  m: Model;
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function useWorkspace(): WorkspaceValue {
  const v = useContext(WorkspaceContext);
  if (!v) throw new Error("useWorkspace outside WorkspaceProvider");
  return v;
}

export function WorkspaceProvider({ weather, children }: { weather: WeatherFile; children: ReactNode }) {
  const [s, setS] = useState<Scenario>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onHash = () => setS(parseHash(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const next = toHash(s);
    if (window.location.hash !== next) window.history.replaceState(null, "", next);
    try {
      localStorage.setItem(LAST_CAMPUS, s.campusId);
    } catch {
      // Private windows refuse storage; the URL still carries the campus.
    }
  }, [s]);

  const set = useCallback((patch: Partial<Scenario>) => setS((prev) => ({ ...prev, ...patch })), []);

  const campus = s.campusId === "custom" ? customCampus(s.customMW) : (CAMPUSES.find((c) => c.id === s.campusId) ?? CAMPUSES[0]!);

  // prepare() is the only per-campus cost; every design and plan below reuses it.
  const prep = useMemo(
    () =>
      prepare(weather, {
        ...DEFAULT_PARAMS,
        itMW: campus.mw,
        switchC: s.switchC ?? DEFAULT_PARAMS.switchC,
        cycles: s.cycles ?? DEFAULT_PARAMS.cycles,
      }),
    [weather, campus.mw, s.switchC, s.cycles],
  );
  const designs = useMemo(
    () => ({
      tower: run(prep, { kind: "design", design: "tower" }),
      closed: run(prep, { kind: "design", design: "closed" }),
      hybrid: run(prep, { kind: "design", design: "hybrid" }),
      dry: run(prep, { kind: "design", design: "dry" }),
    }),
    [prep],
  );
  const hybrid = designs.hybrid;
  const capStep = hybrid.maxDayGal < 4e5 ? 1e2 : 1e4;
  const defaultCapGal = Math.round((hybrid.maxDayGal * DEFAULT_CAP_SHARE) / capStep) * capStep;
  const capRange: [number, number] = [Math.max(capStep, Math.round((hybrid.maxDayGal * 0.1) / capStep) * capStep), Math.ceil(hybrid.maxDayGal / capStep) * capStep];
  const capGal = s.capMgd === null ? defaultCapGal : Math.min(capRange[1], Math.max(capRange[0], s.capMgd * 1e6));
  const peakLimitMW = s.peakMW ?? hybrid.peakMW;
  const plan = useMemo(
    () => run(prep, { kind: "cap", capGalPerDay: capGal, peakLimitMW, annualGal: hybrid.annualGal }),
    [prep, capGal, peakLimitMW, hybrid],
  );

  const m: Model = {
    year: weather.year,
    weather,
    campus,
    prep,
    designs,
    shown: designs[s.design],
    hybrid,
    tower: designs.tower,
    plan,
    capGal,
    defaultCapGal,
    capRange,
    capStep,
    peakLimitMW,
    supply: countySupply(s.richmondDown),
  };

  return <WorkspaceContext.Provider value={{ s, set, m }}>{children}</WorkspaceContext.Provider>;
}
