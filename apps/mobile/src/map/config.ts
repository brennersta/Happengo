export const TALLINN = { longitude: 24.7536, latitude: 59.437 } as const;

export const OPENFREEMAP_POSITRON = "https://tiles.openfreemap.org/styles/positron";

export function mapLibreWorkerUrl(env?: Record<string, string | undefined>): string {
  const raw = env ? env.EXPO_BASE_URL : process.env.EXPO_BASE_URL;
  const configured = (raw ?? "").replace(/\/$/, "");
  const demo = env ? env.EXPO_PUBLIC_DEMO_MODE === "true" : process.env.EXPO_PUBLIC_DEMO_MODE === "true";
  const base = configured || (demo ? "/Happengo" : "");
  return `${base}/maplibre/maplibre-gl-worker.mjs`;
}

export const MAPLIBRE_WORKER_URL = mapLibreWorkerUrl();

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
