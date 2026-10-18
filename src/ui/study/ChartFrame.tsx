import type { ReactNode } from "react";

/**
 * The card every chart sits in: a title that states the claim, one note, an
 * optional control on the right, and the plot. `summary` is the chart's text
 * equivalent, read by assistive technology in place of the drawing.
 */
export function ChartFrame({
  id,
  title,
  note,
  aside,
  summary,
  children,
}: {
  id: string;
  title: ReactNode;
  note?: ReactNode;
  aside?: ReactNode;
  summary: string;
  children: ReactNode;
}) {
  return (
    <section className="md-chart" aria-labelledby={`${id}-title`}>
      <header className="md-chart__head">
        <div style={{ minWidth: 0 }}>
          <h2 className="md-chart__title" id={`${id}-title`}>
            {title}
          </h2>
          {note ? <p className="md-chart__note">{note}</p> : null}
        </div>
        {aside ? <div className="md-chart__aside">{aside}</div> : null}
      </header>
      <figure className="md-chart__figure">
        {children}
        <figcaption className="sg-srlabel">{summary}</figcaption>
      </figure>
    </section>
  );
}

/**
 * An empty plot that keeps its anatomy: gridlines, axis ticks and axis names
 * are real, and the series area says what will draw there. No values are
 * invented to fill it.
 */
export function PendingPlot({
  xTicks,
  xName,
  yName,
  yNameRight,
  height = 220,
  message,
}: {
  xTicks: string[];
  xName: string;
  yName: string;
  yNameRight?: string;
  height?: number;
  message: string;
}) {
  const rows = 4;
  return (
    <div className="md-plot" style={{ height }}>
      <div className="md-plot__yname">{yName}</div>
      {yNameRight ? <div className="md-plot__yname md-plot__yname--right">{yNameRight}</div> : null}
      <div className="md-plot__area" aria-hidden>
        {Array.from({ length: rows + 1 }, (_, i) => (
          <span key={i} className="md-plot__grid" style={{ top: `${(i / rows) * 100}%` }} />
        ))}
        <span className="md-plot__message">{message}</span>
      </div>
      <div className="md-plot__xticks" data-dense={xTicks.length > 8 ? "true" : undefined} aria-hidden>
        {xTicks.map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </div>
      <div className="md-plot__xname">{xName}</div>
    </div>
  );
}
