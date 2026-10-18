import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { dayLabel } from "../engine/run";

export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => entry && setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

/**
 * A year as 365 daily bars. `back` draws as a quiet ghost (what the plant would
 * have done), `front` in amber (what it does). A dashed line marks a cap.
 */
export function YearChart({
  year,
  front,
  back,
  cap,
  marker,
  height = 220,
  label,
}: {
  year: number;
  front: Float64Array;
  back?: Float64Array;
  cap?: number;
  marker?: { day: number; text: string };
  height?: number;
  label: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const days = front.length;
  const top = 28, bottom = 22;
  const plotH = height - top - bottom;
  let max = 0;
  for (let d = 0; d < days; d++) max = Math.max(max, front[d]!, back ? back[d]! : 0);
  max = max * 1.05 || 1;
  const bw = width / days;
  const y = (v: number) => top + plotH - (v / max) * plotH;

  return (
    <div className="chart" ref={ref}>
      {width > 0 ? (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={label}
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setHover(Math.max(0, Math.min(days - 1, Math.floor((e.clientX - r.left) / bw))));
          }}
          onMouseLeave={() => setHover(null)}
        >
          {back
            ? Array.from(back, (v, d) => (
                <rect key={`b${d}`} x={d * bw} y={y(v)} width={Math.max(1, bw - 0.6)} height={top + plotH - y(v)} className="bar-ghost" />
              ))
            : null}
          {Array.from(front, (v, d) => (
            <rect
              key={d}
              x={d * bw + (back ? bw * 0.18 : 0)}
              y={y(v)}
              width={Math.max(1, (back ? bw * 0.64 : bw) - 0.6)}
              height={top + plotH - y(v)}
              className={marker && d === marker.day ? "bar-peak" : back ? "bar-front" : "bar-quiet"}
            />
          ))}
          {cap !== undefined ? (
            <g>
              <line x1={0} x2={width} y1={y(cap)} y2={y(cap)} className="cap-line" />
              <text x={width - 4} y={y(cap) - 6} textAnchor="end" className="cap-text">Cap</text>
            </g>
          ) : null}
          {marker ? (
            <g>
              <line x1={marker.day * bw + bw / 2} x2={marker.day * bw + bw / 2} y1={8} y2={y(front[marker.day]!) - 4} className="marker-line" />
              <text
                x={Math.min(width - 4, Math.max(4, marker.day * bw + bw / 2))}
                y={14}
                textAnchor={marker.day * bw > width * 0.8 ? "end" : marker.day * bw < width * 0.2 ? "start" : "middle"}
                className="marker-text"
              >
                {marker.text}
              </text>
            </g>
          ) : null}
          {MONTH_START.map((d, i) => (
            <text key={i} x={d * bw + 2} y={height - 6} className="axis-text">{MONTHS[i]}</text>
          ))}
          {hover !== null ? (
            <g pointerEvents="none">
              <line x1={hover * bw + bw / 2} x2={hover * bw + bw / 2} y1={top - 6} y2={top + plotH} className="hover-line" />
            </g>
          ) : null}
        </svg>
      ) : (
        <div style={{ height }} />
      )}
      {hover !== null ? (
        <div className="tip" style={{ left: Math.min(width - 150, Math.max(0, hover * bw - 75)) }}>
          <b>{dayLabel(year, hover)}</b>
          <span>{(front[hover]! / 1e6).toFixed(2)} MGD{back ? ` · was ${(back[hover]! / 1e6).toFixed(2)}` : ""}</span>
        </div>
      ) : null}
    </div>
  );
}

/** The worst day's 24 hours, side by side: ghost for the hybrid, amber for Max Day. */
export function DayChart({ back, front, label, height = 180 }: { back: number[]; front: number[]; label: string; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const top = 10, bottom = 22;
  const plotH = height - top - bottom;
  const max = Math.max(1, ...back, ...front) * 1.08;
  const slot = width / 24;
  const y = (v: number) => top + plotH - (v / max) * plotH;
  return (
    <div className="chart" ref={ref}>
      {width > 0 ? (
        <svg width={width} height={height} role="img" aria-label={label}>
          {back.map((v, h) => (
            <rect key={`b${h}`} x={h * slot + slot * 0.12} y={y(v)} width={slot * 0.38} height={top + plotH - y(v)} rx={1.5} className="bar-ghost" />
          ))}
          {front.map((v, h) => (
            <rect key={h} x={h * slot + slot * 0.5} y={y(v)} width={slot * 0.38} height={top + plotH - y(v)} rx={1.5} className="bar-front" />
          ))}
          {[0, 6, 12, 18].map((h) => (
            <text key={h} x={h * slot + 2} y={height - 6} className="axis-text">
              {h === 0 ? "12 AM" : h === 12 ? "12 PM" : h < 12 ? `${h} AM` : `${h - 12} PM`}
            </text>
          ))}
        </svg>
      ) : (
        <div style={{ height }} />
      )}
    </div>
  );
}

export function Legend({ items }: { items: { tone: "ghost" | "front" | "peak" | "cap"; text: ReactNode }[] }) {
  return (
    <div className="legend">
      {items.map((it, i) => (
        <span key={i} className="legend-item">
          <i className={`swatch swatch-${it.tone}`} aria-hidden />
          {it.text}
        </span>
      ))}
    </div>
  );
}
