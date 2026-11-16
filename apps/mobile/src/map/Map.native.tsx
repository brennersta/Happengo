import { Camera, Map as NativeMap } from "@maplibre/maplibre-react-native";
import { StyleSheet } from "react-native";
import type { HappengoMapProps } from "./types";

const worldBounds: [number, number, number, number] = [-180, -85, 180, 85];

export function Map({ center, zoom = 11, styleUrl }: HappengoMapProps) {
  return (
    <NativeMap
      mapStyle={styleUrl}
      style={styles.map}
      attribution
      attributionPosition={{ bottom: 8, right: 8 }}
    >
      <Camera
        initialViewState={{
          center: [center.longitude, center.latitude],
          zoom,
        }}
        maxBounds={worldBounds}
      />
    </NativeMap>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
