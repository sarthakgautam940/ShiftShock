import { ArrowRightLeft, PenLine, SlidersHorizontal } from "lucide-react";
import { Button, Disclosure, SegmentedControl } from "../../kit";
import { DESIGNS, PRESETS, type PresetId } from "../content";
import { navigate } from "../route";
import { useStudy } from "../state";
import { NumberField } from "./NumberField";

/**
 * The left rail: one status line, the campus and its cooling, and the three
 * actions in demo order. Everything the demo path changes lives here.
 */
export function InputsRail() {
  const { state, dispatch } = useStudy();
  const preset = PRESETS.find((p) => p.id === state.preset);
  const design = DESIGNS.find((d) => d.id === state.design);

  return (
    <div className="md-rail">
      <p className="md-rail__status">{preset ? preset.status : "Custom campus. Not tied to a public record."}</p>

      <div className="md-rail__group">
        <span className="md-rail__label" id="md-preset-label">
          Campus
        </span>
        <SegmentedControl<PresetId | "custom">
          aria-label="Campus preset"
          options={PRESETS.map((p) => ({ value: p.id, label: p.name.replace("Tract ", "") }))}
          value={state.preset ?? "custom"}
          onChange={(id) => {
            if (id !== "custom") dispatch({ type: "preset", id });
          }}
        />
        {preset ? <p className="md-rail__hint">{preset.record}</p> : null}
      </div>

      <NumberField
        label="Campus IT load"
        unit="MW"
        value={state.itLoadMW}
        min={1}
        max={5000}
        step={10}
        hint="What the campus draws for computing. Iron Horse's 1.2 MGD record implies about 100 MW."
        onChange={(mw) => dispatch({ type: "itLoad", mw })}
      />

      <div className="md-rail__group">
        <span className="md-rail__label">Cooling design</span>
        <div className="md-designs" role="radiogroup" aria-label="Cooling design">
          {DESIGNS.map((d) => (
            <button
              key={d.id}
              type="button"
              role="radio"
              aria-checked={state.design === d.id}
              className="md-design"
              onClick={() => dispatch({ type: "design", id: d.id })}
            >
              <span className="md-design__name">{d.label}</span>
            </button>
          ))}
        </div>
        {design ? <p className="md-rail__hint">{design.rule}</p> : null}
      </div>

      <NumberField
        label="Hybrid switch temperature"
        unit="°C"
        value={state.switchTempC}
        min={10}
        max={40}
        step={1}
        disabled={state.design !== "hybrid"}
        hint={state.design === "hybrid" ? "Wet only in hours hotter than this." : "Applies to the adiabatic hybrid."}
        onChange={(c) => dispatch({ type: "switchTemp", c })}
      />

      <Disclosure summary="Advanced">
        <div className="md-rail__advanced">
          <NumberField
            label="Cycles of concentration"
            unit="cycles"
            value={state.cycles}
            min={2}
            max={10}
            step={0.5}
            hint="Planning assumption. At 5 cycles, 80% of makeup water evaporates."
            onChange={(n) => dispatch({ type: "cycles", n })}
          />
          <NumberField
            label="Cold storage tank"
            unit="MWh of cooling"
            value={state.tankMWh}
            min={0}
            max={2000}
            step={10}
            hint="Zero means no tank."
            onChange={(mwh) => dispatch({ type: "tank", mwh })}
          />
        </div>
      </Disclosure>

      <div className="md-rail__actions">
        <Button
          variant="secondary"
          icon={<ArrowRightLeft size={15} aria-hidden />}
          onClick={() => dispatch({ type: "translate", open: true })}
        >
          Translate a record
        </Button>
        <Button
          variant="primary"
          icon={<SlidersHorizontal size={15} aria-hidden />}
          onClick={() => {
            dispatch({ type: "fix", open: true });
            requestAnimationFrame(() => document.getElementById("md-fix")?.scrollIntoView({ block: "start" }));
          }}
        >
          Find the cheapest cap
        </Button>
        <Button variant="secondary" icon={<PenLine size={15} aria-hidden />} onClick={() => navigate("condition")}>
          Draft the condition
        </Button>
      </div>
    </div>
  );
}

