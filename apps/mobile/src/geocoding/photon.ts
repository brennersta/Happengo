export const MIN_QUERY_LENGTH = 3;
export const SEARCH_DEBOUNCE_MS = 300;
export const RESULT_LIMIT = 5;
export const DEFAULT_GEOCODER_URL = "https://photon.komoot.io";

export type GeocodePlace = {
  id: string;
  label: string;
  longitude: number;
  latitude: number;
};

export type GeocodeStatus = "idle" | "ok" | "empty" | "error";

export type GeocodeSearchResult = {
  status: GeocodeStatus;
  places: GeocodePlace[];
};

type FetchLike = (input: string, init?: RequestInit) => Promise<Pick<Response, "ok" | "json">>;

export function geocoderBaseUrl(env: Record<string, string | undefined> = process.env): string {
  return (env.EXPO_PUBLIC_GEOCODER_URL?.trim() || DEFAULT_GEOCODER_URL).replace(/\/+$/, "");
}

export function photonLanguage(locale: string | undefined): "de" | "en" | "fr" | undefined {
  const base = locale?.toLowerCase().split("-")[0];
  if (base === "de" || base === "en" || base === "fr") return base;
  return undefined;
}

export function buildPhotonUrl(input: {
  baseUrl: string;
  query: string;
  latitude: number;
  longitude: number;
  locale?: string;
  limit?: number;
}): URL {
  const root = input.baseUrl.replace(/\/+$/, "");
  const url = new URL(root.endsWith("/api") ? `${root}/` : `${root}/api/`);
  url.searchParams.set("q", input.query.trim());
  url.searchParams.set("limit", String(input.limit ?? RESULT_LIMIT));
  url.searchParams.set("lat", input.latitude.toFixed(6));
  url.searchParams.set("lon", input.longitude.toFixed(6));
  const language = photonLanguage(input.locale);
  if (language) url.searchParams.set("lang", language);
  return url;
}

export function buildPhotonReverseUrl(input: {
  baseUrl: string;
  latitude: number;
  longitude: number;
  locale?: string;
}): URL {
  const root = input.baseUrl.replace(/\/+$/, "").replace(/\/api$/, "");
  const url = new URL(`${root}/reverse`);
  url.searchParams.set("lat", input.latitude.toFixed(6));
  url.searchParams.set("lon", input.longitude.toFixed(6));
  const language = photonLanguage(input.locale);
  if (language) url.searchParams.set("lang", language);
  return url;
}

export function placeLabel(properties: Record<string, unknown>): string {
  const text = (key: string) => typeof properties[key] === "string" ? properties[key].trim() : "";
  const street = [text("housenumber"), text("street")].filter(Boolean).join(" ");
  const parts = [text("name") || street, text("city") || text("district") || text("locality"), text("state"), text("country")];
  const unique: string[] = [];
  for (const part of parts) {
    if (!part) continue;
    if (unique.some((item) => item.toLowerCase() === part.toLowerCase())) continue;
    unique.push(part);
  }
  return unique.join(", ");
}

export function moveHighlight(current: number, key: "ArrowDown" | "ArrowUp", count: number): number {
  if (count <= 0) return 0;
  if (key === "ArrowDown") return Math.min(current + 1, count - 1);
  return Math.max(current - 1, 0);
}

export async function searchPlaces(input: {
  query: string;
  latitude: number;
  longitude: number;
  locale?: string;
  signal?: AbortSignal;
  fetchImpl?: FetchLike;
  baseUrl?: string;
}): Promise<GeocodeSearchResult> {
  const query = input.query.trim();
  if (query.length < MIN_QUERY_LENGTH) return { status: "idle", places: [] };
  const url = buildPhotonUrl({
    baseUrl: input.baseUrl ?? geocoderBaseUrl(),
    query,
    latitude: input.latitude,
    longitude: input.longitude,
    locale: input.locale,
  });
  const fetchImpl = input.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(url.toString(), {
      signal: input.signal,
      credentials: "omit",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return { status: "error", places: [] };
    const body = await response.json() as { features?: unknown };
    const places = parseFeatures(body.features);
    return { status: places.length ? "ok" : "empty", places };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    return { status: "error", places: [] };
  }
}

export async function reverseGeocode(input: {
  latitude: number;
  longitude: number;
  locale?: string;
  signal?: AbortSignal;
  fetchImpl?: FetchLike;
  baseUrl?: string;
}): Promise<string | null> {
  const url = buildPhotonReverseUrl({
    baseUrl: input.baseUrl ?? geocoderBaseUrl(),
    latitude: input.latitude,
    longitude: input.longitude,
    locale: input.locale,
  });
  try {
    const response = await (input.fetchImpl ?? fetch)(url.toString(), {
      signal: input.signal,
      credentials: "omit",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const body = await response.json() as { features?: unknown };
    return parseFeatures(body.features)[0]?.label ?? null;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    return null;
  }
}

function parseFeatures(features: unknown): GeocodePlace[] {
  if (!Array.isArray(features)) return [];
  return features.flatMap((feature, index) => {
    if (!feature || typeof feature !== "object") return [];
    const record = feature as { geometry?: { coordinates?: unknown }; properties?: Record<string, unknown> };
    const coordinates = record.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) return [];
    const longitude = Number(coordinates[0]);
    const latitude = Number(coordinates[1]);
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return [];
    const properties = record.properties ?? {};
    const label = placeLabel(properties);
    if (!label) return [];
    const osmType = typeof properties.osm_type === "string" ? properties.osm_type : "place";
    const osmId = typeof properties.osm_id === "number" || typeof properties.osm_id === "string" ? String(properties.osm_id) : String(index);
    return [{ id: `${osmType}:${osmId}:${index}`, label, longitude, latitude }];
  });
}
