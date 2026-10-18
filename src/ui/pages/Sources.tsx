import { PageHead, Region } from "../../kit";

/**
 * Section 18 of the handoff, by title. Links are added as each source is
 * re-opened and its URL confirmed; none is reconstructed from memory.
 */
const GROUPS: { title: string; items: string[] }[] = [
  {
    title: "Data centers, water and policy",
    items: [
      "Iron Horse, Planning Commission backing (12 On Your Side, Aug 21, 2026)",
      "Iron Horse history (VPM, Dec 2024)",
      "Mountain Road Tech Park denied (12 On Your Side, May 28, 2026)",
      "Tract Hickory Hill park (Richmond BizSense)",
      "Hunting Hawk withdrawn (Richmond BizSense, Jan 30, 2026)",
      "Chesterfield halts data center rezonings (Richmond BizSense, Aug 27, 2026)",
      "QTS Henrico expansion (Richmond BizSense, May 18, 2026)",
      "Executive Order 22 coverage (12 On Your Side, Sept 18, 2026)",
      "JLARC, Data Centers in Virginia (Dec 2024)",
      "Richmond water plant after-action report (January 2025 failure)",
      "DEQ groundwater report to the General Assembly (2026)",
    ],
  },
  {
    title: "Power context",
    items: [
      "Dominion Energy FY2025 10-K",
      "PJM capacity auction prices (Utility Dive)",
      "SCC rate decision (Cardinal News, Nov 26, 2025)",
      "Henrico power costs and schools (Futurism)",
    ],
  },
  {
    title: "Data and science",
    items: [
      "Iowa Environmental Mesonet ASOS archive, station OFP, Hanover County Municipal Airport",
      "EPA eGRID downloads, SRVC 593.4 lb CO2/MWh, eGRID2023",
      "Stull, R. (2011), Wet-Bulb Temperature from Relative Humidity and Air Temperature, Journal of Applied Meteorology and Climatology 50(11)",
      "Radovanović et al. (2021), Carbon-Aware Computing for Datacenters",
    ],
  },
];

export function Sources() {
  return (
    <div className="md-doc">
      <PageHead
        title="Sources"
        lead="Every figure on screen traces to one of these."
        rest="Read October 15 to 18, 2026. Weather is measured; every engine output is modeled."
      />
      {GROUPS.map((g) => (
        <Region key={g.title} title={g.title}>
          <ul className="md-sources">
            {g.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Region>
      ))}
    </div>
  );
}
