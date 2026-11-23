import type { components } from "@happengo/api-client";

export type EventMapResponse = components["schemas"]["EventMapResponse"];
export type EventResponse = components["schemas"]["EventResponse"];
export type CreateEventRequest = components["schemas"]["CreateEventRequest"];
export type AttendanceStatus = components["schemas"]["AttendanceStatus"];
export type AttendanceResponse = components["schemas"]["AttendanceResponse"];
export type MyAttendanceResponse = components["schemas"]["MyAttendanceResponse"];
export type PendingAttendanceResponse = components["schemas"]["PendingAttendanceResponse"];

export const mapResultLimit = 500;

const tallinn = { longitude: 24.7536, latitude: 59.437 };
function createFixtures(now: Date): EventResponse[] {
  const nowMs = now.getTime();
  const liveEvent: EventResponse = {
    id: "00000000-0000-4000-8000-000000000001",
    title: "Sample gathering",
    description: null,
    startAt: new Date(nowMs - 30 * 60_000).toISOString(),
    endAt: new Date(nowMs + 90 * 60_000).toISOString(),
    timeZoneId: "Europe/Tallinn",
    address: "Tallinn, Estonia",
    tags: ["Music"],
    visibility: "public",
    approvalMode: "open",
    happeningNow: true,
    isOwner: false,
    attendingCount: 0,
    longitude: tallinn.longitude,
    latitude: tallinn.latitude,
  };
  return [
    liveEvent,
    { ...liveEvent, id: "00000000-0000-4000-8000-000000000002", title: "Unlisted gathering", visibility: "unlisted" },
    {
      ...liveEvent,
      id: "00000000-0000-4000-8000-000000000003",
      title: "Ended gathering",
      startAt: new Date(nowMs - 4 * 60 * 60_000).toISOString(),
      endAt: new Date(nowMs - 2 * 60 * 60_000).toISOString(),
    },
  ];
}

const fixtures = createFixtures(new Date());
const demoEvents: EventResponse[] = [];
const attendance = new Map<string, AttendanceStatus>();
const pendingUsers = new Map<string, string[]>();
const demoUserId = "demo-current-user";
let nextDemoId = 101;

function attendanceKey(eventId: string, userId = demoUserId): string {
  return `${eventId}:${userId}`;
}

/** Creates an in-memory event for the development-only mock API. */
export function createDemoEvent(request: CreateEventRequest, now = new Date()): EventResponse | null {
  if (
    !request.title || !request.startAt || !request.endAt || !request.timeZoneId || !request.address
    || request.longitude == null || request.latitude == null || !request.visibility || !request.approvalMode
    || !request.tags || request.tags.length === 0
  ) return null;

  const id = `00000000-0000-4000-8000-${String(nextDemoId++).padStart(12, "0")}`;
  const event: EventResponse = {
    id,
    title: request.title,
    description: request.description ?? null,
    startAt: request.startAt,
    endAt: request.endAt,
    timeZoneId: request.timeZoneId,
    address: request.address,
    tags: request.tags ?? [],
    visibility: request.visibility,
    approvalMode: request.approvalMode,
    happeningNow: isHappeningNow(request.startAt, request.endAt, now),
    isOwner: true,
    attendingCount: 1,
    longitude: request.longitude,
    latitude: request.latitude,
    shareToken: `demo-share-${String(nextDemoId).padStart(12, "0")}`,
  };
  demoEvents.unshift(event);
  attendance.set(attendanceKey(event.id), "attending");
  return event;
}

export function resetDemoEvents(): void {
  demoEvents.length = 0;
  attendance.clear();
  pendingUsers.clear();
  nextDemoId = 101;
}

export function getDemoAttendance(eventId: string): MyAttendanceResponse | null {
  const event = getEvent(eventId);
  if (!event) return null;
  return { eventId, status: attendance.get(attendanceKey(eventId)) ?? null };
}

export function getDemoPendingRequests(eventId: string): PendingAttendanceResponse | null {
  const event = demoEvents.find((item) => item.id === eventId && item.isOwner);
  return event ? { userIds: [...(pendingUsers.get(eventId) ?? [])] } : null;
}

export function requestDemoAttendance(eventId: string, shareToken: string | null): AttendanceResponse | null {
  const event = getEvent(eventId);
  if (!event || event.isOwner || Date.parse(event.endAt) <= Date.now()) return null;
  if (event.visibility === "unlisted" && event.shareToken !== shareToken) return null;
  if (event.visibility === "friends_only") return null;

  const key = attendanceKey(eventId);
  const current = attendance.get(key);
  if (current === "attending" || current === "requested") {
    return { eventId, status: current, attendingCount: event.attendingCount };
  }
  if (current === "rejected" || current === "cancelled") return null;

  const status: AttendanceStatus = event.approvalMode === "open" ? "attending" : "requested";
  attendance.set(key, status);
  const attendingCount = event.attendingCount + (status === "attending" ? 1 : 0);
  updateDemoAttendingCount(eventId, attendingCount);
  return { eventId, status, attendingCount };
}

