import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { BookMarked, FileText, LineChart, Menu, PanelLeftClose, PanelLeftOpen, Search, Sigma, type LucideIcon } from "lucide-react";
import type { Route } from "../route";
import { CommandPalette } from "./CommandPalette";
import { ThemeMenu } from "./ThemeMenu";

/**
 * The application shell, ported from ShiftGraph: a resizable, collapsible
 * sidebar that becomes a drawer under 1024 px, a frosted top bar with the
 * breadcrumb and a centred search, and the content region. Styling is the
 * kit's (.sg-shell, .sg-sidebar, .sg-nav, .sg-topbar, .sg-main).
 */

export interface NavItem {
  route: Route;
  label: string;
  icon: LucideIcon;
}

export const NAV: readonly NavItem[] = [
  { route: "study", label: "Study", icon: LineChart },
  { route: "condition", label: "Condition", icon: FileText },
  { route: "method", label: "Method", icon: Sigma },
  { route: "sources", label: "Sources", icon: BookMarked },
];

const RAIL_KEY = "md-rail";
const WIDTH_KEY = "md-rail-w";

// MIN keeps every label whole; the gap between COLLAPSE_BELOW and EXPAND_ABOVE
// stops the rail flickering while a pointer rests on the boundary.
const MIN_W = 180;
const MAX_W = 320;
const DEFAULT_W = 220;
const COLLAPSE_BELOW = 140;
const EXPAND_ABOVE = 180;
const COMPACT_AT = 1024;

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode: the choice lasts for the session.
  }
}

