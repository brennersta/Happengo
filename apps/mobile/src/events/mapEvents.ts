import type { components } from "@happengo/api-client";
import type { MapBounds } from "@/map/types";

export type MapEvent = components["schemas"]["EventResponse"];
export type EventMapResponse = components["schemas"]["EventMapResponse"];

export function bboxForBounds(bounds: MapBounds): string {
  const minLng = Math.max(-180, Math.min(180, bounds.southWest.longitude));
  const minLat = Math.max(-85, Math.min(85, bounds.southWest.latitude));
  const maxLng = Math.max(-180, Math.min(180, bounds.northEast.longitude));
  const maxLat = Math.max(-85, Math.min(85, bounds.northEast.latitude));
  return [minLng, minLat, maxLng, maxLat].map((value) => Number(value.toFixed(6))).join(",");
}

export function formatEventTime(event: MapEvent, locale?: string): string {
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(start);
  const startTime = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(start);
  const endTime = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(end);
  return `${date}, ${startTime}–${endTime}`;
}
