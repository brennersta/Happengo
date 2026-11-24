import { Camera, Map as NativeMap, Marker, type CameraRef } from "@maplibre/maplibre-react-native";
import { AccessibilityInfo, Animated, StyleSheet, View } from "react-native";
import { useEffect, useRef, useState } from "react";
import type { HappengoMapProps } from "./types";
import { liveAuraMode, markerColor } from "./markerStyle";

const worldBounds: [number, number, number, number] = [-180, -85, 180, 85];

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
          onPress={() => onMarkerPress?.(marker.id)}
        >
          <NativeMarker title={marker.title} mainTag={marker.mainTag} tagLabel={marker.tagLabel} happeningNow={marker.happeningNow} />
        </Marker>
      ))}
    </NativeMap>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  markerContainer: { width: 40, height: 48, alignItems: "center", justifyContent: "flex-start" },
  marker: { marginTop: 8, width: 26, height: 26, backgroundColor: "white", borderTopLeftRadius: 13, borderTopRightRadius: 13, borderBottomRightRadius: 13, borderBottomLeftRadius: 2, borderWidth: 2, borderColor: "white", transform: [{ rotate: "45deg" }] },
  aura: { position: "absolute", width: 28, height: 28, borderRadius: 14, backgroundColor: "#18a879" },
  staticAura: { borderWidth: 3, borderColor: "#18a879", backgroundColor: "rgba(24,168,121,.14)" },
});

function NativeMarker({ title, mainTag, tagLabel, happeningNow }: { title: string; mainTag?: string | null; tagLabel?: string | null; happeningNow?: boolean }) {
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
      <View style={[styles.marker, { backgroundColor: markerColor(mainTag) }]} />
    </View>
  );
}
