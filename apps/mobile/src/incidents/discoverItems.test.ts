import { mergeDiscoverItems, type Incident } from "./discoverItems";
import type { MapEvent } from "@/events/mapEvents";

const event = { id: "event", startAt: "2026-11-25T10:00:00Z" } as MapEvent;
const incident = (id: string, isActive = true): Incident => ({
  id, category: "fire", description: "Smoke", longitude: 24, latitude: 59, address: "Tallinn",
  createdAt: "2026-11-25T09:00:00Z", lastConfirmedAt: "2026-11-25T09:00:00Z", closedAt: null,
  closeReason: null, isActive, stillThereCount: 0, goneCount: 0, myVote: null, isReporter: false,
});

describe("mergeDiscoverItems", () => {
  it("shows events and incidents by default and keeps incident items first by time", () => {
    expect(mergeDiscoverItems([event], [incident("active")], "all").map((item) => item.kind)).toEqual(["incident", "event"]);
  });

  it("filters to the selected type and excludes inactive incidents", () => {
    expect(mergeDiscoverItems([event], [incident("active"), incident("closed", false)], "events").map((item) => item.kind)).toEqual(["event"]);
    expect(mergeDiscoverItems([event], [incident("active"), incident("closed", false)], "incidents").map((item) => item.kind)).toEqual(["incident"]);
  });
});
