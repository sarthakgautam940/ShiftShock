import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  BookOpen,
  Cpu,
  Check,
  ChevronRight,
  ChevronsUpDown,
  Columns3,
  Download,
  FileJson,
  FileText,
  LayoutGrid,
  Link2,
  Menu,
  Monitor,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Printer,
  Search,
  SlidersHorizontal,
  Sun,
} from "lucide-react";
import { cx } from "../kit/cx";
import { CAMPUSES, HANOVER } from "./model";
import { mgd } from "./format";
import { Kbd, Switch } from "./primitives";
import { VIEWS, useWorkspace, type View } from "./workspace";
import { downloadDailyCsv, downloadScenarioJson } from "./export";

const VIEW_ICON: Record<View, ReactNode> = {
  overview: <LayoutGrid />,
  plan: <SlidersHorizontal />,
  compare: <Columns3 />,
  condition: <FileText />,
  method: <BookOpen />,
  rig: <Cpu />,
};

type Theme = "system" | "paper" | "night";

function readTheme(): Theme {
  const t = document.documentElement.dataset.theme;
  return t === "paper" || t === "night" ? t : "system";
}

function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(readTheme);
  const cycle = () => {
    const next: Theme = theme === "system" ? "paper" : theme === "paper" ? "night" : "system";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("sg-theme", next);
    } catch {
      // Storage refused: the theme still applies for this visit.
    }
    setTheme(next);
  };
  return [theme, cycle];
}

