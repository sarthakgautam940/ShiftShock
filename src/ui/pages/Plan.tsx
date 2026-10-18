import "./plan.css";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import { frontier, lowestFreeCap } from "../../engine/sweep";
import { DayHours } from "../charts/DayHours";
import { Frontier } from "../charts/Frontier";
import { YearBars } from "../charts/YearBars";
import { cx } from "../../kit/cx";
import { dateLabel, fixed, mgal, mgd, pctChange, signed } from "../format";
import { Button, Card, PageHeader, Props, Segmented, Stat, StatPanel } from "../primitives";
import { useWorkspace } from "../workspace";

/** A number field that only commits finite values, so typing "0." never snaps the plan around. */
function NumberField({ value, onCommit, unit, label, digits, big }: { value: number; onCommit: (v: number) => void; unit: string; label: string; digits: number; big?: boolean }) {
  const [text, setText] = useState(value.toFixed(digits));
  useEffect(() => setText(value.toFixed(digits)), [value, digits]);
  const commit = () => {
    const v = Number(text);
    if (Number.isFinite(v) && v > 0) onCommit(v);
    else setText(value.toFixed(digits));
  };
  return (
    <label className={cx("field", big && "field--big")}>
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

type Preset = "record" | "free" | "none" | "custom";

export function Plan() {
  const { set, m } = useWorkspace();
  const { hybrid, plan, prep } = m;
  const [lo, hi] = m.capRange;
  const freeCap = useMemo(() => lowestFreeCap(prep, hybrid, m.peakLimitMW), [prep, hybrid, m.peakLimitMW]);
  const points = useMemo(() => frontier(prep, hybrid, m.peakLimitMW, lo, 28), [prep, hybrid, m.peakLimitMW, lo]);
  const setCap = (gal: number) => set({ capMgd: Math.min(hi, Math.max(lo, gal)) / 1e6 });
  const wetDays = (d: Float64Array) => d.reduce((n, v) => n + (v > 1 ? 1 : 0), 0);
  const infeasible = plan.infeasibleDays.length;
  const short = hybrid.annualGal - plan.annualGal > hybrid.annualGal * 0.001;
  const presetGal: Record<Exclude<Preset, "custom">, number> = {
    record: m.defaultCapGal,
    free: Math.ceil(freeCap / m.capStep) * m.capStep,
    none: hi,
  };
  const preset: Preset = (Object.keys(presetGal) as Exclude<Preset, "custom">[]).find((k) => Math.abs(presetGal[k] - m.capGal) < m.capStep / 2) ?? "custom";
  const fill = hi > lo ? ((m.capGal - lo) / (hi - lo)) * 100 : 100;
  const peakSame = plan.peakMW <= hybrid.peakMW + 0.05;

  return (
    <div className="page">
      <PageHeader
        title="Plan"
        meta={
          <Props
            items={[
              { k: "Campus", v: m.campus.name },
              { k: "Baseline", v: "Adiabatic hybrid" },
              { k: "Annual water", v: `${mgal(hybrid.annualGal)} M gal, held` },
              { k: "Basis", v: "Modeled on KOFP 2025 weather" },
            ]}
          />
        }
        actions={
          <Button variant="primary" icon={<FileText />} onClick={() => set({ view: "condition" })}>
            Draft the condition
          </Button>
        }
      />

      <section className="ctrlbar" aria-label="Plan constraints">
        <div className="ctrlbar__cap">
          <span className="ctrlbar__label">Daily cap</span>
          <NumberField big label="Daily cap in million gallons" value={m.capGal / 1e6} digits={m.capStep < 1e4 ? 4 : 2} unit="MGD" onCommit={(v) => setCap(v * 1e6)} />
          <input
            className="range"
            type="range"
            aria-label="Daily cap"
            title="Arrow keys nudge"
            min={lo}
            max={hi}
            step={m.capStep}
            value={m.capGal}
            style={{ "--fill": `${fill}%` } as React.CSSProperties}
            onChange={(e) => setCap(Number(e.target.value))}
          />
          <div className="ctrl__ends">
            <span>{mgd(lo)}</span>
            <span>Hybrid worst day {mgd(hybrid.maxDayGal)}</span>
          </div>
        </div>
        <div className="ctrlbar__group">
          <span className="ctrlbar__label">Presets</span>
          <Segmented<Preset>
            size="sm"
            label="Cap presets"
            value={preset}
            onChange={(p) => p !== "custom" && setCap(presetGal[p])}
            options={[
              { id: "record", label: `Record share ${mgd(presetGal.record)}`, title: "The record's 0.52 of 0.89, scaled to this campus" },
              { id: "free", label: `No-cost ${mgd(presetGal.free)}`, title: "Lowest cap that costs no electricity against the hybrid" },
              { id: "none", label: "No cap", title: "The hybrid's own worst day" },
            ]}
          />
        </div>
        <div className="ctrlbar__group">
          <span className="ctrlbar__label">
            Peak limit
            <button type="button" className="ctrlbar__link" onClick={() => set({ peakMW: null })} disabled={m.peakLimitMW === hybrid.peakMW}>
              Match hybrid
            </button>
          </span>
          <NumberField label="Peak power limit in megawatts" value={m.peakLimitMW} digits={1} unit="MW" onCommit={(v) => set({ peakMW: v })} />
        </div>
        <div className="ctrlbar__group">
          <span className="ctrlbar__label">Status</span>
          <span className={cx("statuschip", (infeasible > 0 || short) && "is-alarm")} role="status">
            {infeasible > 0 || short ? <AlertTriangle /> : <CheckCircle2 />}
            {infeasible > 0 ? `× ${infeasible} day${infeasible > 1 ? "s" : ""} infeasible` : short ? "× Budget unspent" : "Feasible every day"}
          </span>
        </div>
      </section>

      <StatPanel>
        <Stat tone="amber" label="Worst day" value={mgd(plan.maxDayGal)} unit="MGD" delta={pctChange(hybrid.maxDayGal, plan.maxDayGal)} deltaTitle="vs adiabatic hybrid" />
        <Stat label="Annual water" value={mgal(plan.annualGal)} unit="M gal" delta={short ? pctChange(hybrid.annualGal, plan.annualGal) : "same"} deltaTitle="vs adiabatic hybrid" />
        <Stat label="Electricity" value={signed(plan.annualMWh - hybrid.annualMWh)} unit="MWh/yr" />
        <Stat
          tone={peakSame ? undefined : "alarm"}
          label="Peak power"
          value={fixed(plan.peakMW)}
          unit="MW"
          delta={peakSame ? "same" : signed(plan.peakMW - hybrid.peakMW, 1)}
          deltaTitle="vs adiabatic hybrid"
        />
        <Stat label="CO₂" value={signed(plan.co2Tons - hybrid.co2Tons)} unit="t/yr" />
        <Stat label="Wet days" value={`${wetDays(hybrid.daily)} → ${wetDays(plan.daily)}`} />
      </StatPanel>

      <Card
        title="Daily cooling water"
        meta="Hybrid behind, plan in front, cap as a rule"
        actions={
          <div className="legend">
            <span>
              <i className="swatch" style={{ background: "var(--ghost)" }} />
              Hybrid
            </span>
            <span>
              <i className="swatch" style={{ background: "var(--amber)" }} />
              Optimized plan
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

      <div className="grid grid--half">
        <Card title={`Worst day by hour, ${dateLabel(m.year, hybrid.maxDay)}`} meta="Water moves to the hours that save the most power">
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
        <Card title="Cost of a cap" meta={`Free down to ${mgd(freeCap)} MGD`}>
          <Frontier
            points={points}
            hybridMaxGal={hybrid.maxDayGal}
            hybridMWh={hybrid.annualMWh}
            current={plan}
            label={`Frontier of worst-day water against annual electricity. Lowest cap at no extra electricity: ${mgd(freeCap)} MGD.`}
          />
        </Card>
      </div>
    </div>
  );
}
