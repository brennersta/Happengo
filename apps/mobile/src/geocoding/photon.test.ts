import { buildPhotonUrl, geocoderBaseUrl, moveHighlight, placeLabel, searchPlaces } from "./photon";

test("the public Photon host is the default and can be replaced", () => {
  expect(geocoderBaseUrl({})).toBe("https://photon.komoot.io");
  expect(geocoderBaseUrl({ EXPO_PUBLIC_GEOCODER_URL: "https://photon.example/api/" })).toBe("https://photon.example/api");
});

test("a short query never calls the geocoder", async () => {
  const fetchImpl = jest.fn();
  await expect(searchPlaces({ query: "sa", latitude: 59.4, longitude: 24.7, fetchImpl })).resolves.toEqual({ status: "idle", places: [] });
  expect(fetchImpl).not.toHaveBeenCalled();
});

test("the request is biased, limited, and carries no user identifier", async () => {
  const fetchImpl = jest.fn(async () => ({
    ok: true,
    json: async () => ({
      features: [
        { geometry: { coordinates: [-43.85, -16.07] }, properties: { name: "Santa Luzia", state: "Minas Gerais", country: "Brazil", osm_type: "R", osm_id: 1 } },
        { geometry: { coordinates: [-45.78, -4.27] }, properties: { name: "Santa Luzia", state: "Maranhão", country: "Brazil", osm_type: "R", osm_id: 2 } },
      ],
    }),
  }));
  const result = await searchPlaces({
    query: "santa",
    latitude: 59.437,
    longitude: 24.7536,
    locale: "en-US",
    fetchImpl,
    baseUrl: "https://photon.example",
  });
  const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
  const parsed = new URL(url);
  expect(parsed.origin + parsed.pathname).toBe("https://photon.example/api/");
  expect(Object.fromEntries(parsed.searchParams.entries())).toEqual({
    q: "santa",
    limit: "5",
    lat: "59.437000",
    lon: "24.753600",
    lang: "en",
  });
  expect(init.credentials).toBe("omit");
  expect(init.headers).toEqual({ Accept: "application/json" });
  expect(result.places.map((place) => place.label)).toEqual([
    "Santa Luzia, Minas Gerais, Brazil",
    "Santa Luzia, Maranhão, Brazil",
  ]);
});

test("Portuguese is not sent because Photon does not support it", () => {
  const url = buildPhotonUrl({ baseUrl: "https://photon.komoot.io", query: "rua", latitude: 1, longitude: 2, locale: "pt-BR" });
  expect(url.searchParams.has("lang")).toBe(false);
});

test("a failed response is an error and an abort is not swallowed", async () => {
  await expect(searchPlaces({
    query: "tallinn",
    latitude: 1,
    longitude: 2,
    fetchImpl: async () => ({ ok: false, json: async () => ({}) }),
  })).resolves.toEqual({ status: "error", places: [] });
  const abort = Object.assign(new Error("aborted"), { name: "AbortError" });
  await expect(searchPlaces({
    query: "tallinn",
    latitude: 1,
    longitude: 2,
    fetchImpl: async () => { throw abort; },
  })).rejects.toBe(abort);
});

test("labels keep the region when names match, and keyboard highlight stops at the ends", () => {
  expect(placeLabel({ street: "Pikk", city: "Tallinn", country: "Estonia" })).toBe("Pikk, Tallinn, Estonia");
  expect(moveHighlight(0, "ArrowDown", 3)).toBe(1);
  expect(moveHighlight(2, "ArrowDown", 3)).toBe(2);
  expect(moveHighlight(0, "ArrowUp", 3)).toBe(0);
});
