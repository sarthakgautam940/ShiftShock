
import { useEffect, useState, type ReactNode } from "react";
import { Copy, Check, CircleAlert, Info, OctagonAlert, TriangleAlert } from "lucide-react";
import { cx } from "../cx";
import { IconButton } from "./Button";

export function Badge({
  children,
  accent,
  className,
}: {
  children: ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return <span className={cx("sg-badge", accent && "sg-badge--accent", className)}>{children}</span>;
}

export type Severity = "high" | "medium" | "low" | "info";

/** Glyph + word, never color alone (§3.5, §4.14). */
export function SeverityBadge({ severity }: { severity: Severity }) {
  const Icon =
    severity === "high"
      ? OctagonAlert
      : severity === "medium"
        ? TriangleAlert
        : severity === "low"
          ? CircleAlert
          : Info;
  const word = severity === "high" ? "High" : severity === "medium" ? "Medium" : severity === "low" ? "Low" : "Info";
  return (
    <span className={`sg-severity sg-severity--${severity}`}>
      <Icon size={12} aria-hidden />
      {word}
    </span>
  );
}

export type Status = "open" | "acked" | "resolved" | "muted" | "stable" | "alarm";

/** Dot-free: 2x10px tick + word (§4.14). */
export function StatusChip({ status, children }: { status: Status; children?: ReactNode }) {
  return (
    <span
      className={cx(
        "sg-status",
        status === "open" && "sg-status--open",
        status === "alarm" && "sg-status--alarm",
      )}
    >
      {children ??
        (status === "open"
          ? "Open"
          : status === "acked"
            ? "Acked"
            : status === "resolved"
              ? "Resolved"
              : status === "muted"
                ? "Muted"
                : status === "alarm"
                  ? "Failing"
                  : "Stable")}
    </span>
  );
}

/**
 * Round means a person, square means an organisation.
 *
 * The convention is inherited rather than invented, because its entire value is
 * that it is legible at twenty pixels without a label. It also does real work
 * here: a workspace and a member are different objects with different
 * lifecycles, and a reader who can tell them apart at a glance never has to be
 * told which one a row is about. That saves a word on every row of every table
 * in the product, which at ledger density is the difference between nine
 * readable columns and six.
 *
 * `src` is the uploaded image; initials are the fallback, never the plan. The
 * image is decorative when a name sits beside it (the common case) and carries
 * the name otherwise, which is why `alt` is derived rather than passed.
 */
export function Avatar({
  name,
  src,
  hue = 0,
  size = 24,
  shape = "person",
  standalone,
}: {
  name: string;
  /** Uploaded image. Falls back to initials when absent or when it fails to load. */
  src?: string | null;
  hue?: number;
  size?: number;
  shape?: "person" | "org";
  /** No adjacent name, so the avatar must carry it for a screen reader. */
  standalone?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  // Words, not whitespace-delimited tokens.
  //
  // Splitting on \s+ took the first character of whatever followed a space, so
  // every seeded provider rendered as "V(" and "M(" - the bracket from
  // "Vaultbox (sample)". Any parenthetical, dash or comma in a display name hit
  // this, which is most legal entity names ("Northwind, Inc."). Letters and
  // digits only, and a name that is entirely punctuation falls through to the
  // question mark rather than rendering a symbol.
  const initials = (name.match(/[\p{L}\p{N}][\p{L}\p{N}'’]*/gu) ?? [])
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");

  // A broken image URL must degrade to the monogram rather than to a broken
  // icon: the avatar appears in every table row, and one dead file would put a
  // torn-page glyph down the whole column.
  const showImage = Boolean(src) && !failed;

  return (
    <span
      className={cx("sg-avatar", shape === "org" && "sg-avatar--org")}
      data-hue={showImage ? undefined : ((hue % 8) + 8) % 8}
      data-image={showImage ? "true" : undefined}
      style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.4)) }}
      aria-hidden={standalone ? undefined : true}
      role={standalone ? "img" : undefined}
      aria-label={standalone ? name : undefined}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- the UI package is
        // framework-agnostic and cannot import next/image.
        <img src={src!} alt="" width={size} height={size} onError={() => setFailed(true)} />
      ) : (
        (initials || "?")
      )}
    </span>
  );
}

/** Geometry-matched ghost (§4.24) - size it exactly like the final content. */
export function Skeleton({
  width,
  height = 14,
  className,
}: {
  width: number | string;
  height?: number | string;
  className?: string;
}) {
  return <span className={cx("sg-skeleton", className)} style={{ display: "inline-block", width, height }} />;
}

export type BannerTone = "info" | "caution" | "alarm";

