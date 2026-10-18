import { Tip, TipRow, ticks, usePointer } from "./kit";
import { mgd } from "../format";

const W = 420, H = 230, L = 40, R = 10, T = 14, B = 26;

/**
 * A duration curve, the utility planner's view of a year: every day sorted from
 * the most water to the least. A flat curve is a plant that drinks steadily; a
 * cliff is one that saves its water for the few days a county can least spare.
 */
export function Duration({ daily, avgGal, label }: { daily: Float64Array; avgGal: number; label: string }) {
  const { x, onMove, onLeave } = usePointer(W);
  const sorted = Array.from(daily).sort((a, b) => b - a);
  const n = sorted.length;
  const total = sorted.reduce((s, v) => s + v, 0);
  const top10 = sorted.slice(0, 10).reduce((s, v) => s + v, 0);
  const wet = sorted.filter((v) => v > 0).length;
  const yt = ticks(Math.max(sorted[0]! / 1e6, 0.01), 3);
  const yTop = yt[yt.length - 1]! * 1e6;
  const sx = (i: number) => L + (i / (n - 1)) * (W - L - R);
  const sy = (v: number) => T + (H - T - B) * (1 - v / yTop);
  const line = sorted.map((v, i) => `${i ? "L" : "M"}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join("");
  const area = `${line}L${sx(n - 1)},${sy(0)}L${sx(0)},${sy(0)}Z`;
  const i = x === null ? null : Math.min(n - 1, Math.max(0, Math.round(((x - L) / (W - L - R)) * (n - 1))));

  return (
    <div className="duration">
      <div className="duration__facts">
        <div>
          <b className="tnum">{total > 0 ? Math.round((top10 / total) * 100) : 0}%</b>
          <span>of the year's water on its 10 worst days</span>
        </div>
        <div>
          <b className="tnum">{wet}</b>
          <span>days draw any water</span>
        </div>
      </div>
      <div className="chart">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} onMouseMove={onMove} onMouseLeave={onLeave}>
          {yt.map((t) => (
            <g key={t}>
              <line className="gridline" x1={L} x2={W - R} y1={sy(t * 1e6)} y2={sy(t * 1e6)} />
              <text x={L - 6} y={sy(t * 1e6) + 4} textAnchor="end">
                {t}
              </text>
            </g>
          ))}
          <path d={area} fill="var(--amber)" opacity={0.16} />
          <path d={line} fill="none" stroke="var(--amber)" strokeWidth={2} strokeLinejoin="round" />
          {avgGal > 0 && (
            <g>
              <line x1={L} x2={W - R} y1={sy(avgGal)} y2={sy(avgGal)} stroke="var(--text-secondary)" strokeDasharray="4 3" shapeRendering="crispEdges" />
              <text x={W - R} y={sy(avgGal) - 5} textAnchor="end" className="lbl-strong">
                Average {mgd(avgGal, 3)}
              </text>
            </g>
          )}
          {[1, 100, 200, 300, 365].map((d) => (
            <text key={d} x={sx(d - 1)} y={H - 8} textAnchor={d === 1 ? "start" : d === 365 ? "end" : "middle"}>
              {d === 1 ? "Day 1" : d}
            </text>
          ))}
          {i !== null && <line className="crosshair" x1={sx(i)} x2={sx(i)} y1={T} y2={sy(0)} />}
          {i !== null && <circle cx={sx(i)} cy={sy(sorted[i]!)} r={3.5} fill="var(--text-primary)" pointerEvents="none" />}
        </svg>
        {i !== null && (
          <Tip x={sx(i)} y={sy(sorted[i]!)} w={W} h={H}>
            <div className="tip__title">{i === 0 ? "Worst day" : `${i + 1}th worst day`}</div>
            <TipRow label="Cooling water" value={`${mgd(sorted[i]!, 3)} MGD`} tone="amber" />
            <TipRow label="Vs average" value={avgGal > 0 ? `${(sorted[i]! / avgGal).toFixed(1)}×` : "n/a"} />
          </Tip>
        )}
      </div>
    </div>
  );
}
