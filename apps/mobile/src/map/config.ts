export const TALLINN = { longitude: 24.7536, latitude: 59.437 } as const;

export const OPENFREEMAP_POSITRON = "https://tiles.openfreemap.org/styles/positron";

export const MAPLIBRE_WORKER_URL = "/maplibre/maplibre-gl-worker.mjs";

export function mapStyleUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  const configured = env.EXPO_PUBLIC_MAP_STYLE_URL?.trim();
  const url = configured ? configured : OPENFREEMAP_POSITRON;
  const key = env.EXPO_PUBLIC_MAP_API_KEY?.trim();
  if (key && url.includes("{key}")) {
    return url.replaceAll("{key}", encodeURIComponent(key));
  }
  return url;
}
