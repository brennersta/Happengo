import { discoverQuery, emptyDiscoverFilters } from "./discoverFilters";

test("omits unused filters from the viewport query", () => {
  expect(discoverQuery("24,59,25,60", emptyDiscoverFilters)).toEqual({ bbox: "24,59,25,60" });
});

test("sends selected tags and the happening-now flag", () => {
  expect(discoverQuery("24,59,25,60", { tags: ["Food", "Music"], happeningNow: true })).toEqual({
    bbox: "24,59,25,60",
    tags: ["Food", "Music"],
    happeningNow: true,
  });
});
