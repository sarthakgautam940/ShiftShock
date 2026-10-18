import "./pages-am.css";
import { useState, type KeyboardEvent } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { Design } from "../../engine/plant";
import type { Result } from "../../engine/run";
import { cx } from "../../kit/cx";
import { Sparkline } from "../charts/Sparkline";
import { fixed, int, mgal, mgd, shortDate } from "../format";
import { DESIGNS, headroom } from "../model";
import { Card, PageHeader, Props, Segmented } from "../primitives";
import { useWorkspace } from "../workspace";

interface Line {
  id: Design | "plan";
  name: string;
  rule: string;
  r: Result;
  headroomGal: number;
}

type Col = "worst" | "avg" | "peaking" | "annual" | "mwh" | "peak" | "co2" | "headroom";

const peaking = (r: Result) => (r.avgDayGal > 0 ? r.maxDayGal / r.avgDayGal : NaN);

const VALUE: Record<Col, (l: Line) => number> = {
  worst: (l) => l.r.maxDayGal,
  avg: (l) => l.r.avgDayGal,
  peaking: (l) => peaking(l.r),
  annual: (l) => l.r.annualGal,
  mwh: (l) => l.r.annualMWh,
  peak: (l) => l.r.peakMW,
  co2: (l) => l.r.co2Tons,
  headroom: (l) => l.headroomGal,
};

const COLS: { id: Col; label: string; unit: string }[] = [
  { id: "worst", label: "Worst day", unit: "MGD" },
  { id: "avg", label: "Average", unit: "MGD" },
  { id: "peaking", label: "Peaking", unit: "ratio" },
  { id: "annual", label: "Annual", unit: "M gal" },
  { id: "mwh", label: "Energy", unit: "MWh/yr" },
  { id: "peak", label: "Peak", unit: "MW" },
  { id: "co2", label: "CO₂", unit: "t/yr" },
  { id: "headroom", label: "Headroom", unit: "MGD" },
];

