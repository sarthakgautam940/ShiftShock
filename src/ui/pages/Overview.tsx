import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Calendar } from "../charts/Calendar";
import { CountyStack } from "../charts/CountyStack";
import { DayHours } from "../charts/DayHours";
import { DailyStrip } from "../charts/DailyStrip";
import { DESIGNS, designLabel, headroom } from "../model";
import { dateLabel, int, mgal, mgd, pctChange, signed } from "../format";
import { Button, Card, Footnote, Kpi, KpiStrip, PageHeader, Row, Segmented, Switch, Tag } from "../primitives";
import { useWorkspace } from "../workspace";

export function Overview() {
  const { s, set, m } = useWorkspace();
  const r = m.shown;
  const isDry = r.maxDayGal <= 0;
  const date = isDry ? "None" : dateLabel(m.year, r.maxDay);
  const room = headroom(r.maxDayGal, s.richmondDown);
  const vsTower = s.design !== "tower";
  const highs = useMemo(() => {
    const out: number[] = [];
    for (let d = 0; d < 365; d++) {
      let hi = -Infinity;
      for (let h = d * 24; h < d * 24 + 24; h++) hi = Math.max(hi, m.prep.t[h]!);
      out.push(hi);
    }
    return out;
  }, [m.prep]);
  const cut = 1 - m.plan.maxDayGal / m.hybrid.maxDayGal;

  return (
    <div className="page">
      <PageHeader
        title={m.campus.name}
        meta={
          <>
            <span className="tnum">{m.campus.mw.toLocaleString("en-US")} MW IT load</span>
            <span className="meta-sep" />
            <span className="dim">{m.campus.site}</span>
            <Tag>{m.campus.status}</Tag>
          </>
        }
        actions={
          <Segmented
            label="Cooling design"
            value={s.design}
            onChange={(design) => set({ design })}
            options={DESIGNS.map((d) => ({ id: d.id, label: d.short, title: `${d.label}: ${d.rule}` }))}
          />
        }
      />

      <KpiStrip>
        <Kpi
          tone="amber"
          label="Worst day"
          value={mgd(r.maxDayGal)}
          unit="MGD"
          sub={vsTower && !isDry ? `${date}, ${pctChange(m.tower.maxDayGal, r.maxDayGal)} vs tower` : date}
        />
        <Kpi label="Average day" value={mgd(r.avgDayGal, 3)} unit="MGD" sub={vsTower ? `${pctChange(m.tower.avgDayGal, r.avgDayGal)} vs tower` : "365 days of 2025"} />
        <Kpi label="Worst to average" value={isDry ? "n/a" : (r.maxDayGal / r.avgDayGal).toFixed(1)} unit={isDry ? undefined : "×"} sub="Peaking factor" />
        <Kpi
          tone={room < 0 ? "alarm" : undefined}
          label="County headroom"
          value={mgd(Math.abs(room))}
          unit="MGD"
          sub={room < 0 ? `× short on the worst day` : `of ${mgd(m.supply, 3)} MGD supply`}
          subTone={room < 0 ? "alarm" : undefined}
        />
        <Kpi label="Peak power" value={r.peakMW.toFixed(1)} unit="MW" sub={vsTower ? `${signed(r.peakMW - m.tower.peakMW, 1)} MW vs tower` : "Highest hour of 2025"} />
        <Kpi label="Annual water" value={mgal(r.annualGal)} unit="M gal" sub={vsTower ? `${pctChange(m.tower.annualGal, r.annualGal)} vs tower` : `${int(r.annualMWh)} MWh a year`} />
      </KpiStrip>

      <div className="grid grid--main">
        <Card
          title="Cooling water by day, 2025"
          meta={isDry ? "A dry plant uses no cooling water; it pays in power instead." : `${designLabel(s.design)}, each day on its own scale. Worst day ${date}, ${mgd(r.maxDayGal)} MGD.`}
          actions={
            <div className="legend">
              <span className="legend-scale" aria-hidden="true">
                <i style={{ background: "var(--heat-0)" }} />
                <i style={{ background: "color-mix(in srgb, var(--text-primary) 30%, transparent)" }} />
                <i style={{ background: "color-mix(in srgb, var(--text-primary) 60%, transparent)" }} />
                <i style={{ background: "color-mix(in srgb, var(--text-primary) 88%, transparent)" }} />
              </span>
              <span>
                <i className="swatch" style={{ background: "var(--amber)" }} />
                Worst day
              </span>
            </div>
          }
        >
          <Calendar
            year={m.year}
            daily={r.daily}
            maxDay={r.maxDay}
            highs={highs}
            label={`Calendar of 2025 cooling water for ${designLabel(s.design)}. Worst day ${date}, ${mgd(r.maxDayGal)} million gallons; average ${mgd(r.avgDayGal, 3)}.`}
          />
          <div className="strip-gap" />
          <DailyStrip
            year={m.year}
            daily={r.daily}
            maxDay={r.maxDay}
            avgGal={r.avgDayGal}
            label={`Daily cooling water across 2025 with the average day marked: worst day ${mgd(r.maxDayGal)} MGD against an average of ${mgd(r.avgDayGal, 3)} MGD.`}
          />
        </Card>

        <Card
          title={`Hanover system${isDry ? "" : ` on ${date}`}`}
          meta={s.richmondDown ? "Stress test: Richmond's January 2025 failure, on the worst day" : "Suburban supply against peak use plus the campus"}
        >
          <div className={`headroom${room < 0 ? " is-alarm" : ""}`}>
            <span className="headroom__num">
              {room < 0 ? "× " : ""}
              {mgd(Math.abs(room))}
            </span>
            <span className="headroom__unit">MGD {room < 0 ? "short" : "headroom"}</span>
          </div>
          <CountyStack campusGal={r.maxDayGal} campusName={m.campus.name} richmondDown={s.richmondDown} />
          <div style={{ marginTop: 14 }}>
            <Switch checked={s.richmondDown} onChange={(v) => set({ richmondDown: v })} label="Richmond plant down" />
          </div>
        </Card>
      </div>

      <div className="grid grid--main">
        <Card
          title={isDry ? "Hottest day by hour" : `Worst day by hour, ${date}`}
          meta={`${designLabel(s.design)}. Water and power peak in the same afternoon hours.`}
        >
          <DayHours
            day={isDry ? m.hybrid.maxDay : r.maxDay}
            temps={m.prep.t}
            series={[{ label: DESIGNS.find((d) => d.id === s.design)!.short, water: r.water, power: r.power, tone: "amber" }]}
            label={`Hourly cooling water and power on ${date}.`}
          />
        </Card>

        <Card className="plan-card" title="Max Day plan" meta={`Against the adiabatic hybrid, cap ${mgd(m.capGal)} MGD`}>
          <div className="plan-card__big">
            <span className="plan-card__pct">{signed(-cut * 100)}%</span>
            <span className="plan-card__what">worst day</span>
          </div>
          <dl className="rows">
            <Row label="Worst day" tone="amber">
              {mgd(m.hybrid.maxDayGal)}
              <span className="arrow">→</span>
              {mgd(m.plan.maxDayGal)} MGD
            </Row>
            <Row label="Annual water">
              {Math.abs(m.plan.annualGal - m.hybrid.annualGal) < 1e5 ? "Same, " : ""}
              {mgal(m.plan.annualGal)} M gal
            </Row>
            <Row label="Peak power">
              {m.plan.peakMW <= m.hybrid.peakMW + 0.05 ? "No higher, " : ""}
              {m.plan.peakMW.toFixed(1)} MW
            </Row>
            <Row label="Electricity">{signed(m.plan.annualMWh - m.hybrid.annualMWh)} MWh/yr</Row>
          </dl>
          <Button variant="primary" onClick={() => set({ view: "plan" })}>
            Open the plan
            <ArrowRight />
          </Button>
        </Card>
      </div>

      <Footnote>
        Modeled, not measured. Hourly weather measured at {m.weather.name} ({m.weather.station}), {m.year}. County figures: Hanover suburban supply 24.775 MGD, peak use about 11.7 MGD.
      </Footnote>
    </div>
  );
}
