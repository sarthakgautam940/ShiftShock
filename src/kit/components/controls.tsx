
import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { Check } from "lucide-react";
import { cx } from "../cx";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, className, ...rest },
  ref,
) {
  return (
    <label className={cx("sg-check", className)}>
      <input ref={ref} type="checkbox" {...rest} />
      <span className="sg-check__box" aria-hidden>
        <Check size={12} strokeWidth={3} />
      </span>
      <span>{label}</span>
    </label>
  );
});

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
  /**
   * What explains this control when it cannot be used: a disabled control
   * points here at the sentence that says why (a read-only workspace's banner).
   */
  "aria-describedby"?: string;
}

/** Instant-effect settings only; anything needing Save uses Checkbox (§4.7). */
export function Switch({ checked, onChange, disabled, label, "aria-describedby": describedBy }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      className="sg-switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    />
  );
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  "aria-label": string;
  /**
   * What explains this control when it cannot be used: a disabled control
   * points here at the sentence that says why (a read-only workspace's banner).
   */
  "aria-describedby"?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled,
  "aria-label": ariaLabel,
  "aria-describedby": describedBy,
}: SegmentedControlProps<T>) {
  return (
    <div
      className="sg-segmented"
      role="group"
      aria-label={ariaLabel}
      aria-describedby={describedBy}
      data-disabled={disabled ? "true" : undefined}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="sg-segmented__item"
          aria-pressed={option.value === value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export interface TabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export interface TabsProps<T extends string> {
  tabs: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  "aria-label": string;
}

/**
 * A one-of-many strip. Named Tabs for what it looks like; built as a toggle
 * group, because that is what it is.
 *
 * It used to carry `role="tablist"` and `role="tab"`, and that was a promise
 * the markup could not keep. A tab owns a tabpanel: it needs `aria-controls`
 * pointing at one, the panel needs `role="tabpanel"` pointing back, and the
 * strip needs roving tabindex with Left/Right moving the selection so the whole
 * set is a single tab stop. None of that existed. Two of the three call sites
 * have no panel at all - they filter a ledger in place, or push a URL - and the
 * third switches plain divs. So a screen reader announced "tab, 1 of 4, Drift"
 * and then, for a tabpanel that was never there, nothing; and a keyboard user
 * got four separate tab stops where the pattern promises one.
 *
 * `role="group"` with `aria-pressed` is the truthful shape, and it is the exact
 * construction SegmentedControl above already uses. Anything that grows a real
 * tabpanel should be built as a tablist properly rather than by putting the
 * roles back.
 */
export function Tabs<T extends string>({ tabs, value, onChange, "aria-label": ariaLabel }: TabsProps<T>) {
  return (
    <div className="sg-tabs" role="group" aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          className="sg-tabs__tab"
          aria-pressed={tab.value === value}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
          {tab.count !== undefined ? (
            <span className="sg-badge sg-tabs__count sg-tnum">{tab.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
