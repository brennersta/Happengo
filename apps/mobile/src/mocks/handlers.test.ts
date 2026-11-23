import {
  cancelDemoAttendance,
  createDemoEvent,
  decideDemoAttendance,
  demoPendingRequesterId,
  getDemoAttendance,
  getDemoPendingRequests,
  getEvent,
  isHappeningNow,
  listEvents,
  listMyEvents,
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

test("an event leaves the map and stops being live at endAt", () => {
  expect(listEvents(bbox, new Date(atEnd.getTime() - 1)).items).toHaveLength(1);
  expect(listEvents(bbox, atEnd).items).toEqual([]);
  expect(isHappeningNow(liveEvent.startAt, liveEvent.endAt, new Date(liveEvent.startAt))).toBe(true);
  expect(isHappeningNow(liveEvent.startAt, liveEvent.endAt, new Date(atEnd.getTime() - 1))).toBe(true);
  expect(isHappeningNow(liveEvent.startAt, liveEvent.endAt, atEnd)).toBe(false);
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

test("my events returns only the demo user's owned, attending, or requested events", () => {
  expect(listMyEvents().items).toEqual([]);
  const created = createDemoEvent({
    title: "Owner dinner",
    description: null,
    startAt: new Date(Date.now() + 60 * 60_000).toISOString(),
    endAt: new Date(Date.now() + 3 * 60 * 60_000).toISOString(),
    timeZoneId: "Europe/Tallinn",
    address: "Tallinn, Estonia",
    longitude: 24.7536,
    latitude: 59.437,
    visibility: "public",
    approvalMode: "approval",
    tags: ["Nightlife", "Music"],
  });
  expect(created?.tags).toEqual(["Nightlife", "Music"]);
  const mine = listMyEvents().items.map((event) => event.id);
  expect(mine).toEqual([created!.id]);
  expect(getDemoPendingRequests(created!.id)?.userIds).toEqual([demoPendingRequesterId]);
  expect(decideDemoAttendance(created!.id, demoPendingRequesterId, "rejected")?.status).toBe("rejected");
  expect(getDemoPendingRequests(created!.id)?.userIds).toEqual([]);

  const sample = listEvents(bbox).items[0]!;
  expect(listMyEvents().items.some((event) => event.id === sample.id)).toBe(false);
  expect(requestDemoAttendance(sample.id, null)?.status).toBe("attending");
  expect(listMyEvents().items.map((event) => event.id)).toContain(sample.id);
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
