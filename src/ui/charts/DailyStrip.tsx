import { MONTHS, Tip, TipRow, monthStarts, usePointer } from "./kit";
import { dateLabel, mgd } from "../format";

const W = 876, H = 112, L = 30, T = 14, B = 18;

/**
 * The same year as a profile, with the average day drawn across it: the one
 * picture of why a county sized on the average is surprised by the peak.
 */
export function DailyStrip({ year, daily, maxDay, avgGal, label }: { year: number; daily: Float64Array; maxDay: number; avgGal: number; label: string }) {
  const { x, onMove, onLeave } = usePointer(W);
  const n = daily.length;
  const top = Math.max(daily[maxDay]!, 1);
  const bw = (W - L) / n;
  const y = (v: number) => T + (H - T - B) * (1 - v / top);
  const day = x === null ? null : Math.min(n - 1, Math.max(0, Math.floor((x - L) / bw)));
  const starts = monthStarts(year);
  const ratio = avgGal > 0 ? daily[maxDay]! / avgGal : 0;

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} onMouseMove={onMove} onMouseLeave={onLeave}>
        {starts.map((s, i) => (
          <line key={MONTHS[i]} className="gridline" x1={L + s * bw} x2={L + s * bw} y1={T} y2={H - B} />
        ))}
        {Array.from(daily, (v, d) =>
          v > 0 ? (
            <rect key={d} x={L + d * bw} y={y(v)} width={Math.max(1, bw - 0.5)} height={y(0) - y(v)} fill={d === maxDay ? "var(--amber)" : "var(--ghost)"} />
          ) : null,
        )}
        <line className="axis" x1={L} x2={W} y1={y(0)} y2={y(0)} />
        {avgGal > 0 && (
          <g>
            <line x1={L} x2={W} y1={y(avgGal)} y2={y(avgGal)} stroke="var(--text-primary)" strokeDasharray="4 3" shapeRendering="crispEdges" />
            <text x={L + 4} y={y(avgGal) - 5} className="lbl-strong">
              Average day {mgd(avgGal, 3)} MGD
            </text>
          </g>
        )}
        {daily[maxDay]! > 0 && (
          <text x={L + maxDay * bw + (maxDay > n * 0.7 ? -6 : 6)} y={T + 4} textAnchor={maxDay > n * 0.7 ? "end" : "start"} className="lbl-amber">
            {mgd(daily[maxDay]!)} MGD, {ratio.toFixed(1)}× the average
          </text>
        )}
        {starts.map((s, i) => (
          <text key={`t${MONTHS[i]}`} x={L + s * bw + 2} y={H - 4}>
            {MONTHS[i]}
          </text>
        ))}
        {day !== null && <line className="crosshair" x1={L + day * bw + bw / 2} x2={L + day * bw + bw / 2} y1={T} y2={y(0)} />}
      </svg>
      {day !== null && (
        <Tip x={L + day * bw} y={y(Math.max(daily[day]!, top * 0.4))} w={W} h={H}>
          <div className="tip__title">{dateLabel(year, day, true)}</div>
          <TipRow label="Cooling water" value={`${mgd(daily[day]!, 3)} MGD`} tone={day === maxDay ? "amber" : undefined} />
          <TipRow label="Vs average day" value={avgGal > 0 ? `${(daily[day]! / avgGal).toFixed(1)}×` : "n/a"} />
        </Tip>
      )}
    </div>
  );
}
