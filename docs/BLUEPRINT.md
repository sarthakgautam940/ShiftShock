# Max Day: the complete build blueprint

Written 18 October 2026 at 14:10 for the next Claude session picking this up mid-hackathon.
Read this file top to bottom before touching anything. It replaces every earlier plan in `docs/rig/`.

---

## 0. The clock (read first)

| Time | What must be true |
|---|---|
| **15:00** | Feature freeze. Engine, app and rig all work end to end from a fresh browser. |
| **15:45** | Backup demo video recorded (2:30, unlisted YouTube or Vimeo). |
| **16:15** | Final deploy. No unreviewed change after this. |
| **16:30** | Submitted on Devpost (official deadline 17:00 per site, 17:15 per Devpost; we submit at 16:30). |
| **17:15** | Judging: about 3 minutes of demo plus 1 to 2 minutes of questions per team. |

At 14:10 **the engine does not exist yet** and the rig is being built by the team. Cutting rule: protect the demo path, cut breadth first (section 11).

---

## 1. Who you are working for and how

- **The user** leads a team of 1 to 4 high-school students at **804 Hacks** (Birdsong Hall, Randolph-Macon College, Ashland VA; ages 13 to 18; theme "The Environment"). Track: **Track 2, Build a Sustainable Future** ("rethink infrastructure and optimize resource consumption").
- **Working style the user asked for, enforced:**
  - Keep what reaches them short and clear. They have said "your demo was so messy"; prefer one clean thing over many.
  - **Verify every claim** (prices, stores, specs, physics) before stating it. A wrong store address was called out.
  - **After every verified arc of work: commit and `git push origin main`** without asking, then say so.
  - They review on Remote Control; screenshots via `SendUserFile` help.
  - They want things that look genuinely impressive and real, not forced.
- **Repo:** `C:\Users\122125\Desktop\6-crown business\804 hacks` → `https://github.com/sarthakgautam940/ShiftShock.git`, branch `main`.
- **Read-only reference:** `C:\Users\122125\Desktop\6-crown business\shiftgraph-platform` is a different product (ShiftGraph). Its UI kit was copied into this repo; never edit that repo.
- **Source of truth for every number:** the team's PDF *"Max Day: 804 Hacks Build Handoff"* (31 pages, in the user's uploads, not in the repo; do not commit it). Its essentials are transcribed below. Where the engine and the PDF disagree, the engine wins and the doc gets corrected.

---

## 2. The product in one page

**Max Day** sizes a data center's cooling water hour by hour against the one day a county cannot spare it, then finds the cheapest way to cap that day.

**Tagline:** *Water systems don't fail on average days.*

**The problem (all sourced in the PDF, section 18):**
- Hanover County's suburban supply is **24.775 MGD**: Richmond contract 20, Doswell plant 4.0, Henrico 0.775. Peak daily use is **about 11.7 MGD**. About 80% of capacity runs through the Richmond contract.
- **6 January 2025:** Richmond's water plant lost power about 80 minutes and its basement flooded; Mechanicsville lost water for 24 to 36 hours under a four-day boil advisory.
- **Iron Horse** data center (Route 54 at Mount Hermon Rd, about 1.4 miles east of the venue): on record at **up to 1.2 MGD** plus 250,000 gal/day wastewater, and at the same hearing announced a switch to "closed loop". Planning Commission recommended 5 to 2 on 20 Aug 2026; Board vote not scheduled.
- **Executive Order 22** (18 Sept 2026): east of I-95 is a cooling-water scarcity area; new data centers applying for air permits after 1 Jan 2027 must use air cooling, 100% recycled or storm water, or "a closed-loop system", which is undefined. DEQ told legislators in July 2026 it still needs a water-budget model for large cooling systems.

**The insight:** the debate quotes average-day or annual gallons, but water systems are sized and stressed by the **max day**. The "water-efficient" adiabatic hybrid saves water on the year but concentrates it on the hottest days.

**The fix (the ingenious part):** Max Day does not use less water across the year; it **moves** it. Each day it spends water only in the hours where water saves the most electricity, under a daily cap and a peak-power limit. That is a fractional knapsack, provably optimal.

