import { hasEnded, isHappeningNow } from "./liveState";

const start = "2026-11-16T08:43:00.000Z";
const end = "2026-11-16T12:43:00.000Z";

test("an event is happening from the start instant until, but not including, the end instant", () => {
  expect(isHappeningNow(start, end, new Date("2026-11-16T08:42:59.999Z"))).toBe(false);
  expect(isHappeningNow(start, end, new Date(start))).toBe(true);
  expect(isHappeningNow(start, end, new Date("2026-11-16T09:00:00.000Z"))).toBe(true);
  expect(isHappeningNow(start, end, new Date("2026-11-16T12:42:59.999Z"))).toBe(true);
  expect(isHappeningNow(start, end, new Date(end))).toBe(false);
  expect(isHappeningNow(start, end, new Date("2026-11-16T12:43:00.001Z"))).toBe(false);
});

test("an event has ended at the end instant", () => {
  expect(hasEnded(end, new Date("2026-11-16T12:42:59.999Z"))).toBe(false);
  expect(hasEnded(end, new Date(end))).toBe(true);
});
