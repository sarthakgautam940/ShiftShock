import type { FrontierPoint } from "../../engine/sweep";
import { Tip, TipRow, ticks, usePointer } from "./kit";
import { mgd, signed } from "../format";

const W = 520, H = 260, L = 56, R = 16, T = 16, B = 34;

/**
 * The cost of a cap. Each point is a full-year re-plan: how low the worst day
 * goes (x) against the electricity it costs or saves versus the hybrid rule (y).
 * Flat means free; the knee is where water starts being bought back with power.
 */
export function Frontier({
  points,
  hybridMaxGal,
  hybridMWh,
  current,
  label,
}: {
  points: FrontierPoint[];
  hybridMaxGal: number;
  hybridMWh: number;
  current: { maxDayGal: number; annualMWh: number };
  label: string;
}) {
  const { x, onMove, onLeave } = usePointer(W);
  const full = points.filter((p) => !p.budgetShort);
  const shown = full.length ? full : points;
  const xMin = shown[0]!.maxDayGal, xMax = hybridMaxGal;
  const dy = (p: { annualMWh: number }) => p.annualMWh - hybridMWh;
  let yLo = Math.min(0, dy(current)), yHi = Math.max(0, dy(current));
  for (const p of shown) {
    yLo = Math.min(yLo, dy(p));
    yHi = Math.max(yHi, dy(p));
  }
  const span = Math.max(10, yHi - yLo);
  yLo -= span * 0.08;
  yHi += span * 0.12;
  const sx = (g: number) => L + ((g - xMin) / (xMax - xMin || 1)) * (W - L - R);
  const sy = (v: number) => T + (1 - (v - yLo) / (yHi - yLo)) * (H - T - B);
  const yt = (() => {
    const t = ticks(yHi - yLo, 4);
    const step = t[1] ?? 1;
    const out: number[] = [];
    for (let v = Math.ceil(yLo / step) * step; v <= yHi; v += step) out.push(Number(v.toPrecision(8)));
    return out;
  })();
  const xt = ticks(xMax / 1e6, 4).map((t) => t * 1e6).filter((g) => g >= xMin - 1 && g <= xMax + 1);
  const path = shown.map((p, i) => `${i ? "L" : "M"}${sx(p.maxDayGal).toFixed(1)},${sy(dy(p)).toFixed(1)}`).join("");
  const area = `${path}L${sx(shown[shown.length - 1]!.maxDayGal).toFixed(1)},${sy(yLo).toFixed(1)}L${sx(shown[0]!.maxDayGal).toFixed(1)},${sy(yLo).toFixed(1)}Z`;

  let near: FrontierPoint | null = null;
  if (x !== null) {
    let best = Infinity;
    for (const p of shown) {
      const d = Math.abs(sx(p.maxDayGal) - x);
      if (d < best) {
        best = d;
        near = p;
      }
    }
  }
  const cx = sx(Math.min(xMax, Math.max(xMin, current.maxDayGal))), cy = sy(dy(current));

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} onMouseMove={onMove} onMouseLeave={onLeave}>
        {yt.map((t) => (
          <g key={t}>
            <line className="gridline" x1={L} x2={W - R} y1={sy(t)} y2={sy(t)} />
            <text x={L - 8} y={sy(t) + 4} textAnchor="end">
              {signed(t)}
            </text>
          </g>
        ))}
        {xt.map((g) => (
          <text key={g} x={sx(g)} y={H - 16} textAnchor="middle">
            {mgd(g)}
          </text>
        ))}
        <text x={(L + W - R) / 2} y={H - 1} textAnchor="middle">
          Worst day, MGD
        </text>
        <text x={L - 8} y={T - 4} textAnchor="end">
          MWh/yr
        </text>
        <line x1={L} x2={W - R} y1={sy(0)} y2={sy(0)} stroke="var(--text-tertiary)" strokeDasharray="3 3" shapeRendering="crispEdges" />
        <path d={area} fill="var(--text-primary)" opacity={0.04} />
        <path d={path} fill="none" stroke="var(--text-secondary)" strokeWidth={1.75} strokeLinejoin="round" />
        <circle cx={sx(hybridMaxGal)} cy={sy(0)} r={4.5} fill="var(--bg-surface)" stroke="var(--text-secondary)" strokeWidth={1.5} />
        <text x={sx(hybridMaxGal) - 8} y={sy(0) + 16} textAnchor="end">
          Hybrid rule
        </text>
        <circle cx={cx} cy={cy} r={6} fill="var(--amber)" stroke="var(--bg-surface)" strokeWidth={2} />
        <text x={cx} y={cy + 22 < H - B - 2 ? cy + 22 : cy - 12} textAnchor="middle" className="lbl-amber">
          This plan
        </text>
        {near && <line className="crosshair" x1={sx(near.maxDayGal)} x2={sx(near.maxDayGal)} y1={T} y2={H - B} />}
        {near && <circle cx={sx(near.maxDayGal)} cy={sy(dy(near))} r={3.5} fill="var(--text-primary)" pointerEvents="none" />}
      </svg>
      {near && (
        <Tip x={sx(near.maxDayGal)} y={sy(dy(near))} w={W} h={H}>
          <div className="tip__title">Cap {mgd(near.capGal)} MGD</div>
          <TipRow label="Worst day" value={`${mgd(near.maxDayGal)} MGD`} />
          <TipRow label="Electricity vs hybrid" value={`${signed(dy(near))} MWh`} />
          <TipRow label="Annual water" value={`${(near.annualGal / 1e6).toFixed(1)} M gal`} />
        </Tip>
      )}
    </div>
  );
}
