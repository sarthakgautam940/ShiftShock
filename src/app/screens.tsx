import type { Design } from "../engine/plant";
import { dayLabel, type Result } from "../engine/run";
import { DayChart, Legend, YearChart } from "./charts";
import { CAMPUSES, DESIGNS, HANOVER, fmtInt, fmtMgd, mgd, type Campus } from "./model";

/* ------------------------------------------------------------ controls */

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; label: string; hint?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          className="seg-item"
          title={o.hint}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Figure({ label, value, unit, note, tone }: { label: string; value: string; unit?: string; note?: string; tone?: "peak" | "quiet" | "good" }) {
  return (
    <div className="figure" data-tone={tone}>
      <span className="figure-label">{label}</span>
      <span className="figure-value">
        {value}
        {unit ? <small>{unit}</small> : null}
      </span>
      {note ? <span className="figure-note">{note}</span> : null}
    </div>
  );
}

/* ------------------------------------------------------------- the day */

export function DayScreen({
  year,
  campus,
  setCampus,
  design,
  setDesign,
  result,
  richmondDown,
  setRichmondDown,
}: {
  year: number;
  campus: Campus;
  setCampus: (id: string) => void;
  design: Design;
  setDesign: (d: Design) => void;
  result: Result;
  richmondDown: boolean;
  setRichmondDown: (v: boolean) => void;
}) {
  const ratio = result.avgDayGal > 0 ? result.maxDayGal / result.avgDayGal : 0;
  const date = dayLabel(year, result.maxDay);
  return (
    <section className="screen" aria-labelledby="s1">
      <header className="screen-head">
        <h1 id="s1">The average hides the day that matters.</h1>
        <div className="controls">
          <Segmented label="Campus" options={CAMPUSES.map((c) => ({ id: c.id, label: c.name, hint: `${fmtInt(c.mw)} MW` }))} value={campus.id} onChange={setCampus} />
          <Segmented label="Cooling design" options={DESIGNS.map((d) => ({ id: d.id, label: d.label, hint: d.rule }))} value={design} onChange={setDesign} />
        </div>
      </header>

      <div className="figures">
        <Figure label="Average day" value={fmtMgd(result.avgDayGal)} unit="MGD" tone="quiet" />
        <Figure label="Max day" value={fmtMgd(result.maxDayGal)} unit="MGD" note={result.maxDayGal > 0 ? date : "No water"} tone="peak" />
        {result.maxDayGal > 0 ? <Figure label="Max day vs average" value={ratio >= 10 ? ratio.toFixed(0) : ratio.toFixed(1)} unit="×" tone="quiet" /> : null}
        <Figure label="Peak power" value={result.peakMW.toFixed(0)} unit="MW" tone="quiet" />
      </div>

      <div className="panel">
        <div className="panel-head">
          <span>Cooling water, every day of {year}</span>
          <span className="muted">{campus.name} · {fmtInt(campus.mw)} MW · modeled on measured weather</span>
        </div>
        <YearChart
          year={year}
          front={result.daily}
          marker={result.maxDayGal > 0 ? { day: result.maxDay, text: `${date} · ${fmtMgd(result.maxDayGal)} MGD` } : undefined}
          label={`Daily cooling water for ${campus.name}. Max day ${date} at ${fmtMgd(result.maxDayGal)} million gallons, average ${fmtMgd(result.avgDayGal)}.`}
        />
      </div>

      <County maxDayGal={result.maxDayGal} richmondDown={richmondDown} setRichmondDown={setRichmondDown} />
    </section>
  );
}

