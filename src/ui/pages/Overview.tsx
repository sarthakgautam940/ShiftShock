import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Calendar, CalendarLegend } from "../charts/Calendar";
import { CountyStack } from "../charts/CountyStack";
import { DayProfile } from "../charts/DayProfile";
import { Duration } from "../charts/Duration";
import { DESIGNS, designLabel, headroom } from "../model";
import { dateLabel, mgal, mgd, pctChange, signed } from "../format";
import { Button, Card, PageHeader, Props, Segmented, Stat, StatPanel, Tag } from "../primitives";
import { useWorkspace } from "../workspace";
import { Assumptions } from "../Assumptions";

export function Overview() {
  const { s, set, m } = useWorkspace();
  const r = m.shown;
  const isDry = r.maxDayGal <= 0;
  const worst = isDry ? m.hybrid.maxDay : r.maxDay;
  const [picked, setPicked] = useState<number | null>(null);
  useEffect(() => setPicked(null), [r]);
  const day = picked ?? worst;
  const room = headroom(r.maxDayGal, s.richmondDown);
  const vsTower = s.design !== "tower" && !isDry;
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
  const date = isDry ? "None" : dateLabel(m.year, r.maxDay);

  return (
    <div className="page">
      <PageHeader
        title={
          <>
            {m.campus.name}
            <Tag>{m.campus.status}</Tag>
          </>
        }
        meta={
          <Props
            items={[
              { k: "IT load", v: `${m.campus.mw.toLocaleString("en-US")} MW` },
              { k: "Basis", v: m.campus.basis },
              { k: "Weather", v: `${m.weather.station} ${m.year}, measured` },
              { k: "Plant", v: "Modeled" },
            ]}
          />
        }
        actions={
          <>
            <Assumptions />
            <Segmented
              label="Cooling design"
              value={s.design}
              onChange={(design) => set({ design })}
              options={DESIGNS.map((d) => ({ id: d.id, label: d.short, title: `${d.label}: ${d.id === "hybrid" ? `wet above ${m.prep.params.switchC} °C` : d.rule}` }))}
            />
          </>
        }
      />

      <StatPanel
        aside={
          <div className="county-aside">
            <div className="county-aside__head">
              <span>Hanover County, worst day</span>
              <b className={room < 0 ? "is-alarm" : undefined}>{room < 0 ? `× ${mgd(-room)} MGD short` : `${mgd(room)} MGD headroom`}</b>
            </div>
            <CountyStack campusGal={r.maxDayGal} campusName={m.campus.name} richmondDown={s.richmondDown} />
          </div>
        }
      >
        <Stat label={`Worst day, ${date}`} value={mgd(r.maxDayGal)} unit="MGD" tone="amber" delta={vsTower ? pctChange(m.tower.maxDayGal, r.maxDayGal) : undefined} deltaTitle="vs cooling tower" />
        <Stat label="Average day" value={mgd(r.avgDayGal, 3)} unit="MGD" delta={vsTower ? pctChange(m.tower.avgDayGal, r.avgDayGal) : undefined} deltaTitle="vs cooling tower" />
        <Stat label="Worst to average" value={isDry ? "n/a" : (r.maxDayGal / r.avgDayGal).toFixed(1)} unit={isDry ? undefined : "×"} />
        <Stat label="Annual water" value={mgal(r.annualGal)} unit="M gal" delta={vsTower ? pctChange(m.tower.annualGal, r.annualGal) : undefined} deltaTitle="vs cooling tower" />
      </StatPanel>

      <section className="reco" aria-label="Optimized plan">
        <span className="reco__icon" aria-hidden="true">
          <Sparkles />
        </span>
        <div className="reco__text">
          <b>Cap the worst day at {mgd(m.capGal)} MGD</b>
          <span>
            Worst day <em className="tnum">{signed(-cut * 100)}%</em> against the hybrid, with the same annual water and no higher peak power.
          </span>
        </div>
        <Button variant="primary" onClick={() => set({ view: "plan" })}>
          Open plan
          <ArrowRight />
        </Button>
      </section>

      <Card title="Cooling water by day" meta={isDry ? "A dry plant draws no cooling water." : "Click a day to see its hours."} actions={<CalendarLegend daily={r.daily} maxDay={r.maxDay} />}>
        <Calendar
          year={m.year}
          daily={r.daily}
          maxDay={r.maxDay}
          selected={day}
          onSelect={setPicked}
          highs={highs}
          label={`Calendar of ${m.year} cooling water for ${designLabel(s.design)}. Worst day ${date}, ${mgd(r.maxDayGal)} million gallons; average ${mgd(r.avgDayGal, 3)}.`}
        />
      </Card>

      <div className="grid grid--main">
        <Card
          title={`${dateLabel(m.year, day, true)} by hour`}
          meta={day === worst ? (isDry ? "The hybrid's worst day, run dry" : "The worst day of the year") : "Selected day"}
          actions={
            day !== worst && (
              <Button variant="ghost" onClick={() => setPicked(null)}>
                Back to worst day
              </Button>
            )
          }
        >
          <DayProfile
            day={day}
            t={m.prep.t}
            tw={m.prep.tw}
            water={r.water}
            power={r.power}
            switchC={s.design === "hybrid" ? m.prep.params.switchC : undefined}
            label={`Temperature, cooling water and power by hour on ${dateLabel(m.year, day)}.`}
          />
        </Card>
        <Card title="Duration" meta="Every day, most water to least">
          <Duration daily={r.daily} avgGal={r.avgDayGal} label={`Days of ${m.year} sorted by cooling water for ${designLabel(s.design)}.`} />
        </Card>
      </div>
    </div>
  );
}
