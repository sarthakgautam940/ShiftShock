/**
 * Wet-bulb temperature from dry-bulb (°C) and relative humidity (%), Stull (2011).
 * Valid for RH 5 to 99% and T from -20 to 50 °C near sea level; inputs are clamped
 * to that range so an odd sensor reading cannot produce NaN downstream.
 */
export function wetBulb(tC: number, rh: number): number {
  const T = Math.min(50, Math.max(-20, tC));
  const RH = Math.min(99, Math.max(5, rh));
  return (
    T * Math.atan(0.151977 * Math.sqrt(RH + 8.313659)) +
    Math.atan(T + RH) -
    Math.atan(RH - 1.676331) +
    0.00391838 * Math.pow(RH, 1.5) * Math.atan(0.023101 * RH) -
    4.686035
  );
}

/** Evaporating water absorbs about 2.43 MJ/kg near 25 °C; one gallon is 3.785 kg. */
export const LATENT_MJ_PER_KG = 2.43;
export const KG_PER_GAL = 3.785;

/** Gallons evaporated to reject one MWh of heat purely by evaporation (about 391). */
export const GAL_PER_MWH = 3600 / (LATENT_MJ_PER_KG * KG_PER_GAL);
