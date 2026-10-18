/** Bars under a cap line: the worst day kept below a limit, with the headroom left between them. */
const BARS = [
  { x: 6, top: 12.5 },
  { x: 10.5, top: 8.5 },
  { x: 15, top: 11 },
];

export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="mark">
      <rect width="24" height="24" rx="6.5" fill="var(--text-primary)" />
      {BARS.map((b) => (
        <path key={b.x} d={`M${b.x} 18.5V${b.top + 1.5}A1.5 1.5 0 0 1 ${b.x + 3} ${b.top + 1.5}V18.5Z`} fill="var(--bg-canvas)" />
      ))}
      <line x1="5" y1="6.2" x2="19" y2="6.2" stroke="#EFA23A" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
