import { listEvents } from "./contract";

test("returns the sample event when the bbox contains Tallinn", () => {
  const body = listEvents("24.6,59.3,24.9,59.5");
  expect(body.truncated).toBe(false);
  expect(body.events).toHaveLength(1);
  expect(body.events[0]?.address).toBe("Tallinn, Estonia");
  expect(body.events[0]?.timeZoneId).toBe("Europe/Tallinn");
});

test("includes a point that sits on the bbox boundary", () => {
  expect(listEvents("24.7536,59.437,24.8,59.5").events).toHaveLength(1);
});

test("returns no events outside the bbox and for a bad bbox", () => {
  expect(listEvents("0,0,1,1")).toEqual({ events: [], truncated: false });
  expect(listEvents("nope")).toEqual({ events: [], truncated: false });
  expect(listEvents(null)).toEqual({ events: [], truncated: false });
});
