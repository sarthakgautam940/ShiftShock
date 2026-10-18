import { createContext, useContext, useMemo, useReducer, type ReactNode } from "react";
import {
  CYCLES_DEFAULT,
  HYBRID_SWITCH_DEFAULT_C,
  PEAK_LIMIT_DEFAULT_MW,
  PRESETS,
  type DesignId,
  type PresetId,
} from "./content";

/**
 * The study's inputs. One reducer, so the rail, the palette and the mobile tabs
 * all change the same state and can never disagree about which design is on.
 */
export interface StudyState {
  preset: PresetId | null;
  itLoadMW: number;
  design: DesignId;
  switchTempC: number;
  cycles: number;
  tankMWh: number;
  richmondDown: boolean;
  capMGD: number;
  peakLimitMW: number;
  storage: boolean;
  fixOpen: boolean;
  translateOpen: boolean;
  recordGalPerDay: number;
  recordIncludesBlowdown: boolean;
}

export type StudyAction =
  | { type: "preset"; id: PresetId }
  | { type: "itLoad"; mw: number }
  | { type: "design"; id: DesignId }
  | { type: "switchTemp"; c: number }
  | { type: "cycles"; n: number }
  | { type: "tank"; mwh: number }
  | { type: "richmond"; down: boolean }
  | { type: "cap"; mgd: number }
  | { type: "peakLimit"; mw: number }
  | { type: "storage"; on: boolean }
  | { type: "fix"; open: boolean }
  | { type: "translate"; open: boolean }
  | { type: "record"; galPerDay: number }
  | { type: "recordBlowdown"; on: boolean };

// The demo path opens on Iron Horse with the adiabatic hybrid (handoff section 8).
export const INITIAL: StudyState = {
  preset: "iron-horse",
  itLoadMW: 100,
  design: "hybrid",
  switchTempC: HYBRID_SWITCH_DEFAULT_C,
  cycles: CYCLES_DEFAULT,
  tankMWh: 0,
  richmondDown: false,
  capMGD: 0.5,
  peakLimitMW: PEAK_LIMIT_DEFAULT_MW,
  storage: false,
  fixOpen: false,
  translateOpen: false,
  recordGalPerDay: 1_200_000,
  recordIncludesBlowdown: true,
};

export function reduce(state: StudyState, action: StudyAction): StudyState {
  switch (action.type) {
    case "preset": {
      const preset = PRESETS.find((p) => p.id === action.id);
      return preset ? { ...state, preset: preset.id, itLoadMW: preset.itLoadMW } : state;
    }
    case "itLoad": {
      // Typing a load that no longer matches the preset makes it a custom campus.
      const match = PRESETS.find((p) => p.id === state.preset);
      return { ...state, itLoadMW: action.mw, preset: match?.itLoadMW === action.mw ? state.preset : null };
    }
    case "design":
      return { ...state, design: action.id };
    case "switchTemp":
      return { ...state, switchTempC: action.c };
    case "cycles":
      return { ...state, cycles: action.n };
    case "tank":
      return { ...state, tankMWh: action.mwh };
    case "richmond":
      return { ...state, richmondDown: action.down };
    case "cap":
      return { ...state, capMGD: action.mgd };
    case "peakLimit":
      return { ...state, peakLimitMW: action.mw };
    case "storage":
      return { ...state, storage: action.on };
    case "fix":
      return { ...state, fixOpen: action.open };
    case "translate":
      return { ...state, translateOpen: action.open };
    case "record":
      return { ...state, recordGalPerDay: action.galPerDay };
    case "recordBlowdown":
      return { ...state, recordIncludesBlowdown: action.on };
  }
}

const StudyContext = createContext<{ state: StudyState; dispatch: (a: StudyAction) => void } | null>(null);

export function StudyProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reduce, INITIAL);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
}

export function useStudy() {
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error("useStudy must be used inside StudyProvider");
  return ctx;
}
