import { X } from "lucide-react";
import { Switch } from "../../kit";
import { DESIGNS, HANOVER } from "../content";
import { useStudy } from "../state";
import { ChartFrame, PendingPlot } from "./ChartFrame";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const HOURS = ["12 AM", "4 AM", "8 AM", "12 PM", "4 PM", "8 PM", "12 AM"];

export function YearChart() {
  const { state } = useStudy();
  const design = DESIGNS.find((d) => d.id === state.design);
  return (
    <ChartFrame
      id="md-year"
      title="Every day of 2025, one value per day"
      note={`${design?.label ?? ""}. Daily cooling water, average day in grey and the max day marked with its date.`}
      summary="Daily modeled cooling water for each day of 2025. Values appear when the engine runs."
    >
      <PendingPlot
        xTicks={MONTHS}
        xName="2025, measured hourly weather at KOFP"
        yName="Million gallons per day, modeled"
        height={240}
        message="365 daily values draw here when the engine runs"
      />
    </ChartFrame>
  );
}

/** Scale for the county bars, in MGD. Fixed so the Richmond toggle visibly drops capacity. */
const SCALE_MAX = 26;
const TICKS = [0, 5, 10, 15, 20, 25];

function pct(mgd: number): string {
  return `${(mgd / SCALE_MAX) * 100}%`;
}

function fmt(mgd: number, digits = 3): string {
  return mgd.toLocaleString("en-US", { maximumFractionDigits: digits });
}

/**
 * Capacity and today's peak use are sourced county figures and render now.
 * Only the campus's max day waits on the engine.
 */
export function CountyChart() {
  const { state, dispatch } = useStudy();
  const down = state.richmondDown;
  const capacity = down ? HANOVER.capacityRichmondDown : HANOVER.capacity;
  const shortfall = HANOVER.peakUse - capacity;

  return (
    <ChartFrame
      id="md-county"
      title="The campus max day on Hanover's system"
      note={
        down
          ? "Stress test: January 2025's Richmond failure, moved to July. The Richmond contract supplies 20 of 24.775 MGD."
          : "Supply capacity against demand on the worst day. Figures in million gallons per day."
      }
      aside={
        <label className="md-toggle">
          <span>Richmond plant down in July</span>
          <Switch
            checked={down}
            onChange={(next) => dispatch({ type: "richmond", down: next })}
            label="Richmond plant down in July"
          />
        </label>
      }
      summary={`Hanover supply capacity ${fmt(capacity)} MGD. Today's peak use about ${fmt(HANOVER.peakUse)} MGD. ${
        shortfall > 0 ? `Peak use exceeds capacity by about ${fmt(shortfall, 1)} MGD before the campus is added.` : ""
      } The campus max day is added when the engine runs.`}
    >
      <div className="md-county">
        <div className="md-county__row">
          <div className="md-county__label">
            <span>Supply capacity</span>
            <b className="sg-tnum">{fmt(capacity)} MGD</b>
          </div>
          <div className="md-county__track">
            {/* Local supply first, so the bar left standing when Richmond goes
                down starts at zero and the capacity line lands on its end. */}
            <span className="md-seg md-seg--supply" style={{ left: 0, width: pct(HANOVER.doswell) }}>
              <span className="md-seg__label">Doswell 4.0</span>
            </span>
            <span
              className="md-seg md-seg--supply md-seg--thin"
              style={{ left: pct(HANOVER.doswell), width: pct(HANOVER.henrico) }}
              title="Henrico 0.775 MGD"
            />
            <span
              className="md-seg md-seg--richmond"
              data-off={down ? "true" : undefined}
              style={{ left: pct(HANOVER.doswell + HANOVER.henrico), width: pct(HANOVER.richmond) }}
            >
              <span className="md-seg__label">{down ? "Richmond 20, offline" : "Richmond 20"}</span>
            </span>
            <span className="md-capline" style={{ left: pct(capacity) }} aria-hidden />
          </div>
        </div>

        <div className="md-county__row">
          <div className="md-county__label">
            <span>Demand on the max day</span>
            <b className="sg-tnum">about {fmt(HANOVER.peakUse)} MGD + campus</b>
          </div>
          <div className="md-county__track">
            <span className="md-seg md-seg--use" style={{ left: 0, width: pct(HANOVER.peakUse) }}>
              <span className="md-seg__label">Today's peak use</span>
            </span>
            <span className="md-seg md-seg--pending" style={{ left: pct(HANOVER.peakUse), width: "20%" }}>
              <span className="md-seg__label">Campus max day</span>
            </span>
            <span className="md-capline" style={{ left: pct(capacity) }} aria-hidden />
          </div>
        </div>

        <div className="md-county__axis" aria-hidden>
          {TICKS.map((t) => (
            <span key={t} style={{ left: pct(t) }}>
              {t}
            </span>
          ))}
        </div>

        <div className="md-county__foot">
          {shortfall > 0 ? (
            <p className="md-shortfall" role="status">
              <X size={14} aria-hidden />
              Shortfall: today's peak use is over capacity by about {fmt(shortfall, 1)} MGD, before the campus.
            </p>
          ) : (
            <p className="sg-micro">
              Doswell 4.0, Henrico 0.775 and the Richmond contract 20. Source: {HANOVER.source}.
            </p>
          )}
        </div>
      </div>
    </ChartFrame>
  );
}

export function HourlyChart() {
  return (
    <ChartFrame
      id="md-hourly"
      title="The max day, hour by hour"
      note="Cooling water and the campus's electrical draw for each hour, with temperature as context. The hottest hours are also the grid's peak."
      summary="Hourly modeled water and electrical draw on the max day. Values appear when the engine runs."
    >
      <PendingPlot
        xTicks={HOURS}
        xName="Hour of the max day, local time"
        yName="Gallons per hour, modeled"
        yNameRight="Electrical draw, MW, modeled"
        height={220}
        message="24 hourly values draw here when the engine runs"
      />
    </ChartFrame>
  );
}