export function Banner({
  tone,
  children,
  action,
}: {
  tone: BannerTone;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={`sg-banner sg-banner--${tone}`} role={tone === "alarm" ? "alert" : "status"}>
      <span style={{ flex: 1 }}>{children}</span>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  what,
  how,
  actions,
  variant = "first-use",
}: {
  icon?: ReactNode;
  what: string;
  how: string;
  actions?: ReactNode;
  /** "first-use" (setup needed, taller) or "quiet" (configured, nothing to do). */
  variant?: "first-use" | "quiet";
}) {
  return (
    <div className={cx("sg-empty", variant === "quiet" && "sg-empty--quiet")}>
      {icon}
      <span className="sg-empty__what">{what}</span>
      <span className="sg-empty__how">{how}</span>
      {actions ? <span className="sg-empty__actions">{actions}</span> : null}
    </div>
  );
}

/**
 * The label for an instant `diffMs` milliseconds in the past. A negative value
 * is an instant in the future.
 *
 * Returns null when the gap is wide enough that an absolute date reads better,
 * which the component renders instead.
 *
 * Extracted so it can be tested against real values. This package has no DOM
 * test runner, and the alternative was asserting on source text, which cannot
 * tell you what a given instant actually renders as.
 */
export function relativeTimeLabel(diffMs: number): string | null {
  // A future instant used to fall straight through to "just now", because the
  // difference is negative and every threshold below is an upper bound. Six
  // surfaces render one: invitation expiry, trusted-device expiry, billing
  // period end, scheduled downgrade, token expiry and support-grant expiry.
  //
  // Past and future round in opposite directions deliberately. The past
  // reports time ELAPSED and floors, so "2m ago" means at least two minutes
  // have gone. The future reports time REMAINING and ceils, so an invitation
  // 6.99 days from expiring has seven days left. Flooring both would be
  // consistent and would understate every deadline by one unit.
  if (diffMs < 0) {
    const remaining = Math.abs(diffMs) / 1000;
    if (remaining < 45) return "in a moment";
    if (remaining < 3600) return `in ${Math.ceil(remaining / 60)}m`;
    if (remaining < 86_400) return `in ${Math.ceil(remaining / 3600)}h`;
    if (remaining <= 7 * 86_400) return `in ${Math.ceil(remaining / 86_400)}d`;
    return null;
  }

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 45) return "just now";
  if (seconds < 3600) return `${Math.max(1, Math.floor(seconds / 60))}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 7 * 86_400) return `${Math.floor(seconds / 86_400)}d ago`;
  return null;
}

/**
 * Relative under 7 days, absolute after; absolute + timezone on hover;
 * 30s live tick with fixed-width numerals so nothing shifts (§3.6, §4.29).
 *
 * THE FIRST RENDER IS THE SAME EVERYWHERE (UR-054). This component renders on
 * the server and then hydrates in the browser, and it used to compute
 * `Date.now()` and two locale- and zone-dependent strings during render: a
 * viewer in Los Angeles got "Sep 11, 2026" from the server and "Sep 10, 2026"
 * from hydration, the tooltip flipped from the server's zone to theirs, and
 * React had to throw the server's markup away on 52 uses across the product.
 * Until it has mounted it now renders the instant as a UTC date in one fixed
 * locale, which the server and the browser compute identically; the effect
 * then switches to the viewer's zone and the relative wording, and the 30s
 * tick keeps that current. Rejected: suppressHydrationWarning, which hides the
 * disagreement without removing it, and reading the zone from a cookie, which
 * a first visit does not have.
 */
export function RelativeTime({ date }: { date: Date | string }) {
  const target = typeof date === "string" ? new Date(date) : date;
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  if (now === null) {
    const utc = target.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
    return (
      <time className="sg-tnum" dateTime={target.toISOString()} title={`${utc} (UTC)`}>
        {utc}
      </time>
    );
  }

  const absolute = target.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const label =
    relativeTimeLabel(now - target.getTime()) ??
    target.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return (
    <time className="sg-tnum" dateTime={target.toISOString()} title={absolute}>
      {label}
    </time>
  );
}

/**
 * Read-only mono value + copy with success flash (§4.29).
 *
 * The value renders in an `<output>` because a `<Field>` labels whatever
 * carries its id, and a label pointing at a `<span>` labels nothing: the
 * profile's Email field had a visible label and hint attached to no element
 * (UR-053). `<output>` is labelable and read-only, so `id` and
 * `aria-describedby` give the value its name and its hint.
 */
export function CopyField({
  value,
  label,
  id,
  "aria-describedby": describedBy,
}: {
  value: string;
  label?: string;
  id?: string;
  "aria-describedby"?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <output id={id} aria-describedby={describedBy} className="sg-mono" style={{ color: "var(--text-secondary)" }}>
        {label ?? value}
      </output>
      <IconButton
        size="sm"
        label={copied ? "Copied" : "Copy"}
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </IconButton>
    </span>
  );
}