function County({ maxDayGal, richmondDown, setRichmondDown }: { maxDayGal: number; richmondDown: boolean; setRichmondDown: (v: boolean) => void }) {
  const capacity = richmondDown ? HANOVER.capacity - HANOVER.richmond : HANOVER.capacity;
  const campus = mgd(maxDayGal);
  const demand = HANOVER.peakUse + campus;
  const scale = 26;
  const pct = (v: number) => `${Math.min(100, (v / scale) * 100)}%`;
  const short = demand - capacity;
  return (
    <div className="panel county">
      <div className="panel-head">
        <span>Hanover's water system on that day</span>
        <label className="toggle">
          <input type="checkbox" checked={richmondDown} onChange={(e) => setRichmondDown(e.target.checked)} />
          <span className="toggle-track" aria-hidden />
          Richmond plant down
        </label>
      </div>
      <div className="county-rows">
        <div className="county-row">
          <span className="county-label">Supply</span>
          <div className="track">
            <span className="seg-local" style={{ width: pct(HANOVER.doswell + HANOVER.henrico) }} />
            <span className="seg-richmond" data-off={richmondDown || undefined} style={{ left: pct(HANOVER.doswell + HANOVER.henrico), width: pct(HANOVER.richmond) }} />
            <span className="cap-mark" style={{ left: pct(capacity) }} />
          </div>
          <span className="county-value">{capacity.toFixed(1)} MGD</span>
        </div>
        <div className="county-row">
          <span className="county-label">Demand</span>
          <div className="track">
            <span className="seg-use" style={{ width: pct(HANOVER.peakUse) }} />
            <span className="seg-campus" style={{ left: pct(HANOVER.peakUse), width: pct(campus) }} />
            <span className="cap-mark" style={{ left: pct(capacity) }} />
          </div>
          <span className="county-value">{demand.toFixed(1)} MGD</span>
        </div>
      </div>
      <p className={short > 0 ? "county-foot bad" : "county-foot"}>
        {short > 0
          ? `× Short ${short.toFixed(1)} MGD. A stress test of January 2025's real Richmond failure, moved to July.`
          : `Peak use ${HANOVER.peakUse} MGD plus this campus's max day, against ${HANOVER.capacity} MGD of supply.`}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------- the fix */

export function FixScreen({
  year,
  hybrid,
  plan,
  capMgd,
  setCapMgd,
  capRange,
}: {
  year: number;
  hybrid: Result;
  plan: Result;
  capMgd: number;
  setCapMgd: (v: number) => void;
  capRange: [number, number];
}) {
  const cut = 1 - plan.maxDayGal / hybrid.maxDayGal;
  const dMWh = plan.annualMWh - hybrid.annualMWh;
  const worst = hybrid.maxDay;
  const hours = (r: Result) => Array.from({ length: 24 }, (_, i) => r.water[worst * 24 + i]!);
  return (
    <section className="screen" aria-labelledby="s2">
      <header className="screen-head">
        <h1 id="s2">Move the water, don't cut it.</h1>
        <p className="lede">Max Day spends water only in the hours it saves the most power, under a daily cap.</p>
      </header>

      <div className="cap-control">
        <label htmlFor="cap" className="cap-label">
          Daily cap <b>{capMgd.toFixed(2)} MGD</b>
        </label>
        <input
          id="cap"
          type="range"
          min={capRange[0]}
          max={capRange[1]}
          step={0.01}
          value={capMgd}
          onChange={(e) => setCapMgd(Number(e.target.value))}
          style={{ "--fill": `${((capMgd - capRange[0]) / (capRange[1] - capRange[0])) * 100}%` } as React.CSSProperties}
          aria-valuetext={`${capMgd.toFixed(2)} million gallons per day`}
        />
      </div>

      <div className="figures">
        <Figure label="Worst day" value={`−${Math.round(cut * 100)}`} unit="%" note={`${fmtMgd(hybrid.maxDayGal)} → ${fmtMgd(plan.maxDayGal)} MGD`} tone="peak" />
        <Figure label="Water per year" value={(plan.annualGal / 1e6).toFixed(1)} unit="M gal" note="Same as the hybrid" tone="good" />
        <Figure label="Peak power" value={plan.peakMW.toFixed(1)} unit="MW" note={plan.peakMW <= hybrid.peakMW + 0.05 ? "No higher" : "Higher"} tone="good" />
        <Figure label="Electricity per year" value={`${dMWh <= 0 ? "−" : "+"}${fmtInt(Math.abs(dMWh))}`} unit="MWh" note={dMWh <= 0 ? "Less than the hybrid" : "More than the hybrid"} tone={dMWh <= 0 ? "good" : "quiet"} />
      </div>

      <div className="panel">
        <div className="panel-head">
          <span>Every day of {year}</span>
          <Legend items={[{ tone: "ghost", text: "Hybrid" }, { tone: "front", text: "Max Day" }, { tone: "cap", text: "Cap" }]} />
        </div>
        <YearChart year={year} back={hybrid.daily} front={plan.daily} cap={capMgd * 1e6} label="Daily water, hybrid against Max Day, with the cap." />
      </div>

      <div className="panel">
        <div className="panel-head">
          <span>The worst day, {dayLabel(year, worst)}, hour by hour</span>
          <Legend items={[{ tone: "ghost", text: "Hybrid" }, { tone: "front", text: "Max Day" }]} />
        </div>
        <DayChart back={hours(hybrid)} front={hours(plan)} label="Gallons per hour on the worst day, hybrid against Max Day." />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- the rule */

export function RuleScreen({ campus, plan, hybrid, capMgd }: { campus: Campus; plan: Result; hybrid: Result; capMgd: number }) {
  const capGal = Math.round(capMgd * 1e6);
  return (
    <section className="screen" aria-labelledby="s3">
      <header className="screen-head">
        <h1 id="s3">One sentence a county can adopt.</h1>
        <button type="button" className="btn" onClick={() => window.print()}>Print</button>
      </header>
      <article className="paper">
        <p className="paper-tag">Draft condition for discussion. Not legal advice.</p>
        <h2>{campus.name} data center, cooling water</h2>
        <p className="paper-rule">
          Cooling water use shall not exceed <b>{fmtInt(capGal)} gallons</b> on any calendar day. Daily cooling water
          use shall be reported monthly. During a declared water emergency, cooling shall run in dry mode.
        </p>
        <dl className="paper-facts">
          <div><dt>Worst day, hybrid</dt><dd>{fmtMgd(hybrid.maxDayGal)} MGD</dd></div>
          <div><dt>Worst day, with the cap</dt><dd>{fmtMgd(plan.maxDayGal)} MGD</dd></div>
          <div><dt>Water per year</dt><dd>{(plan.annualGal / 1e6).toFixed(1)} M gal, unchanged</dd></div>
          <div><dt>Peak power</dt><dd>{plan.peakMW.toFixed(1)} MW, unchanged</dd></div>
        </dl>
        <p className="paper-foot">
          Modeled for a {fmtInt(campus.mw)} MW campus on measured 2025 weather at Hanover County Airport (KOFP).
          Method and sources: Max Day, How it works.
        </p>
      </article>
    </section>
  );
}
