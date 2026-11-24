import { useEffect, useRef, useState, type ComponentRef } from "react";
import { StyleSheet, View } from "react-native";
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
import { MAPLIBRE_WORKER_URL } from "./config";
import type { HappengoMapProps } from "./types";
import { liveAuraMode, markerColor } from "./markerStyle";

import "maplibre-gl/dist/maplibre-gl.css";
import "./attribution.css";

export function Map({ center, zoom = 11, styleUrl, markers = [], focus = null, onMapIdle, onMapPress, onMarkerPress }: HappengoMapProps) {
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
          if (idle) onMapIdleRef.current?.(value, map!.getZoom());
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
      markersRef.current = markers.map((item) => {
        const element = document.createElement("button");
        element.type = "button";
        const tag = item.tagLabel || item.mainTag;
        element.setAttribute("aria-label", `${item.title}${tag ? `, ${tag}` : ""}${item.happeningNow ? ", happening now" : ""}`);
        element.title = item.title;
        element.addEventListener("click", () => onMarkerPress?.(item.id));
        const color = markerColor(item.mainTag);
        element.style.cssText = "width:36px;height:46px;padding:0;border:0;background:transparent;cursor:pointer;position:relative;";
        const aura = document.createElement("span");
        aura.style.cssText = "position:absolute;left:2px;top:2px;width:32px;height:32px;border-radius:50%;pointer-events:none;";
        const pin = document.createElement("span");
        pin.style.cssText = `position:absolute;left:5px;top:4px;width:26px;height:26px;background:${color};border:2px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.28);pointer-events:none;`;
        element.append(aura, pin);
        if (liveAuraMode(item.happeningNow, window.matchMedia("(prefers-reduced-motion: reduce)").matches) === "pulse") {
          aura.animate(
            [{ boxShadow: "0 0 0 0 rgba(24,168,121,.45)" }, { boxShadow: "0 0 0 12px rgba(24,168,121,0)" }],
            { duration: 1600, iterations: Infinity },
          );
        } else if (item.happeningNow) {
          aura.style.boxShadow = "0 0 0 4px rgba(24,168,121,.35)";
        }
        return new maplibre.Marker({ element, anchor: "bottom" })
          .setLngLat([item.coordinate.longitude, item.coordinate.latitude])
          .setPopup(new maplibre.Popup({ offset: 16 }).setText(item.title))
          .addTo(map);
      });
    });
    return () => { cancelled = true; };
  }, [mapReady, markers, onMarkerPress]);

  return <View ref={hostRef} style={styles.map} />;
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
