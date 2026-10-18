import { Tip, TipRow, usePointer } from "./kit";
import { hourLabel, int } from "../format";

const W = 760, L = 84, R = 12;
const STRIP = { temp: [8, 78], water: [104, 184], power: [210, 270] } as const;
const H = 296;

/**
 * One day as three strips on a shared clock, the way an operator reads a plant:
 * outdoor temperature (with the hybrid's switch point), the water drawn each
 * hour, and the electricity. The cause sits directly above its two effects.
 */
export function DayProfile({
  day,
  t,
  tw,
  water,
  power,
  switchC,
  label,
}: {
  day: number;
  t: Float64Array;
  tw: Float64Array;
  water: Float64Array;
  power: Float64Array;
  /** Drawn when the design switches on temperature. */
  switchC?: number;
  label: string;
}) {
  const { x, onMove, onLeave } = usePointer(W);
  const h0 = day * 24;
  const hrs = Array.from({ length: 24 }, (_, i) => i);
  const band = (W - L - R) / 24;
  const cx = (i: number) => L + i * band + band / 2;
  const at = (a: Float64Array) => hrs.map((i) => a[h0 + i]!);
  const T = at(t), Tw = at(tw), Wt = at(water), P = at(power);

  const tLo = Math.floor(Math.min(...Tw, switchC ?? Infinity) - 1), tHi = Math.ceil(Math.max(...T, switchC ?? -Infinity) + 1);
  const yT = (v: number) => STRIP.temp[1] - ((v - tLo) / (tHi - tLo)) * (STRIP.temp[1] - STRIP.temp[0]);
  const wMax = Math.max(...Wt, 1);
  const yW = (v: number) => STRIP.water[1] - (v / wMax) * (STRIP.water[1] - STRIP.water[0]);
  const pLo = Math.min(...P), pHi = Math.max(...P);
  const pPad = Math.max(1, (pHi - pLo) * 0.25);
  const yP = (v: number) => STRIP.power[1] - ((v - (pLo - pPad)) / (pHi - pLo + 2 * pPad)) * (STRIP.power[1] - STRIP.power[0]);
  const path = (vals: number[], y: (v: number) => number) => vals.map((v, i) => `${i ? "L" : "M"}${cx(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const hi = x === null ? null : Math.min(23, Math.max(0, Math.floor((x - L) / band)));
  const fmtW = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : String(Math.round(v)));

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} onMouseMove={onMove} onMouseLeave={onLeave}>
        {(["temp", "water", "power"] as const).map((k) => (
          <rect key={k} x={L} y={STRIP[k][0]} width={W - L - R} height={STRIP[k][1] - STRIP[k][0]} fill="var(--text-primary)" opacity={0.025} rx={4} />
        ))}
        {(
          [
            ["temp", `${tHi} °C`, `${tLo}`],
            ["water", `${fmtW(wMax)} gal/h`, "0"],
            ["power", `${pHi.toFixed(1)} MW`, `${(pLo - pPad).toFixed(0)}`],
          ] as const
        ).map(([k, top, bottom]) => (
          <g key={k}>
            <text x={L - 8} y={STRIP[k][0] + 9} textAnchor="end" className="lbl-strong">
              {top}
            </text>
            <text x={L - 8} y={STRIP[k][1]} textAnchor="end">
              {bottom}
            </text>
          </g>
        ))}

        {switchC !== undefined && (
          <g>
            <line x1={L} x2={W - R} y1={yT(switchC)} y2={yT(switchC)} stroke="var(--text-tertiary)" strokeDasharray="3 3" shapeRendering="crispEdges" />
            <text x={L + 6} y={yT(switchC) - 4}>
              Goes wet above {switchC} °C
            </text>
          </g>
        )}
        <path d={path(Tw, yT)} fill="none" stroke="var(--text-tertiary)" strokeWidth={1.25} />
        <path d={path(T, yT)} fill="none" stroke="var(--text-primary)" strokeWidth={1.75} />

        {hrs.map((i) =>
          Wt[i]! > 0 ? <rect key={i} x={L + i * band + 3} y={yW(Wt[i]!)} width={band - 6} height={STRIP.water[1] - yW(Wt[i]!)} rx={2} fill="var(--amber)" /> : null,
        )}
        {Wt.every((v) => v <= 0) && (
          <text x={(L + W - R) / 2} y={(STRIP.water[0] + STRIP.water[1]) / 2 + 4} textAnchor="middle">
            No cooling water drawn
          </text>
        )}

        <path d={`${path(P, yP)}L${cx(23)},${STRIP.power[1]}L${cx(0)},${STRIP.power[1]}Z`} fill="var(--text-primary)" opacity={0.07} />
        <path d={path(P, yP)} fill="none" stroke="var(--text-secondary)" strokeWidth={1.75} />

        {[0, 6, 12, 18, 23].map((i) => (
          <text key={i} x={cx(i)} y={H - 4} textAnchor="middle">
            {hourLabel(i)}
          </text>
        ))}
        {hi !== null && <rect x={L + hi * band} y={STRIP.temp[0]} width={band} height={STRIP.power[1] - STRIP.temp[0]} fill="var(--text-primary)" opacity={0.06} pointerEvents="none" />}
      </svg>
      {hi !== null && (
        <Tip x={cx(hi)} y={STRIP.water[0]} w={W} h={H}>
          <div className="tip__title">{hourLabel(hi)}</div>
          <TipRow label="Dry-bulb" value={`${T[hi]!.toFixed(1)} °C`} />
          <TipRow label="Wet-bulb" value={`${Tw[hi]!.toFixed(1)} °C`} />
          <TipRow label="Water" value={`${int(Wt[hi]!)} gal`} tone="amber" />
          <TipRow label="Power" value={`${P[hi]!.toFixed(1)} MW`} />
        </Tip>
      )}
    </div>
  );
}
