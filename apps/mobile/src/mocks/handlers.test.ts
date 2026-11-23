import {
  cancelDemoAttendance,
  createDemoEvent,
  getDemoAttendance,
  getEvent,
  isHappeningNow,
  listEvents,
  requestDemoAttendance,
  resetDemoEvents,
} from "./contract";
import type { components } from "@happengo/api-client";

const bbox = "24.6,59.3,24.9,59.5";
const during = new Date("2026-11-16T09:00:00.000Z");
const liveEvent = listEvents(bbox).items[0]!;
const atEnd = new Date(liveEvent.endAt);

beforeEach(() => resetDemoEvents());

test("returns the public event when the bbox contains Tallinn", () => {
  const body = listEvents(bbox);
  expect(body.truncated).toBe(false);
  expect(body.limit).toBe(500);
  expect(body.items).toHaveLength(1);
  expect(body.items[0]?.address).toBe("Tallinn, Estonia");
  expect(body.items[0]?.visibility).toBe("public");
  expect(body.items[0]?.happeningNow).toBe(true);
  expect(body.items[0]?.shareToken).toBeUndefined();
  expect(body.items[0]?.longitude).toBe(24.7536);
  expect(body.items[0]?.latitude).toBe(59.437);
});

test("unlisted events never appear on the map", () => {
  const body = listEvents(bbox);
  expect(body.items.some((event) => event.visibility === "unlisted")).toBe(false);
  expect(body.items.some((event) => event.title === "Unlisted gathering")).toBe(false);
});

test("an event remains live at endAt and leaves the map immediately after", () => {
  expect(listEvents(bbox, new Date(atEnd.getTime() + 1)).items).toEqual([]);
  expect(
    isHappeningNow("2026-11-16T08:43:00.000Z", "2026-11-16T12:43:00.000Z", during),
  ).toBe(true);
  expect(
    isHappeningNow(
      "2026-11-16T08:43:00.000Z",
      "2026-11-16T12:43:00.000Z",
      new Date("2026-11-16T08:43:00.000Z"),
    ),
  ).toBe(true);
  expect(isHappeningNow("2026-11-16T08:43:00.000Z", "2026-11-16T12:43:00.000Z", atEnd)).toBe(true);
});

test("includes a point that sits on the bbox boundary", () => {
  expect(listEvents("24.7536,59.437,24.8,59.5").items).toHaveLength(1);
});

test("returns no events outside the bbox and for a bad bbox", () => {
  expect(listEvents("0,0,1,1")).toEqual({ items: [], limit: 500, truncated: false });
  expect(listEvents("nope", during)).toEqual({ items: [], limit: 500, truncated: false });
  expect(listEvents(null, during)).toEqual({ items: [], limit: 500, truncated: false });
});

test("creates a development event, returns its details, and includes it in Discover", () => {
  const startAt = new Date(Date.now() + 60 * 60_000).toISOString();
  const endAt = new Date(Date.now() + 3 * 60 * 60_000).toISOString();
  const request: components["schemas"]["CreateEventRequest"] = {
    title: "Demo dinner",
    description: null,
    startAt,
    endAt,
    timeZoneId: "Europe/Tallinn",
    address: "Tallinn, Estonia",
    longitude: 24.7536,
    latitude: 59.437,
    visibility: "public",
    approvalMode: "open",
    tags: ["Food"],
  };
  const created = createDemoEvent(request);

  expect(created?.isOwner).toBe(true);
  expect(getEvent(created!.id)?.title).toBe("Demo dinner");
  const found = listEvents(bbox).items.find((event) => event.id === created!.id);
  expect(found?.title).toBe("Demo dinner");
  expect(found?.shareToken).toBeUndefined();
});

test("keeps demo unlisted events out of Discover but lets their creator open details", () => {
  const request: components["schemas"]["CreateEventRequest"] = {
    title: "Unlisted demo",
    description: null,
    startAt: new Date(Date.now() + 60 * 60_000).toISOString(),
    endAt: new Date(Date.now() + 3 * 60 * 60_000).toISOString(),
    timeZoneId: "Europe/Tallinn",
    address: "Tallinn, Estonia",
    longitude: 24.7536,
    latitude: 59.437,
    visibility: "unlisted",
    approvalMode: "open",
    tags: ["Family"],
  };
  const created = createDemoEvent(request);

  expect(listEvents(bbox).items.some((event) => event.id === created?.id)).toBe(false);
  expect(getEvent(created!.id)?.visibility).toBe("unlisted");
  expect(getEvent("00000000-0000-4000-8000-000000000002")).toBeNull();
});

test("joins a public demo event idempotently and updates the attendee count on cancellation", () => {
  const event = listEvents(bbox).items[0]!;
  const first = requestDemoAttendance(event.id, null);
  const second = requestDemoAttendance(event.id, null);
  expect(first?.status).toBe("attending");
  expect(first?.attendingCount).toBe(1);
  expect(second?.attendingCount).toBe(1);
  expect(getDemoAttendance(event.id)?.status).toBe("attending");

  const cancelled = cancelDemoAttendance(event.id);
  expect(cancelled?.status).toBe("cancelled");
  expect(cancelled?.attendingCount).toBe(0);
  expect(getDemoAttendance(event.id)?.status).toBe("cancelled");
  expect(cancelDemoAttendance(event.id)).toBeNull();
});
