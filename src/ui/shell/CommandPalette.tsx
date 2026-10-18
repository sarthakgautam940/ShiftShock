import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRightLeft,
  BookMarked,
  Building2,
  FileText,
  LineChart,
  Monitor,
  Moon,
  PenLine,
  Power,
  Sigma,
  SlidersHorizontal,
  Sun,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { useDialogFocus } from "../../kit";
import { DESIGNS, PRESETS } from "../content";
import { navigate } from "../route";
import { useStudy } from "../state";
import { setTheme } from "./ThemeMenu";

/**
 * Ctrl/Cmd+K from anywhere: every page and every demo-path action, so a
 * presenter can drive the whole study from the keyboard. Ported from the
 * ShiftGraph palette (combobox and listbox pattern, focus trapped, Escape
 * closes), with commands in place of its server search.
 */

interface Command {
  label: string;
  context: string;
  keywords: string;
  icon: LucideIcon;
  run: () => void;
}

function score(item: Command, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 1;
  const label = item.label.toLowerCase();
  if (label.startsWith(q)) return 100;
  if (label.includes(q)) return 60;
  if (item.keywords.includes(q)) return 30;
  const hay = `${label} ${item.keywords}`;
  return q.split(/\s+/).every((w) => hay.includes(w)) ? 10 : 0;
}

function useCommands(): Command[] {
  const { state, dispatch } = useStudy();
  return useMemo(() => {
    const toStudy = (then: () => void) => () => {
      navigate("study");
      then();
    };
    return [
      { label: "Study", context: "Page", keywords: "home year county hourly chart", icon: LineChart, run: () => navigate("study") },
      { label: "Condition", context: "Page", keywords: "print letter draft", icon: FileText, run: () => navigate("condition") },
      { label: "Method", context: "Page", keywords: "equations constants tests limits", icon: Sigma, run: () => navigate("method") },
      { label: "Sources", context: "Page", keywords: "references citations links", icon: BookMarked, run: () => navigate("sources") },
      {
        label: "Translate a record",
        context: "Action",
        keywords: "gallons heat reverse implied",
        icon: ArrowRightLeft,
        run: toStudy(() => dispatch({ type: "translate", open: true })),
      },
      {
        label: "Find the cheapest cap",
        context: "Action",
        keywords: "fix optimize slider pareto",
        icon: SlidersHorizontal,
        run: toStudy(() => dispatch({ type: "fix", open: true })),
      },
      { label: "Draft the condition", context: "Action", keywords: "write print", icon: PenLine, run: () => navigate("condition") },
      {
        label: state.richmondDown ? "Restore the Richmond plant" : "Richmond plant down in July",
        context: "Toggle",
        keywords: "county capacity stress test outage",
        icon: Power,
        run: toStudy(() => dispatch({ type: "richmond", down: !state.richmondDown })),
      },
      ...PRESETS.map((p) => ({
        label: `Load ${p.name}`,
        context: `Preset, ${p.itLoadMW.toLocaleString("en-US")} MW`,
        keywords: "campus preset",
        icon: Building2,
        run: toStudy(() => dispatch({ type: "preset", id: p.id })),
      })),
      ...DESIGNS.map((d) => ({
        label: `Switch to ${d.label}`,
        context: "Cooling design",
        keywords: `design cooling ${d.short.toLowerCase()}`,
        icon: Wind,
        run: toStudy(() => dispatch({ type: "design", id: d.id })),
      })),
      { label: "Light theme", context: "Appearance", keywords: "paper theme", icon: Sun, run: () => setTheme("paper") },
      { label: "Dark theme", context: "Appearance", keywords: "night theme", icon: Moon, run: () => setTheme("night") },
      { label: "Match system theme", context: "Appearance", keywords: "auto theme", icon: Monitor, run: () => setTheme("system") },
    ];
  }, [dispatch, state.richmondDown]);
}

export function CommandPalette() {
  const commands = useCommands();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const rows = useMemo(
    () =>
      commands
        .map((c) => ({ c, s: score(c, query) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .map((x) => x.c),
    [commands, query],
  );

  const openPalette = useCallback(() => {
    setQuery("");
    setActive(0);
    setOpen(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) setOpen(false);
        else openPalette();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("md:palette", openPalette);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("md:palette", openPalette);
    };
  }, [open, openPalette]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Declared after the focus effect so the input already holds focus when the
  // trap looks; Escape is handled on the input itself.
  useDialogFocus(open, panelRef);

  useEffect(() => {
    setActive(0);
  }, [query]);

  function run(command: Command | undefined) {
    if (!command) return;
    setOpen(false);
    command.run();
  }

  if (!open) return null;

  // Portalled so the scrim covers the sticky top bar as well as the page.
  return createPortal(
    <div
      role="presentation"
      className="md-palette-layer"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div ref={panelRef} role="dialog" aria-label="Go to or run" tabIndex={-1} className="sg-panel md-palette">
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded="true"
          aria-controls="md-palette-list"
          aria-activedescendant={rows[active] ? `md-palette-${active}` : undefined}
          aria-label="Search pages and commands"
          placeholder="Go to a page or run a step"
          className="md-palette__input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, rows.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              run(rows[active]);
            } else if (e.key === "Escape") {
              e.preventDefault();
              setOpen(false);
            }
          }}
        />
        <ul id="md-palette-list" role="listbox" aria-label="Pages and commands" className="md-palette__list">
          {rows.length === 0 ? (
            <li className="sg-micro md-palette__none">Nothing matches. Try a page name, a design or a preset.</li>
          ) : (
            rows.map((item, i) => {
              const Icon = item.icon;
              return (
                <li key={item.label} role="presentation">
                  <button
                    id={`md-palette-${i}`}
                    role="option"
                    aria-selected={i === active}
                    type="button"
                    className="md-palette__row"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => run(item)}
                  >
                    <Icon size={15} aria-hidden />
                    <span className="md-palette__label">{item.label}</span>
                    <span style={{ flex: 1 }} />
                    <span className="sg-micro">{item.context}</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
