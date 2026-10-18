import { useEffect, useRef, useState } from "react";
import { RotateCcw, Settings2 } from "lucide-react";
import { DEFAULT_PARAMS } from "../engine/plant";
import { cx } from "../kit/cx";
import { useWorkspace } from "./workspace";

function Field({ label, unit, value, min, max, step, onCommit }: { label: string; unit: string; value: number; min: number; max: number; step: number; onCommit: (v: number) => void }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const v = Number(text);
    if (Number.isFinite(v) && v >= min && v <= max) onCommit(Math.round(v / step) * step);
    else setText(String(value));
  };
  return (
    <label className="asm-field">
      <span className="asm-field__label">{label}</span>
      <span className="field">
        <input aria-label={label} inputMode="decimal" value={text} onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && commit()} />
        <span>{unit}</span>
      </span>
      <span className="asm-field__range tnum">
        {min} to {max}, default {label.startsWith("Hybrid") ? DEFAULT_PARAMS.switchC : DEFAULT_PARAMS.cycles}
      </span>
    </label>
  );
}

/**
 * The two plant assumptions people argue about at a hearing, open to change:
 * when the hybrid goes wet and how hard the tower water is cycled. Everything
 * on every page re-solves from the new values; the link carries them.
 */
export function Assumptions() {
  const { s, set, m } = useWorkspace();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const custom = s.switchC !== null || s.cycles !== null;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="menu-wrap" ref={ref}>
      <button type="button" className={cx("btn btn--secondary", custom && "is-custom")} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Settings2 />
        Assumptions
        {custom && <span className="asm-dot" aria-label="changed from defaults" />}
      </button>
      {open && (
        <div className="menu asm" role="dialog" aria-label="Plant assumptions" style={{ top: "calc(100% + 6px)", right: 0 }}>
          <div className="asm__head">
            <b>Plant assumptions</b>
            <span>Planning values, not measured. Every page re-solves.</span>
          </div>
          <Field
            label="Hybrid switch temperature"
            unit="°C"
            value={m.prep.params.switchC}
            min={15}
            max={40}
            step={0.5}
            onCommit={(v) => set({ switchC: v === DEFAULT_PARAMS.switchC ? null : v, capMgd: null })}
          />
          <Field
            label="Cycles of concentration"
            unit="cycles"
            value={m.prep.params.cycles}
            min={2}
            max={15}
            step={0.5}
            onCommit={(v) => set({ cycles: v === DEFAULT_PARAMS.cycles ? null : v, capMgd: null })}
          />
          <button type="button" className="menu__item" disabled={!custom} onClick={() => set({ switchC: null, cycles: null, capMgd: null })}>
            <RotateCcw />
            Reset to planning defaults
          </button>
        </div>
      )}
    </div>
  );
}
