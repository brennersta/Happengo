import { Camera, Map as NativeMap, Marker } from "@maplibre/maplibre-react-native";
import { AccessibilityInfo, Animated, StyleSheet, View } from "react-native";
import { useEffect, useState } from "react";
import type { HappengoMapProps } from "./types";
import { liveAuraMode, markerColor } from "./markerStyle";

const worldBounds: [number, number, number, number] = [-180, -85, 180, 85];

export function Map({ center, zoom = 11, styleUrl, markers = [], onMapIdle, onMapPress, onMarkerPress }: HappengoMapProps) {
  return (
    <NativeMap
      mapStyle={styleUrl}
      style={styles.map}
      attribution
      attributionPosition={{ bottom: 8, right: 8 }}
      onRegionDidChange={(event) => {
        const [west, south, east, north] = event.nativeEvent.bounds;
        onMapIdle?.({
          southWest: { longitude: west, latitude: south },
          northEast: { longitude: east, latitude: north },
        });
      }}
      onPress={(event) => onMapPress?.({
        longitude: event.nativeEvent.lngLat[0],
        latitude: event.nativeEvent.lngLat[1],
      })}
    >
      <Camera
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
          <NativeMarker title={marker.title} mainTag={marker.mainTag} happeningNow={marker.happeningNow} />
        </Marker>
      ))}
    </NativeMap>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  markerContainer: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  marker: { width: 26, height: 26, borderRadius: 13, borderWidth: 3, borderColor: "white", elevation: 3 },
  aura: { position: "absolute", width: 28, height: 28, borderRadius: 14, backgroundColor: "#18a879" },
  staticAura: { borderWidth: 3, borderColor: "#18a879", backgroundColor: "rgba(24,168,121,.14)" },
});

function NativeMarker({ title, mainTag, happeningNow }: { title: string; mainTag?: string | null; happeningNow?: boolean }) {
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
    <View accessible accessibilityLabel={`${title}${mainTag ? `, ${mainTag}` : ""}${happeningNow ? ", happening now" : ""}`} style={styles.markerContainer}>
      {aura !== "none" ? <Animated.View style={[styles.aura, aura === "static" ? styles.staticAura : { transform: [{ scale }], opacity }]} /> : null}
      <View style={[styles.marker, { backgroundColor: markerColor(mainTag) }]} />
    </View>
  );
}
