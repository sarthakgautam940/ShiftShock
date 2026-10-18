import { Tip, TipRow, ticks, usePointer } from "./kit";
import { hourLabel, int } from "../format";

export interface DaySeries {
  label: string;
  water: Float64Array;
  power: Float64Array;
  tone: "amber" | "ghost";
}

const W = 640, L = 44, R = 12, TOP_H = 150, GAP = 34, PW_H = 92, B = 22;
const H = TOP_H + GAP + PW_H + B;

/**
 * One day by the hour, as two panels on a shared clock: cooling water above,
 * the campus's electrical draw below. The collision the plan has to respect is
 * visible directly: the hours that drink the most are the hours that draw the most.
 */
export function DayHours({
  day,
  series,
  temps,
  peakLimitMW,
  label,
}: {
  day: number;
  series: DaySeries[];
  temps: Float64Array;
  peakLimitMW?: number;
  label: string;
}) {
  const { x, onMove, onLeave } = usePointer(W);
  const h0 = day * 24;
  const band = (W - L - R) / 24;
  const hours = Array.from({ length: 24 }, (_, i) => i);

  let wMax = 0, pMin = Infinity, pMax = 0;
  for (const s of series)
    for (const i of hours) {
      wMax = Math.max(wMax, s.water[h0 + i]!);
      pMin = Math.min(pMin, s.power[h0 + i]!);
      pMax = Math.max(pMax, s.power[h0 + i]!);
    }
  if (peakLimitMW) pMax = Math.max(pMax, peakLimitMW);
  const wTicks = ticks(Math.max(wMax, 1), 3);
  const wTop = wTicks[wTicks.length - 1]!;
  const pLo = Math.floor(pMin - 1), pHi = Math.ceil(pMax + 1);
  const yW = (v: number) => TOP_H - (v / wTop) * (TOP_H - 26);
  const pTop = TOP_H + GAP;
  const yP = (v: number) => pTop + PW_H - ((v - pLo) / (pHi - pLo)) * PW_H;
  const hx = (i: number) => L + i * band;
  const hi = x === null ? null : Math.min(23, Math.max(0, Math.floor((x - L) / band)));
  const ghost = series.find((s) => s.tone === "ghost");
  const amber = series.find((s) => s.tone === "amber");
  const line = (s: DaySeries) => hours.map((i) => `${i ? "L" : "M"}${(hx(i) + band / 2).toFixed(1)},${yP(s.power[h0 + i]!).toFixed(1)}`).join("");

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} onMouseMove={onMove} onMouseLeave={onLeave}>
        {wTicks.map((t) => (
          <g key={t}>
            <line className="gridline" x1={L} x2={W - R} y1={yW(t)} y2={yW(t)} />
            <text x={L - 8} y={yW(t) + 4} textAnchor="end">
              {t >= 1000 ? `${t / 1000}k` : t}
            </text>
          </g>
        ))}
        <text x={L} y={10} className="lbl-strong">
          Water, gal per hour
        </text>
        {hours.map((i) => {
          const g = ghost ? ghost.water[h0 + i]! : 0;
          const a = amber ? amber.water[h0 + i]! : 0;
          const both = ghost && amber;
          return (
            <g key={i}>
              {ghost && g > 0 && <rect x={hx(i) + 2} y={yW(g)} width={band - 4} height={TOP_H - yW(g)} rx={2} fill="var(--ghost)" />}
              {amber && a > 0 && (
                <rect x={hx(i) + (both ? band * 0.28 : 2)} y={yW(a)} width={both ? band * 0.44 : band - 4} height={TOP_H - yW(a)} rx={2} fill="var(--amber)" />
              )}
            </g>
          );
        })}
        <line className="axis" x1={L} x2={W - R} y1={TOP_H} y2={TOP_H} />

        <text x={L} y={pTop - 10} className="lbl-strong">
          Power, MW
        </text>
        {[pLo, Math.round((pLo + pHi) / 2), pHi].map((t) => (
          <g key={t}>
            <line className="gridline" x1={L} x2={W - R} y1={yP(t)} y2={yP(t)} />
            <text x={L - 8} y={yP(t) + 4} textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        {peakLimitMW !== undefined && (
          <g>
            <line x1={L} x2={W - R} y1={yP(peakLimitMW)} y2={yP(peakLimitMW)} stroke="var(--text-secondary)" strokeDasharray="4 3" />
            <text x={W - R} y={yP(peakLimitMW) - 5} textAnchor="end">
              Peak limit {peakLimitMW.toFixed(1)} MW
            </text>
          </g>
        )}
        {ghost && <path d={line(ghost)} fill="none" stroke="var(--text-tertiary)" strokeWidth={1.5} strokeDasharray={amber ? "3 3" : undefined} />}
        {amber && <path d={line(amber)} fill="none" stroke="var(--amber)" strokeWidth={2} />}

        {[0, 6, 12, 18, 23].map((i) => (
          <text key={i} x={hx(i) + band / 2} y={H - 4} textAnchor="middle">
            {hourLabel(i)}
          </text>
        ))}
        {hi !== null && (
          <rect x={hx(hi)} y={0} width={band} height={pTop + PW_H} fill="var(--text-primary)" opacity={0.05} pointerEvents="none" />
        )}
      </svg>
      {hi !== null && (
        <Tip x={hx(hi) + band / 2} y={yW(Math.max(ghost?.water[h0 + hi] ?? 0, amber?.water[h0 + hi] ?? 0)) + 4} w={W} h={H}>
          <div className="tip__title">
            {hourLabel(hi)}, {temps[h0 + hi]!.toFixed(1)} °C
          </div>
          {series.map((s) => (
            <TipRow key={s.label} label={`${s.label} water`} value={`${int(s.water[h0 + hi]!)} gal`} tone={s.tone === "amber" ? "amber" : undefined} />
          ))}
          {series.map((s) => (
            <TipRow key={`${s.label}p`} label={`${s.label} power`} value={`${s.power[h0 + hi]!.toFixed(1)} MW`} />
          ))}
        </Tip>
      )}
    </div>
  );
}
