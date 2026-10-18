
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ForwardedRef,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { Eye, EyeOff } from "lucide-react";
import { cx } from "../cx";
import { IconButton } from "./Button";

/**
 * How the message line announces itself.
 *
 * `alert` is the default and is right for a validation failure: assertive, it
 * interrupts, because the user has just done something that did not work.
 *
 * `status` is for a message that CHANGES ON A TIMER. The sign-in form's
 * progressive backoff recomputes its sentence every second - "Please wait 43
 * seconds to try again", then 42, then 41 - and on an assertive region that is
 * a screen reader talked over once a second for the length of the lockout. The
 * same reasoning is already written out at SessionGuard's countdown, which is
 * polite for exactly this reason.
 */
/**
 * One `aria-describedby` from several sources, in reading order (UR-053).
 *
 * A control can be described by its field (the hint, then the error) and by a
 * page-level notice, such as the read-only banner a disabled control points
 * at. `aria-describedby` takes a list, so neither has to displace the other;
 * passing one where both apply silently dropped the other. Empty and repeated
 * ids are dropped, and nothing at all yields `undefined` so the attribute is
 * not rendered empty.
 */
export function joinIds(...ids: Array<string | null | undefined | false>): string | undefined {
  const seen: string[] = [];
  for (const raw of ids) {
    if (!raw) continue;
    for (const id of raw.split(/\s+/)) if (id && !seen.includes(id)) seen.push(id);
  }
  return seen.length > 0 ? seen.join(" ") : undefined;
}

export type FieldTone = "alert" | "status";

export interface FieldProps {
  label: string;
  hint?: string;
  /** The 16px error line is always reserved; layout never shifts (§4.3). */
  error?: string | null;
  /** `alert` (default) interrupts. `status` is polite; use it for a countdown. */
  tone?: FieldTone;
  children: (props: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}

export function Field({ label, hint, error, tone = "alert", children }: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  /**
   * Both descriptions, in reading order, or nothing.
   *
   * This used to be `error ? errorId : undefined`, so the hint - the sentence
   * explaining what the field wants - was never tied to the input at all. It
   * was rendered, it was visible, and to a screen reader it was a loose piece
   * of text somewhere near a control with no relationship to it. `aria-
   * describedby` takes a LIST, so the hint does not have to displace the error:
   * a field that has both announces the requirement and then what went wrong.
   */
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className="sg-field">
      <label className="sg-field__label" htmlFor={id}>
        {label}
      </label>
      {hint ? (
        <span className="sg-field__hint" id={hintId}>
          {hint}
        </span>
      ) : null}
      {children({ id, describedBy, invalid: Boolean(error) })}
      {/*
        A live region has to be in the accessibility tree BEFORE its content
        changes, or the change is not a change and nothing is announced.

        `status` is therefore attached unconditionally: it is polite, an empty
        polite region says nothing, and a countdown that mounts its own region
        at the same instant as its first sentence would announce the first tick
        unreliably and every tick after it as an update. `alert` stays
        conditional, because it is assertive and an assertive region left
        standing on every field on the page is an open interruption channel;
        the whole point of an alert is that it appears.
      */}
      <span
        className="sg-field__error"
        id={errorId}
        role={tone === "status" ? "status" : error ? "alert" : undefined}
        aria-live={tone === "status" ? "polite" : undefined}
      >
        {error ?? ""}
      </span>
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  trailing?: ReactNode;
}

/**
 * TEXT TYPED BEFORE HYDRATION IS KEPT, NOT ERASED (UR-128).
 *
 * A page reached by a full load renders its fields from the server, and the
 * browser accepts typing into them before React hydrates. That text is in the
 * DOM and not in the component's state, and the next re-render of the form
 * (ticking a checkbox) wrote the empty state back over it: journey J03 lost a
 * workspace name this way, and a person on a slow connection who types at once
 * loses it the same way. After mount, a field whose DOM value differs from
 * its controlled value reports the DOM value through its own onChange, so the
 * parent adopts what the person typed. Rejected: rendering fields disabled
 * until hydration (a flash of disabled controls on every load, and keystrokes
 * still lost), and suppressing the re-render (the state would stay wrong).
 */
export function useKeepPrehydrationText<E extends HTMLInputElement | HTMLTextAreaElement>(
  forwarded: ForwardedRef<E>,
  value: unknown,
  onChange: ((e: ChangeEvent<E>) => void) | undefined,
): (el: E | null) => void {
  const own = useRef<E | null>(null);
  useEffect(() => {
    const el = own.current;
    if (!el || !onChange || value === undefined || value === null) return;
    if (el.value !== String(value)) onChange({ target: el, currentTarget: el } as ChangeEvent<E>);
    // Mount only: after hydration the state owns the field.
  }, []);
  return useCallback(
    (el: E | null) => {
      own.current = el;
      if (typeof forwarded === "function") forwarded(el);
      else if (forwarded) forwarded.current = el;
    },
    [forwarded],
  );
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, trailing, className, ...rest },
  ref,
) {
  const setRef = useKeepPrehydrationText(ref, rest.value, rest.onChange);
  return (
    <span className="sg-input-well">
      <input
        ref={setRef}
        className={cx("sg-input", trailing ? "sg-input--trail" : null, className)}
        aria-invalid={invalid || undefined}
        {...rest}
      />
      {trailing ? <span className="sg-input__trail">{trailing}</span> : null}
    </span>
  );
});

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

/**
 * A controlled multi-line field that keeps text typed before hydration
 * (UR-128), styled as the product's inputs.
 */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { invalid, className, ...rest },
  ref,
) {
  const setRef = useKeepPrehydrationText(ref, rest.value, rest.onChange);
  return <textarea ref={setRef} className={cx("sg-input", className)} aria-invalid={invalid || undefined} {...rest} />;
});

export interface PasswordInputProps extends Omit<InputProps, "type" | "trailing"> {
  /** 0-4 from zxcvbn; omit to hide the meter (sign-in vs creation). */
  strengthScore?: number | null;
  strengthLabel?: string | null;
}

const STRENGTH_LABELS = ["Too weak", "Too weak", "Weak", "Good", "Strong"] as const;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ strengthScore, strengthLabel, ...rest }, ref) {
    const [revealed, setRevealed] = useState(false);
    const [capsLock, setCapsLock] = useState(false);
    const showMeter = strengthScore !== undefined && strengthScore !== null;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <Input
          ref={ref}
          type={revealed ? "text" : "password"}
          onKeyUp={(e) => setCapsLock(e.getModifierState?.("CapsLock") ?? false)}
          trailing={
            <IconButton
              size="sm"
              type="button"
              label={revealed ? "Hide password" : "Show password"}
              aria-pressed={revealed}
              onClick={() => setRevealed((v) => !v)}
              tabIndex={-1}
            >
              {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
            </IconButton>
          }
          {...rest}
        />
        {capsLock ? <span className="sg-micro">Caps Lock is on</span> : null}
        {showMeter ? (
          <span className="sg-strength" aria-live="polite">
            <span className="sg-strength__bars" aria-hidden>
              {[1, 2, 3, 4].map((seg) => (
                <span key={seg} className="sg-strength__bar" data-on={(strengthScore ?? 0) >= seg} />
              ))}
            </span>
            <span className="sg-strength__label">
              {strengthLabel ?? STRENGTH_LABELS[strengthScore ?? 0]}
            </span>
          </span>
        ) : null}
      </div>
    );
  },
);
