import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { validMapView, type SavedMapView } from "./mapView";

const key = "happengo.last-map-view";

export async function readSavedMapView(): Promise<SavedMapView | null> {
  try {
    const value = Platform.OS === "web"
      ? window.localStorage.getItem(key)
      : await SecureStore.getItemAsync(key);
    if (!value) return null;
    const parsed: unknown = JSON.parse(value);
    return validMapView(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveMapView(view: SavedMapView): Promise<void> {
  try {
    const value = JSON.stringify(view);
    if (Platform.OS === "web") window.localStorage.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  } catch { /* Map use remains available if persistence fails. */ }
}
