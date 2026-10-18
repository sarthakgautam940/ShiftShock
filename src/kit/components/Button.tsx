
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cx } from "../cx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "danger-ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Guards double-submit and marks the control busy. A pending state is
   *  WRITTEN, never spun: pass `loadingLabel` to say what is happening. */
  loading?: boolean;
  /** The label while pending, e.g. "Saving". Falls back to the resting label. */
  loadingLabel?: ReactNode;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading = false, loadingLabel, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cx(
        "sg-btn",
        `sg-btn--${variant}`,
        size === "sm" && "sg-btn--sm",
        size === "lg" && "sg-btn--lg",
        className,
      )}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      {...rest}
    >
      {icon}
      <span className="sg-btn__label">{loading ? (loadingLabel ?? children) : children}</span>
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Tooltip text is mandatory (§4.2); doubles as the accessible name. */
  label: string;
  size?: "sm" | "md";
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = "md", className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cx("sg-iconbtn", size === "sm" && "sg-iconbtn--sm", className)}
      aria-label={label}
      title={label}
      {...rest}
    >
      {children}
    </button>
  );
});
