import type { components } from "@happengo/api-client";

export type EventMapResponse = components["schemas"]["EventMapResponse"];
export type EventResponse = components["schemas"]["EventResponse"];

export const mapResultLimit = 500;

const tallinn = { longitude: 24.7536, latitude: 59.437 };
const liveStart = "2026-11-16T08:43:00.000Z";
const liveEnd = "2026-11-16T12:43:00.000Z";

const publicEvent: EventResponse = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Sample gathering",
  description: null,
  startAt: liveStart,
  endAt: liveEnd,
  timeZoneId: "Europe/Tallinn",
  address: "Tallinn, Estonia",
  tags: [],
  visibility: "public",
  approvalMode: "open",
  happeningNow: false,
  isOwner: false,
  attendingCount: 0,
  longitude: tallinn.longitude,
  latitude: tallinn.latitude,
};

const unlistedEvent: EventResponse = {
  ...publicEvent,
  id: "00000000-0000-4000-8000-000000000002",
  title: "Unlisted gathering",
  visibility: "unlisted",
};

const endedEvent: EventResponse = {
  ...publicEvent,
  id: "00000000-0000-4000-8000-000000000003",
  title: "Ended gathering",
  startAt: "2026-11-16T06:00:00.000Z",
  endAt: "2026-11-16T08:00:00.000Z",
};

const fixtures = [publicEvent, unlistedEvent, endedEvent];

/** Happening now is half-open: startAt <= now < endAt (ADR 0003). */
export function isHappeningNow(startAt: string, endAt: string, now: Date): boolean {
  const time = now.getTime();
  return Date.parse(startAt) <= time && time < Date.parse(endAt);
}

/**
 * Viewport events for the map. Unlisted events are never returned, including
 * for the owner. A share token is not an input and does not grant access.
 * Ended events (endAt <= now) stay off the map.
 */
export function listEvents(bbox: string | null, now = new Date()): EventMapResponse {
  const box = parseBbox(bbox);
  if (!box) return { items: [], limit: mapResultLimit, truncated: false };
  const [minLng, minLat, maxLng, maxLat] = box;
  const items = fixtures
    .filter((event) => event.visibility !== "unlisted")
    .filter((event) => Date.parse(event.endAt) > now.getTime())
    .filter(
      (event) =>
        event.longitude >= minLng &&
        event.longitude <= maxLng &&
        event.latitude >= minLat &&
        event.latitude <= maxLat,
    )
    .map((event) => ({
      ...event,
      happeningNow: isHappeningNow(event.startAt, event.endAt, now),
    }));
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
