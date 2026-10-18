
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { cx } from "../cx";
import { layerStyle, useAnchoredLayer } from "./useAnchoredLayer";

/**
 * The listbox the product was missing.
 *
 * Thirteen native `<select>` elements shipped across seven surfaces, and on a
 * dark ground each one opened as a white operating-system menu. Nothing else on
 * a page survives that: a single OS dropdown tells a reader the rest of the
 * craft is a coat of paint. This is the replacement, and it is a real listbox
 * rather than a styled div:
 *
 *  - `role="combobox"` trigger, `role="listbox"` layer, `aria-activedescendant`
 *    moving with the keyboard, so a screen reader hears a select.
 *  - The native element's whole keyboard contract: Up/Down/Home/End, Enter and
 *    Space to commit, Escape to abandon, and printable-character typeahead
 *    both open and closed.
 *  - Portalled and clamped by useAnchoredLayer, so it can never be clipped by
 *    an ancestor or sealed under the page.
 *
 * It deliberately does NOT support multi-select or free text. Those are a
 * different control with a different contract, and a Select that quietly grows
 * into a Combobox is how a design system starts lying about what its parts do.
 */

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  /** A second line inside the row. Never required to understand the label. */
  description?: string;
  disabled?: boolean;
  icon?: ReactNode;
}

export interface SelectGroup<T extends string> {
  /** Sentence case. The brand bans the tracked-out uppercase micro-label. */
  label?: string;
  options: SelectOption<T>[];
}

export interface SelectProps<T extends string> {
  value: T | null;
  onChange: (value: T) => void;
  options: SelectOption<T>[] | SelectGroup<T>[];
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  size?: "sm" | "md";
  /** Borderless, for a rail or a toolbar where the box would be chrome noise. */
  bare?: boolean;
  /**
   * Adds a filter field to the layer.
   *
   * Set it once a list stops being scannable. Typeahead alone carries maybe
   * twenty options; the timezone picker has four hundred, and asking someone to
   * find one by holding a letter down is not a control, it is a puzzle.
   */
  searchable?: boolean;
  searchPlaceholder?: string;
  id?: string;
  name?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  className?: string;
}

