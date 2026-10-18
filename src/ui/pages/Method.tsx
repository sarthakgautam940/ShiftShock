import type { ReactNode } from "react";
import { PageHead, Region } from "../../kit";

function Eq({ children }: { children: ReactNode }) {
  return <p className="md-eq">{children}</p>;
}

const STEPS: { title: string; body: string; eq: ReactNode }[] = [
  {
    title: "Latent heat, the translator",
    body: "Evaporating water absorbs about 2.43 MJ/kg near 25 °C. One gallon is 3.785 kg, so rejecting one kilowatt-hour purely by evaporation costs:",
    eq: (
      <>
        3.6 MJ ÷ (2.43 MJ/kg × 3.785 kg/gal) ≈ 0.39 gal/kWh
      </>
    ),
  },
  {
    title: "Wet-bulb temperature",
    body: "Computed from dry-bulb temperature T (°C) and relative humidity RH (%). Cross-checked with Stull (2011), valid for RH 5 to 99% and T from −20 to 50 °C near sea level.",
    eq: (
      <>
        T<sub>w</sub> = T·atan(0.151977·√(RH + 8.313659)) + atan(T + RH) − atan(RH − 1.676331) + 0.00391838·RH
        <sup>1.5</sup>·atan(0.023101·RH) − 4.686035
      </>
    ),
  },
  {
    title: "Saturation vapor pressure (Buck)",
    body: "For any psychrometric step.",
    eq: (
      <>
        e<sub>s</sub>(T) = 0.61121·exp[(18.678 − T/234.5)·T/(257.14 + T)] kPa
      </>
    ),
  },
  {
    title: "Heat to reject",
    body: "Nearly all electricity becomes heat: the IT load in MW, scaled by the engine's overhead factor.",
    eq: (
      <>
        Q<sub>h</sub> = k<sub>heat</sub>·P<sub>IT</sub>
      </>
    ),
  },
  {
    title: "Water in wet mode",
    body: "w is the share of an hour's heat rejected by evaporation, η the latent fraction of it, h_fg the latent heat and N the cycles of concentration. E is evaporation, B blowdown, and M makeup, the water the utility supplies. Drift is neglected.",
    eq: (
      <>
        E<sub>h</sub> = w<sub>h</sub>·η·3600·Q<sub>h</sub> / (h<sub>fg</sub> × 3.785) gal, B<sub>h</sub> = E<sub>h</sub> /
        (N − 1), M<sub>h</sub> = E<sub>h</sub> + B<sub>h</sub>
      </>
    ),
  },
  {
    title: "Electricity",
    body: "Dry rejection needs more compressor work as the air warms. Dry mode depends on T, wet mode on the wet-bulb.",
    eq: (
      <>
        ΔP<sub>h</sub> = Q<sub>h</sub>·(1/COP<sub>dry</sub>(T<sub>h</sub>) − 1/COP<sub>wet</sub>(T<sub>w,h</sub>)), P
        <sub>h</sub> = P<sub>IT</sub> + P<sub>base</sub> + (1 − w<sub>h</sub>)·ΔP<sub>h</sub>
      </>
    ),
  },
  {
    title: "Each design as a rule for the wet share",
    body: "Cooling tower: always 1. Closed-circuit evaporative: 1, with the coil's parameters. Dry: 0. Adiabatic hybrid: 1 when the hour is hotter than the switch temperature, else 0.",
    eq: (
      <>
        w<sub>h</sub> ∈ [0, 1]
      </>
    ),
  },
  {
    title: "Carbon",
    body: "EPA eGRID2023, SRVC (SERC Virginia/Carolina) region.",
    eq: (
      <>
        CO<sub>2</sub> = 593.4 lb/MWh × Σ<sub>h</sub> P<sub>h</sub>
      </>
    ),
  },
  {
    title: "Fix A: cap the max day",
    body: "For each day with a budget C in gallons, choose each hour's wet share to save the most electricity. The peak-power limit sets a floor on each hour's wet share. Spend the floors first, then fill the hours with the best kWh saved per gallon. This is the fractional knapsack, and it is provably optimal.",
    eq: (
      <>
        max Σ w<sub>h</sub>b<sub>h</sub> subject to Σ w<sub>h</sub>a<sub>h</sub> ≤ C, w<sub>h</sub> ≥ w<sub>h</sub>
        <sup>min</sup>, w<sub>h</sub><sup>min</sup> = max(0, (P<sub>IT</sub> + P<sub>base</sub> + ΔP<sub>h</sub> − P
        <sub>lim</sub>) / ΔP<sub>h</sub>)
      </>
    ),
  },
  {
    title: "Fix B: cold storage (specified)",
    body: "A chilled-water tank charges at night and discharges late afternoon. At an 8 °C swing, one MWh of cooling needs about 107,500 kg of water, about 28,400 gallons.",
    eq: (
      <>
        s<sub>h+1</sub> = s<sub>h</sub> + c<sub>h</sub> − x<sub>h</sub>, 0 ≤ s<sub>h</sub> ≤ S<sub>max</sub>, Q′
        <sub>h</sub> = Q<sub>h</sub> + c<sub>h</sub> − x<sub>h</sub>
      </>
    ),
  },
];