/** Closes a popover on outside click or Escape. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

function CampusSwitcher({ onPick }: { onPick: () => void }) {
  const { s, set, m } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [mw, setMw] = useState(String(s.customMW));
  const [gal, setGal] = useState("");
  const ref = useDismiss(open, () => setOpen(false));
  // A tower's worst day scales with IT load, so a water figure on the record reads back to megawatts.
  const towerGalPerMW = m.tower.maxDayGal / m.campus.mw;
  const pick = (patch: Parameters<typeof set>[0]) => {
    set({ capMgd: null, peakMW: null, ...patch });
    setOpen(false);
    onPick();
  };
  const fromGal = Number(gal.replace(/,/g, "")) * (gal.toLowerCase().includes("m") ? 1e6 : 1);
  const impliedMW = Number.isFinite(fromGal) && fromGal > 0 ? Math.round(fromGal / towerGalPerMW) : null;

  return (
    <div className="menu-wrap" ref={ref}>
      <button type="button" className="campus-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="avatar">{m.campus.short}</span>
        <span className="campus-btn__text">
          <div className="campus-btn__name">{m.campus.name}</div>
          <div className="campus-btn__meta tnum">{m.campus.mw.toLocaleString("en-US")} MW IT load</div>
        </span>
        <ChevronsUpDown />
      </button>
      {open && (
        <div className="menu campus-menu" role="menu" style={{ top: "calc(100% + 6px)", left: 0, width: 300 }}>
          <div className="menu__label">Hanover County projects</div>
          {CAMPUSES.map((c) => (
            <button key={c.id} type="button" role="menuitem" className={cx("menu__item", c.id === s.campusId && "is-active")} onClick={() => pick({ campusId: c.id })}>
              <span className="avatar">{c.short}</span>
              <span>
                <div style={{ fontWeight: 560 }}>{c.name}</div>
                <div className="campus-btn__meta">{c.status}</div>
              </span>
              <span className="menu__meta tnum">{c.mw.toLocaleString("en-US")} MW</span>
            </button>
          ))}
          <div className="menu__sep" />
          <div className="menu__label">Custom campus</div>
          <form
            className="custom-form"
            onSubmit={(e) => {
              e.preventDefault();
              const v = Number(mw);
              if (Number.isFinite(v) && v > 0) pick({ campusId: "custom", customMW: Math.min(5000, Math.round(v)) });
            }}
          >
            <label className="field">
              <input aria-label="IT load in megawatts" inputMode="numeric" value={mw} onChange={(e) => setMw(e.target.value)} />
              <span>MW IT</span>
            </label>
            <button type="submit" className="btn btn--secondary">Open</button>
          </form>
          <form
            className="custom-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (impliedMW) pick({ campusId: "custom", customMW: Math.min(5000, impliedMW), design: "tower" });
            }}
          >
            <label className="field">
              <input aria-label="Water figure on the record, gallons per day" placeholder="1,200,000" value={gal} onChange={(e) => setGal(e.target.value)} />
              <span>gal/day</span>
            </label>
            <button type="submit" className="btn btn--secondary" disabled={!impliedMW}>
              {impliedMW ? `${impliedMW.toLocaleString("en-US")} MW` : "Size"}
            </button>
          </form>
          <p className="menu__hint">A water figure from the record reads back to the IT load whose cooling-tower worst day matches it.</p>
        </div>
      )}
    </div>
  );
}

function ExportMenu() {
  const { s, set, m } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const copyLink = () => {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  };
  return (
    <div className="menu-wrap" ref={ref}>
      <button type="button" className="btn btn--secondary" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Download />
        <span className="hide-sm">Export</span>
      </button>
      {open && (
        <div className="menu" role="menu" style={{ top: "calc(100% + 6px)", right: 0 }}>
          <button type="button" role="menuitem" className="menu__item" onClick={() => (downloadDailyCsv(m), setOpen(false))}>
            <Download />
            Daily water, all designs
            <span className="menu__meta">CSV</span>
          </button>
          <button type="button" role="menuitem" className="menu__item" onClick={() => (downloadScenarioJson(m, s), setOpen(false))}>
            <FileJson />
            Scenario and results
            <span className="menu__meta">JSON</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="menu__item"
            onClick={() => {
              setOpen(false);
              set({ view: "condition" });
              setTimeout(() => window.print(), 120);
            }}
          >
            <Printer />
            Print the condition
            <span className="menu__meta">Letter</span>
          </button>
          <div className="menu__sep" />
          <button type="button" role="menuitem" className="menu__item" onClick={copyLink}>
            {copied ? <Check /> : <Link2 />}
            {copied ? "Link copied" : "Copy link to this view"}
          </button>
        </div>
      )}
    </div>
  );
}

export function Shell({ children, onSearch }: { children: ReactNode; onSearch: () => void }) {
  const { s, set, m } = useWorkspace();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [theme, cycleTheme] = useTheme();
  const viewLabel = VIEWS.find((v) => v.id === s.view)!.label;
  const supplyNow = s.richmondDown ? HANOVER.supply - HANOVER.richmond : HANOVER.supply;
  const go = (view: View) => {
    set({ view });
    setDrawer(false);
  };

  return (
    <div className={cx("shell sg-app", collapsed && "is-collapsed", drawer && "is-drawer")}>
      <aside className="side" aria-label="Workspace">
        <div className="side__brand">
          <img src="/mark.svg" alt="" />
          <span className="side__label">Max Day</span>
        </div>
        <CampusSwitcher onPick={() => setDrawer(false)} />
        <div className="side__section">Workspace</div>
        <nav className="nav">
          {VIEWS.map((v, i) => (
            <button key={v.id} type="button" className={cx("nav__item", s.view === v.id && "is-on")} aria-current={s.view === v.id ? "page" : undefined} onClick={() => go(v.id)} title={collapsed ? v.label : undefined}>
              {VIEW_ICON[v.id]}
              <span className="side__label">{v.label}</span>
              <span className="nav__key">{i + 1}</span>
            </button>
          ))}
        </nav>
        <div className="side__spacer" />
        <div className="county" aria-label="County water system">
          <div className="county__top">
            <span>Hanover County</span>
            <span className="tnum">{mgd(supplyNow, 3)}</span>
          </div>
          <div className="county__sub">Suburban supply, MGD</div>
          <div className="county__bar" aria-hidden="true">
            <span className={cx(s.richmondDown && "is-off")} style={{ flex: HANOVER.richmond }} />
            <span style={{ flex: HANOVER.doswell }} />
            <span style={{ flex: HANOVER.henrico }} />
          </div>
          <div className={cx("county__status", s.richmondDown && "is-alarm")}>
            {s.richmondDown ? "× Richmond contract offline, stress test" : "Richmond 20, Doswell 4.0, Henrico 0.775"}
          </div>
        </div>
        <div className="side__foot">
          <button type="button" className="nav__item" onClick={cycleTheme} title="Theme">
            {theme === "night" ? <Moon /> : theme === "paper" ? <Sun /> : <Monitor />}
            <span className="side__label">{theme === "night" ? "Night" : theme === "paper" ? "Paper" : "System theme"}</span>
          </button>
          <button type="button" className="nav__item hide-sm" onClick={() => setCollapsed(!collapsed)} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            <span className="side__label">Collapse</span>
          </button>
        </div>
      </aside>
      {drawer && <div className="scrim" onClick={() => setDrawer(false)} />}

      <div className="main">
        <header className="top">
          <button type="button" className="btn btn--ghost btn--icon top__menu" aria-label="Open navigation" onClick={() => setDrawer(true)}>
            <Menu />
          </button>
          <nav className="crumbs" aria-label="Breadcrumb">
            <span className="crumb-county">Hanover County</span>
            <ChevronRight className="crumb-sep1" />
            <span>{m.campus.name}</span>
            <ChevronRight />
            <b>{viewLabel}</b>
          </nav>
          <button type="button" className="top__search" onClick={onSearch} aria-label="Search and commands">
            <Search />
            <span>Search or jump to</span>
            <Kbd>Ctrl K</Kbd>
          </button>
          <div className="top__right">
            <Switch
              checked={s.richmondDown}
              onChange={(v) => set({ richmondDown: v })}
              label={<span>Richmond plant down</span>}
              hint="Stress test: Richmond's January 6, 2025 plant failure, moved to the worst day. Supply drops to 4.775 MGD."
            />
            <ExportMenu />
          </div>
        </header>
        <main className="content" id="content">
          {children}
        </main>
      </div>
    </div>
  );
}
