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

test("returns a mix of tagged public events around Tallinn, with one live", () => {
  const body = listEvents(bbox);
  expect(body.truncated).toBe(false);
  expect(body.limit).toBe(500);
  expect(body.items.map((event) => event.title).sort()).toEqual([
    "Gallery opening",
    "Harbour choir",
    "Kadriorg run",
    "Market lunch",
    "Studio night",
  ]);
  expect(body.items.filter((event) => event.happeningNow).map((event) => event.title)).toEqual(["Harbour choir"]);
  expect(body.items.every((event) => event.shareToken === undefined)).toBe(true);
  expect(new Set(body.items.map((event) => event.tags[0])).size).toBeGreaterThan(1);
  const live = body.items.find((event) => event.title === "Harbour choir");
  expect(live?.address).toBe("Tallinn, Estonia");
  expect(live?.longitude).toBe(24.7536);
  expect(live?.latitude).toBe(59.437);
});

test("tag and happening-now filters narrow the viewport and keep unlisted events off the map", () => {
  expect(listEvents(bbox, new Date(), { tags: ["Food"] }).items.map((event) => event.title)).toEqual(["Market lunch"]);
  expect(listEvents(bbox, new Date(), { happeningNow: true }).items.map((event) => event.title)).toEqual(["Harbour choir"]);
  expect(listEvents(bbox, new Date(), { tags: ["Family"], happeningNow: true }).items).toEqual([]);
  expect(listEvents(bbox, new Date(atEnd), { happeningNow: true }).items.some((event) => event.id === liveEvent.id)).toBe(false);
});

test("unlisted events never appear on the map", () => {
  const body = listEvents(bbox);
  expect(body.items.some((event) => event.visibility === "unlisted")).toBe(false);
  expect(body.items.some((event) => event.title === "Unlisted gathering")).toBe(false);
});

test("an event leaves the map and stops being live at endAt", () => {
  const beforeEnd = listEvents(bbox, new Date(atEnd.getTime() - 1)).items.map((event) => event.id);
  const atEndItems = listEvents(bbox, atEnd).items.map((event) => event.id);
  expect(beforeEnd).toContain(liveEvent.id);
  expect(atEndItems).not.toContain(liveEvent.id);
  expect(isHappeningNow(liveEvent.startAt, liveEvent.endAt, new Date(liveEvent.startAt))).toBe(true);
  expect(isHappeningNow(liveEvent.startAt, liveEvent.endAt, new Date(atEnd.getTime() - 1))).toBe(true);
  expect(isHappeningNow(liveEvent.startAt, liveEvent.endAt, atEnd)).toBe(false);
});

test("includes a point that sits on the bbox boundary", () => {
  expect(listEvents("24.7536,59.437,24.8,59.5").items.some((event) => event.id === liveEvent.id)).toBe(true);
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
  expect(created?.shareToken).toBeUndefined();
  const mine = listMyEvents().items.map((event) => event.id);
  expect(mine).toEqual(expect.arrayContaining([created!.id, "00000000-0000-4000-8000-000000000006", "00000000-0000-4000-8000-000000000007"]));
  expect(mine).not.toContain("00000000-0000-4000-8000-000000000004");
  expect(getDemoPendingRequests(created!.id)?.userIds).toEqual([demoPendingRequesterId]);
  expect(decideDemoAttendance(created!.id, demoPendingRequesterId, "rejected")?.status).toBe("rejected");
  expect(getDemoPendingRequests(created!.id)?.userIds).toEqual([]);

  const sample = listEvents(bbox).items.find((event) => event.title === "Harbour choir")!;
  expect(listMyEvents().items.some((event) => event.id === sample.id)).toBe(false);
  expect(requestDemoAttendance(sample.id, null)?.status).toBe("attending");
  expect(listMyEvents().items.map((event) => event.id)).toContain(sample.id);
});

test("listMyEvents drops a request at endAt and still returns an owned past event", () => {
  const opening = listEvents(bbox).items.find((event) => event.title === "Gallery opening")!;
  expect(requestDemoAttendance(opening.id, null)?.status).toBe("requested");
  expect(listMyEvents().items.some((event) => event.id === opening.id)).toBe(true);
  expect(listMyEvents(new Date(opening.endAt)).items.some((event) => event.id === opening.id)).toBe(false);
  expect(listMyEvents().items.some((event) => event.title === "Sunday picnic")).toBe(true);
  expect(listEvents(bbox).items.some((event) => event.title === "Sunday picnic")).toBe(false);
});

test("joins a public demo event idempotently and updates the attendee count on cancellation", () => {
  const event = listEvents(bbox).items.find((item) => item.title === "Harbour choir")!;
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
