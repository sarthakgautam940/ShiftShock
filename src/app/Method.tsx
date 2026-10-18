import { useEffect, useRef } from "react";
import { DEFAULT_PARAMS } from "../engine/plant";
import type { WeatherFile } from "./model";

const P = DEFAULT_PARAMS;

/** Everything a skeptical engineer would ask, kept out of the way until asked for. */
export function Method({ open, onClose, weather }: { open: boolean; onClose: () => void; weather: WeatherFile }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) panel.current?.focus();
  }, [open]);
  if (!open) return null;
  return (
    <div className="drawer-layer" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="drawer" role="dialog" aria-modal="true" aria-labelledby="method-title" tabIndex={-1} ref={panel}>
        <header className="drawer-head">
          <h2 id="method-title">How it works</h2>
          <button type="button" className="btn-quiet" onClick={onClose} aria-label="Close">Close</button>
        </header>

        <section className="m-block">
          <h3>1. Measured weather</h3>
          <p>Every hour of {weather.year} at {weather.name}, from the {weather.source}. {weather.filledHours} short gaps filled by interpolation.</p>
        </section>

        <section className="m-block">
          <h3>2. Heat to water</h3>
          <p className="eq">Q = k<sub>heat</sub> · P<sub>IT</sub></p>
          <p className="eq">Evaporation = w · η · 3600 · Q ÷ (2.43 MJ/kg × 3.785 kg/gal)</p>
          <p className="eq">Makeup = evaporation × N ÷ (N − 1)</p>
          <p>About 0.39 gallons carry off one kWh of heat. Wet-bulb temperature from Stull (2011).</p>
        </section>

        <section className="m-block">
          <h3>3. Water to power</h3>
          <p className="eq">ΔP = Q · (1/COP<sub>dry</sub>(T) − 1/COP<sub>wet</sub>(T<sub>w</sub>))</p>
          <p className="eq">P = P<sub>IT</sub> + P<sub>base</sub> + (1 − w) · ΔP</p>
          <p>Running dry costs the most on the hottest afternoons, which are also the grid's peak.</p>
        </section>

        <section className="m-block">
          <h3>4. The optimizer</h3>
          <p>Each hour trades gallons for kilowatt-hours at a fixed rate. Max Day first meets a peak-power floor, then spends water on the hours with the most kWh saved per gallon, until each day's cap and the year's budget are spent. That greedy fill is provably optimal (fractional knapsack), and a full year re-plans in a few milliseconds.</p>
        </section>

        <section className="m-block">
          <h3>Planning assumptions</h3>
          <table className="m-table">
            <tbody>
              <tr><th>Heat per IT MW, k<sub>heat</sub></th><td>{P.kHeat}</td></tr>
              <tr><th>Latent share, η</th><td>{P.etaBase} + {P.etaSlope} × (T<sub>w</sub> − 15)</td></tr>
              <tr><th>Cycles of concentration</th><td>{P.cycles} (closed loop {P.closedCycles})</td></tr>
              <tr><th>COP dry</th><td>{P.copDry0} − {P.copDrySlope} × T</td></tr>
              <tr><th>COP wet</th><td>{P.copWet0} − {P.copWetSlope} × T<sub>w</sub></td></tr>
              <tr><th>P<sub>base</sub></th><td>{P.pBaseMW} MW</td></tr>
              <tr><th>Hybrid switch</th><td>{P.switchC} °C</td></tr>
              <tr><th>Grid carbon, SRVC</th><td>593.4 lb CO₂/MWh (EPA eGRID2023)</td></tr>
            </tbody>
          </table>
          <p>Calibrated so a 100 MW cooling tower's worst day lands at about 1.26 MGD, matching Iron Horse's "up to 1.2 MGD" on the record.</p>
        </section>

        <section className="m-block">
          <h3>Hanover's system</h3>
          <p>24.775 MGD of supply: Richmond contract 20, Doswell 4.0, Henrico 0.775. Peak use about 11.7 MGD. "Richmond plant down" is a stress test of the January 2025 failure, moved to July.</p>
        </section>

        <section className="m-block">
          <h3>Limits</h3>
          <p>System totals, not zone hydraulics. No water chemistry beyond cycles. Plant parameters are planning assumptions. Engine outputs are modeled; only the weather is measured.</p>
        </section>
      </div>
    </div>
  );
}