**Headline results** (100 MW IT campus, measured 2025 Ashland weather, from the PDF's engine run):

| Design | Worst day | Annual water | Electricity | Peak draw |
|---|---|---|---|---|
| Cooling tower | **1.25 MGD (24 June)** | 433 M gal | not recorded | not recorded |
| Adiabatic hybrid, wet above 27 °C | **0.89 MGD** | 41.5 M gal | 1,000,624 MWh | 120.0 MW |
| Max Day plan (cap + 120 MW limit) | **0.52 MGD** | 41.4 M gal | 1,000,020 MWh | 120.0 MW |

- The tower's 1.25 MGD matches Iron Horse's "up to 1.2 MGD", so the record implies about 100 MW.
- The hybrid cuts annual water 90% but its worst day only 29%; its worst day is 7.8× its average day.
- **Max Day cuts the worst day 42%** (0.89 → 0.52) at the same annual water and the same 120 MW peak.
- **Never say 78%.** An early run claimed it but raised peak power 5.5 MW; the peak limit was added. The number is **42%**.

**Tone rules:** civic, exact, neutral on data centers. Units on every number. "Modeled" or "predicted" on every engine output; only the weather is "measured". No alarm words. The fix is the product, so a developer could use it.

---

## 3. What exists right now

### The app (Phase 1 skeleton, `6f2ce9b`)
Vite + React 19 + TypeScript strict, built as a static site. No engine, no data yet: every engine figure shows a pending shape.

```
src/kit/            ShiftGraph design system, copied and trimmed (tokens.css, components.css,
                    workspace.css, preflight.css = the Tailwind reset the kit depends on)
src/ui/shell/       Shell (resizable sidebar, phone drawer, top bar), CommandPalette (Ctrl/Cmd+K), ThemeMenu
src/ui/study/       Study screen: InputsRail, Headline, Charts (Year, County, Hourly), FixPanel, Translate drawer
src/ui/pages/       Condition (US-letter print page), Method (equations + constants), Sources
src/ui/content.ts   sourced figures and copy (Hanover capacities, presets, condition template)
src/ui/state.tsx    one reducer for all study inputs (+ state.test.ts, 3 tests)
docs/rig/           rig design pages (see section 9 for which are current)
```

- Commands: `npm run dev` (port 5173), `npm test`, `npm run build`, `npm run typecheck`.
- Preview config: the session's `.claude/launch.json` lives in the parent folder `6-crown business` and has a `max-day` entry (`npm --prefix "804 hacks" run dev`, port 5173).
- Routing is hash based: `#/study`, `#/condition`, `#/method`, `#/sources`.
- The county chart already renders real sourced figures, and the "Richmond plant down in July" toggle drops capacity to 4.775 MGD with a red × shortfall line (about 6.9 MGD over before the campus).
- **Not deployed yet.** Vercel needs linking to the GitHub repo (owned by the team's 16+ member).

### Design rules (user decision, overrides the PDF's visual section)
- **Use the ShiftGraph look:** General Sans, cream "paper" and warm "night" themes, ShiftGraph's blue accent for UI chrome.
- **Two data accents only:** amber `#EFA23A` marks the max day, peak hours and spent water; red `#E25433` marks shortfall or over-cap, always with a × or words.
- Every number has units; no invented numbers in the UI; no em dashes in copy.

---

## 4. The engine (build this first)

Lives in `src/engine/`, pure TypeScript functions, Vitest tests beside each file. Runs on the main thread (a full year re-runs in about 12 ms).

### 4.1 Weather data (measured, verified working 14:08)
Iowa Environmental Mesonet ASOS, station **OFP** (Hanover County Municipal Airport). Fetch once at build time, save to `public/data/kofp-2025.csv`, never fetch at runtime:

```
https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py?station=OFP&data=tmpf&data=relh&year1=2025&month1=1&day1=1&year2=2026&month2=1&day2=1&tz=America/New_York&format=onlycomma&latlon=no&missing=M&trace=T&direct=no&report_type=3
```
Returns `station,valid,tmpf,relh` with observations at :54 past each hour. Resample to 8,760 hourly values (nearest observation to the top of the hour; linearly fill short gaps; flag gaps over 3 hours). Convert °F → °C. Parse with **zod** at load and show a visible error state on failure. Do **not** use Open-Meteo (it rate-limited the team).

### 4.2 Equations (PDF section 7)
- **Wet-bulb (Stull 2011):** `Tw = T·atan(0.151977·√(RH+8.313659)) + atan(T+RH) − atan(RH−1.676331) + 0.00391838·RH^1.5·atan(0.023101·RH) − 4.686035` (T in °C, RH in %).
- **Heat to reject:** `Q_h = k_heat · P_IT` (MW).
- **Water in wet mode:** evaporation `E_h = w_h · η · 3600 · Q_h / (h_fg × 3.785)` gal with `h_fg = 2.43 MJ/kg` (Q in MW → MJ/s, so 3600·Q is MJ per hour); blowdown `B_h = E_h/(N−1)`; makeup `M_h = E_h + B_h`. Write `a_h` for `M_h` at `w_h = 1`.
- **Check:** 1 kWh by evaporation ≈ 0.39 gal. 1.2 MGD fully evaporated ≈ 126 MW of heat; at 5 cycles (80% evaporates) ≈ 101 MW.
- **Electricity:** `ΔP_h = Q_h·(1/COP_dry(T_h) − 1/COP_wet(Tw_h))`, `P_h = P_IT + P_base + (1 − w_h)·ΔP_h`. Write `b_h = ΔP_h × 1 h` (kWh a fully wet hour saves).
- **Designs as rules for w_h:** tower `w=1` always; closed-circuit evaporative `w=1` (it still evaporates); dry `w=0`; hybrid `w=1` when `T_h > 27 °C`, else 0.
- **Carbon:** `CO2 = 593.4 lb/MWh × Σ P_h` (EPA eGRID2023, SRVC).

### 4.3 The optimizer (Fix A, shipped in the PDF's engine)
For each day d with budget C gallons:
```
maximize Σ w_h·b_h  subject to  Σ w_h·a_h ≤ C,  w_h ≥ w_h_min,  0 ≤ w_h ≤ 1
w_h_min = max(0, (P_IT + P_base + ΔP_h − P_lim) / ΔP_h)
```
Algorithm: spend the floors first (if floors alone exceed C, the cap is infeasible that day: report it, use the floors); then sort remaining hours by `b_h / a_h` (kWh saved per gallon) and fill best first until C is spent. Fractional knapsack: provably optimal by the exchange argument.

API used by the UI:
```ts
const prepared = prepare(weather, plantParams)              // once
run(prepared, { kind: 'cap', capGalPerDay, peakLimitMW })   // the Fix slider calls this live
run(prepared, { kind: 'design', design: 'tower' | 'closed' | 'hybrid' | 'dry' })
// returns hourly water (gal) and power (MW) for 8,760 hours, plus daily totals, max day + date, annual totals, peak MW, CO2
```

### 4.4 Parameters (the PDF's engine zip is lost; calibrate)
The original `ENGINE.md` held COP curves, `k_heat`, `η`, `P_base`, cycles. It is not in the repo. Pick defensible planning values, label them "planning assumption" on the Method page, then **calibrate to reproduce the PDF table**:
- `N = 5` cycles (PDF uses 5).
- `k_heat` about 1.1 to 1.2 and `η` about 0.85 to 0.95: a tower must hit **1.25 MGD on 24 June** and about **433 M gal** a year at 100 MW.
- `COP_dry(T)` falling with dry-bulb, `COP_wet(Tw)` higher and falling with wet-bulb, `P_base` a few MW: the hybrid must draw about **1,000,624 MWh** a year with a **120.0 MW** peak.
- Then the hybrid must land near **0.89 MGD** worst day / 41.5 M gal, and Max Day at a 0.52 MGD cap with a 120 MW limit near 41.4 M gal and 1,000,020 MWh.
If calibration cannot hit these within a few percent by 14:50, ship what it computes, correct the pitch numbers to the engine, and say "modeled".

### 4.5 Tests (at least)
Stull against reference values; 0.39 gal/kWh conversion; blowdown at N=5 (80% evaporates); each design's w rule; knapsack respects cap and floors; knapsack equals brute force on small days; monotonicity (a higher cap never raises electricity; a tighter peak limit never lowers water); the locked headline (Max Day worst day ≥ 40% below hybrid at matched annual water and peak).

---

## 5. Wiring the app to the engine (after 4.x passes)
1. `src/data/`: load `public/data/kofp-2025.csv` and `public/data/context.json` (move `content.ts` county figures there) with zod.
2. Headline: average day and max day (with date) from `run(design)`.
3. Year chart: 365 daily values, max day marked; d3-scale + d3-shape as React SVG (ask the user before adding the d3 dependency; it is in the PDF's stack).
4. County chart: add the campus max-day segment to the existing bar.
5. Hourly chart: the max day's 24 hours of water and power.
6. Fix panel: slider → `run({kind:'cap'})` live; readouts; Pareto (max-day water vs annual MWh) by sweeping the cap.
7. Translate: gal/day → implied heat MW (inverse of 4.2).
8. Condition page: fill `{cap}`.
9. **Rig page** (`#/rig`): see section 8.

---

## 6. The physical rig (current design, decided with the user)

**What judges see:** one "county supply" jug on a stand feeds two clear cups through two straws. Each straw is a valve on a servo. Left cup is **the hybrid**, right cup is **Max Day**. Both cups have a red cap line at the same height. Press Run: last June's hottest day plays in 60 seconds. A judge holds the joystick down for a heat wave. The hybrid's cup rises through the red line; Max Day's straw swings up exactly at the line.

### 6.1 The straw valve (no seal, no leaks)
A bendy straw passes through a hole near the bottom of the jug. Its long end is an arm on a servo:
- **Arm pointing up**, tip above the jug's water line → no flow (gravity).
- **Arm swung down** over its cup → it pours.
The servo lifts and lowers the arm with a craft stick taped from its horn to the straw.

### 6.2 What the team has built (photo at 13:55)
Four identical clear plastic cups (look like 16 oz). Two glued rim to rim form the **jug** (the top cup is inverted with its bottom cut open). Two are the plant cups.

### 6.3 Numbers (assume 16 oz cups: 9.5 cm top, 6 cm bottom, 12 cm tall, about 576 mL brimful; **ask the user for real dimensions**)

| | Option A: water only in the jug's bottom cup | **Option B (recommended): seam taped + glued, both cups hold water** |
|---|---|---|
| Jug water | about 460 mL | about 920 mL |
| Hybrid ends at | 240 mL, 6.3 cm up | **415 mL, 9.5 cm up** |
| Max Day cap line | 140 mL, 4.1 cm up | **242 mL, 6.4 cm up** |
| Gap at the line | 2.2 cm | **3.2 cm** |
| Scale (cap = 0.52 MGD) | 1 mL ≈ 3,700 gal | **1 mL ≈ 2,150 gal** |

- Keep about 80 mL in the jug so the straw inlets stay under water.
- Hot glue sticks poorly to this cup plastic; seal the jug seam with tape first, glue over the tape, leak-test 2 minutes.
- Straw holes: on opposite sides of the jug's bottom cup, about 1.5 cm above its floor, melted with a hot nail slightly smaller than the straw; straw pushed through, glued around.
- Stand: 15 to 20 cm tall so the straw tips reach over the plant cups.
- Flow: a straw pours roughly 15 to 25 mL/s; **time 100 mL through one straw on site** and put that number in the Pi config.
- Tint the water orange (drink or tea) so levels read from across the table, or put white paper behind the cups.

### 6.4 Controller: Raspberry Pi (the user switched from Arduino)
- **Joystick:** the Pi has no analog input, so the heat wave is **pressing the joystick straight down (SW pin) and holding it**.
- **Ultrasonic meters (optional):** HC-SR04 echo is 5 V; each echo line needs a divider (1 kΩ from echo to the GPIO, 2 kΩ from that GPIO to ground). The demo runs without meters on valve timing.
- **Ask the user which Pi model** and whether it boots Raspberry Pi OS. On Pi 5 use `gpiozero` with `lgpio`; on Pi 3/4 `pigpio` gives jitter-free servo pulses.

| Part | Pi pin (BCM / physical) |
|---|---|
| Hybrid servo signal | GPIO18 / pin 12 |
| Max Day servo signal | GPIO13 / pin 33 |
| Servo 5 V and ground | USB power bank lead; ground tied to Pi GND pin 6 |
| Run button | GPIO27 / pin 13 and GND (internal pull-up) |
| Joystick press (SW) | GPIO17 / pin 11 and GND (internal pull-up) |
| Meter 1 trig / echo | GPIO23 / GPIO24 (pins 16, 18), echo via divider |
| Meter 2 trig / echo | GPIO5 / GPIO6 (pins 29, 31), echo via divider |
| Meters' power | 5 V pin 2, GND |
| Cup lights (optional) | GPIO22 / GPIO25 (pins 15, 22), 220 Ω each |

Power: Pi 4 needs 5 V 3 A (strong power bank or two-port bank shared with the servos). Everything portable: no wall outlet, no venue Wi-Fi.

### 6.5 Materials (full list given to the user)
Cups ×4 (have), bendy straws ×3, tape, 500 mL water bottle, orange tint, paper towels; base board about 50 × 35 cm, stand 15 to 20 cm, hot glue gun + sticks, craft sticks, nail + heat source, scissors or knife, ruler, red marker or tape, rubber bands; Raspberry Pi + microSD + power, breadboard, 2 servos, 2 HC-SR04 (optional), joystick module, push button (or reuse joystick press), female-to-male jumpers ×25, 2 amber LEDs + 220 Ω (optional), resistors 2×1 kΩ + 2×2 kΩ (for meters), USB power bank + a cuttable USB cable; laptop with Chrome.

---

## 7. Rig software (Pi side)

A single Python program on the Pi, `rig/maxday_rig.py`, run with `python3 maxday_rig.py`:
- **Serves the built app** (`dist/` copied to the Pi) and a WebSocket at the same origin, so the laptop's Chrome opens `http://10.42.0.1:8000` with no mixed-content problems. (A page on `https://…vercel.app` cannot talk to `http://` on the Pi; serving the app from the Pi avoids that.)
- **Own Wi-Fi network** (Raspberry Pi OS Bookworm, NetworkManager): `sudo nmcli device wifi hotspot ifname wlan0 ssid MaxDay password maxday804` → Pi is `10.42.0.1`. The laptop joins "MaxDay". A direct Ethernet cable also works.
- **Role split:** the **app is the planner** (the tested TS engine). The **Pi is the plant**: it executes timing, reads the buttons and meters, and enforces the cap in its own code as an interlock (closes Max Day's straw when metered or timed volume reaches the cap, whatever the planner asked).
- **Protocol** (JSON over WebSocket `/ws`):
  - app → Pi: `{"type":"run","dayS":60,"flowMlPerS":20,"capMl":242,"plan":{"hybrid":[24 numbers, mL per hour],"maxday":[24 numbers]}}`, `{"type":"replan","fromHour":h,"plan":{...}}`, `{"type":"reset"}`, `{"type":"calibrate"}` (opens one straw until 100 mL by meter or 5 s).
  - Pi → app, 10 per second: `{"type":"state","t":s,"hour":h,"hyMl":x,"mdMl":y,"valves":{"hy":true,"md":false},"heat":bool,"button":bool,"meters":{"hy":cm,"md":cm}|null,"interlock":bool}`.
  - The Run button and joystick press on the board are reported in `state`; the app starts the day on `button` and re-plans with +5 °C on `heat`.
- **Execution:** for hour h, open the straw for `plan[h] / flowMlPerS` seconds (carry over into the next hour if longer than the hour's 2.5 s). Servo angles: tune `UP` and `DOWN` on site; move with a short ease; on start and on exit, always send both straws **up**.
- **Without the Pi** the app must still run the full story (simulated day). The 3D model's simulation logic in `docs/rig/rig3d.src.html` is a working reference for the day curve, re-planning and the interlock.

---

## 8. Rig screen in the app (`#/rig`)
Two columns mirroring the cups (amber fill, red cap line, red × when the hybrid crosses), the clock, the heat-wave state, and the end line "Same day, same heat: worst day 42% lower". A "Connect rig" state when served from the Pi; a "Simulated" badge otherwise. Reuse the 3D model's day logic for the simulated mode.

---

## 9. Existing design pages (what is current)
| File / link | Status |
|---|---|
| `docs/rig/rig3d.html` → https://claude.ai/artifact/XbzeVfwzc1enREN6u8yPy8 | **Current visual of the rig** (Zdog 3D, no WebGL needed). Still labels an **Arduino**; update to the Pi pin map in 6.4 and the user's cups when time allows. |
| `docs/rig/blueprint.html`, `walkthrough.html` | Superseded (glass-vase siphon rig). |
| `docs/rig/gauges.html` | Rejected by the user as underwhelming. |
Artifacts are private to the user; they share them from the page's Share menu.

---

## 10. Decisions already made (do not re-propose)
- Track 2, Max Day. The user questioned the idea's wow factor; the answer was to keep the problem and fix and make the demo physical and visual.
- Rejected: six servos "spinning at equal speed" (uniform speed is not efficient cooling; servos don't spin; Google/DeepMind already did cooling AI in 2016, 40% cooling energy); servo gauge needles (underwhelming); the flat 2D view (user wants 3D); the busy SVG walkthrough.
- Water rig evolution: glass vases + siphons (2 tubes per column, $22 Walmart cart) → **user's restaurant cups + straws + hot glue**. No heat sensor exists → **joystick is the heat wave**. Arduino → **Raspberry Pi**.
- Budget ceiling the user set: about $25. Current design costs $0 beyond what they have.
- No Micro Center nearby (only Fairfax). The Ashland Walmart is 145 Hill Carter Pkwy.

---

## 11. Cut order if late (first to go at the top)
1. Ultrasonic meters (run on valve timing).
2. Pareto chart (keep the slider and readouts).
3. Translate drawer polish, extra presets.
4. Mobile polish, print styling.
5. The rig itself (the app's simulated Rig screen still tells the story).

**Never cut:** average day vs max day, the Hanover stack with the Richmond toggle, the cheapest-cap result (42%), the drafted condition, the Method page.

---

## 12. Open questions for the user
1. Real cup size (height, top and bottom width, or the ounces on the bottom), and option A or B.
2. Pi model and whether it boots Raspberry Pi OS; does the laptop have an Ethernet port.
3. Is judging at their table or at a stage (decides how portable the base must be).
4. Did an organizer confirm Max Day fits Track 2.
5. Who owns Vercel (the 16+ team member) for the deploy.

---

## 13. Pitch beats (2:40, PDF section 15)
0:00 dark: "Track 2… last January Richmond's water plant failed… 80% of Hanover's capacity runs through that contract." · 0:20 the jug: Iron Horse "up to 1.2 million gallons a day… fourteen of these every second… closed loop: which is it, and on which day?" · 0:40 cooling tower year chart, 1.25 MGD · 1:00 hybrid: year −90%, worst day only −29% · 1:20 Richmond down in July (a stress test of January's real failure, say so) · 1:35 hourly: same hours as the grid peak · 1:45 Find the cheapest cap: **−42%, same water, same 120 MW** · then the rig moment · 2:10 Draft the condition · 2:25 Method: "DEQ said it needs a water budget model. We built one today."
Judges likely: Mark Shapiro (CoStar), G. Thomas White (VITA), Jesse Warden (Capital One: "can you explain the code"), Suhas Jangaon (Zendesk). Everyone must be able to explain their module; the AI answer is "most of the code, from our spec; the equations, constants and tests are ours".
