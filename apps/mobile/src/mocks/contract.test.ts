import {
  cancelDemoEvent,
  editDemoEvent,
  getEvent,
  listEvents,
  listMyEvents,
  resetDemoEvents,
  studioEventId,
} from "./contract";
import type { EditEventRequest } from "./contract";

beforeEach(() => resetDemoEvents());

test("demo event edits preserve visibility and approval mode and keep tag order", () => {
  const now = new Date();
  const original = getEvent(studioEventId, now);
  expect(original).not.toBeNull();
  const request: EditEventRequest = {
    title: "Updated studio night",
    description: "Updated details",
    startAt: new Date(now.getTime() + 4 * 60 * 60_000).toISOString(),
    endAt: new Date(now.getTime() + 6 * 60 * 60_000).toISOString(),
    timeZoneId: "Europe/Tallinn",
    address: "New address",
    longitude: 24.81,
    latitude: 59.46,
    tags: ["Nightlife", "Music"],
    invitedFriendTags: [],
  };

  const updated = editDemoEvent(studioEventId, request, now);

  expect(updated?.title).toBe("Updated studio night");
  expect(updated?.tags).toEqual(["Nightlife", "Music"]);
  expect(updated?.visibility).toBe(original?.visibility);
  expect(updated?.approvalMode).toBe(original?.approvalMode);
});

test("demo cancellation stays visible in My Events and detail but leaves map discovery", () => {
  const now = new Date();
  const cancelled = cancelDemoEvent(studioEventId, now);

  expect(cancelled?.cancelledAt).toBe(now.toISOString());
  expect(getEvent(studioEventId, now)?.cancelledAt).toBe(now.toISOString());
  expect(listMyEvents(now).items.find((event) => event.id === studioEventId)?.cancelledAt).toBe(now.toISOString());
  expect(listEvents("24.7,59.4,24.9,59.5", now).items.some((event) => event.id === studioEventId)).toBe(false);
});
