import { discoverQuery, emptyDiscoverFilters } from "./discoverFilters";

test("omits unused filters from the viewport query", () => {
  expect(discoverQuery("24,59,25,60", emptyDiscoverFilters, "Europe/Tallinn")).toEqual({
    bbox: "24,59,25,60",
    timeZoneId: "Europe/Tallinn",
  });
});

test("sends selected tags, happening-now, and date-range filters", () => {
  expect(discoverQuery("24,59,25,60", { tags: ["Food", "Music"], happeningNow: true, when: "weekend" }, "America/Sao_Paulo")).toEqual({
    bbox: "24,59,25,60",
    timeZoneId: "America/Sao_Paulo",
    tags: ["Food", "Music"],
    happeningNow: true,
    when: "weekend",
  });
});
