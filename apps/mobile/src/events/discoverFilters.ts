import type { EventTag } from "@/map/markerStyle";

export type DiscoverFilters = {
  tags: EventTag[];
  happeningNow: boolean;
};

export const emptyDiscoverFilters: DiscoverFilters = { tags: [], happeningNow: false };

export function discoverQuery(bbox: string, filters: DiscoverFilters): {
  bbox: string;
  tags?: EventTag[];
  happeningNow?: boolean;
} {
  return {
    bbox,
    ...(filters.tags.length > 0 ? { tags: filters.tags } : {}),
    ...(filters.happeningNow ? { happeningNow: true } : {}),
  };
}
