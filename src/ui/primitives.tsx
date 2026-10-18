import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "../kit/cx";

export function PageHeader({ title, meta, actions }: { title: ReactNode; meta?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-head">
      <div className="page-head__text">
        <h1 className="page-title">{title}</h1>
        {meta && <div className="page-meta">{meta}</div>}
      </div>
      {actions && <div className="page-head__actions">{actions}</div>}
    </header>
  );
}

export function Card({
  title,
  meta,
  actions,
  children,
  className,
  flush,
}: {
  title?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Content runs edge to edge (tables). */
  flush?: boolean;
}) {
  return (
    <section className={cx("card", flush && "card--flush", className)}>
      {(title || actions) && (
        <header className="card__head">
          <div className="card__titles">
            {title && <h2 className="card__title">{title}</h2>}
            {meta && <div className="card__meta">{meta}</div>}
          </div>
          {actions && <div className="card__actions">{actions}</div>}
        </header>
      )}
      <div className="card__body">{children}</div>
    </section>
  );
}

export type Tone = "amber" | "alarm";

export function Kpi({
  label,
  value,
  unit,
  sub,
  tone,
  subTone,
}: {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  subTone?: Tone | "good";
}) {
  return (
    <div className={cx("kpi", tone && `kpi--${tone}`)}>
      <div className="kpi__label">{label}</div>
      <div className="kpi__value">
        <span className="kpi__num">{value}</span>
        {unit && <span className="kpi__unit">{unit}</span>}
      </div>
      {sub && <div className={cx("kpi__sub", subTone && `kpi__sub--${subTone}`)}>{sub}</div>}
    </div>
  );
}

export function KpiStrip({ children, cols }: { children: ReactNode; cols?: number }) {
  return (
    <div className="kpis" style={cols ? ({ "--kpi-cols": cols } as React.CSSProperties) : undefined}>
      {children}
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size,
}: {
  options: { id: T; label: ReactNode; title?: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  size?: "sm";
}) {
  return (
    <div className={cx("seg", size === "sm" && "seg--sm")} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          title={o.title}
          className={cx("seg__opt", value === o.id && "is-on")}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className={cx("switch", checked && "is-on")} onClick={() => onChange(!checked)} title={hint}>
      <span className="switch__track" aria-hidden="true">
        <span className="switch__thumb" />
      </span>
      <span className="switch__label">{label}</span>
    </button>
  );
}

export function Button({
  variant = "secondary",
  icon,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost"; icon?: ReactNode }) {
  return (
    <button type="button" className={cx("btn", `btn--${variant}`, !children && "btn--icon", className)} {...rest}>
      {icon}
      {children}
    </button>
  );
}

export function Tag({ children, tone }: { children: ReactNode; tone?: Tone | "neutral" }) {
  return <span className={cx("tag", tone && `tag--${tone}`)}>{children}</span>;
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

/** A labelled figure in a two-column definition list. */
export function Row({ label, children, tone }: { label: ReactNode; children: ReactNode; tone?: Tone }) {
  return (
    <div className={cx("row", tone && `row--${tone}`)}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function Footnote({ children }: { children: ReactNode }) {
  return <p className="footnote">{children}</p>;
}
