import { cx } from "../../kit/cx";
import { HANOVER } from "../model";
import { mgd } from "../format";

/**
 * Hanover's system on the campus's worst day: supply by source above, demand
 * below (the county's own peak use plus the campus), on one scale so the gap
 * between the two bars is the headroom. With Richmond offline the 20 MGD
 * contract drops out of the supply bar and the gap turns into a shortfall.
 */
export function CountyStack({ campusGal, campusName, richmondDown }: { campusGal: number; campusName: string; richmondDown: boolean }) {
  const supply = richmondDown ? HANOVER.supply - HANOVER.richmond : HANOVER.supply;
  const demand = HANOVER.peakUse + campusGal;
  const scale = Math.max(HANOVER.supply, demand) * 1.02;
  const pct = (g: number) => `${(g / scale) * 100}%`;
  const short = demand > supply;

  return (
    <div className="county-stack" role="img" aria-label={`Supply ${mgd(supply, 3)} MGD against demand ${mgd(demand)} MGD: ${short ? `short ${mgd(demand - supply)}` : `headroom ${mgd(supply - demand)}`} MGD.`}>
      <div className="cs-row">
        <div className="cs-head">
          <span>Supply</span>
          <b className="tnum">{mgd(supply, 3)} MGD</b>
        </div>
        <div className="cs-track">
          <span className={cx("cs-seg cs-seg--supply", richmondDown && "is-off")} style={{ width: pct(HANOVER.richmond) }} title="Richmond contract, 20 MGD">
            <em>{richmondDown ? "× Richmond offline" : "Richmond 20"}</em>
          </span>
          <span className="cs-seg cs-seg--supply" style={{ width: pct(HANOVER.doswell) }} title="Doswell plant, 4.0 MGD">
            <em>4.0</em>
          </span>
          <span className="cs-seg cs-seg--supply" style={{ width: pct(HANOVER.henrico) }} title="Henrico, 0.775 MGD" />
        </div>
      </div>
      <div className="cs-row">
        <div className="cs-head">
          <span>Demand on the worst day</span>
          <b className="tnum">{mgd(demand)} MGD</b>
        </div>
        <div className="cs-track">
          <span className="cs-seg cs-seg--use" style={{ width: pct(HANOVER.peakUse) }} title="County peak use, about 11.7 MGD">
            <em>Peak use 11.7</em>
          </span>
          {campusGal > 0 && (
            <span className="cs-seg cs-seg--campus" style={{ width: pct(campusGal) }} title={`${campusName}, ${mgd(campusGal)} MGD`}>
              {campusGal / scale > 0.08 && <em>{campusName}</em>}
            </span>
          )}
          <span className="cs-cap" style={{ left: pct(supply) }} aria-hidden="true" />
        </div>
      </div>
      <div className="cs-scale tnum" aria-hidden="true">
        <span>0</span>
        <span style={{ left: pct(supply) }} className={cx(short && "is-alarm")}>
          {mgd(supply, 3)}
        </span>
      </div>
    </div>
  );
}
