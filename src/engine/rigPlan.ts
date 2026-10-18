import type { PlantDayHour } from "./plantDay";

/**
 * The tabletop rig's day plan, the same rule the Pi controller runs: spend the
 * peak-power floors first, then give the remaining millilitres to the hours that
 * save the most power per millilitre until the cap is spent. Returns the wet share
 * of each hour.
 */
export function planRigDay(hours: PlantDayHour[], capMl: number): number[] {
  const w = hours.map((x) => x.wMin);
  let left = capMl - hours.reduce((s, x, i) => s + w[i]! * x.aMl, 0);
  const order = hours
    .map((_, i) => i)
    .filter((i) => hours[i]!.aMl > 0 && hours[i]!.bKWh > 0)
    .sort((a, b) => hours[b]!.bKWh / hours[b]!.aMl - hours[a]!.bKWh / hours[a]!.aMl);
  for (const i of order) {
    if (left <= 0) break;
    const x = hours[i]!;
    const add = Math.min((1 - w[i]!) * x.aMl, left);
    w[i] = w[i]! + add / x.aMl;
    left -= add;
  }
  return w;
}

/** The hybrid's rule on the rig: fully wet in the hours above its switch temperature. */
export function hybridRigDay(hours: PlantDayHour[]): number[] {
  return hours.map((x) => (x.hybridWet ? 1 : 0));
}
