import { TALLINN } from "./config";
import type { LngLat } from "./types";

export type SavedMapView = { center: LngLat; zoom: number };

export const DEFAULT_MAP_VIEW: SavedMapView = { center: TALLINN, zoom: 11 };

export function validMapView(value: unknown): value is SavedMapView {
  if (!value || typeof value !== "object") return false;
  const view = value as Partial<SavedMapView>;
  return Boolean(view.center && Number.isFinite(view.center.longitude) && view.center.longitude >= -180 && view.center.longitude <= 180
    && Number.isFinite(view.center.latitude) && view.center.latitude >= -85 && view.center.latitude <= 85
    && Number.isFinite(view.zoom) && view.zoom! >= 0 && view.zoom! <= 22);
}

export function initialMapView(deviceLocation: LngLat | null, savedView: SavedMapView | null): SavedMapView {
  if (deviceLocation) return { center: deviceLocation, zoom: 13 };
  return savedView ?? DEFAULT_MAP_VIEW;
}