export function Shell({ route, children }: { route: Route; children: ReactNode }) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [macKeys, setMacKeys] = useState(false);
  const [collapsed, setCollapsed] = useState(() => readStored(RAIL_KEY) === "1");
  const [width, setWidth] = useState(() => {
    const stored = Number(readStored(WIDTH_KEY));
    return Number.isFinite(stored) && stored >= MIN_W && stored <= MAX_W ? stored : DEFAULT_W;
  });
  const [compact, setCompact] = useState(() => window.matchMedia(`(max-width: ${COMPACT_AT - 1}px)`).matches);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [resizing, setResizing] = useState(false);

  useEffect(() => {
    setMacKeys(/mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent));
    const mq = window.matchMedia(`(max-width: ${COMPACT_AT - 1}px)`);
    const sync = () => setCompact(mq.matches);
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // A drawer that survives navigation would cover the page just asked for.
  useEffect(() => {
    setDrawerOpen(false);
    window.scrollTo(0, 0);
  }, [route]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const commit = useCallback((next: { collapsed: boolean; width: number }) => {
    setCollapsed(next.collapsed);
    setWidth(next.width);
    store(RAIL_KEY, next.collapsed ? "1" : "0");
    store(WIDTH_KEY, String(next.width));
  }, []);

  const toggleRail = () => commit({ collapsed: !collapsed, width });

  /** Writes the width straight to the CSS property while dragging and commits
   *  on release, so the rail moves with the cursor instead of behind it. */
  function onGripPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (compact || event.button !== 0) return;
    event.preventDefault();
    const grip = event.currentTarget;
    grip.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startWidth = collapsed ? 0 : width;
    let live = { collapsed, width };
    setResizing(true);

    const onMove = (move: PointerEvent) => {
      const raw = startWidth + (move.clientX - startX);
      if (live.collapsed) {
        if (raw > EXPAND_ABOVE) {
          live = { collapsed: false, width: Math.min(MAX_W, raw) };
          setCollapsed(false);
          shellRef.current?.style.setProperty("--sidebar-w", `${live.width}px`);
        }
        return;
      }
      if (raw < COLLAPSE_BELOW) {
        live = { collapsed: true, width: live.width };
        setCollapsed(true);
        return;
      }
      live = { collapsed: false, width: Math.max(MIN_W, Math.min(MAX_W, raw)) };
      shellRef.current?.style.setProperty("--sidebar-w", `${live.width}px`);
    };

    const onUp = () => {
      grip.removeEventListener("pointermove", onMove);
      grip.removeEventListener("pointerup", onUp);
      grip.removeEventListener("pointercancel", onUp);
      setResizing(false);
      commit(live);
    };

    grip.addEventListener("pointermove", onMove);
    grip.addEventListener("pointerup", onUp);
    grip.addEventListener("pointercancel", onUp);
  }

  function onGripKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 32 : 8;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const delta = event.key === "ArrowRight" ? step : -step;
      if (collapsed) {
        if (delta > 0) commit({ collapsed: false, width });
        return;
      }
      const next = width + delta;
      if (next < COLLAPSE_BELOW) commit({ collapsed: true, width });
      else commit({ collapsed: false, width: Math.max(MIN_W, Math.min(MAX_W, next)) });
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleRail();
    }
  }

  const railed = collapsed && !compact;
  const current = NAV.find((n) => n.route === route) ?? NAV[0]!;

  return (
    <div
      className="sg-shell"
      ref={shellRef}
      data-resizing={resizing ? "true" : undefined}
      style={{ "--sidebar-w": `${width}px` } as React.CSSProperties}
    >
      <a href="#sg-main" className="sg-skip-link">
        Skip to content
      </a>
      <CommandPalette />
      <div
        className="sg-drawer-scrim"
        data-open={drawerOpen ? "true" : undefined}
        onClick={() => setDrawerOpen(false)}
        aria-hidden
      />
      <aside
        className="sg-sidebar"
        data-collapsed={railed}
        data-open={drawerOpen ? "true" : undefined}
        aria-hidden={compact && !drawerOpen ? true : undefined}
        inert={compact && !drawerOpen}
      >
        <div className="sg-brandblock">
          <a href="#/study" className="sg-brandblock__ws md-wordmark" title="Max Day" aria-label="Max Day, open the study">
            <img src="/mark.svg" width={24} height={24} alt="" />
            {!railed ? <span className="sg-brandblock__wsname">Max Day</span> : null}
          </a>
        </div>

        <nav className="sg-nav" aria-label="Primary">
          {NAV.map((item) => {
            const active = item.route === route;
            const Icon = item.icon;
            return (
              <a
                key={item.route}
                href={`#/${item.route}`}
                className="sg-nav__item"
                data-active={active}
                aria-current={active ? "page" : undefined}
                title={railed ? item.label : undefined}
                aria-label={railed ? item.label : undefined}
              >
                <Icon size={15} className="sg-nav__icon" />
                {!railed ? <span className="sg-nav__label">{item.label}</span> : null}
              </a>
            );
          })}
        </nav>

        {!railed ? (
          <p className="md-sidebar-note">
            Water systems don't fail on average days.
          </p>
        ) : null}

        <div className="sg-nav__group">
          {!compact ? (
            <button
              type="button"
              onClick={toggleRail}
              className="sg-nav__item"
              aria-label={railed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {railed ? (
                <PanelLeftOpen size={15} className="sg-nav__icon" />
              ) : (
                <PanelLeftClose size={15} className="sg-nav__icon" />
              )}
              {!railed ? <span className="sg-nav__label">Collapse</span> : null}
            </button>
          ) : null}
        </div>

        {!compact ? (
          <div
            className="sg-sidebar__grip"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            aria-valuemin={MIN_W}
            aria-valuemax={MAX_W}
            aria-valuenow={railed ? 0 : width}
            tabIndex={0}
            onPointerDown={onGripPointerDown}
            onKeyDown={onGripKeyDown}
            onDoubleClick={() => commit({ collapsed: false, width: DEFAULT_W })}
          />
        ) : null}
      </aside>

      <div className="sg-shell__body">
        <header className="sg-frost sg-topbar">
          <button
            type="button"
            className="sg-iconbtn sg-topbar__menu"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
          >
            <Menu size={17} />
          </button>
          <nav aria-label="Breadcrumb" className="sg-breadcrumb">
            <a href="#/study">Max Day</a>
            <span className="sg-breadcrumb__sep">/</span>
            <span className="sg-breadcrumb__current">{current.label}</span>
          </nav>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            className="sg-topsearch"
            onClick={() => window.dispatchEvent(new CustomEvent("md:palette"))}
            aria-label="Search pages and commands"
          >
            <Search size={14} aria-hidden />
            <span className="sg-topsearch__label">Search</span>
            <kbd className="sg-topsearch__kbd" aria-hidden>
              {macKeys ? "⌘" : "Ctrl"} K
            </kbd>
          </button>
          <span style={{ flex: 1 }} />
          <div className="sg-topbar__utility">
            <ThemeMenu />
          </div>
        </header>
        <main id="sg-main" tabIndex={-1} className="sg-main">
          <div className="sg-page" key={route}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
