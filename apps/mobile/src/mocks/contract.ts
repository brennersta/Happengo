import type { components } from "@happengo/api-client";

export type Health = components["schemas"]["Health"];
export type EventList = components["schemas"]["EventList"];
export type EventSummary = components["schemas"]["EventSummary"];

const sample: EventSummary = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Sample gathering",
  startAt: "2026-11-16T08:43:00.000Z",
  endAt: "2026-11-16T12:43:00.000Z",
  timeZoneId: "Europe/Tallinn",
  address: "Tallinn, Estonia",
  location: { longitude: 24.7536, latitude: 59.437 },
};

export function listEvents(bbox: string | null): EventList {
  const box = parseBbox(bbox);
  if (!box) return { events: [], truncated: false };
  const [minLng, minLat, maxLng, maxLat] = box;
  const { longitude, latitude } = sample.location;
  const inside =
    longitude >= minLng &&
    longitude <= maxLng &&
    latitude >= minLat &&
    latitude <= maxLat;
  return { events: inside ? [sample] : [], truncated: false };
}

export const health: Health = { status: "ok" };

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
