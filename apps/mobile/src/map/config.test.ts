import { OPENFREEMAP_POSITRON, TALLINN, mapStyleUrl } from "./config";

test("defaults to OpenFreeMap Positron and Tallinn", () => {
  expect(mapStyleUrl({})).toBe(OPENFREEMAP_POSITRON);
  expect(TALLINN).toEqual({ longitude: 24.7536, latitude: 59.437 });
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
