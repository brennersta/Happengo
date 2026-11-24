import { Platform } from "react-native";
import * as Location from "expo-location";
import type { LngLat } from "./types";

function currentPosition(): Promise<LngLat | null> {
  if (Platform.OS === "web") {
    if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(null);
    return new Promise((resolve) => navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ longitude: coords.longitude, latitude: coords.latitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    ));
  }
  return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then((location) => ({
    longitude: location.coords.longitude,
    latitude: location.coords.latitude,
  }));
}

export async function readGrantedDeviceLocation(): Promise<LngLat | null> {
  try {
    if (Platform.OS === "web") {
      if (typeof navigator === "undefined" || !navigator.permissions?.query) return null;
      const permission = await navigator.permissions.query({ name: "geolocation" });
      return permission.state === "granted" ? currentPosition() : null;
    }
    const permission = await Location.getForegroundPermissionsAsync();
    return permission.status === "granted" ? currentPosition() : null;
  } catch { return null; }
}

export async function requestDeviceLocation(): Promise<LngLat | null> {
  if (Platform.OS === "web") return currentPosition();
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted") return null;
  return currentPosition();
}
