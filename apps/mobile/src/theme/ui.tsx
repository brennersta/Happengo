import type { ReactNode } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { markerColor } from "@/map/markerStyle";
import { theme } from "./theme";

export function GradientButton({
  label,
  onPress,
  disabled = false,
  busy = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled || busy} onPress={onPress} style={[styles.gradientPress, (disabled || busy) && styles.disabled]}>
      <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientFill}>
        {busy ? <ActivityIndicator color="white" /> : <Text style={styles.gradientText}>{label}</Text>}
      </LinearGradient>
    </Pressable>
  );
}

export function GradientHeader({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, style]}>
      {children}
    </LinearGradient>
  );
}

export function Chip({
  label,
  selected = false,
  onPress,
  count,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  count?: number;
}) {
  const text = typeof count === "number" ? `${label} ${count}` : label;
  const style = [styles.chip, selected && styles.chipSelected];
  const labelStyle = [styles.chipText, selected && styles.chipTextSelected];
  if (!onPress) return <View style={style}><Text style={labelStyle}>{text}</Text></View>;
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected }} accessibilityLabel={text} onPress={onPress} style={style}>
      <Text style={labelStyle}>{text}</Text>
    </Pressable>
  );
}

export function CoverPlaceholder({ tag, style }: { tag?: string | null; style?: StyleProp<ViewStyle> }) {
  const color = markerColor(tag);
  return <LinearGradient colors={[color, theme.gradient[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.cover, style]} />;
}

const styles = StyleSheet.create({
  gradientPress: { borderRadius: 12, overflow: "hidden" },
  gradientFill: { minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, paddingVertical: 10 },
  gradientText: { color: "white", fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.6 },
  header: { paddingHorizontal: 16, paddingVertical: 14 },
  chip: { borderRadius: 16, backgroundColor: theme.chip, paddingHorizontal: 12, paddingVertical: 7 },
  chipSelected: { backgroundColor: "#E9E7FF" },
  chipText: { color: theme.chipText, fontSize: 13, fontWeight: "600" },
  chipTextSelected: { color: theme.brand },
  cover: { width: "100%", height: "100%" },
});
