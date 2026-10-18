import { useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { IconButton, Switch, useDialogFocus } from "../../kit";
import { useStudy } from "../state";
import { NumberField } from "./NumberField";

/**
 * Translate runs the record backwards: a water figure from a hearing becomes
 * the heat it implies, so an undisclosed campus can still be sized.
 */
export function TranslateBody() {
  const { state, dispatch } = useStudy();
  return (
    <div className="md-translate">
      <NumberField
        label="Water on the record"
        unit="gal/day"
        value={state.recordGalPerDay}
        min={1000}
        max={50_000_000}
        step={50_000}
        hint="Iron Horse's 1.2 MGD figure is the seeded example."
        onChange={(galPerDay) => dispatch({ type: "record", galPerDay })}
      />
      <label className="md-toggle md-toggle--row">
        <span>
          Figure includes blowdown
          <span className="md-toggle__hint">Makeup water, not only what evaporates.</span>
        </span>
        <Switch
          checked={state.recordIncludesBlowdown}
          onChange={(on) => dispatch({ type: "recordBlowdown", on })}
          label="Figure includes blowdown"
        />
      </label>

      <dl className="md-readouts md-readouts--stack">
        <div className="md-readout">
          <dt>Implied heat rejected</dt>
          <dd>
            <span className="md-readout__pending" role="img" aria-label="waiting on the engine" />
            <span className="md-readout__unit">MW</span>
          </dd>
        </div>
        <div className="md-readout">
          <dt>Implied IT load</dt>
          <dd>
            <span className="md-readout__pending" role="img" aria-label="waiting on the engine" />
            <span className="md-readout__unit">MW, as a range</span>
          </dd>
        </div>
      </dl>
      <p className="md-translate__sentence">
        If fully evaporative, this is <span className="md-inline-pending" role="img" aria-label="waiting on the engine" />{" "}
        MW of heat.
      </p>
      <p className="sg-micro">
        Evaporating one gallon carries off about 0.39 kWh of heat at 2.43 MJ/kg, so a daily water figure fixes the heat
        it can remove.
      </p>
    </div>
  );
}

export function TranslateDrawer() {
  const { state, dispatch } = useStudy();
  const panelRef = useRef<HTMLDivElement>(null);
  const close = () => dispatch({ type: "translate", open: false });
  useDialogFocus(state.translateOpen, panelRef, { onClose: close, lockScroll: true });

  if (!state.translateOpen) return null;
  // Portalled: inside the shell body it would share a stacking context with the
  // sticky top bar, which then paints over the drawer's header.
  return createPortal(
    <>
      <div className="md-drawer-scrim" onClick={close} aria-hidden />
      <div ref={panelRef} className="sg-drawer md-drawer" role="dialog" aria-modal="true" aria-labelledby="md-translate-title" tabIndex={-1}>
        <header className="md-drawer__head">
          <h2 id="md-translate-title" className="md-drawer__title">
            Translate a record
          </h2>
          <IconButton label="Close" onClick={close}>
            <X size={16} />
          </IconButton>
        </header>
        <div className="md-drawer__body">
          <TranslateBody />
        </div>
      </div>
    </>,
    document.body,
  );
}
