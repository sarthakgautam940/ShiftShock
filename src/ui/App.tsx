import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { loadWeather, type WeatherFile } from "./model";
import { Shell } from "./Shell";
import { Palette } from "./Palette";
import { Overview } from "./pages/Overview";
import { Plan } from "./pages/Plan";
import { Compare } from "./pages/Compare";
import { Condition } from "./pages/Condition";
import { Method } from "./pages/Method";
import { Rig } from "./pages/Rig";
import { VIEWS, WorkspaceProvider, useWorkspace, type View } from "./workspace";

export function App() {
  const [weather, setWeather] = useState<WeatherFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadWeather().then(setWeather, (e: Error) => setError(e.message));
  }, []);

  if (error) return <Failure message={error} />;
  if (!weather) return <Booting />;
  return (
    <WorkspaceProvider weather={weather}>
      <Workspace />
    </WorkspaceProvider>
  );
}

const PAGES: Record<View, () => React.JSX.Element> = {
  overview: Overview,
  plan: Plan,
  compare: Compare,
  condition: Condition,
  method: Method,
  rig: Rig,
};

const G_KEYS: Record<string, View> = { o: "overview", p: "plan", c: "compare", d: "condition", m: "method", r: "rig" };

function isTyping(t: EventTarget | null): boolean {
  return t instanceof HTMLElement && (t.isContentEditable || t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT");
}

function Workspace() {
  const { s, set, m } = useWorkspace();
  const [palette, setPalette] = useState(false);

  // Keys for people who open this every week: 1 to 6 or G then a letter switch views,
  // arrows move the cap by 10,000 gallons, Ctrl or Cmd K and / open the command bar.
  useEffect(() => {
    let gAt = 0;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
        return;
      }
      if (palette || isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        setPalette(true);
        return;
      }
      const n = Number(e.key);
      if (n >= 1 && n <= VIEWS.length) {
        set({ view: VIEWS[n - 1]!.id });
        return;
      }
      if (e.key.toLowerCase() === "g") {
        gAt = Date.now();
        return;
      }
      const target = G_KEYS[e.key.toLowerCase()];
      if (target && Date.now() - gAt < 1200) {
        gAt = 0;
        set({ view: target });
        return;
      }
      if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && s.view === "plan" && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        const step = m.capStep * (e.shiftKey ? 5 : 1) * (e.key === "ArrowRight" ? 1 : -1);
        const next = Math.min(m.capRange[1], Math.max(m.capRange[0], m.capGal + step));
        set({ capMgd: next / 1e6 });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [palette, s.view, m.capGal, m.capRange, m.capStep, set]);

  // Each view starts at its top, as a page would.
  useEffect(() => {
    document.getElementById("content")?.scrollTo({ top: 0 });
    const label = VIEWS.find((v) => v.id === s.view)!.label;
    document.title = `${label}, ${m.campus.name} | Headroom`;
  }, [s.view, m.campus.name]);

  const Page = PAGES[s.view];
  return (
    <Shell onSearch={() => setPalette(true)}>
      <Page />
      {palette && <Palette onClose={() => setPalette(false)} />}
    </Shell>
  );
}

function Booting() {
  return (
    <div className="boot sg-app" aria-busy="true" aria-label="Loading a year of measured weather">
      <div className="boot__side" />
      <div className="boot__main">
        <div className="skel" style={{ height: 40, width: 280 }} />
        <div className="skel" style={{ height: 104 }} />
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 360px", gap: 16 }}>
          <div className="skel" style={{ height: 300 }} />
          <div className="skel" style={{ height: 300 }} />
        </div>
      </div>
    </div>
  );
}

function Failure({ message }: { message: string }) {
  return (
    <div className="failure sg-app" role="alert">
      <div className="failure__box">
        <AlertTriangle style={{ color: "var(--alarm)", width: 20, height: 20, marginBottom: 10 }} />
        <h1>Headroom could not read its weather data</h1>
        <p>{message} Every figure is computed from this file, so nothing is shown rather than a guess.</p>
        <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    </div>
  );
}
