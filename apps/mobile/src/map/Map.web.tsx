import { useEffect, useRef, useState, type ComponentRef } from "react";
import { StyleSheet, View } from "react-native";
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
import { MAPLIBRE_WORKER_URL } from "./config";
import type { HappengoMapProps } from "./types";
import { createWebMarker } from "./markerFactory.web";

import "maplibre-gl/dist/maplibre-gl.css";
import "./attribution.css";

export function Map({ center, zoom = 11, styleUrl, markers = [], focus = null, selectedMarkerId = null, onMapIdle, onMapPress, onMarkerPress, onMarkerPositionChange }: HappengoMapProps) {
  const hostRef = useRef<ComponentRef<typeof View>>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MapLibreMarker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const onMapIdleRef = useRef(onMapIdle);
  const onMapPressRef = useRef(onMapPress);
  const onMarkerPositionChangeRef = useRef(onMarkerPositionChange);
  const selectedMarkerIdRef = useRef(selectedMarkerId);
  const markersDataRef = useRef(markers);

  useEffect(() => {
    onMapIdleRef.current = onMapIdle;
  }, [onMapIdle]);

  useEffect(() => {
    onMapPressRef.current = onMapPress;
  }, [onMapPress]);

  useEffect(() => {
    onMarkerPositionChangeRef.current = onMarkerPositionChange;
    selectedMarkerIdRef.current = selectedMarkerId;
    markersDataRef.current = markers;
  }, [markers, onMarkerPositionChange, selectedMarkerId]);

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
          if (idle) onMapIdleRef.current?.(value, map!.getZoom());
        }
        const selected = markersDataRef.current.find((marker) => marker.id === selectedMarkerIdRef.current);
        if (map && selected) {
          const point = map.project([selected.coordinate.longitude, selected.coordinate.latitude]);
          onMarkerPositionChangeRef.current?.({ x: point.x, y: point.y });
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
    if (!map || !mapReady || !focus) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.easeTo({
      center: [focus.longitude, focus.latitude],
      zoom: Math.max(map.getZoom(), 14),
      duration: reduce ? 0 : 600,
    });
  }, [focus, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    let cancelled = false;
    void import("maplibre-gl").then((maplibre) => {
      if (cancelled || mapRef.current !== map) return;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      markersRef.current = markers.map((item) => {
        return createWebMarker(maplibre, map, item, onMarkerPress, reduceMotion);
      });
    });
    return () => { cancelled = true; };
  }, [mapReady, markers, onMarkerPress]);

  return <View ref={hostRef} style={styles.map} />;
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