export function Compare() {
  const { s, set, m } = useWorkspace();
  const [sort, setSort] = useState<{ col: Col; dir: 1 | -1 } | null>(null);
  const [scale, setScale] = useState<"shared" | "own">("shared");

  const lines: Line[] = [
    ...DESIGNS.map((d) => ({ id: d.id, name: d.label, rule: d.id === "hybrid" ? `Wet above ${m.prep.params.switchC} °C` : d.rule, r: m.designs[d.id], headroomGal: headroom(m.designs[d.id].maxDayGal, s.richmondDown) })),
    {
      id: "plan" as const,
      name: "Optimized plan",
      rule: `Cap ${mgd(m.capGal)} MGD, peak ${fixed(m.peakLimitMW)} MW`,
      r: m.plan,
      headroomGal: headroom(m.plan.maxDayGal, s.richmondDown),
    },
  ];

  const rows = sort
    ? [...lines].sort((a, b) => {
        const va = VALUE[sort.col](a), vb = VALUE[sort.col](b);
        // Undefined ratios (a dry plant has no average day) always sink to the bottom.
        if (Number.isNaN(va)) return 1;
        if (Number.isNaN(vb)) return -1;
        return (va - vb) * sort.dir;
      })
    : lines;

  const sharedMax = Math.max(...lines.map((l) => l.r.maxDayGal));

  const toggle = (col: Col) =>
    setSort((cur) => (!cur || cur.col !== col ? { col, dir: -1 } : cur.dir === -1 ? { col, dir: 1 } : null));

  const open = (l: Line) => (l.id === "plan" ? set({ view: "plan" }) : set({ design: l.id, view: "overview" }));
  const onKey = (e: KeyboardEvent, l: Line) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open(l);
    }
  };

  const head = (c: (typeof COLS)[number]) => {
    const on = sort?.col === c.id;
    const Icon = !on ? ArrowUpDown : sort.dir === -1 ? ArrowDown : ArrowUp;
    return (
      <th key={c.id} className="r" aria-sort={on ? (sort.dir === -1 ? "descending" : "ascending") : "none"}>
        <button type="button" className={cx("sort", on && "is-on")} onClick={() => toggle(c.id)}>
          <span className="cmp-th">
            <span>{c.label}</span>
            <span className="cmp-unit">{c.unit}</span>
          </span>
          <Icon aria-hidden="true" className={cx(!on && "sort__idle")} />
        </button>
      </th>
    );
  };

  return (
    <div className="page">
      <PageHeader
        title="Compare designs"
        meta={
          <Props
            items={[
              { k: "Campus", v: m.campus.name },
              { k: "IT load", v: `${m.campus.mw.toLocaleString("en-US")} MW` },
              { k: "County supply", v: s.richmondDown ? <span className="cmp-alarm">× {mgd(m.supply, 3)} MGD, Richmond down</span> : `${mgd(m.supply, 3)} MGD` },
              { k: "Basis", v: "Modeled on KOFP 2025 weather" },
            ]}
          />
        }
        actions={
          <Segmented
            size="sm"
            label="Sparkline scale"
            value={scale}
            onChange={setScale}
            options={[
              { id: "shared", label: "Shared scale", title: "Every row on the tallest worst day" },
              { id: "own", label: "Own scale", title: "Each row on its own worst day" },
            ]}
          />
        }
      />

      <Card flush title="Designs and plan" meta="Select a row to open it">
        <div className="cmp-scroll">
          <table className="table cmp">
            <thead>
              <tr>
                <th>
                  <span className="cmp-th">
                    <span>Design</span>
                    <span className="cmp-unit">rule</span>
                  </span>
                </th>
                {head(COLS[0]!)}
                {COLS.slice(1).map(head)}
                <th>
                  <span className="cmp-th">
                    <span>2025</span>
                    <span className="cmp-unit">daily water</span>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => {
                const r = l.r;
                const dry = r.maxDayGal <= 0;
                const ratio = peaking(r);
                const short = l.headroomGal < 0;
                const isPlan = l.id === "plan";
                const current = l.id === s.design;
                return (
                  <tr
                    key={l.id}
                    className={cx("is-link", isPlan && "cmp-plan")}
                    tabIndex={0}
                    onClick={() => open(l)}
                    onKeyDown={(e) => onKey(e, l)}
                    aria-label={isPlan ? "Open the optimized plan" : `Open ${l.name} on the overview`}
                  >
                    <td>
                      <div className="cmp-name">
                        {l.name}
                        {current && <span className="cmp-current">Shown</span>}
                      </div>
                      <div className="cmp-rule tnum">{l.rule}</div>
                    </td>
                    <td className="r">
                      <div className={cx("cmp-strong", isPlan && "cmp-amber")}>{mgd(r.maxDayGal)}</div>
                      <div className="cmp-rule">{dry ? "None" : shortDate(m.year, r.maxDay)}</div>
                    </td>
                    <td className="r">{mgd(r.avgDayGal, 3)}</td>
                    <td className="r">{Number.isNaN(ratio) ? <span className="cmp-dim">n/a</span> : `${fixed(ratio)}×`}</td>
                    <td className="r">{mgal(r.annualGal)}</td>
                    <td className="r">{int(r.annualMWh)}</td>
                    <td className="r">{fixed(r.peakMW)}</td>
                    <td className="r">{int(r.co2Tons)}</td>
                    <td className={cx("r", short && "cmp-short")}>
                      {short ? `× ${mgd(-l.headroomGal)} short` : mgd(l.headroomGal)}
                    </td>
                    <td className="cmp-spark">
                      <Sparkline
                        values={r.daily}
                        max={scale === "shared" ? sharedMax : r.maxDayGal}
                        mark={dry ? null : r.maxDay}
                        label={dry ? `${l.name}: no cooling water in 2025` : `${l.name}: daily water in 2025, worst day ${mgd(r.maxDayGal)} MGD on ${shortDate(m.year, r.maxDay)}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
