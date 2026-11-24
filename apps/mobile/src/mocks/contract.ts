import type { components } from "@happengo/api-client";
import { hasEnded, isHappeningNow } from "../events/liveState";

export { hasEnded, isHappeningNow };

export type EventMapResponse = components["schemas"]["EventMapResponse"];
export type EventResponse = components["schemas"]["EventResponse"];
export type CreateEventRequest = components["schemas"]["CreateEventRequest"];
export type AttendanceStatus = components["schemas"]["AttendanceStatus"];
export type AttendanceResponse = components["schemas"]["AttendanceResponse"];
export type MyAttendanceResponse = components["schemas"]["MyAttendanceResponse"];
export type PendingAttendanceRequest = components["schemas"]["PendingAttendanceRequest"];
export type PendingAttendanceResponse = components["schemas"]["PendingAttendanceResponse"];

export const mapResultLimit = 500;

const tallinn = { longitude: 24.7536, latitude: 59.437 };

export const liveEventId = "00000000-0000-4000-8000-000000000001";
export const unlistedEventId = "00000000-0000-4000-8000-000000000002";
export const endedStrangerEventId = "00000000-0000-4000-8000-000000000003";
export const lunchEventId = "00000000-0000-4000-8000-000000000004";
export const runEventId = "00000000-0000-4000-8000-000000000005";
export const studioEventId = "00000000-0000-4000-8000-000000000006";
export const picnicEventId = "00000000-0000-4000-8000-000000000007";
export const requestEventId = "00000000-0000-4000-8000-000000000008";

function createFixtures(now: Date): EventResponse[] {
  const nowMs = now.getTime();
  const base = {
    description: null,
    timeZoneId: "Europe/Tallinn",
    address: "Tallinn, Estonia",
    visibility: "public" as const,
    approvalMode: "open" as const,
    happeningNow: false,
    isOwner: false,
    attendingCount: 0,
    invitedFriendTags: null,
    cancelledAt: null,
    longitude: tallinn.longitude,
    latitude: tallinn.latitude,
  };
  return [
    {
      ...base,
      id: liveEventId,
      title: "Harbour choir",
      startAt: new Date(nowMs - 30 * 60_000).toISOString(),
      endAt: new Date(nowMs + 90 * 60_000).toISOString(),
      tags: ["Music"],
      happeningNow: true,
      description: "A short harbour rehearsal, open to anyone nearby.",
    },
    {
      ...base,
      id: unlistedEventId,
      title: "Unlisted gathering",
      startAt: new Date(nowMs - 30 * 60_000).toISOString(),
      endAt: new Date(nowMs + 90 * 60_000).toISOString(),
      tags: ["Family"],
      visibility: "unlisted",
    },
    {
      ...base,
      id: endedStrangerEventId,
      title: "Ended gathering",
      startAt: new Date(nowMs - 4 * 60 * 60_000).toISOString(),
      endAt: new Date(nowMs - 2 * 60 * 60_000).toISOString(),
      tags: ["Culture"],
    },
    {
      ...base,
      id: lunchEventId,
      title: "Market lunch",
      startAt: new Date(nowMs + 2 * 60 * 60_000).toISOString(),
      endAt: new Date(nowMs + 5 * 60 * 60_000).toISOString(),
      tags: ["Food"],
      longitude: 24.77,
      latitude: 59.445,
    },
    {
      ...base,
      id: runEventId,
      title: "Kadriorg run",
      startAt: new Date(nowMs + 3 * 60 * 60_000).toISOString(),
      endAt: new Date(nowMs + 4 * 60 * 60_000).toISOString(),
      tags: ["Sports", "Outdoor"],
      longitude: 24.735,
      latitude: 59.43,
    },
    {
      ...base,
      id: studioEventId,
      title: "Studio night",
      startAt: new Date(nowMs + 6 * 60 * 60_000).toISOString(),
      endAt: new Date(nowMs + 9 * 60 * 60_000).toISOString(),
      tags: ["Art"],
      description: "An evening in the studio. The host approves each request.",
      approvalMode: "approval",
      isOwner: true,
      attendingCount: 1,
      longitude: 24.76,
      latitude: 59.428,
    },
    {
      ...base,
      id: requestEventId,
      title: "Gallery opening",
      startAt: new Date(nowMs + 8 * 60 * 60_000).toISOString(),
      endAt: new Date(nowMs + 10 * 60 * 60_000).toISOString(),
      tags: ["Nightlife"],
      approvalMode: "approval",
      longitude: 24.742,
      latitude: 59.44,
    },
    {
      ...base,
      id: picnicEventId,
      title: "Sunday picnic",
      startAt: new Date(nowMs - 26 * 60 * 60_000).toISOString(),
      endAt: new Date(nowMs - 24 * 60 * 60_000).toISOString(),
      tags: ["Family"],
      description: "A family picnic that has already ended.",
      isOwner: true,
      attendingCount: 1,
      longitude: 24.748,
      latitude: 59.45,
    },
  ];
}

