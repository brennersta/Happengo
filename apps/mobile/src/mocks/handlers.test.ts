import { isHappeningNow, listEvents } from "./contract";

const bbox = "24.6,59.3,24.9,59.5";
const during = new Date("2026-11-16T09:00:00.000Z");
const atEnd = new Date("2026-11-16T12:43:00.000Z");

test("returns the public event when the bbox contains Tallinn", () => {
  const body = listEvents(bbox, during);
  expect(body.truncated).toBe(false);
  expect(body.limit).toBe(500);
  expect(body.items).toHaveLength(1);
  expect(body.items[0]?.address).toBe("Tallinn, Estonia");
  expect(body.items[0]?.visibility).toBe("public");
  expect(body.items[0]?.happeningNow).toBe(true);
  expect(body.items[0]?.shareToken).toBeUndefined();
  expect(body.items[0]?.longitude).toBe(24.7536);
  expect(body.items[0]?.latitude).toBe(59.437);
});

test("unlisted events never appear on the map", () => {
  const body = listEvents(bbox, during);
  expect(body.items.some((event) => event.visibility === "unlisted")).toBe(false);
  expect(body.items.some((event) => event.title === "Unlisted gathering")).toBe(false);
});

test("an ended event is off the map, and happening now stops at endAt", () => {
  expect(listEvents(bbox, atEnd).items).toEqual([]);
  expect(
    isHappeningNow("2026-11-16T08:43:00.000Z", "2026-11-16T12:43:00.000Z", during),
  ).toBe(true);
  expect(
    isHappeningNow(
      "2026-11-16T08:43:00.000Z",
      "2026-11-16T12:43:00.000Z",
      new Date("2026-11-16T08:43:00.000Z"),
    ),
  ).toBe(true);
  expect(isHappeningNow("2026-11-16T08:43:00.000Z", "2026-11-16T12:43:00.000Z", atEnd)).toBe(
    false,
  );
});

test("includes a point that sits on the bbox boundary", () => {
  expect(listEvents("24.7536,59.437,24.8,59.5", during).items).toHaveLength(1);
});

test("returns no events outside the bbox and for a bad bbox", () => {
  expect(listEvents("0,0,1,1", during)).toEqual({ items: [], limit: 500, truncated: false });
  expect(listEvents("nope", during)).toEqual({ items: [], limit: 500, truncated: false });
  expect(listEvents(null, during)).toEqual({ items: [], limit: 500, truncated: false });
});
