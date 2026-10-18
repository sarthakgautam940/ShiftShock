/**
 * A year of daily values as a filled step area, about 120 × 28. The y scale is
 * passed in so rows of a table can share one: a cooling tower then reads tall
 * and steady, a hybrid low with summer spikes.
 */
export function Sparkline({
  values,
  max,
  mark,
  width = 120,
  height = 28,
  label,
}: {
  values: ArrayLike<number>;
  max: number;
  /** Index to mark with an amber tick (the worst day), or null. */
  mark: number | null;
  width?: number;
  height?: number;
  label: string;
}) {
  const n = values.length;
  const top = max > 0 ? max : 1;
  const x = (i: number) => (i / n) * width;
  const y = (v: number) => height - (Math.max(0, v) / top) * (height - 2);
  let d = `M0 ${height}`;
  for (let i = 0; i < n; i++) d += ` L${x(i).toFixed(2)} ${y(values[i]!).toFixed(2)} L${x(i + 1).toFixed(2)} ${y(values[i]!).toFixed(2)}`;
  d += ` L${width} ${height} Z`;
  const mx = mark === null ? null : x(mark + 0.5);
  return (
    <svg className="spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <line x1={0} x2={width} y1={height - 0.5} y2={height - 0.5} className="spark__base" />
      <path d={d} className="spark__area" />
      {mx !== null && <rect x={mx - 1} y={0} width={2} height={height} className="spark__mark" />}
    </svg>
  );
}
