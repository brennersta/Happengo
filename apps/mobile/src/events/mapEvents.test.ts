import { bboxForBounds, formatEventTime, type MapEvent } from "./mapEvents";

test("formats a viewport as min longitude, min latitude, max longitude, max latitude", () => {
  expect(bboxForBounds({
    southWest: { longitude: 24, latitude: 59 },
    northEast: { longitude: 25, latitude: 60 },
  })).toBe("24,59,25,60");
});

test("clamps viewport coordinates to valid map bounds and stabilizes precision", () => {
  expect(bboxForBounds({
    southWest: { longitude: -181.12345678, latitude: -90 },
    northEast: { longitude: 180.00001, latitude: 90 },
  })).toBe("-180,-85,180,85");
});

test("formats event time without losing the event's start date", () => {
  const event = {
    startAt: "2026-11-17T10:00:00.000Z",
    endAt: "2026-11-17T12:30:00.000Z",
  } as MapEvent;
  expect(formatEventTime(event, "en-US")).toContain(new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(event.startAt)));
});