const fixtures = createFixtures(new Date());
const demoEvents: EventResponse[] = [];
const attendance = new Map<string, AttendanceStatus>();
const pendingUsers = new Map<string, PendingAttendanceRequest[]>();
const shareTokens = new Map<string, string>();
const demoUserId = "demo-current-user";
/** Synthetic requester so the single-user demo can exercise owner approve and decline. */
export const demoPendingRequesterId = "00000000-0000-4000-8000-0000000000aa";
let nextDemoId = 101;

function seedFixtureRelations(): void {
  attendance.set(attendanceKey(studioEventId), "attending");
  attendance.set(attendanceKey(studioEventId, demoPendingRequesterId), "requested");
  pendingUsers.set(studioEventId, [{
    userId: demoPendingRequesterId,
    displayName: "Demo Guest",
    requestedAt: new Date(Date.now() - 12 * 60_000).toISOString(),
  }]);
  attendance.set(attendanceKey(picnicEventId), "attending");
  shareTokens.set(unlistedEventId, "demo-unlisted-token");
}

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
    invitedFriendTags: request.visibility === "friends_only" ? [...(request.invitedFriendTags ?? [])] : [],
    cancelledAt: null,
    longitude: request.longitude,
    latitude: request.latitude,
  };
  if (request.visibility === "unlisted") {
    shareTokens.set(id, `demo-share-${String(nextDemoId).padStart(12, "0")}`);
  }
  demoEvents.unshift(event);
  attendance.set(attendanceKey(event.id), "attending");
  if (request.approvalMode === "approval") {
    pendingUsers.set(id, [{
      userId: demoPendingRequesterId,
      displayName: "Demo Guest",
      requestedAt: now.toISOString(),
    }]);
    attendance.set(attendanceKey(id, demoPendingRequesterId), "requested");
  }
  return event;
}

export function resetDemoEvents(): void {
  demoEvents.length = 0;
  attendance.clear();
  pendingUsers.clear();
  shareTokens.clear();
  nextDemoId = 101;
  for (let index = 0; index < fixtures.length; index += 1) {
    const event = fixtures[index];
    if (!event) continue;
    const owned = event.id === studioEventId || event.id === picnicEventId;
    fixtures[index] = { ...event, attendingCount: owned ? 1 : 0 };
  }
  seedFixtureRelations();
}

seedFixtureRelations();

export function getDemoAttendance(eventId: string): MyAttendanceResponse | null {
  const event = getEvent(eventId);
  if (!event) return null;
  return { eventId, status: attendance.get(attendanceKey(eventId)) ?? null };
}

export function getDemoPendingRequests(eventId: string): PendingAttendanceResponse | null {
  const event = [...demoEvents, ...fixtures].find((item) => item.id === eventId && item.isOwner);
  return event ? { requests: (pendingUsers.get(eventId) ?? []).map((request) => ({ ...request })) } : null;
}

