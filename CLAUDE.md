# Max Day (804 Hacks, Track 2)

Start by reading `docs/BLUEPRINT.md` in full. It has the deadline clock, the product, the engine spec,
the physical rig (cups, straws, servos, Raspberry Pi) and everything already decided.

Rules for this repo:
- After every verified piece of work: commit and `git push origin main`, then tell the user.
- Verify claims (prices, specs, physics, numbers) before stating them. Never show "78%"; the headline is 42%.
- Every number on screen has units and says "modeled" unless it is measured weather.
- No runtime network calls in the app; weather ships as a static file in `public/data/`.
- Keep messages to the user short and clear.
- `../shiftgraph-platform` is read-only reference; never edit it.
