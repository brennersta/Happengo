import { EVENT_TAG_COLORS, EVENT_TAGS, liveAuraMode, markerColor, NEUTRAL_MARKER_COLOR } from "./markerStyle";

test("every supported tag has one stable color and unknown tags use the neutral fallback", () => {
  const colors = new Set<string>();
  for (const tag of EVENT_TAGS) {
    expect(markerColor(tag)).toBe(EVENT_TAG_COLORS[tag]);
    colors.add(EVENT_TAG_COLORS[tag]);
  }
  expect(colors.size).toBe(EVENT_TAGS.length);
  expect(markerColor(null)).toBe(NEUTRAL_MARKER_COLOR);
  expect(markerColor(undefined)).toBe(NEUTRAL_MARKER_COLOR);
  expect(markerColor("Fire")).toBe(NEUTRAL_MARKER_COLOR);
});

test("the live aura pulses only while happening and prefers reduced motion stays static", () => {
  expect(liveAuraMode(false, false)).toBe("none");
  expect(liveAuraMode(false, true)).toBe("none");
  expect(liveAuraMode(undefined, false)).toBe("none");
  expect(liveAuraMode(true, false)).toBe("pulse");
  expect(liveAuraMode(true, true)).toBe("static");
});
