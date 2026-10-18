You are the engineer building the **Max Day plant controller**: the Python program that runs on a Raspberry Pi and drives a tabletop model of a data-center cooling plant at the 804 Hacks hackathon today (Sunday 18 October 2026, Ashland, Virginia). Another Claude session is building the engine and web app in the same repo at the same time. Read this whole brief before writing code.

## 1. Deadlines (hard)
- Now is about 14:25. **15:00:** the program runs fully in simulation mode on the laptop, with tests passing. **15:30:** it runs on the real Pi with the real servos. **16:15:** final code freeze. **16:30:** project submitted.
- If something is not going to make it, cut the optional parts (section 10), never the core loop.

## 2. The project in 60 seconds
**Max Day** (Track 2, Build a Sustainable Future) shows that data-center cooling water must be judged on a county's worst day, not its average day. A "water-efficient" adiabatic hybrid cooler saves water across the year but concentrates it on the hottest afternoons. Max Day's fix is to **move the water, not cut it**: each day, spend water only in the hours where it saves the most electricity, under a daily cap and a peak-power limit. That is a fractional knapsack, provably optimal. Headline (from the team's engine run, 100 MW campus, measured 2025 Ashland weather): hybrid worst day 0.89 MGD, Max Day 0.52 MGD, **42% lower** at the same annual water and the same 120 MW peak. Never say 78%.

The product has two halves:
1. **The Max Day app** (web, being built by the other session): the planning tool a county, the state agency DEQ, or a developer uses. It writes the rule: "cooling water shall not exceed {cap} gallons on any calendar day".
2. **The Max Day plant controller** (your job): what a real plant would install to keep that rule. It runs the same optimizer on a model plant. The pitch line is "the tool writes the rule, the controller keeps it."

## 3. The physical model plant (being built by the team now)
- **County supply:** two clear 16 oz plastic cups glued rim to rim into a tall "jug" on a stand 15 to 20 cm high.
- **Two model data centers:** two identical clear cups on the table: **left = the hybrid** (today's design), **right = Max Day**. Each has a red **cap line** at the same height.
- **The valve:** a bendy straw through a hole near the bottom of the jug, one per plant. Its long end is an arm on a servo. **Arm up**, tip above the jug's water line: no flow. **Arm down** over its cup: it pours, by gravity. No pump, no seal. A craft stick links the servo horn to the straw.
- **Inputs on the board:** a **Run button**, and a **joystick module whose press (SW pin) held down means "heat wave"** (the Pi has no analog inputs, so the stick's tilt is not used). There is no temperature sensor.
- **Optional meters:** an HC-SR04 ultrasonic sensor over each plant cup.
- **Optional lights:** an amber LED under each plant cup, lit while that straw pours.
- Assumed cup geometry, until the team measures it: top inside diameter 9.5 cm, bottom 6.0 cm, height 12 cm, about 576 mL brimful. **Option B** (recommended): the jug holds about 920 mL, the hybrid ends near **415 mL** (9.5 cm up), **the cap is 242 mL** (6.4 cm up), and the scale is **1 mL ≈ 2,150 gallons**, so the cap line means 0.52 MGD.
- A straw pours roughly 15 to 25 mL/s. **The real flow is measured on site** with the calibration tool you write (section 7).

## 4. Hardware and pins (BCM numbering; physical pin in brackets)
| Part | Pin |
|---|---|
| Hybrid straw servo, signal | GPIO18 (12) |
| Max Day straw servo, signal | GPIO13 (33) |
| Servo 5 V and ground | from a USB power bank lead, **ground tied to the Pi's GND (6)**. Never power servos from the Pi's 5 V pin. |
| Run button | GPIO27 (13) to GND, internal pull-up |
| Joystick press (SW) | GPIO17 (11) to GND, internal pull-up |
| Meter 1 (hybrid) trig / echo | GPIO23 (16) / GPIO24 (18). Echo is 5 V: divider of 1 kΩ (echo to GPIO) and 2 kΩ (GPIO to GND). |
| Meter 2 (Max Day) trig / echo | GPIO5 (29) / GPIO6 (31), same divider |
| Meters' power | 5 V (2), GND |
| Hybrid / Max Day pour lights | GPIO22 (15) / GPIO25 (22), 220 Ω each |

**The Pi model is not known yet. Ask the user first:** which Pi (3, 4 or 5), whether it boots Raspberry Pi OS (Bookworm), and whether they can reach it by keyboard and monitor or SSH. On Pi 5 use gpiozero's default `lgpio` pin factory; on Pi 3/4 prefer `pigpio` (start `pigpiod`) for jitter-free servo pulses, else `lgpio`. SG90 pulse range 0.5 to 2.5 ms.

## 5. The contract with the engine session: `rig/plant-day.json`
The other session's engine exports one file for the hottest day, 24 June 2025, already scaled to the model plant. **You do not compute physics.** Use this exact shape:

```json
{
  "version": 1,
  "source": "Max Day engine, KOFP measured weather 2025-06-24, 100 MW IT campus",
  "date": "2025-06-24",
  "galPerMl": 2150,
  "capMl": 242,
  "peakLimitMW": 120,
  "normal":   { "hours": [ { "h": 0, "tempC": 25.6, "hybridWet": false, "aMl": 0.0, "bKWh": 0.0, "wMin": 0.0 } ] },
  "heatWave": { "deltaC": 5, "hours": [ { "h": 0, "tempC": 30.6, "hybridWet": true, "aMl": 0.0, "bKWh": 0.0, "wMin": 0.0 } ] }
}
```
Each `hours` array has exactly 24 entries, `h` from 0 to 23.
- `aMl`: water that hour would use if fully wet, already in model millilitres (real gallons ÷ galPerMl).
- `bKWh`: electricity a fully wet hour saves versus dry (real kWh).
- `wMin`: the peak-power floor, the minimum wet fraction that hour must run to stay under `peakLimitMW` (0 to 1).
- `hybridWet`: the hybrid's rule, wet when the hour is over 27 °C.

Until the engine session commits the real `rig/plant-day.json`, write **`rig/plant-day.sample.json`** with plausible illustrative values: a hot afternoon peaking near 35 °C around 3 PM; the hybrid's day summing to about 415 mL; Max Day's feasible within the 242 mL cap; heat-wave values about 25% higher. Put `"illustrative": true` in it. The program loads `rig/plant-day.json` if present, otherwise the sample, and **prints a loud warning when running on the sample**. Validate the file on load: exactly 24 hours, numbers non-negative, `wMin` within 0 to 1. Exit with a clear message if invalid.

## 6. What the controller does
**States:** `idle` (both straws up), `running`, `done`. On start, on Ctrl+C and on any crash: **both straws up first** (try/finally plus a signal handler).

**A day:** one simulated day lasts `daySeconds` (default 60, so 2.5 s per hour). Press **Run**: reset volumes, start hour 0. Pressing Run while running restarts the day.

**The hybrid plant** (status quo, no cap, no planning): in each hour where `hybridWet` is true, it pours that hour's `aMl`.

**The Max Day plant** (the controller):
- At the start of the day, and again **whenever the heat-wave state changes**, plan the **remaining** hours with budget `capMl − pouredSoFar`:
  1. Every hour gets its floor: `w = wMin`. If the floors alone exceed the budget, the cap is infeasible: keep the floors, set `infeasible = true` and show it (never silently break the peak limit).
  2. Fill the remaining budget by sorting hours by `bKWh / aMl`, best first, raising each `w` to 1 until the budget is spent (the last one fractionally).
  3. Hour h then pours `w_h × aMl_h`.
- While the joystick is held, the remaining hours use the `heatWave` table, for both plants. On release, go back to `normal` and re-plan again.
- **Interlock (the law, in hardware):** independent of the plan, close the Max Day straw the moment its poured volume reaches `capMl`. Poured volume comes from valve-open time × calibrated flow; if meters are enabled and reading sanely, use the meter instead. The hybrid has no interlock.

**Pouring:** for hour h, open the straw for `ml / flowMlPerS` seconds. If that is longer than the hour, carry the remainder into the next hour (keep a queue per straw). Move servos with a short ease (about 250 ms), not a snap.

**Lights:** on while their straw is open.

**Console display** (the presenter may glance at it): one updating line, for example `14:00  heat:ON  hybrid 312 mL (pouring)  maxday 198/242 mL  infeasible:no  data:REAL`.

**Keyboard fallback** (works over SSH or a local terminal, for when a button fails): `r` run or restart, `h` toggle heat wave, `x` reset, `u` both straws up, `q` quit.

## 7. Calibration tool
`python3 rig/maxday_rig.py calibrate`:
1. **Angles:** step each servo with the keyboard (`[` / `]` adjusts by 2°, `n` switches servo), and save `upDeg` and `downDeg` per straw to `rig/config.json`. Up must lift the tip above the jug's water line; down must hang the tip over its cup's mouth.
2. **Flow:** opens one straw for a fixed 5 s, asks the user to read the poured volume off a marked cup (or uses the meter), and saves `flowMlPerS` per straw.

`rig/config.json` holds `pins`, per-straw `upDeg`, `downDeg` and `flowMlPerS`, `daySeconds`, `metersEnabled`, `lightsEnabled`, cup geometry (`topDiamCm`, `bottomDiamCm`, `heightCm`), and each meter's mounting height above its cup's floor. Defaults load if the file is missing.

## 8. Network interface (lets the app's Rig screen mirror the plant; the plant must work without it)
- HTTP on port 8000, Python standard library only (`http.server`, threaded), JSON:
  - `GET /state` returns `{"state","hour","t","daySeconds","heat","hybridMl","maxdayMl","capMl","valves":{"hybrid":bool,"maxday":bool},"infeasible","interlock","data":"real"|"sample","meters":{"hybridMl":n|null,"maxdayMl":n|null}}`.
  - `POST /run`, `POST /reset`, `POST /heat` with body `{"on":true|false}`.
- Send `Access-Control-Allow-Origin: *`, and answer `OPTIONS` preflights with `Access-Control-Allow-Private-Network: true` plus the usual CORS headers, so a page on `http://localhost` can call the Pi.
- If a folder `rig/www/` exists, serve it at `/` (the web app's built files may be copied there later).
- Wi-Fi without the venue network, documented in the README (do not run it without the user): `sudo nmcli device wifi hotspot ifname wlan0 ssid MaxDay password maxday804`. The Pi is then `10.42.0.1`.

## 9. Files you own (touch nothing else)
```
rig/maxday_rig.py            the controller (run, calibrate, --sim)
rig/plan.py                  pure functions: load and validate the day file, the knapsack plan, the pour queue
rig/test_plan.py             pytest: cap respected; floors respected; infeasible flagged; equals brute force on small cases;
                             re-plan after a heat-wave toggle never exceeds the cap; hybrid totals equal the sum of its wet hours
rig/plant-day.sample.json    illustrative day (see section 5)
rig/config.json              defaults
rig/README.md                wiring table, Pi setup, calibration, run, troubleshooting, a 2-minute pre-demo checklist
rig/maxday-rig.service       optional systemd unit for autostart
```
- `--sim` mode uses gpiozero's `MockFactory` so it runs and can be demoed on the Windows laptop with no hardware (keyboard drives the Run button and the joystick). Develop and test in sim first.
- Dependencies: Python 3.11, `gpiozero` (preinstalled on Raspberry Pi OS; `pip install gpiozero` for sim on the laptop), `lgpio` or `pigpio` on the Pi, `pytest` for tests. Nothing else.

## 10. Priorities
**Core (must work):** load and validate the day file; the knapsack plan with floors and infeasibility; the pour queue; the two servos; the Run button; joystick heat wave with re-plan; the interlock on valve time; safe straws-up on exit; console line; keyboard fallback; `--sim`; tests; README.
**Optional (cut in this order if late):** meters, then lights, then the HTTP interface, then the systemd unit.

## 11. Working rules in this repo
- Repo: `C:\Users\122125\Desktop\6-crown business\804 hacks`, remote `https://github.com/sarthakgautam940/ShiftShock.git`, branch `main`. Read `CLAUDE.md` and `docs/BLUEPRINT.md` sections 0, 2, 6 and 7 for wider context.
- Another session pushes to `main` too. **Before every push: `git pull --rebase origin main`.** Only stage files under `rig/`.
- After each verified step (sim runs, tests pass), commit and push, and tell the user in one or two short lines. The user prefers short, clear messages, and wants every claim verified (pin facts, library behavior, numbers).
- Code that reads like a careful engineer wrote it: small functions, comments that explain why, no dead code, no catch-all error swallowing, no placeholders in the core loop.
- Never claim it works on hardware until it has run on the Pi. Say exactly what was tested.

## 12. First steps
1. Ask the user the questions in section 4 (Pi model, OS, access).
2. Write `rig/plan.py` and `rig/test_plan.py` with the sample day file, and get the tests green.
3. Write `rig/maxday_rig.py` with `--sim`, run a full day in sim, and confirm: the hybrid ends near 415 mL, Max Day stops at 242 mL, holding "h" mid-afternoon raises the hybrid while Max Day still holds the cap, and both straws go up on quit.
4. Commit and push. Then the README, then help the team bring it up on the Pi.
