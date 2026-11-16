import { useEffect, useRef, type ComponentRef } from "react";
import { StyleSheet, View } from "react-native";
import type { Map as MapLibreMap } from "maplibre-gl";
import { MAPLIBRE_WORKER_URL } from "./config";
import type { HappengoMapProps } from "./types";

import "maplibre-gl/dist/maplibre-gl.css";
import "./attribution.css";

export function Map({ center, zoom = 11, styleUrl }: HappengoMapProps) {
  const hostRef = useRef<ComponentRef<typeof View>>(null);

  useEffect(() => {
    const container = hostRef.current as unknown as HTMLElement | null;
    if (!container) return;

    let map: MapLibreMap | null = null;
    let cancelled = false;

    void import("maplibre-gl").then((maplibre) => {
      if (cancelled) return;
      maplibre.setWorkerUrl(MAPLIBRE_WORKER_URL);
      map = new maplibre.Map({
        container,
        style: styleUrl,
        center: [center.longitude, center.latitude],
        zoom,
        renderWorldCopies: false,
        maxBounds: [
          [-179.9, -85],
          [179.9, 85],
        ],
      });
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-left");
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [center.latitude, center.longitude, styleUrl, zoom]);

  return <View ref={hostRef} style={styles.map} />;
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
