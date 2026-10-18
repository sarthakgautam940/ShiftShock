import { DESIGNS, PRESETS } from "../content";
import { useStudy } from "../state";

/**
 * The headline pair: the average day the debate quotes, and the max day the
 * water system is sized for. Both are engine output, so until the engine runs
 * each figure holds its place at full size rather than showing a number.
 */
export function Headline() {
  const { state } = useStudy();
  const preset = PRESETS.find((p) => p.id === state.preset);
  const design = DESIGNS.find((d) => d.id === state.design);
  const campus = preset ? preset.name : "Custom campus";

  return (
    <section className="md-headline" aria-labelledby="md-headline-title">
      <h1 className="md-headline__title" id="md-headline-title">
        {campus}, {state.itLoadMW.toLocaleString("en-US")} MW, {design?.label.toLowerCase()}
      </h1>
      <div className="md-headline__pair">
        <HeadlineFigure label="Average day" note="Modeled. Mean of the 365 days of 2025." tone="quiet" />
        <HeadlineFigure label="Max day" note="Modeled. The worst calendar day, with its date." tone="peak" />
      </div>
    </section>
  );
}

function HeadlineFigure({ label, note, tone }: { label: string; note: string; tone: "quiet" | "peak" }) {
  return (
    <div className="md-figure" data-tone={tone}>
      <span className="md-figure__label">{label}</span>
      <span className="md-figure__value">
        <span className="md-figure__pending" aria-label={`${label}: waiting on the engine`} role="img" />
        <span className="md-figure__unit">MGD</span>
      </span>
      <span className="md-figure__note">{note}</span>
    </div>
  );
}
