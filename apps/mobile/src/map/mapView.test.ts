import { DEFAULT_MAP_VIEW, initialMapView, validMapView } from "./mapView";

const saved = { center: { longitude: 10, latitude: 20 }, zoom: 8 };

test("starts at the device when permission was already granted", () => {
  expect(initialMapView({ longitude: 30, latitude: 40 }, saved)).toEqual({ center: { longitude: 30, latitude: 40 }, zoom: 13 });
});

test("falls back to the saved map view before Tallinn", () => {
  expect(initialMapView(null, saved)).toBe(saved);
  expect(initialMapView(null, null)).toBe(DEFAULT_MAP_VIEW);
});

test("validates persisted map views", () => {
  expect(validMapView(saved)).toBe(true);
  expect(validMapView({ center: { longitude: 190, latitude: 20 }, zoom: 8 })).toBe(false);
  expect(validMapView(null)).toBe(false);
});