function isGrouped<T extends string>(
  options: SelectOption<T>[] | SelectGroup<T>[],
): options is SelectGroup<T>[] {
  return options.length > 0 && "options" in options[0]!;
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled,
  invalid,
  size = "md",
  bare,
  searchable,
  searchPlaceholder = "Search…",
  id,
  name,
  "aria-label": ariaLabel,
  "aria-describedby": describedBy,
  className,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const reactId = useId();
  const listId = `${id ?? reactId}-list`;

  const close = useCallback(() => setOpen(false), []);
  const { triggerRef, layerRef, placement, mounted } = useAnchoredLayer<HTMLButtonElement, HTMLDivElement>({
    open,
    onClose: close,
    matchTriggerWidth: true,
  });

  const allGroups: SelectGroup<T>[] = useMemo(
    () => (isGrouped(options) ? options : [{ options }]),
    [options],
  );

  /** The selected label must survive filtering, so it is read from the full set. */
  const everything = useMemo(() => allGroups.flatMap((g) => g.options), [allGroups]);
  const selected = everything.find((o) => o.value === value) ?? null;

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!searchable || !q) return allGroups;
    return allGroups
      .map((g) => ({
        ...g,
        options: g.options.filter(
          (o) =>
            o.label.toLowerCase().includes(q) ||
            (o.description?.toLowerCase().includes(q) ?? false),
        ),
      }))
      .filter((g) => g.options.length > 0);
  }, [allGroups, searchable, query]);

  /** Flattened, in visual order, for keyboard traversal. */
  const flat = useMemo(() => groups.flatMap((g) => g.options), [groups]);

  // A stale query would filter the list before it is ever seen the next time
  // the layer opens, which reads as options having vanished.
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const firstEnabled = flat.findIndex((o) => !o.disabled);
  const selectedIndex = flat.findIndex((o) => o.value === value);
  const [active, setActive] = useState(selectedIndex >= 0 ? selectedIndex : firstEnabled);

  // Opening lands on the current value, which is what a native select does and
  // what makes Down-Down-Enter predictable.
  useEffect(() => {
    if (open) setActive(selectedIndex >= 0 ? selectedIndex : firstEnabled);
  }, [open, selectedIndex, firstEnabled]);

  // Keep the active row in view when the keyboard walks past the fold.
  useEffect(() => {
    if (!open) return;
    layerRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active, layerRef]);

  // Typing is the point of a searchable list, so the caret goes there rather
  // than leaving the user to click into the field they just asked for.
  useEffect(() => {
    if (open && searchable) searchRef.current?.focus();
  }, [open, searchable]);

  const typeahead = useRef({ buffer: "", at: 0 });

  const step = useCallback(
    (from: number, delta: number) => {
      if (flat.length === 0) return from;
      let i = from;
      for (let n = 0; n < flat.length; n++) {
        i = (i + delta + flat.length) % flat.length;
        if (!flat[i]!.disabled) return i;
      }
      return from;
    },
    [flat],
  );

  const commit = useCallback(
    (index: number) => {
      const option = flat[index];
      if (!option || option.disabled) return;
      onChange(option.value);
      setOpen(false);
      triggerRef.current?.focus();
    },
    [flat, onChange, triggerRef],
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;

    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (searchable) {
          // Open and seed, so the first keystroke is not swallowed by the act
          // of opening. Typing "lon" from closed reaches London in three keys.
          setQuery(e.key);
          setOpen(true);
          return;
        }
        // Closed typeahead jumps the value directly, as the native control does.
        const hit = matchTypeahead(e.key, flat, typeahead, selectedIndex);
        if (hit >= 0) commit(hit);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => step(i, 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => step(i, -1));
        break;
      case "Home":
        e.preventDefault();
        setActive(step(-1, 1));
        break;
      case "End":
        e.preventDefault();
        setActive(step(flat.length, -1));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(active);
        break;
      case "Tab":
        // Tab commits and moves on, matching the native control.
        commit(active);
        break;
      default:
        // The filter field owns printable keys when there is one. Running
        // typeahead as well would move the highlight to a row the query has
        // already filtered out.
        if (!searchable && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          const hit = matchTypeahead(e.key, flat, typeahead, active);
          if (hit >= 0) {
            e.preventDefault();
            setActive(hit);
          }
        }
    }
  }

  let cursor = -1;
  const layer =
    open && placement ? (
      <div
        ref={layerRef}
        className="sg-select__layer sg-popover"
        style={layerStyle(placement, true)}
        data-above={placement.above ? "true" : undefined}
      >
        {searchable ? (
          <div className="sg-select__search">
            <Search size={13} aria-hidden />
            <input
              ref={searchRef}
              type="text"
              // The input becomes the combobox while the layer is open, which is
              // the pattern a screen reader expects when a select opens onto a
              // filterable list. The trigger reverts to a plain popup button.
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
              aria-label={ariaLabel ? `${ariaLabel}. Filter options` : "Filter options"}
              autoComplete="off"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
            />
          </div>
        ) : null}
        <ul className="sg-select__list" role="listbox" id={listId} aria-label={ariaLabel}>
          {flat.length === 0 ? (
            <li className="sg-select__none" role="presentation">
              Nothing matches {query.trim()}.
            </li>
          ) : null}
          {groups.map((group, gi) => (
            <li key={gi} role="presentation">
              {group.label ? (
                <div className="sg-select__grouplabel" role="presentation">
                  {group.label}
                </div>
              ) : null}
              <ul role="group" aria-label={group.label} className="sg-select__group">
                {group.options.map((option) => {
                  cursor += 1;
                  const index = cursor;
                  const isSelected = option.value === value;
                  return (
                    <li
                      key={option.value}
                      id={`${listId}-opt-${index}`}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={option.disabled || undefined}
                      data-index={index}
                      data-active={index === active ? "true" : undefined}
                      className="sg-select__opt"
                      // Pointerdown rather than click: the layer's dismiss
                      // handler also listens on pointerdown, and a click would
                      // race it and close before the value committed.
                      onPointerDown={(e) => {
                        e.preventDefault();
                        commit(index);
                      }}
                      onPointerEnter={() => !option.disabled && setActive(index)}
                    >
                      <span className="sg-select__check" aria-hidden>
                        {isSelected ? <Check size={13} strokeWidth={2.5} /> : null}
                      </span>
                      {option.icon ? (
                        <span className="sg-select__icon" aria-hidden>
                          {option.icon}
                        </span>
                      ) : null}
                      <span className="sg-select__text">
                        <span className="sg-select__label">{option.label}</span>
                        {option.description ? (
                          <span className="sg-select__desc">{option.description}</span>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        /* When the layer carries a filter field, that field is the combobox and
           this reverts to a plain popup button. Two comboboxes for one value
           makes a screen reader announce the control twice with different
           states. */
        role={searchable ? undefined : "combobox"}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open && !searchable ? listId : undefined}
        aria-activedescendant={open && !searchable && active >= 0 ? `${listId}-opt-${active}` : undefined}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        className={cx(
          "sg-select",
          size === "sm" && "sg-select--sm",
          bare && "sg-select--bare",
          className,
        )}
        data-open={open ? "true" : undefined}
        data-placeholder={selected ? undefined : "true"}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
      >
        {selected?.icon ? (
          <span className="sg-select__icon" aria-hidden>
            {selected.icon}
          </span>
        ) : null}
        <span className="sg-select__value">{selected?.label ?? placeholder}</span>
        <ChevronDown size={14} className="sg-select__chev" aria-hidden />
      </button>
      {/* Progressive enhancement and plain-form posts. Never focusable: the
          combobox above is the control, and a second tab stop for the same
          value is a keyboard trap in disguise. */}
      {name ? <input type="hidden" name={name} value={value ?? ""} /> : null}
      {mounted && layer ? createPortal(layer, document.body) : null}
    </>
  );
}

/**
 * Printable-character typeahead.
 *
 * Repeating one key cycles through everything starting with it; typing several
 * within a second matches the whole buffer. Both are the native behaviour, and
 * people who use selects heavily rely on the first one without knowing it.
 */
function matchTypeahead<T extends string>(
  key: string,
  flat: SelectOption<T>[],
  state: React.MutableRefObject<{ buffer: string; at: number }>,
  from: number,
): number {
  const now = Date.now();
  const s = state.current;
  s.buffer = now - s.at > 1000 ? key : s.buffer + key;
  s.at = now;

  const needle = s.buffer.toLowerCase();
  const repeat = s.buffer.length > 1 && s.buffer.split("").every((c) => c === s.buffer[0]);
  const probe = repeat ? s.buffer[0]!.toLowerCase() : needle;
  // A repeated key advances past the current row; a new buffer searches from it.
  const start = repeat || s.buffer.length === 1 ? from + 1 : from;

  for (let n = 0; n < flat.length; n++) {
    const i = (start + n + flat.length) % flat.length;
    const option = flat[i]!;
    if (!option.disabled && option.label.toLowerCase().startsWith(probe)) return i;
  }
  return -1;
}
