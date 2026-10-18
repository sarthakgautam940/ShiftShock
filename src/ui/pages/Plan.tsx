import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import { frontier, lowestFreeCap } from "../../engine/sweep";
import { DayHours } from "../charts/DayHours";
import { Frontier } from "../charts/Frontier";
import { YearBars } from "../charts/YearBars";
import { cx } from "../../kit/cx";
import { dateLabel, int, mgal, mgd, pctChange, signed } from "../format";
import { Button, Card, Footnote, Kpi, KpiStrip, PageHeader, Row } from "../primitives";
import { useWorkspace } from "../workspace";

/** A number field that only commits finite values, so typing "0." never snaps the plan around. */
function NumberField({ value, onCommit, unit, label, digits }: { value: number; onCommit: (v: number) => void; unit: string; label: string; digits: number }) {
  const [text, setText] = useState(value.toFixed(digits));
  useEffect(() => setText(value.toFixed(digits)), [value, digits]);
  const commit = () => {
    const v = Number(text);
    if (Number.isFinite(v) && v > 0) onCommit(v);
    else setText(value.toFixed(digits));
  };
  return (
    <label className="field">
      <input
        aria-label={label}
        inputMode="decimal"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
      />
      <span>{unit}</span>
    </label>
  );
}

export function Plan() {
  const { set, m } = useWorkspace();
  const { hybrid, plan, prep } = m;
  const [lo, hi] = m.capRange;
  const freeCap = useMemo(() => lowestFreeCap(prep, hybrid, m.peakLimitMW), [prep, hybrid, m.peakLimitMW]);
  const points = useMemo(() => frontier(prep, hybrid, m.peakLimitMW, lo, 28), [prep, hybrid, m.peakLimitMW, lo]);
  const setCap = (gal: number) => set({ capMgd: Math.min(hi, Math.max(lo, gal)) / 1e6 });
  const cut = 1 - plan.maxDayGal / hybrid.maxDayGal;
  const wetDays = (d: Float64Array) => d.reduce((n, v) => n + (v > 1 ? 1 : 0), 0);
  const infeasible = plan.infeasibleDays.length;
  const short = hybrid.annualGal - plan.annualGal > hybrid.annualGal * 0.001;
  const presets = [
    { label: `Record share, ${mgd(m.defaultCapGal)}`, gal: m.defaultCapGal },
    { label: `Lowest at no cost, ${mgd(freeCap)}`, gal: Math.ceil(freeCap / 1e4) * 1e4 },
    { label: "No cap", gal: hi },
  ];
  const fill = ((m.capGal - lo) / (hi - lo)) * 100;

  return (
    <div className="page">
      <PageHeader
        title="Plan"
        meta={
          <>
            <span>Hour-by-hour wet and dry schedule under a daily cap</span>
            <span className="meta-sep" />
            <span className="dim">
              {m.campus.name}, against the adiabatic hybrid's {mgal(hybrid.annualGal)} M gal a year
            </span>
          </>
        }
        actions={
          <Button variant="primary" icon={<FileText />} onClick={() => set({ view: "condition" })}>
            Draft the condition
          </Button>
        }
      />

      <div className="grid grid--plan">
        <Card title="Constraints" meta="The plan re-solves the year as you move them">
          <div className="ctrl">
            <div className="ctrl__head">
              <span className="ctrl__label">Daily cap</span>
              <span className="ctrl__hint">Arrow keys nudge</span>
            </div>
            <NumberField label="Daily cap in million gallons" value={m.capGal / 1e6} digits={2} unit="MGD" onCommit={(v) => setCap(v * 1e6)} />
            <input
              className="range"
              type="range"
              aria-label="Daily cap"
              min={lo}
              max={hi}
              step={1e4}
              value={m.capGal}
              style={{ "--fill": `${fill}%` } as React.CSSProperties}
              onChange={(e) => setCap(Number(e.target.value))}
            />
            <div className="ctrl__ends">
              <span>{mgd(lo)}</span>
              <span>Hybrid worst day {mgd(hi)}</span>
            </div>
            <div className="presets">
              {presets.map((p) => (
                <button key={p.label} type="button" className={cx("preset", Math.abs(p.gal - m.capGal) < 5e3 && "is-on")} onClick={() => setCap(p.gal)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="ctrl">
            <div className="ctrl__head">
              <span className="ctrl__label">Peak limit</span>
              <button type="button" className="preset" onClick={() => set({ peakMW: null })}>
                Match hybrid
              </button>
            </div>
            <NumberField label="Peak power limit in megawatts" value={m.peakLimitMW} digits={1} unit="MW" onCommit={(v) => set({ peakMW: v })} />
            <span className="ctrl__hint">No hour may draw more. The hybrid peaks at {hybrid.peakMW.toFixed(1)} MW.</span>
          </div>
          <div className="ctrl">
            <dl className="rows">
              <Row label="Annual water">{mgal(hybrid.annualGal)} M gal, held</Row>
              <Row label="Wet days">
                {wetDays(hybrid.daily)} <span className="arrow">→</span> {wetDays(plan.daily)}
              </Row>
            </dl>
          </div>
          <div className={cx("status-line", (infeasible > 0 || short) && "is-alarm")} role="status">
            {infeasible > 0 || short ? <AlertTriangle /> : <CheckCircle2 />}
            {infeasible > 0
              ? `× ${infeasible} day${infeasible > 1 ? "s" : ""} need more than the cap to hold the peak limit`
              : short
                ? `× Cap too tight to spend the year's water: ${mgal(hybrid.annualGal - plan.annualGal)} M gal unused, more power drawn`
                : "Every day holds the cap and every hour the peak limit"}
          </div>
        </Card>

        <div className="stack">
          <KpiStrip cols={5}>
            <Kpi tone="amber" label="Worst day" value={mgd(plan.maxDayGal)} unit="MGD" sub={`${pctChange(hybrid.maxDayGal, plan.maxDayGal)} vs ${mgd(hybrid.maxDayGal)}`} subTone="amber" />
            <Kpi label="Annual water" value={mgal(plan.annualGal)} unit="M gal" sub={short ? `${pctChange(hybrid.annualGal, plan.annualGal)} vs hybrid` : "Same as hybrid"} />
            <Kpi label="Electricity" value={signed(plan.annualMWh - hybrid.annualMWh)} unit="MWh/yr" sub={`${int(plan.annualMWh)} MWh total`} />
            <Kpi
              label="Peak power"
              value={plan.peakMW.toFixed(1)}
              unit="MW"
              sub={plan.peakMW <= hybrid.peakMW + 0.05 ? `No higher than ${hybrid.peakMW.toFixed(1)}` : `${signed(plan.peakMW - hybrid.peakMW, 1)} MW vs hybrid`}
              subTone={plan.peakMW > hybrid.peakMW + 0.05 ? "alarm" : undefined}
            />
            <Kpi label="CO₂" value={signed(plan.co2Tons - hybrid.co2Tons)} unit="t/yr" sub="vs hybrid, eGRID2023" />
          </KpiStrip>

          <Card
            title="Daily cooling water, hybrid and plan"
            meta={`The cap cuts the worst day by ${Math.round(cut * 100)}% and spends the same water on cooler days, where it still saves power.`}
            actions={
              <div className="legend">
                <span>
                  <i className="swatch" style={{ background: "var(--ghost)" }} />
                  Hybrid
                </span>
                <span>
                  <i className="swatch" style={{ background: "var(--amber)" }} />
                  Max Day plan
                </span>
              </div>
            }
          >
            <YearBars
              year={m.year}
              before={hybrid.daily}
              after={plan.daily}
              capGal={m.capGal}
              beforeLabel="Hybrid"
              label={`Daily cooling water for 2025. Hybrid worst day ${mgd(hybrid.maxDayGal)} MGD; with the plan ${mgd(plan.maxDayGal)} MGD under a ${mgd(m.capGal)} MGD cap.`}
            />
          </Card>
        </div>
      </div>

      <div className="grid grid--half">
        <Card title={`Hybrid's worst day by hour, ${dateLabel(m.year, hybrid.maxDay)}`} meta="Dashed is the hybrid; amber is the plan. Water moves to the hours that save the most power per gallon.">
          <DayHours
            day={hybrid.maxDay}
            temps={prep.t}
            peakLimitMW={m.peakLimitMW}
            series={[
              { label: "Hybrid", water: hybrid.water, power: hybrid.power, tone: "ghost" },
              { label: "Plan", water: plan.water, power: plan.power, tone: "amber" },
            ]}
            label={`Hourly water and power on ${dateLabel(m.year, hybrid.maxDay)}, hybrid against the plan.`}
          />
        </Card>
        <Card title="Cost of a cap" meta={`Each point re-plans the year. Caps down to ${mgd(freeCap)} MGD cost no electricity against the hybrid.`}>
          <Frontier
            points={points}
            hybridMaxGal={hybrid.maxDayGal}
            hybridMWh={hybrid.annualMWh}
            current={plan}
            label={`Frontier of worst-day water against annual electricity. Lowest cap at no extra electricity: ${mgd(freeCap)} MGD.`}
          />
        </Card>
      </div>

      <Footnote>
        Modeled, not measured. The optimizer is a fractional knapsack per day under a peak-power floor: provably optimal for this model. Water budget held to the hybrid's so the comparison is like for like.
      </Footnote>
    </div>
  );
}
