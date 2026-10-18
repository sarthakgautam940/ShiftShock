import "./pages-am.css";
import type { ReactNode } from "react";
import { Check, ExternalLink } from "lucide-react";
import { GAL_PER_MWH, KG_PER_GAL, LATENT_MJ_PER_KG } from "../../engine/psychro";
import { CO2_LB_PER_MWH } from "../../engine/run";
import { int, shortDate } from "../format";
import { Card, PageHeader, Props, Row, Tag } from "../primitives";
import { useWorkspace } from "../workspace";

const SECTIONS = [
  { id: "data", label: "Data" },
  { id: "model", label: "Model" },
  { id: "assumptions", label: "Assumptions" },
  { id: "optimizer", label: "Optimizer" },
  { id: "tests", label: "Tests" },
  { id: "sources", label: "Sources" },
  { id: "limits", label: "Limits" },
];

/** The engine's suite, by file. Kept beside the code it names; `npm test` runs every one. */
const TESTS: { file: string; names: string[] }[] = [
  {
    file: "engine.test.ts",
    names: [
      "Matches Stull's worked example: 20 °C at 50% is about 13.7 °C wet-bulb",
      "Never exceeds dry-bulb and meets it near saturation",
      "Evaporating water carries off about 0.39 gal per kWh",
      "Adds blowdown at 5 cycles: makeup is evaporation × 5/4",
      "Applies each design's rule for the wet share",
      "Reproduces the public record: a 100 MW tower's worst day is about 1.2 to 1.3 MGD",
      "Never lets a day exceed the cap or an hour exceed the peak limit",
      "Spends exactly the hybrid's annual water",
      "A higher cap never raises electricity",
      "A tighter peak limit never lowers water use on the worst hours",
      "Beats random feasible reallocations of the same water on a day (greedy is optimal)",
      "Locks the headline: the worst day falls at least 40% at the same water and peak",
      "Runs a full year fast enough for a live slider",
    ],
  },
  {
    file: "sweep.test.ts",
    names: [
      "Spans from the low cap to the hybrid's own worst day",
      "Never reaches a worst day above the cap it was given",
      "Only gets cheaper as the cap loosens",
      "Flags caps too tight to spend the year's water",
      "Lowest no-cost cap: costs no electricity at the cap and some just below it",
    ],
  },
  {
    file: "rigPlan.test.ts",
    names: [
      "Never pours past the cap line",
      "Keeps every hour at or above its peak-power floor",
      "Leaves the hybrid's cup over the line on its worst day",
    ],
  },
  {
    file: "plantDay.test.ts",
    names: [
      "Has 24 valid hours in both tables",
      "Scales the hybrid's worst day to about 415 mL and the cap to about 242 mL",
      "Keeps the floors inside the cap, so the rig's cap is feasible",
      "Writes rig/plant-day.json",
    ],
  },
];

const SOURCES: { title: string; by: string; date: string; use: string; href: string }[] = [
  {
    title: "ASOS archive, station OFP",
    by: "Iowa Environmental Mesonet",
    date: "2025 hourly",
    use: "Measured temperature and humidity at Hanover County Municipal Airport",
    href: "https://mesonet.agron.iastate.edu/request/download.phtml",
  },
  {
    title: "Wet-bulb temperature from relative humidity and air temperature",
    by: "Stull, J. Appl. Meteor. Climatol. 50(11)",
    date: "2011",
    use: "Wet-bulb formula",
    href: "https://doi.org/10.1175/JAMC-D-11-0143.1",
  },
  {
    title: "eGRID2023, SRVC subregion",
    by: "U.S. EPA",
    date: "2025",
    use: "593.4 lb CO₂ per MWh",
    href: "https://www.epa.gov/egrid/download-data",
  },
  {
    title: "Iron Horse gets Planning Commission backing",
    by: "12 On Your Side",
    date: "Aug 21, 2026",
    use: "Up to 1.2 MGD on the record; 5 to 2 recommendation",
    href: "https://www.12onyourside.com/2026/08/21/iron-horse-data-center-proposal-gets-planning-commissions-backing-despite-public-opposition/",
  },
  {
    title: "Hanover votes down Mountain Road data center",
    by: "12 On Your Side",
    date: "May 28, 2026",
    use: "900 MW campus, denied 4 to 3",
    href: "https://www.12onyourside.com/2026/05/28/hanover-county-officials-vote-down-controversial-data-center-proposal/",
  },
  {
    title: "Executive Order 22 on data centers",
    by: "12 On Your Side",
    date: "Sep 18, 2026",
    use: "Cooling water scarcity area east of I-95; closed loop allowed",
    href: "https://www.12onyourside.com/2026/09/18/watch-live-spanberger-address-data-centers-ai/",
  },
  {
    title: "Report to the General Assembly, SD6",
    by: "Virginia DEQ",
    date: "2026",
    use: "Water budget model for large cooling systems is future work",
    href: "https://rga.lis.virginia.gov/Published/2026/SD6/PDF",
  },
  {
    title: "Data Centers in Virginia",
    by: "JLARC",
    date: "Dec 2024",
    use: "Statewide data center water use, 2023",
    href: "https://jlarc.virginia.gov/landing-2024-data-centers-in-virginia.asp",
  },
  {
    title: "Final after-action assessment, water plant failure",
    by: "City of Richmond",
    date: "2025",
    use: "January 6, 2025 outage behind the Richmond-down stress test",
    href: "https://rva.gov/press-releases-and-announcements/news/city-richmond-releases-final-after-action-assessment-report",
  },
];

