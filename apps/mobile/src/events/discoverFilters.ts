import type { EventTag } from "@/map/markerStyle";
import { localTimeZone } from "./createEventForm";

export type WhenFilter = "now" | "today" | "weekend" | "next7days";

export type DiscoverFilters = {
  tags: EventTag[];
  happeningNow: boolean;
  when: WhenFilter;
};

export const emptyDiscoverFilters: DiscoverFilters = { tags: [], happeningNow: false, when: "now" };

export function discoverQuery(bbox: string, filters: DiscoverFilters, timeZoneId = localTimeZone()): {
  bbox: string;
  tags?: EventTag[];
  happeningNow?: boolean;
  when?: WhenFilter;
  timeZoneId: string;
} {
  return {
    bbox,
    timeZoneId,
    ...(filters.tags.length > 0 ? { tags: filters.tags } : {}),
    ...(filters.happeningNow ? { happeningNow: true } : {}),
    ...(filters.when !== "now" ? { when: filters.when } : {}),
  };
}