export function decideDemoAttendance(
  eventId: string,
  userId: string,
  decision: "attending" | "rejected",
): AttendanceResponse | null {
  const event = demoEvents.find((item) => item.id === eventId && item.isOwner);
  const userIds = pendingUsers.get(eventId) ?? [];
  if (!event || !userIds.includes(userId)) return null;
  pendingUsers.set(eventId, userIds.filter((id) => id !== userId));
  attendance.set(attendanceKey(eventId, userId), decision);
  const attendingCount = event.attendingCount + (decision === "attending" ? 1 : 0);
  updateDemoAttendingCount(eventId, attendingCount);
  return { eventId, status: decision, attendingCount };
}

export function cancelDemoAttendance(eventId: string): AttendanceResponse | null {
  const event = getEvent(eventId);
  if (!event || event.isOwner || attendance.get(attendanceKey(eventId)) !== "attending") return null;
  attendance.set(attendanceKey(eventId), "cancelled");
  const attendingCount = Math.max(0, event.attendingCount - 1);
  updateDemoAttendingCount(eventId, attendingCount);
  return { eventId, status: "cancelled", attendingCount };
}

function updateDemoAttendingCount(eventId: string, attendingCount: number): void {
  const eventIndex = demoEvents.findIndex((item) => item.id === eventId);
  if (eventIndex >= 0) {
    const event = demoEvents[eventIndex];
    if (event) demoEvents[eventIndex] = { ...event, attendingCount };
    return;
  }
  const fixtureIndex = fixtures.findIndex((item) => item.id === eventId);
  if (fixtureIndex >= 0) {
    const event = fixtures[fixtureIndex];
    if (event) fixtures[fixtureIndex] = { ...event, attendingCount };
  }
}

export function getEvent(id: string, now = new Date()): EventResponse | null {
  const event = [...demoEvents, ...fixtures].find((item) => item.id === id);
  if (!event || (event.visibility !== "public" && !event.isOwner)) return null;
  if (Date.parse(event.endAt) < now.getTime() && !event.isOwner) return null;
  return { ...event, happeningNow: isHappeningNow(event.startAt, event.endAt, now) };
}

/** Happening now includes both event boundary instants. */
export function isHappeningNow(startAt: string, endAt: string, now: Date): boolean {
  const time = now.getTime();
  return Date.parse(startAt) <= time && time <= Date.parse(endAt);
}

/**
 * Viewport events for the map. Unlisted events are never returned, including
 * for the owner. A share token is not an input and does not grant access.
 * Events disappear from the map after their end instant (endAt < now).
 */
export function listEvents(bbox: string | null, now = new Date()): EventMapResponse {
  const box = parseBbox(bbox);
  if (!box) return { items: [], limit: mapResultLimit, truncated: false };
  const [minLng, minLat, maxLng, maxLat] = box;
  const items = [...fixtures, ...demoEvents]
    .filter((event) => event.visibility !== "unlisted")
    .filter((event) => Date.parse(event.endAt) >= now.getTime())
    .filter(
      (event) =>
        event.longitude >= minLng &&
        event.longitude <= maxLng &&
        event.latitude >= minLat &&
        event.latitude <= maxLat,
    )
    .map(({ shareToken: _shareToken, ...event }) => ({
      ...event,
      happeningNow: isHappeningNow(event.startAt, event.endAt, now),
    }));
  return { items, limit: mapResultLimit, truncated: false };
}

/** Events created by the demo user plus events they are attending or requested. */
export function listMyEvents(now = new Date()): EventMapResponse {
  const items = [...demoEvents, ...fixtures]
    .filter((event) => event.isOwner || ["attending", "requested"].includes(attendance.get(attendanceKey(event.id)) ?? ""))
    .map(({ shareToken: _shareToken, ...event }) => ({
      ...event,
      happeningNow: isHappeningNow(event.startAt, event.endAt, now),
    }))
    .sort((a, b) => Number(Date.parse(a.startAt) <= now.getTime()) - Number(Date.parse(b.startAt) <= now.getTime())
      || Date.parse(a.startAt) - Date.parse(b.startAt));
  return { items, limit: mapResultLimit, truncated: false };
}

function parseBbox(value: string | null): readonly [number, number, number, number] | null {
  if (!value) return null;
  const parts = value.split(",");
  if (parts.length !== 4) return null;
  const numbers = parts.map((part) => Number(part.trim()));
  if (numbers.some((number) => !Number.isFinite(number))) return null;
  const minLng = numbers[0];
  const minLat = numbers[1];
  const maxLng = numbers[2];
  const maxLat = numbers[3];
  if (minLng === undefined || minLat === undefined || maxLng === undefined || maxLat === undefined) {
    return null;
  }
  if (minLng > maxLng || minLat > maxLat) return null;
  return [minLng, minLat, maxLng, maxLat];
}
