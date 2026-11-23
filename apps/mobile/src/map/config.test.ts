import { OPENFREEMAP_POSITRON, TALLINN, mapLibreWorkerUrl, mapStyleUrl } from "./config";

test("defaults to OpenFreeMap Positron and Tallinn", () => {
  expect(mapStyleUrl({})).toBe(OPENFREEMAP_POSITRON);
  expect(TALLINN).toEqual({ longitude: 24.7536, latitude: 59.437 });
});

test("prefixes the map worker with the Pages base path", () => {
  expect(mapLibreWorkerUrl({})).toBe("/maplibre/maplibre-gl-worker.mjs");
  expect(mapLibreWorkerUrl({ EXPO_BASE_URL: "/Happengo" })).toBe("/Happengo/maplibre/maplibre-gl-worker.mjs");
  expect(mapLibreWorkerUrl({ EXPO_PUBLIC_DEMO_MODE: "true" })).toBe("/Happengo/maplibre/maplibre-gl-worker.mjs");
});

test("uses a configured style and substitutes a key only in {key}", () => {
  expect(mapStyleUrl({ EXPO_PUBLIC_MAP_STYLE_URL: "https://tiles.example/style.json" })).toBe(
    "https://tiles.example/style.json",
  );
  expect(
    mapStyleUrl({
      EXPO_PUBLIC_MAP_STYLE_URL: "https://tiles.example/style.json",
      EXPO_PUBLIC_MAP_API_KEY: "secret",
    }),
  ).toBe("https://tiles.example/style.json");
  expect(
    mapStyleUrl({
      EXPO_PUBLIC_MAP_STYLE_URL: "https://tiles.example/{key}/style.json",
      EXPO_PUBLIC_MAP_API_KEY: "a b",
    }),
  ).toBe("https://tiles.example/a%20b/style.json");
});