export function requestDemoAttendance(eventId: string, shareToken: string | null): AttendanceResponse | null {
  const event = getEvent(eventId);
  if (!event || event.isOwner || event.cancelledAt || hasEnded(event.endAt, new Date())) return null;
  if (event.visibility === "unlisted" && shareTokens.get(eventId) !== shareToken) return null;
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

export type EditEventRequest = components["schemas"]["EditEventRequest"];

export function editDemoEvent(eventId: string, request: EditEventRequest, now = new Date()): EventResponse | null {
  const event = [...demoEvents, ...fixtures].find((item) => item.id === eventId && item.isOwner);
  if (
    !event || hasEnded(event.endAt, now) || !request.title || !request.startAt || !request.endAt
    || !request.timeZoneId || !request.address || request.longitude == null || request.latitude == null
    || !request.tags?.length
  ) return null;
  Object.assign(event, {
    title: request.title,
    description: request.description ?? null,
    startAt: request.startAt,
    endAt: request.endAt,
    timeZoneId: request.timeZoneId,
    address: request.address,
    longitude: request.longitude,
    latitude: request.latitude,
    tags: [...request.tags],
    invitedFriendTags: event.visibility === "friends_only" ? [...(request.invitedFriendTags ?? [])] : event.invitedFriendTags,
    happeningNow: !event.cancelledAt && isHappeningNow(request.startAt, request.endAt, now),
  });
  return publish(event, now);
}

export function cancelDemoEvent(eventId: string, now = new Date()): EventResponse | null {
  const event = [...demoEvents, ...fixtures].find((item) => item.id === eventId && item.isOwner);
  if (!event) return null;
  event.cancelledAt ??= now.toISOString();
  event.happeningNow = false;
  return publish(event, now);
}

export function decideDemoAttendance(
  eventId: string,
  userId: string,
  decision: "attending" | "rejected",
): AttendanceResponse | null {
  const event = [...demoEvents, ...fixtures].find((item) => item.id === eventId && item.isOwner);
  const requests = pendingUsers.get(eventId) ?? [];
  if (!event || !requests.some((request) => request.userId === userId)) return null;
  pendingUsers.set(eventId, requests.filter((request) => request.userId !== userId));
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
  const attending = attendance.get(attendanceKey(event.id)) === "attending";
  if (hasEnded(event.endAt, now) && !event.isOwner && !attending) return null;
  return publish(event, now);
}

function publish(event: EventResponse, now: Date): EventResponse {
  const { shareToken: _shareToken, invitedFriendTags, ...rest } = event;
  return {
    ...rest,
    happeningNow: isHappeningNow(event.startAt, event.endAt, now),
    invitedFriendTags: event.isOwner ? invitedFriendTags ?? [] : null,
  };
}

/**
 * Viewport events for the map. Unlisted events are never returned, including
 * for the owner. A share token is not an input and does not grant access.
 * Events leave the map at endAt (now >= endAt).
 */
export type DemoListFilters = {
  tags?: readonly string[];
  happeningNow?: boolean;
};

export function listEvents(bbox: string | null, now = new Date(), filters: DemoListFilters = {}): EventMapResponse {
  const box = parseBbox(bbox);
  if (!box) return { items: [], limit: mapResultLimit, truncated: false };
  const [minLng, minLat, maxLng, maxLat] = box;
  const items = [...fixtures, ...demoEvents]
    .filter((event) => event.visibility !== "unlisted")
    .filter((event) => event.visibility !== "friends_only" || event.isOwner)
    .filter((event) => !event.cancelledAt)
    .filter((event) => !hasEnded(event.endAt, now))
    .filter((event) => !filters.tags?.length || event.tags.some((tag) => filters.tags?.includes(tag)))
    .filter((event) => !filters.happeningNow || isHappeningNow(event.startAt, event.endAt, now))
    .filter(
      (event) =>
        event.longitude >= minLng &&
        event.longitude <= maxLng &&
        event.latitude >= minLat &&
        event.latitude <= maxLat,
    )
    .map((event) => publish(event, now));
  return { items, limit: mapResultLimit, truncated: false };
}

/** Events the demo user owns or is attending, plus requests that have not ended. */
export function listMyEvents(now = new Date()): EventMapResponse {
  const items = [...demoEvents, ...fixtures]
    .filter((event) => {
      if (event.isOwner) return true;
      const status = attendance.get(attendanceKey(event.id));
      if (status === "attending") return true;
      return status === "requested" && !hasEnded(event.endAt, now);
    })
    .map((event) => publish(event, now))
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
