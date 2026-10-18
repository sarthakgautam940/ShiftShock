import { useEffect, useState } from "react";
import { Field, Input } from "../../kit";

/**
 * A number with its unit inside the field. The text is held locally so a
 * half-typed value ("1,") is not rejected mid-keystroke; it commits when it
 * parses and sits inside the bounds, and says why when it does not.
 */
export function NumberField({
  label,
  unit,
  value,
  min,
  max,
  step,
  hint,
  disabled,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  hint?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const [text, setText] = useState(() => value.toLocaleString("en-US"));
  const [error, setError] = useState<string | null>(null);

  // A preset or the palette can change the value from outside this field.
  useEffect(() => {
    setText(value.toLocaleString("en-US"));
    setError(null);
  }, [value]);

  function commit(raw: string) {
    setText(raw);
    const parsed = Number(raw.replace(/,/g, ""));
    if (raw.trim() === "" || !Number.isFinite(parsed)) {
      setError("Enter a number.");
      return;
    }
    if (parsed < min || parsed > max) {
      setError(`Between ${min.toLocaleString("en-US")} and ${max.toLocaleString("en-US")} ${unit}.`);
      return;
    }
    setError(null);
    onChange(parsed);
  }

  return (
    <Field label={label} hint={hint} error={error}>
      {({ id, describedBy, invalid }) => (
        <Input
          id={id}
          inputMode="decimal"
          aria-describedby={describedBy}
          invalid={invalid}
          disabled={disabled}
          value={text}
          trailing={unit}
          onChange={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
            e.preventDefault();
            const next = Math.min(max, Math.max(min, value + (e.key === "ArrowUp" ? step : -step)));
            onChange(Number(next.toFixed(3)));
          }}
        />
      )}
    </Field>
  );
}
