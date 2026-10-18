import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "../../kit";
import { CONDITION_TEMPLATE, DESIGNS, PRESETS } from "../content";
import { navigate } from "../route";
import { useStudy } from "../state";

const METHOD_LINES = [
  "Weather: every hour of 2025, measured at Hanover County Municipal Airport (KOFP).",
  "Water: heat to reject, the share leaving as evaporation by latent heat, plus blowdown at the set cycles.",
  "The cap: a fractional knapsack per day, spending water in the hours that save the most power per gallon.",
];

const LIMITS = [
  "Plant parameters are planning assumptions, shown as ranges.",
  "System totals, not zone hydraulics.",
  "No water chemistry beyond cycles of concentration.",
];

/** The drafted condition, as text with the cap left for the engine to fill. */
function DraftedCondition() {
  return (
    <p className="md-letter__condition">
      {CONDITION_TEMPLATE.before}
      <span className="md-letter__blank" role="img" aria-label="cap, filled when the engine runs" />
      {CONDITION_TEMPLATE.after}
    </p>
  );
}

/** The US-letter page a county or DEQ could hold. Print CSS hides the shell. */
export function Condition() {
  const { state } = useStudy();
  const preset = PRESETS.find((p) => p.id === state.preset);
  const design = DESIGNS.find((d) => d.id === state.design);

  return (
    <div className="md-condition">
      <div className="md-condition__bar" data-print="hide">
        <Button variant="ghost" icon={<ArrowLeft size={15} aria-hidden />} onClick={() => navigate("study")}>
          Back to the study
        </Button>
        <span style={{ flex: 1 }} />
        <Button variant="primary" icon={<Printer size={15} aria-hidden />} onClick={() => window.print()}>
          Print the condition
        </Button>
      </div>

      <article className="md-letter" aria-labelledby="md-letter-title">
        <p className="md-letter__draft">Draft for discussion. Not legal advice.</p>
        <h1 className="md-letter__title" id="md-letter-title">
          A max-day water condition for {preset ? preset.name : "a custom campus"}
        </h1>
        <p className="md-letter__meta">
          {state.itLoadMW.toLocaleString("en-US")} MW of IT load, {design?.label.toLowerCase()}, Hanover County, Virginia
        </p>

        <section className="md-letter__section">
          <h2>Finding</h2>
          <p>
            The campus's average day and its max day, from a year of measured weather, and how far the cheapest cap
            lowers the max day at the same annual water and the same peak power.
          </p>
          <div className="md-letter__lines" role="img" aria-label="Finding, filled when the engine runs">
            <span />
            <span />
          </div>
        </section>

        <section className="md-letter__section">
          <h2>The record, in three charts</h2>
          <div className="md-letter__charts">
            {["The year", "The county", "The max day"].map((name) => (
              <figure key={name} className="md-letter__chart">
                <div className="md-letter__chartbox" aria-hidden />
                <figcaption>{name}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="md-letter__section">
          <h2>Drafted condition</h2>
          <DraftedCondition />
        </section>

        <section className="md-letter__section md-letter__cols">
          <div>
            <h2>Method</h2>
            <ul>
              {METHOD_LINES.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2>Limits</h2>
            <ul>
              {LIMITS.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        </section>

        <footer className="md-letter__foot">
          Modeled, not measured. Sources: Iowa Environmental Mesonet ASOS archive (KOFP, 2025); Hanover County utility
          figures; EPA eGRID2023 (SRVC). Full list on the Sources page.
        </footer>
      </article>
    </div>
  );
}

/** The condition inside the study's phone tabs: the clause and a way to the full page. */
export function ConditionPreview() {
  return (
    <div className="md-condition-preview">
      <p className="md-letter__draft">Draft for discussion. Not legal advice.</p>
      <DraftedCondition />
      <Button variant="primary" onClick={() => navigate("condition")}>
        Open the printable page
      </Button>
    </div>
  );
}
