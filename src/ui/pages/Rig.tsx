import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import rigDay from "../../../rig/plant-day.json";
import type { PlantDay } from "../../engine/plantDay";
import { hybridRigDay, planRigDay } from "../../engine/rigPlan";
import { hourLabel, int } from "../format";
import { Button, Card, PageHeader, Props, Segmented, Stat, StatPanel } from "../primitives";

const DAY = rigDay as PlantDay;
const W = 760, H = 250, L = 56, R = 14, T = 14, B = 24;

interface RigState {
  state: string;
  hour: number;
  heat: boolean;
  hybridMl: number;
  maxdayMl: number;
  capMl: number;
  valves: { hybrid: boolean; maxday: boolean };
}

/** Running total of the cup, in millilitres, at the end of each hour. */
function cumulative(w: number[], aMl: number[]): number[] {
  let sum = 0;
  return w.map((x, i) => (sum += x * aMl[i]!));
}

/**
 * Polls the Pi controller's /state. A browser only allows this when the app itself
 * is served over plain http (the presenting laptop's preview, or the Pi), so the
 * HTTPS site explains that instead of failing quietly.
 */
function LiveRig() {
  const httpPage = window.location.protocol === "http:";
  const [host, setHost] = useState("10.42.0.1");
  const [on, setOn] = useState(false);
  const [live, setLive] = useState<RigState | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!on) return;
    let stop = false;
    const tick = async () => {
      try {
        const res = await fetch(`http://${host}:8000/state`, { signal: AbortSignal.timeout(1500) });
        const body = (await res.json()) as RigState;
        if (!stop) {
          setLive(body);
          setErr(null);
        }
      } catch {
        if (!stop) setErr(`No answer from ${host}:8000.`);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [on, host]);

  if (!httpPage)
    return (
      <p className="rig-note">
        Mirroring the rig needs the app served over http on the presenting laptop (<b>npm run preview</b>, then open <b>http://localhost:4173</b>) or from the Pi itself. The rig runs on its own either way.
      </p>
    );
  return (
    <div className="rig-live">
      <form
        className="custom-form"
        onSubmit={(e) => {
          e.preventDefault();
          setOn(!on);
        }}
      >
        <label className="field">
          <input aria-label="Raspberry Pi address" value={host} onChange={(e) => setHost(e.target.value)} />
          <span>:8000</span>
        </label>
        <Button variant={on ? "secondary" : "primary"} type="submit">
          {on ? "Disconnect" : "Connect"}
        </Button>
      </form>
      {err && <p className="rig-note is-alarm">× {err}</p>}
      {live && (
        <dl className="rows">
          <div className="row">
            <dt>State</dt>
            <dd>
              {live.state}, {hourLabel(live.hour)}
              {live.heat ? ", heat wave" : ""}
            </dd>
          </div>
          <div className="row">
            <dt>Hybrid cup</dt>
            <dd>
              {int(live.hybridMl)} mL{live.valves.hybrid ? ", pouring" : ""}
            </dd>
          </div>
          <div className="row row--amber">
            <dt>Plan cup</dt>
            <dd>
              {int(live.maxdayMl)} of {live.capMl} mL{live.valves.maxday ? ", pouring" : ""}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}

export function Rig() {
  const [heat, setHeat] = useState<"normal" | "heat">("normal");
  const hours = heat === "heat" ? DAY.heatWave.hours : DAY.normal.hours;
  const aMl = hours.map((x) => x.aMl);
  const wHybrid = hybridRigDay(hours);
  const wPlan = planRigDay(hours, DAY.capMl);
  const cHybrid = cumulative(wHybrid, aMl);
  const cPlan = cumulative(wPlan, aMl);
  const endHybrid = cHybrid[23]!, endPlan = cPlan[23]!;
  const top = Math.ceil(Math.max(endHybrid, DAY.capMl) / 100) * 100;
  const band = (W - L - R) / 24;
  const x = (i: number) => L + i * band;
  const y = (v: number) => T + (H - T - B) * (1 - v / top);
  const step = (c: number[]) => c.map((v, i) => `${i ? "" : `M${x(0)},${y(0)}`}L${x(i)},${y(i ? c[i - 1]! : 0)}L${x(i + 1)},${y(v)}`).join("");
  const capMgd = ((DAY.capMl * DAY.galPerMl) / 1e6).toFixed(2);
  const date = new Date(`${DAY.date}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });

  return (
    <div className="page">
      <PageHeader
        title="Model plant"
        meta={
          <Props
            items={[
              { k: "Campus", v: "Iron Horse" },
              { k: "Day", v: date },
              { k: "Scale", v: `1 mL = ${int(DAY.galPerMl)} gal` },
              { k: "Basis", v: "Modeled, same engine as the app" },
            ]}
          />
        }
        actions={
          <Segmented
            label="Day"
            value={heat}
            onChange={setHeat}
            options={[
              { id: "normal", label: "Measured day" },
              { id: "heat", label: `Heat wave +${DAY.heatWave.deltaC} °C` },
            ]}
          />
        }
      />

      <StatPanel>
        <Stat
          tone={endHybrid > DAY.capMl ? "alarm" : undefined}
          label="Hybrid cup"
          value={int(endHybrid)}
          unit="mL"
          delta={endHybrid > DAY.capMl ? `× +${int(endHybrid - DAY.capMl)} over` : "under"}
          deltaTitle="Against the cap line"
        />
        <Stat tone="amber" label="Plan cup" value={int(endPlan)} unit="mL" delta="holds" deltaTitle="Against the cap line" />
        <Stat label="Cap line" value={DAY.capMl} unit="mL" delta={`${capMgd} MGD`} deltaTitle="At full scale" />
        <Stat label="Peak limit" value={DAY.peakLimitMW.toFixed(1)} unit="MW" />
      </StatPanel>

      <div className="grid grid--main">
        <Card title="Cups through the day" meta="Poured by the end of each hour; the plan straw closes at the line">
          <div className="chart">
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Hybrid cup ends at ${int(endHybrid)} mL, plan cup at ${int(endPlan)} mL against a ${DAY.capMl} mL line.`}>
              {[0, top / 2, top].map((t) => (
                <g key={t}>
                  <line className="gridline" x1={L} x2={W - R} y1={y(t)} y2={y(t)} />
                  <text x={L - 8} y={y(t) + 4} textAnchor="end">
                    {t === top ? `${t} mL` : t}
                  </text>
                </g>
              ))}
              <line x1={L} x2={W - R} y1={y(DAY.capMl)} y2={y(DAY.capMl)} stroke="var(--alarm)" strokeDasharray="5 4" shapeRendering="crispEdges" />
              <text x={L + 6} y={y(DAY.capMl) - 6} className="lbl-alarm">
                Cap line {DAY.capMl} mL
              </text>
              <path d={step(cHybrid)} fill="none" stroke="var(--text-secondary)" strokeWidth={2} strokeDasharray="4 3" />
              <path d={step(cPlan)} fill="none" stroke="var(--amber)" strokeWidth={2.5} />
              <text x={W - R} y={y(endHybrid) - 8} textAnchor="end" className="lbl-strong">
                Hybrid {int(endHybrid)} mL
              </text>
              <text x={W - R} y={y(endPlan) + 18} textAnchor="end" className="lbl-amber">
                Plan {int(endPlan)} mL
              </text>
              {[0, 6, 12, 18, 23].map((i) => (
                <text key={i} x={x(i) + band / 2} y={H - 4} textAnchor="middle">
                  {hourLabel(i)}
                </text>
              ))}
            </svg>
          </div>
        </Card>
        <Card title="Live rig" meta="The Pi's own state, once a second">
          <LiveRig />
          <div className="rig-wire">
            <Radio />
            <span>Pi hotspot MaxDay, controller at 10.42.0.1:8000</span>
          </div>
        </Card>
      </div>

      <Card title="Valve schedule" meta="Share of each hour the straw is open">
        <div className="valves" role="table" aria-label="Valve schedule by hour">
          {[
            { label: "Hybrid", w: wHybrid, tone: "ghost" },
            { label: "Plan", w: wPlan, tone: "amber" },
          ].map((row) => (
            <div className="valves__row" role="row" key={row.label}>
              <span className="valves__label" role="rowheader">
                {row.label}
              </span>
              {row.w.map((v, i) => (
                <span key={i} role="cell" className="valves__cell" title={`${hourLabel(i)}, ${hours[i]!.tempC} °C: open ${Math.round(v * 100)}%`}>
                  <i className={`valves__fill valves__fill--${row.tone}`} style={{ height: `${Math.round(v * 100)}%` }} />
                </span>
              ))}
            </div>
          ))}
          <div className="valves__row valves__row--axis" aria-hidden="true">
            <span className="valves__label">°C</span>
            {hours.map((hr) => (
              <span key={hr.h} className="valves__temp">
                {Math.round(hr.tempC)}
              </span>
            ))}
          </div>
        </div>
      </Card>

    </div>
  );
}
