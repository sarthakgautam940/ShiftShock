import { useEffect, useState } from "react";
import { Tabs } from "../../kit";
import { FOOTER_LINE } from "../content";
import { ConditionPreview } from "../pages/Condition";
import { useStudy } from "../state";
import { CountyChart, HourlyChart, YearChart } from "./Charts";
import { FixPanel } from "./FixPanel";
import { Headline } from "./Headline";
import { InputsRail } from "./InputsRail";
import { TranslateBody, TranslateDrawer } from "./Translate";

const COMPACT = "(max-width: 1023px)";

function useCompact(): boolean {
  const [compact, setCompact] = useState(() => window.matchMedia(COMPACT).matches);
  useEffect(() => {
    const mq = window.matchMedia(COMPACT);
    const sync = () => setCompact(mq.matches);
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return compact;
}

type MobileTab = "inputs" | "translate" | "fix" | "condition";

/**
 * The study. Desktop: the input rail beside the main column (headline, year,
 * county, max-day hours). Under 1024 px: the main column stacks and the rail,
 * Translate, Fix and Condition become tabs beneath it.
 */
export function Study() {
  const { state } = useStudy();
  const compact = useCompact();
  const [tab, setTab] = useState<MobileTab>("inputs");

  if (compact) {
    return (
      <div className="md-study md-study--compact">
        <Headline />
        <YearChart />
        <CountyChart />
        <Tabs<MobileTab>
          aria-label="Study tools"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "inputs", label: "Inputs" },
            { value: "translate", label: "Translate" },
            { value: "fix", label: "Fix" },
            { value: "condition", label: "Condition" },
          ]}
        />
        <div className="md-tabpanel">
          {tab === "inputs" ? <InputsRail /> : null}
          {tab === "translate" ? <TranslateBody /> : null}
          {tab === "fix" ? <FixPanel inline /> : null}
          {tab === "condition" ? <ConditionPreview /> : null}
        </div>
        <HourlyChart />
        <p className="md-footnote">{FOOTER_LINE}</p>
      </div>
    );
  }

  return (
    <div className="md-study">
      <aside className="md-study__rail" aria-label="Campus and cooling">
        <InputsRail />
      </aside>
      <div className="md-study__main">
        <Headline />
        {state.fixOpen ? <FixPanel /> : null}
        <YearChart />
        <CountyChart />
        <HourlyChart />
        <p className="md-footnote">{FOOTER_LINE}</p>
      </div>
      <TranslateDrawer />
    </div>
  );
}
