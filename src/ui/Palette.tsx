import "./pages/pages-cp.css";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  BookOpen,
  Building2,
  Columns3,
  Download,
  FileJson,
  FileText,
  Fan,
  LayoutGrid,
  Monitor,
  Moon,
  Printer,
  Search,
  SlidersHorizontal,
  Sun,
  TriangleAlert,
} from "lucide-react";
import { cx } from "../kit/cx";
import { CAMPUSES, DESIGNS } from "./model";
import { Kbd } from "./primitives";
import { VIEWS, useWorkspace, type View } from "./workspace";
import { downloadDailyCsv, downloadScenarioJson } from "./export";

interface Command {
  id: string;
  group: string;
  label: string;
  icon: ReactNode;
  meta?: ReactNode;
  run: () => void;
}

const VIEW_ICON: Record<View, ReactNode> = {
  overview: <LayoutGrid />,
  plan: <SlidersHorizontal />,
  compare: <Columns3 />,
  condition: <FileText />,
  method: <BookOpen />,
};

function setTheme(theme: "paper" | "night" | "system") {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("sg-theme", theme);
  } catch {
    // Storage refused: the theme still applies for this visit.
  }
}

export function Palette({ onClose }: { onClose: () => void }) {
  const { s, set, m } = useWorkspace();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo<Command[]>(
    () => [
      ...VIEWS.map((v, i) => ({
        id: `view-${v.id}`,
        group: "Go to",
        label: v.label,
        icon: VIEW_ICON[v.id],
        meta: <Kbd>{i + 1}</Kbd>,
        run: () => set({ view: v.id }),
      })),
      ...CAMPUSES.map((c) => ({
        id: `campus-${c.id}`,
        group: "Campus",
        label: c.name,
        icon: <Building2 />,
        meta: `${c.mw.toLocaleString("en-US")} MW`,
        run: () => set({ campusId: c.id, capMgd: null, peakMW: null }),
      })),
      ...DESIGNS.map((d) => ({
        id: `design-${d.id}`,
        group: "Design",
        label: d.label,
        icon: <Fan />,
        meta: d.rule,
        run: () => set({ design: d.id, view: "overview" }),
      })),
      {
        id: "richmond",
        group: "Scenario",
        label: s.richmondDown ? "Restore the Richmond contract" : "Richmond plant down",
        icon: <TriangleAlert />,
        meta: s.richmondDown ? "24.775 MGD" : "4.775 MGD",
        run: () => set({ richmondDown: !s.richmondDown }),
      },
      {
        id: "cap-default",
        group: "Scenario",
        label: "Set cap to the record's 0.52 share",
        icon: <SlidersHorizontal />,
        meta: `${(m.defaultCapGal / 1e6).toFixed(2)} MGD`,
        run: () => set({ capMgd: null, view: "plan" }),
      },
      {
        id: "csv",
        group: "Export",
        label: "Daily water, all designs",
        icon: <Download />,
        meta: "CSV",
        run: () => downloadDailyCsv(m),
      },
      {
        id: "json",
        group: "Export",
        label: "Scenario and results",
        icon: <FileJson />,
        meta: "JSON",
        run: () => downloadScenarioJson(m, s),
      },
      {
        id: "print",
        group: "Export",
        label: "Print the condition",
        icon: <Printer />,
        meta: "Letter",
        run: () => {
          set({ view: "condition" });
          setTimeout(() => window.print(), 150);
        },
      },
      { id: "theme-paper", group: "Theme", label: "Paper theme", icon: <Sun />, run: () => setTheme("paper") },
      { id: "theme-night", group: "Theme", label: "Night theme", icon: <Moon />, run: () => setTheme("night") },
      { id: "theme-system", group: "Theme", label: "System theme", icon: <Monitor />, run: () => setTheme("system") },
    ],
    [s, set, m],
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.label} ${c.group}`.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const runAt = (i: number) => {
    const c = shown[i];
    if (!c) return;
    onClose();
    c.run();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (shown.length ? (a + 1) % shown.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (shown.length ? (a - 1 + shown.length) % shown.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      runAt(active);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  let lastGroup = "";
  return (
    <div className="palette-layer">
      <div className="scrim" onClick={onClose} />
      <div className="palette" role="dialog" aria-modal="true" aria-label="Command bar" onKeyDown={onKey}>
        <div className="palette__input">
          <Search aria-hidden="true" />
          <input
            autoFocus
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={shown[active] ? `pal-${shown[active]!.id}` : undefined}
            aria-autocomplete="list"
            placeholder="Type a command or search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Kbd>Esc</Kbd>
        </div>
        <div className="palette__list" id="palette-list" role="listbox" aria-label="Commands" ref={listRef}>
          {shown.length === 0 && <div className="palette__empty">No command matches “{query}”.</div>}
          {shown.map((c, i) => {
            const head = c.group !== lastGroup ? c.group : null;
            lastGroup = c.group;
            return (
              <div key={c.id} role="presentation">
                {head && (
                  <div className="palette__group" role="presentation">
                    {head}
                  </div>
                )}
                <div
                  id={`pal-${c.id}`}
                  role="option"
                  aria-selected={i === active}
                  data-index={i}
                  className={cx("palette__item", i === active && "is-active")}
                  onMouseMove={() => i !== active && setActive(i)}
                  onClick={() => runAt(i)}
                >
                  {c.icon}
                  <span className="palette__label">{c.label}</span>
                  {c.meta && <span className="palette__meta">{c.meta}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
