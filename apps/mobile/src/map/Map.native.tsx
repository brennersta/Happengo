import { Camera, Map as NativeMap, Marker, type CameraRef } from "@maplibre/maplibre-react-native";
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from "react-native";
import { useEffect, useRef, useState } from "react";
import type { HappengoMapProps } from "./types";
import { centeredAuraPosition, INCIDENT_MARKER_COLOR, incidentMarkerSymbol, LIVE_AURA_SIZE, liveAuraMode, MARKER_PIN_SIZE, markerColor } from "./markerStyle";

const worldBounds: [number, number, number, number] = [-180, -85, 180, 85];
const nativeMarkerWidth = 40;
const nativeMarkerHeight = 48;
const nativePinLeft = 7;
const nativePinTop = nativeMarkerHeight - 18.3848 - MARKER_PIN_SIZE / 2;
const nativeAuraPosition = centeredAuraPosition(nativePinLeft, nativePinTop);

export function Map({ center, zoom = 11, styleUrl, markers = [], focus = null, onMapIdle, onMapPress, onMarkerPress }: HappengoMapProps) {
  const cameraRef = useRef<CameraRef>(null);
  useEffect(() => {
    if (!focus) return;
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      cameraRef.current?.easeTo({
        center: [focus.longitude, focus.latitude],
        zoom: 14,
        duration: reduce ? 0 : 600,
      });
    });
    return () => { cancelled = true; };
  }, [focus]);
  return (
    <NativeMap
      mapStyle={styleUrl}
      style={styles.map}
      attribution
      attributionPosition={{ bottom: 8, right: 8 }}
      onRegionDidChange={(event) => {
        const nativeEvent = event.nativeEvent;
        const [west, south, east, north] = nativeEvent.bounds;
        onMapIdle?.({
          southWest: { longitude: west, latitude: south },
          northEast: { longitude: east, latitude: north },
        }, nativeEvent.zoom);
      }}
      onPress={(event) => onMapPress?.({
        longitude: event.nativeEvent.lngLat[0],
        latitude: event.nativeEvent.lngLat[1],
      })}
    >
      <Camera
        ref={cameraRef}
        initialViewState={{
          center: [center.longitude, center.latitude],
          zoom,
        }}
        maxBounds={worldBounds}
      />
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          id={marker.id}
          lngLat={[marker.coordinate.longitude, marker.coordinate.latitude]}
          anchor="bottom"
          onPress={() => onMarkerPress?.(marker.id)}
        >
          <NativeMarker title={marker.title} mainTag={marker.mainTag} tagLabel={marker.tagLabel} happeningNow={marker.happeningNow} kind={marker.kind} incidentCategory={marker.incidentCategory} />
        </Marker>
      ))}
    </NativeMap>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  markerContainer: { position: "relative", width: nativeMarkerWidth, height: nativeMarkerHeight },
  marker: { position: "absolute", top: nativePinTop, left: nativePinLeft, width: MARKER_PIN_SIZE, height: MARKER_PIN_SIZE, backgroundColor: "white", borderTopLeftRadius: 13, borderTopRightRadius: 13, borderBottomRightRadius: 13, borderBottomLeftRadius: 2, borderWidth: 2, borderColor: "white", transform: [{ rotate: "45deg" }] },
  markerSymbol: { color: "white", fontSize: 11, fontWeight: "900", textAlign: "center", transform: [{ rotate: "-45deg" }] },
  aura: { position: "absolute", top: nativeAuraPosition.top, left: nativeAuraPosition.left, width: LIVE_AURA_SIZE, height: LIVE_AURA_SIZE, borderRadius: LIVE_AURA_SIZE / 2, backgroundColor: "#18a879" },
  staticAura: { borderWidth: 3, borderColor: "#18a879", backgroundColor: "rgba(24,168,121,.14)" },
});

function NativeMarker({ title, mainTag, tagLabel, happeningNow, kind, incidentCategory }: { title: string; mainTag?: string | null; tagLabel?: string | null; happeningNow?: boolean; kind?: "event" | "incident"; incidentCategory?: "fire" | "traffic_collision" | "other" }) {
  const [progress] = useState(() => new Animated.Value(0));
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => { if (mounted) setReduceMotion(enabled); });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);
  const aura = liveAuraMode(happeningNow, reduceMotion);
  useEffect(() => {
    if (aura !== "pulse") { progress.stopAnimation(); progress.setValue(0); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration: 850, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 0, duration: 850, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [aura, progress]);
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.75] });
  const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] });
  return (
    <View accessible accessibilityLabel={`${title}${tagLabel || mainTag ? `, ${tagLabel || mainTag}` : ""}${happeningNow ? ", happening now" : ""}`} style={styles.markerContainer}>
      {aura !== "none" ? <Animated.View style={[styles.aura, aura === "static" ? styles.staticAura : { transform: [{ scale }], opacity }]} /> : null}
      <View style={[styles.marker, { backgroundColor: kind === "incident" ? INCIDENT_MARKER_COLOR : markerColor(mainTag) }]}>
        {kind === "incident" ? <Text style={styles.markerSymbol}>{incidentMarkerSymbol(incidentCategory)}</Text> : null}
      </View>
    </View>
  );
}