const CONSTANTS: { name: string; value: string; source: string }[] = [
  { name: "Hanover suburban supply capacity", value: "24.775 MGD (Richmond 20, Doswell 4.0, Henrico 0.775)", source: "Hanover County utility figures" },
  { name: "Hanover peak daily use", value: "About 11.7 MGD", source: "Hanover County utility figures" },
  { name: "Capacity with the Richmond contract down", value: "4.775 MGD", source: "Derived: 24.775 minus 20" },
  { name: "Iron Horse water on record", value: "Up to 1.2 MGD, plus 250,000 gal/day wastewater", source: "WRIC hearing coverage" },
  { name: "Mountain Road water", value: "About 600,000 gal/day, up to 90% of its zone", source: "12 On Your Side, May 28, 2026" },
  { name: "Latent heat of vaporization", value: "2.43 MJ/kg at 25 °C", source: "Standard steam tables" },
  { name: "Water density and heat capacity", value: "3.785 kg/gal; 4,186 J/(kg·K)", source: "Standard" },
  { name: "Grid CO2 rate", value: "593.4 lb CO2/MWh, SRVC", source: "EPA eGRID2023 (revision 2)" },
  { name: "Hybrid switch temperature", value: "27 °C", source: "Planning assumption" },
  { name: "Cycles, COP curves, k_heat, η, P_base", value: "Per the engine's documentation", source: "Planning assumptions, shown as ranges" },
];

const LIMITS = [
  "No terrain, no plume, no water chemistry beyond cycles of concentration.",
  "No utility hydraulics: zone-level capacity is unknown, so the county chart uses system totals.",
  "Plant parameters are planning assumptions and are shown as ranges.",
  "Every engine figure is modeled from measured weather. None is a metered reading.",
];

export function Method() {
  return (
    <div className="md-doc">
      <PageHead
        title="Method"
        lead="Every hour of 2025 runs through one chain."
        rest="Measured weather, heat to reject, how much of it leaves as evaporated water, and what the rest costs in electricity."
      />

      <Region title="Equations">
        <ol className="md-steps">
          {STEPS.map((s) => (
            <li key={s.title} className="md-step">
              <h3 className="md-step__title">{s.title}</h3>
              <p className="md-step__body">{s.body}</p>
              <Eq>{s.eq}</Eq>
            </li>
          ))}
        </ol>
      </Region>

      <Region title="Constants" note="Each with where it comes from. Planning assumptions are labeled as such.">
        <div className="md-tablewrap">
          <table className="md-table">
            <thead>
              <tr>
                <th scope="col">Constant</th>
                <th scope="col">Value</th>
                <th scope="col">Source</th>
              </tr>
            </thead>
            <tbody>
              {CONSTANTS.map((c) => (
                <tr key={c.name}>
                  <th scope="row">{c.name}</th>
                  <td className="sg-tnum">{c.value}</td>
                  <td>{c.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Region>

      <Region title="Tests" note="The engine ships with its suite beside the code.">
        <p className="md-doc__p">
          Results list here once the engine and its tests are in the repository: psychrometric checks against reference
          values, the 0.39 gal/kWh conversion, blowdown at known cycles, each design's rule, the knapsack against brute
          force, monotonicity, and the locked headline.
        </p>
      </Region>

      <Region title="Limits">
        <ul className="md-list">
          {LIMITS.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </Region>
    </div>
  );
}
