import type { components } from "@happengo/api-client";
import type { MapEvent } from "@/events/mapEvents";

export type Incident = components["schemas"]["IncidentResponse"];
export type DiscoverKind = "events" | "incidents" | "all";
export type DiscoverItem = { kind: "event"; value: MapEvent } | { kind: "incident"; value: Incident };

export function mergeDiscoverItems(events: readonly MapEvent[], incidents: readonly Incident[], kind: DiscoverKind): DiscoverItem[] {
  const items: DiscoverItem[] = [
    ...(kind === "incidents" ? [] : events.map((value): DiscoverItem => ({ kind: "event", value }))),
    ...(kind === "events" ? [] : incidents.filter((incident) => incident.isActive).map((value): DiscoverItem => ({ kind: "incident", value }))),
  ];
  return items.sort((a, b) => {
    const aTime = a.kind === "incident" ? Date.parse(a.value.createdAt) : Date.parse(a.value.startAt);
    const bTime = b.kind === "incident" ? Date.parse(b.value.createdAt) : Date.parse(b.value.startAt);
    return aTime - bTime;
  });
}

export function incidentCategoryIcon(category: Incident["category"]): string {
  if (category === "fire") return "flame";
  if (category === "traffic_collision") return "car-sport";
  return "alert-circle";
}
