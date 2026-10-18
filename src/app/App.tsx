import { useEffect, useMemo, useState } from "react";
import { DEFAULT_PARAMS, prepare, type Design } from "../engine/plant";
import { run } from "../engine/run";
import { Method } from "./Method";
import { CAMPUSES, DEFAULT_CAP_SHARE, loadWeather, type WeatherFile } from "./model";
import { DayScreen, FixScreen, RuleScreen } from "./screens";

type Tab = "day" | "fix" | "rule";
const TABS: { id: Tab; n: string; label: string }[] = [
  { id: "day", n: "1", label: "The day" },
  { id: "fix", n: "2", label: "The fix" },
  { id: "rule", n: "3", label: "The rule" },
];

function tabFromHash(): Tab {
  const h = window.location.hash.replace("#", "");
  return h === "fix" || h === "rule" ? h : "day";
}

export function App() {
  const [weather, setWeather] = useState<WeatherFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadWeather().then(setWeather, (e: Error) => setError(e.message));
  }, []);

  if (error) return <Failure message={error} />;
  if (!weather) return <div className="loading" aria-busy="true" />;
  return <Studio weather={weather} />;
}

function Studio({ weather }: { weather: WeatherFile }) {
  const [tab, setTab] = useState<Tab>(tabFromHash);
  const [campusId, setCampusId] = useState(CAMPUSES[0]!.id);
  const [design, setDesign] = useState<Design>("hybrid");
  const [richmondDown, setRichmondDown] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const campus = CAMPUSES.find((c) => c.id === campusId) ?? CAMPUSES[0]!;

  const prep = useMemo(() => prepare(weather, { ...DEFAULT_PARAMS, itMW: campus.mw }), [weather, campus.mw]);
  const shown = useMemo(() => run(prep, { kind: "design", design }), [prep, design]);
  const hybrid = useMemo(() => run(prep, { kind: "design", design: "hybrid" }), [prep]);

  const scale = campus.mw / 100;
  const capRange: [number, number] = [round2(0.2 * scale), round2(hybrid.maxDayGal / 1e6)];
  const [capMgd, setCapMgd] = useState(() => round2((hybrid.maxDayGal / 1e6) * DEFAULT_CAP_SHARE));
  useEffect(() => setCapMgd(round2((hybrid.maxDayGal / 1e6) * DEFAULT_CAP_SHARE)), [hybrid]);
  // A full year re-plans in a few milliseconds, so the slider drives the optimizer directly.
  const plan = useMemo(
    () => run(prep, { kind: "cap", capGalPerDay: capMgd * 1e6, peakLimitMW: hybrid.peakMW, annualGal: hybrid.annualGal }),
    [prep, capMgd, hybrid],
  );

  useEffect(() => {
    window.history.replaceState(null, "", `#${tab}`);
  }, [tab]);

  // Keys for people who use this every day: 1 2 3 switch screens, arrows move the cap, ? opens the method.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement && e.target.type !== "range") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "1") setTab("day");
      else if (e.key === "2") setTab("fix");
      else if (e.key === "3") setTab("rule");
      else if (e.key === "?" || e.key === "/") setMethodOpen((o) => !o);
      else if (e.key === "Escape") setMethodOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="app">
      <header className="bar">
        <a className="brand" href="#day" onClick={() => setTab("day")} aria-label="Max Day, home">
          <Mark />
          <span>Max Day</span>
        </a>
        <nav className="tabs" aria-label="Story">
          {TABS.map((t) => (
            <button key={t.id} type="button" className="tab" aria-current={tab === t.id ? "page" : undefined} onClick={() => setTab(t.id)}>
              <span className="tab-n">{t.n}</span>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="bar-end">
          <button type="button" className="btn-quiet" onClick={() => setMethodOpen(true)}>How it works</button>
        </div>
      </header>

      <main className="main">
        {tab === "day" ? (
          <DayScreen
            year={weather.year}
            campus={campus}
            setCampus={setCampusId}
            design={design}
            setDesign={setDesign}
            result={shown}
            richmondDown={richmondDown}
            setRichmondDown={setRichmondDown}
          />
        ) : null}
        {tab === "fix" ? <FixScreen year={weather.year} hybrid={hybrid} plan={plan} capMgd={capMgd} setCapMgd={setCapMgd} capRange={capRange} /> : null}
        {tab === "rule" ? <RuleScreen campus={campus} plan={plan} hybrid={hybrid} capMgd={capMgd} /> : null}
      </main>

      <footer className="foot">
        Modeled, not measured. Hourly weather: {weather.name} (KOFP), {weather.year}. Water systems don't fail on average days.
      </footer>

      <Method open={methodOpen} onClose={() => setMethodOpen(false)} weather={weather} />
    </div>
  );
}

function round2(x: number) {
  return Math.round(x * 100) / 100;
}

function Mark() {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="8" className="mark-bg" />
      <path d="M6 22h5l3-4 3 3 4-12 3 9h3" fill="none" stroke="#efa23a" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Failure({ message }: { message: string }) {
  return (
    <div className="failure" role="alert">
      <h1>Max Day couldn't load its weather data.</h1>
      <p>{message}</p>
    </div>
  );
}
