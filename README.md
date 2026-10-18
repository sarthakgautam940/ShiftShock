# Max Day

Water systems don't fail on average days.

Max Day sizes a data center's cooling water hour by hour against the one day a
county cannot spare it, then finds the cheapest way to cap that day. Built at
804 Hacks for Track 2, Build a Sustainable Future.

## Status

Phase 1, the visual skeleton. Every screen, control and route exists and
responds; nothing is computed yet. Figures that come from the engine hold their
place as pending shapes. Sourced county figures (Hanover's capacity and peak
use) render now.

## Run it

```bash
npm install
npm run dev
```

Opens on http://localhost:5173. `npm run build` writes the static site to
`dist/`; `npm run preview` serves that build offline.

## Layout

```
src/kit        ShiftGraph design system: tokens, components, workspace styles
src/ui/shell   app shell, search palette (Ctrl/Cmd+K), theme menu
src/ui/study   inputs rail, headline, year, county and hourly charts, Fix, Translate
src/ui/pages   Condition (print page), Method, Sources
src/ui/content.ts  sourced figures and copy from the build handoff
```

No server, no keys, no runtime network calls.
