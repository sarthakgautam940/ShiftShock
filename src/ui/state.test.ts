import { describe, expect, it } from "vitest";
import { INITIAL, reduce } from "./state";

describe("study state", () => {
  it("opens on the demo path's first step: Iron Horse with the adiabatic hybrid", () => {
    expect(INITIAL.preset).toBe("iron-horse");
    expect(INITIAL.itLoadMW).toBe(100);
    expect(INITIAL.design).toBe("hybrid");
    expect(INITIAL.richmondDown).toBe(false);
  });

  it("loads a preset's IT load with the preset", () => {
    const next = reduce(INITIAL, { type: "preset", id: "hickory-hill" });
    expect(next.preset).toBe("hickory-hill");
    expect(next.itLoadMW).toBe(2400);
  });

  it("turns a typed load that no longer matches the preset into a custom campus", () => {
    expect(reduce(INITIAL, { type: "itLoad", mw: 150 }).preset).toBeNull();
    expect(reduce(INITIAL, { type: "itLoad", mw: 100 }).preset).toBe("iron-horse");
  });
});
