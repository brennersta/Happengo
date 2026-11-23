import { useEffect, useRef, useState, type ComponentRef } from "react";
import { StyleSheet, View } from "react-native";
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
import { MAPLIBRE_WORKER_URL } from "./config";
import type { HappengoMapProps } from "./types";
import { markerColor } from "./markerStyle";

import "maplibre-gl/dist/maplibre-gl.css";
import "./attribution.css";

export function Map({ center, zoom = 11, styleUrl, markers = [], onMapIdle, onMapPress, onMarkerPress }: HappengoMapProps) {
  const hostRef = useRef<ComponentRef<typeof View>>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MapLibreMarker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const onMapIdleRef = useRef(onMapIdle);
  const onMapPressRef = useRef(onMapPress);

  useEffect(() => {
    onMapIdleRef.current = onMapIdle;
  }, [onMapIdle]);

  useEffect(() => {
    onMapPressRef.current = onMapPress;
  }, [onMapPress]);

  useEffect(() => {
    const container = hostRef.current as unknown as HTMLElement | null;
    if (!container) return;

    let map: MapLibreMap | null = null;
    let cancelled = false;
    setMapReady(false);

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
      mapRef.current = map;
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-left");
      const reportBounds = (idle = false) => {
        const bounds = map?.getBounds();
        if (bounds) {
          const value = {
            southWest: { longitude: bounds.getWest(), latitude: bounds.getSouth() },
            northEast: { longitude: bounds.getEast(), latitude: bounds.getNorth() },
          };
          if (idle) onMapIdleRef.current?.(value);
        }
      };
      map.on("load", () => {
        setMapReady(true);
        reportBounds(true);
      });
      map.on("moveend", () => reportBounds(true));
      map.on("click", (event) => {
        onMapPressRef.current?.({
          longitude: event.lngLat.lng,
          latitude: event.lngLat.lat,
        });
      });
    });

    return () => {
      cancelled = true;
      mapRef.current = null;
      setMapReady(false);
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map?.remove();
    };
  }, [center.latitude, center.longitude, styleUrl, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    let cancelled = false;
    void import("maplibre-gl").then((maplibre) => {
      if (cancelled || mapRef.current !== map) return;
      markersRef.current = markers.map((item) => {
        const element = document.createElement("button");
        element.type = "button";
        element.setAttribute("aria-label", `${item.title}${item.mainTag ? `, ${item.mainTag}` : ""}${item.happeningNow ? ", happening now" : ""}`);
        element.title = item.title;
        element.addEventListener("click", () => onMarkerPress?.(item.id));
        const color = markerColor(item.mainTag);
        Object.assign(element.style, {
          width: "36px", height: "36px", borderRadius: "50%", border: `3px solid ${item.happeningNow ? "#18a879" : "white"}`,
          background: color, boxShadow: item.happeningNow ? "0 0 0 5px rgba(24,168,121,.22), 0 2px 8px rgba(0,0,0,.3)" : "0 2px 8px rgba(0,0,0,.3)", cursor: "pointer",
        });
        if (item.happeningNow && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          element.animate(
            [{ boxShadow: "0 0 0 0 rgba(24,168,121,.42), 0 2px 8px rgba(0,0,0,.3)" }, { boxShadow: "0 0 0 11px rgba(24,168,121,0), 0 2px 8px rgba(0,0,0,.3)" }],
            { duration: 1600, iterations: Infinity },
          );
        }
        return new maplibre.Marker({ element })
          .setLngLat([item.coordinate.longitude, item.coordinate.latitude])
          .setPopup(new maplibre.Popup({ offset: 16 }).setText(item.title))
          .addTo(map);
      });
    });
    return () => { cancelled = true; };
  }, [mapReady, markers]);

  return <View ref={hostRef} style={styles.map} />;
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