function Eq({ label, children, note }: { label: string; children: ReactNode; note?: ReactNode }) {
  return (
    <div className="eq-row">
      <div className="eq-label">{label}</div>
      <div className="eq">{children}</div>
      {note && <div className="eq-note">{note}</div>}
    </div>
  );
}

export function Method() {
  const { m } = useWorkspace();
  const w = m.weather;
  const p = m.prep.params;
  const testCount = TESTS.reduce((n, g) => n + g.names.length, 0);
  // 1.2 MGD fully evaporated: gallons × kg per gallon × MJ per kg over a day of seconds.
  const recordMW = (1.2e6 * KG_PER_GAL * LATENT_MJ_PER_KG) / 86400;

  const params: { name: string; value: ReactNode; detail: string; type: "Planning assumption" | "Standard" | "Measured" }[] = [
    { name: "Heat per MW of IT load", value: `${p.kHeat}`, detail: "k_heat: IT plus electrical losses and fans", type: "Planning assumption" },
    { name: "Latent share η", value: `${p.etaBase} + ${p.etaSlope} × (T_w − 15)`, detail: "Share of heat leaving as evaporation, clamped 0.6 to 1", type: "Planning assumption" },
    { name: "Cycles, cooling tower", value: `${p.cycles}`, detail: "Blowdown is evaporation ÷ (N − 1)", type: "Planning assumption" },
    { name: "Cycles, closed loop", value: `${p.closedCycles}`, detail: "Closed-circuit spray water recirculates longer", type: "Planning assumption" },
    { name: "Base power P_base", value: `${p.pBaseMW} MW`, detail: "Fans, pumps and the wet-mode chiller baseline", type: "Planning assumption" },
    { name: "Dry COP", value: `max(${p.copDryMin}, ${p.copDry0} − ${p.copDrySlope} × T)`, detail: "Falls with dry-bulb temperature", type: "Planning assumption" },
    { name: "Wet COP", value: `max(${p.copWetMin}, ${p.copWet0} − ${p.copWetSlope} × T_w)`, detail: "Falls with wet-bulb temperature", type: "Planning assumption" },
    { name: "Hybrid switch", value: `${p.switchC} °C`, detail: "The adiabatic hybrid runs wet above this dry-bulb", type: "Planning assumption" },
    { name: "Latent heat h_fg", value: `${LATENT_MJ_PER_KG} MJ/kg`, detail: "Water near 25 °C; 3.785 kg per gallon", type: "Standard" },
    { name: "Grid CO₂ rate", value: `${CO2_LB_PER_MWH} lb/MWh`, detail: "EPA eGRID2023, SRVC subregion", type: "Standard" },
    { name: "Temperature and humidity", value: "8,760 h", detail: `${w.station}, ${w.year}, hourly`, type: "Measured" },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Data and method"
        meta={
          <Props
            items={[
              { k: "Weather", v: "Measured, KOFP 2025" },
              { k: "Plant", v: "Modeled, planning assumptions" },
              { k: "Optimizer", v: "Fractional knapsack, provably optimal" },
            ]}
          />
        }
      />

      <div className="mth">
        <nav className="mth-toc" aria-label="On this page">
          <div className="mth-toc__title">On this page</div>
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#m-${s.id}`} onClick={(e) => {
              e.preventDefault();
              document.getElementById(`m-${s.id}`)?.scrollIntoView({ block: "start" });
            }}>
              {s.label}
            </a>
          ))}
        </nav>

        <div className="stack">
          <div id="m-data" className="mth-anchor">
            <Card title="Data" meta="Measured. Everything downstream is modeled.">
              <dl className="rows">
                <Row label="Station">
                  {w.station}, {w.name}
                </Row>
                <Row label="Source">
                  <a className="mth-link" href="https://mesonet.agron.iastate.edu/request/download.phtml" target="_blank" rel="noreferrer">
                    {w.source}
                  </a>
                </Row>
                <Row label="Period">{w.year}, 8,760 hours, America/New_York</Row>
                <Row label="Measured">Air temperature and relative humidity</Row>
                <Row label="Filled hours">
                  {w.filledHours} h <span className="mth-dim">short gaps, linear interpolation</span>
                </Row>
                <Row label="Long gaps">
                  <span className="mth-gaps">
                    {w.longGaps.map(([start, len]) => (
                      <span key={start} className="tnum">
                        {shortDate(w.year, Math.floor(start / 24))}, {len} h
                      </span>
                    ))}
                  </span>
                </Row>
              </dl>
            </Card>
          </div>

          <div id="m-model" className="mth-anchor">
            <Card title="Model" meta="Every hour of the year runs through one chain">
              <div className="eqs">
                <Eq label="Wet-bulb" note="Stull 2011, valid RH 5 to 99%, T −20 to 50 °C">
                  <var>T</var><sub>w</sub> = <i>f</i>(<var>T</var>, <var>RH</var>)
                </Eq>
                <Eq label="Heat to reject">
                  <var>Q</var> = <var>k</var><sub>heat</sub> × <var>P</var><sub>IT</sub>
                </Eq>
                <Eq label="Water when wet" note="gallons in the hour; w is the wet share chosen">
                  <var>E</var> = <var>w</var> × <var>η</var> × 3600 <var>Q</var> ÷ (<var>h</var><sub>fg</sub> × 3.785)
                </Eq>
                <Eq label="Blowdown">
                  <var>B</var> = <var>E</var> ÷ (<var>N</var> − 1)
                </Eq>
                <Eq label="Makeup from the utility">
                  <var>M</var> = <var>E</var> + <var>B</var>
                </Eq>
                <Eq label="Power a wet hour saves">
                  Δ<var>P</var> = <var>Q</var> (1 ÷ COP<sub>dry</sub>(<var>T</var>) − 1 ÷ COP<sub>wet</sub>(<var>T</var><sub>w</sub>))
                </Eq>
                <Eq label="Power drawn">
                  <var>P</var> = <var>P</var><sub>IT</sub> + <var>P</var><sub>base</sub> + (1 − <var>w</var>) Δ<var>P</var>
                </Eq>
                <Eq label="Carbon" note="EPA eGRID2023, SRVC">
                  CO<sub>2</sub> = {CO2_LB_PER_MWH} lb/MWh × Σ <var>P</var>
                </Eq>
              </div>
              <div className="mth-checks">
                <div className="mth-check">
                  <span className="mth-check__num tnum">{(GAL_PER_MWH / 1000).toFixed(2)} gal</span>
                  <span className="mth-dim">rejects 1 kWh of heat by evaporation</span>
                </div>
                <div className="mth-check">
                  <span className="mth-check__num tnum">{Math.round(recordMW)} MW</span>
                  <span className="mth-dim">of heat if 1.2 MGD fully evaporates</span>
                </div>
              </div>
            </Card>
          </div>

          <div id="m-assumptions" className="mth-anchor">
            <Card title="Assumptions" meta="Planning values, calibrated so a 100 MW tower reproduces the 1.2 MGD record" flush>
              <div className="mth-scroll">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Parameter</th>
                      <th>Value</th>
                      <th>Basis</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {params.map((x) => (
                      <tr key={x.name}>
                        <td className="mth-strong">{x.name}</td>
                        <td className="tnum">{x.value}</td>
                        <td className="mth-dim">{x.detail}</td>
                        <td>
                          <Tag>{x.type}</Tag>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div id="m-optimizer" className="mth-anchor">
            <Card title="Optimizer" meta="This year re-plans in about 3 ms">
              <div className="eqs">
                <Eq label="Objective" note="kWh saved across the year">
                  maximize Σ <var>w</var><sub>h</sub> <var>b</var><sub>h</sub>
                </Eq>
                <Eq label="Daily cap">
                  Σ<sub>h in day</sub> <var>w</var><sub>h</sub> <var>a</var><sub>h</sub> ≤ <var>C</var>
                </Eq>
                <Eq label="Annual budget" note="held to the hybrid's water">
                  Σ<sub>h in year</sub> <var>w</var><sub>h</sub> <var>a</var><sub>h</sub> ≤ <var>W</var>
                </Eq>
                <Eq label="Peak floor" note="an hour that would breach the peak limit dry must run partly wet">
                  <var>w</var><sub>min</sub> = max(0, (<var>P</var><sub>IT</sub> + <var>P</var><sub>base</sub> + Δ<var>P</var> − <var>P</var><sub>lim</sub>) ÷ Δ<var>P</var>) ≤ <var>w</var><sub>h</sub> ≤ 1
                </Eq>
              </div>
              <ol className="mth-steps">
                <li>
                  <b>Floors first.</b> Spend the water each hour needs to hold the peak limit. A day whose floors alone pass the cap is reported as infeasible.
                </li>
                <li>
                  <b>Rank.</b> Order the remaining hours by <var>b</var> ÷ <var>a</var>, kilowatt-hours saved per gallon.
                </li>
                <li>
                  <b>Fill.</b> Give water to the best hour first, until its day reaches the cap or the year's budget is spent.
                </li>
              </ol>
              <p className="mth-proof">
                <b>Why it is optimal.</b> Each hour trades gallons for kilowatt-hours at a fixed rate, so this is a fractional knapsack. Exchange argument: moving a gallon from a
                better-rate hour to a worse one can only save less. The daily caps sit inside one annual budget, a laminar family of constraints, so filling best-first
                stays optimal at every level. A test checks the result against random reallocations of the same water.
              </p>
            </Card>
          </div>

          <div id="m-tests" className="mth-anchor">
            <Card title="Tests" meta={`${testCount} tests, Vitest, run on every build`}>
              <div className="mth-tests">
                {TESTS.map((g) => (
                  <div key={g.file} className="mth-tests__group">
                    <div className="mth-tests__file">{g.file}</div>
                    <ul>
                      {g.names.map((n) => (
                        <li key={n}>
                          <Check aria-hidden="true" />
                          <span>{n}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div id="m-sources" className="mth-anchor">
            <Card title="Sources" meta="Read October 15 to 18, 2026">
              <ul className="mth-sources">
                {SOURCES.map((x) => (
                  <li key={x.href}>
                    <a href={x.href} target="_blank" rel="noreferrer" className="mth-source">
                      <span className="mth-source__title">
                        {x.title}
                        <ExternalLink aria-hidden="true" />
                      </span>
                      <span className="mth-dim">
                        {x.by}, {x.date}
                      </span>
                    </a>
                    <span className="mth-source__use">{x.use}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div id="m-limits" className="mth-anchor">
            <Card title="Limits">
              <ul className="mth-limits">
                <li>County figures are system totals, not zone hydraulics; zone capacities are not public.</li>
                <li>No water chemistry beyond cycles of concentration; drift is neglected.</li>
                <li>Plant parameters are planning assumptions, not a vendor's data sheet.</li>
                <li>Richmond plant down is a stress test: the January 6, 2025 failure, moved to the worst day of summer.</li>
                <li>The drafted condition is for discussion, not legal advice.</li>
                <li className="tnum">
                  A {int(m.campus.mw)} MW campus is modeled at constant IT load every hour of {w.year}.
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
