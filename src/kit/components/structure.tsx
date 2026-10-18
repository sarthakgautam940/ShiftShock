import type { HTMLAttributes, ReactNode } from "react";
import { Check } from "lucide-react";
import { cx } from "../cx";

/**
 * Structural primitives: the shared section anatomy that replaces the
 * card-for-everything habit. Framework agnostic - links are passed in as
 * ReactNode so this package stays free of next/link.
 *
 * Page and section headings are not here. PageHead (one band per surface) and
 * Region (one band per section) live in workspace.tsx and are the only two, so
 * a heading cannot differ route to route by accident.
 */

/* Surface: a contained content plane. Level opts into a treatment; default is
   the standard surface card. Use an open section (no Surface) when containment
   is not needed. */
export function Surface({
  level = "surface",
  pad = "md",
  className,
  children,
  ...rest
}: {
  level?: "surface" | "surface2" | "inset" | "flat";
  pad?: "none" | "sm" | "md";
  className?: string;
  children?: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        "sg-panel",
        pad === "md" && "sg-panel--pad",
        pad === "sm" && "sg-panel--dense",
        level === "surface2" && "sg-panel--surface2",
        level === "inset" && "sg-panel--inset",
        level === "flat" && "sg-panel--flat",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/* Data plane: the panel shell wrapping a table. Empty content lives in tbody. */
export function DataPlane({
  className,
  children,
  ...rest
}: {
  className?: string;
  children?: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("sg-panel", "sg-dataplane", className)} {...rest}>
      {children}
    </div>
  );
}

/* Operational band: compact horizontal guidance with an attached action. */
export function OperationalBand({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="sg-opband">
      {icon ? (
        <span className="sg-opband__icon" aria-hidden>
          {icon}
        </span>
      ) : null}
      <div className="sg-opband__body">
        <span className="sg-opband__title">{title}</span>
        {description ? <span className="sg-opband__desc">{description}</span> : null}
      </div>
      {action ? <div className="sg-opband__action">{action}</div> : null}
    </div>
  );
}

/* Stat card: a single labelled numeral with an optional hint. */
export function StatCard({
  label,
  value,
  hint,
  muted,
  title,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  muted?: boolean;
  title?: string;
}) {
  return (
    <div className="sg-statcard" title={title}>
      <span className="sg-hud">{label}</span>
      <span className={cx("sg-stat", muted && "sg-statcard__value--muted")}>{value}</span>
      {hint ? <span className="sg-micro">{hint}</span> : null}
    </div>
  );
}

export interface ChecklistStep {
  title: ReactNode;
  description?: ReactNode;
  done?: boolean;
}

/* Checklist: setup steps with a numbered node that fills when done. */
export function Checklist({ steps }: { steps: ChecklistStep[] }) {
  return (
    <ol className="sg-checklist">
      {steps.map((step, i) => (
        <li className="sg-checklist__row" key={i}>
          <span className="sg-checklist__node" data-done={step.done ? "true" : "false"}>
            {step.done ? <Check size={13} /> : i + 1}
          </span>
          <span className="sg-checklist__body">
            <span className="sg-checklist__title">{step.title}</span>
            {step.description ? <span className="sg-checklist__desc">{step.description}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

/* Privacy assurance: a grounded trust surface, not a marketing card. */
export function PrivacyAssurance({
  icon,
  title,
  children,
  action,
}: {
  icon?: ReactNode;
  title: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="sg-privacy">
      {icon ? (
        <span className="sg-privacy__mark" aria-hidden>
          {icon}
        </span>
      ) : null}
      <div className="sg-privacy__body">
        <h2 className="sg-h2">{title}</h2>
        <div className="sg-micro" style={{ lineHeight: "18px" }}>
          {children}
        </div>
        {action ? <div style={{ marginTop: 2 }}>{action}</div> : null}
      </div>
    </section>
  );
}

/* Code / command text. No monospace (the brand bans it): tabular sans via
   .sg-code so commands and snippets stay legible and aligned. */
export function CodeBlock({ children, className }: { children: ReactNode; className?: string }) {
  return <pre className={cx("sg-code", className)}>{children}</pre>;
}

/* Shape-change mark (provisional product motif): two offset structural groups,
   one field changed in accent. Geometric, low-contrast, no animation. */
export function ShapeChangeMark({ size = 56 }: { size?: number }) {
  const height = Math.round(size * 0.72);
  return (
    <svg
      className="sg-shapemark"
      width={size}
      height={height}
      viewBox="0 0 56 40"
      fill="none"
      role="img"
      aria-hidden
    >
      <rect x="3" y="7" width="20" height="4" rx="2" fill="var(--text-tertiary)" opacity="0.45" />
      <rect x="3" y="16" width="20" height="4" rx="2" fill="var(--text-tertiary)" opacity="0.45" />
      <rect x="3" y="25" width="13" height="4" rx="2" fill="var(--text-tertiary)" opacity="0.45" />
      <rect x="33" y="7" width="20" height="4" rx="2" fill="var(--text-tertiary)" opacity="0.45" />
      <rect x="33" y="16" width="20" height="4" rx="2" fill="var(--accent)" />
      <rect x="33" y="25" width="16" height="4" rx="2" fill="var(--text-tertiary)" opacity="0.45" />
    </svg>
  );
}
