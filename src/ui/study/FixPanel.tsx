import { X } from "lucide-react";
import { IconButton, Switch } from "../../kit";
import { useStudy } from "../state";
import { ChartFrame, PendingPlot } from "./ChartFrame";
import { NumberField } from "./NumberField";

const CAP_MIN = 0.05;
const CAP_MAX = 1.5;

const READOUTS = [
  { label: "Max day", unit: "MGD", tone: "peak" },
  { label: "Annual water", unit: "million gal", tone: "quiet" },
  { label: "Annual electricity", unit: "MWh", tone: "quiet" },
  { label: "Peak draw", unit: "MW", tone: "quiet" },
  { label: "Carbon", unit: "tons CO2", tone: "quiet" },
] as const;

/**
 * Fix: cap the max day. The slider will call the engine's
 * run(prepared, { kind: 'cap', capGalPerDay, peakLimitMW }) on every move; a
 * full year re-runs in about 12 ms, so the readouts follow the thumb.
 */
export function FixPanel({ inline }: { inline?: boolean }) {
  const { state, dispatch } = useStudy();

  return (
    <section className="md-fix" id="md-fix" aria-labelledby="md-fix-title" data-inline={inline ? "true" : undefined}>
      <header className="md-fix__head">
        <div>
          <h2 className="md-fix__title" id="md-fix-title">
            Find the cheapest cap
          </h2>
          <p className="md-fix__note">
            Spend water only in the hours where it saves the most power, under a daily cap and a peak-power limit.
          </p>
        </div>
        {inline ? null : (
          <IconButton label="Close the cap panel" onClick={() => dispatch({ type: "fix", open: false })}>
            <X size={16} />
          </IconButton>
        )}
      </header>

      <div className="md-fix__controls">
        <div className="md-slider">
          <label className="md-slider__label" htmlFor="md-cap">
            <span>Daily water cap</span>
            <b className="sg-tnum">{state.capMGD.toFixed(2)} MGD</b>
          </label>
          <input
            id="md-cap"
            type="range"
            className="md-range"
            min={CAP_MIN}
            max={CAP_MAX}
            step={0.01}
            value={state.capMGD}
            aria-valuetext={`${state.capMGD.toFixed(2)} million gallons per day`}
            onChange={(e) => dispatch({ type: "cap", mgd: Number(e.target.value) })}
            style={{ "--fill": `${((state.capMGD - CAP_MIN) / (CAP_MAX - CAP_MIN)) * 100}%` } as React.CSSProperties}
          />
          <div className="md-slider__ends sg-micro" aria-hidden>
            <span>{CAP_MIN} MGD</span>
            <span>{CAP_MAX} MGD</span>
          </div>
        </div>
        <NumberField
          label="Peak power limit"
          unit="MW"
          value={state.peakLimitMW}
          min={1}
          max={6000}
          step={1}
          hint="The campus never draws more than this in any hour."
          onChange={(mw) => dispatch({ type: "peakLimit", mw })}
        />
        <label className="md-toggle md-toggle--row">
          <span>
            Cold storage
            <span className="md-toggle__hint">Charge a chilled-water tank at night, discharge late afternoon.</span>
          </span>
          <Switch checked={state.storage} onChange={(on) => dispatch({ type: "storage", on })} label="Cold storage" />
        </label>
      </div>

      <dl className="md-readouts">
        {READOUTS.map((r) => (
          <div className="md-readout" key={r.label} data-tone={r.tone}>
            <dt>{r.label}</dt>
            <dd>
              <span className="md-readout__pending" role="img" aria-label={`${r.label}: waiting on the engine`} />
              <span className="md-readout__unit">{r.unit}</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="md-fix__compare">
        Max-day reduction against the hybrid, at matched annual water and the same peak:{" "}
        <span className="md-inline-pending" role="img" aria-label="waiting on the engine" />
      </p>

      <ChartFrame
        id="md-pareto"
        title="Every cap traces the trade"
        note="Each point is the cheapest plan at one cap: its max-day water against the year's electricity."
        summary="Pareto frontier of max-day water against annual electricity. Points appear when the engine runs."
      >
        <PendingPlot
          xTicks={["Less electricity", "", "", "More electricity"]}
          xName="Annual electricity, MWh, modeled"
          yName="Max-day water, MGD, modeled"
          height={200}
          message="The frontier draws here as the cap sweeps"
        />
      </ChartFrame>
    </section>
  );
}
