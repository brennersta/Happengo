import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme/theme";

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "map-outline",
  "my-events": "calendar-outline",
  friends: "people-outline",
  profile: "person-outline",
};

type TabBarModel = {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<string, { options: { title?: string } }>;
  navigateToTab: (routeKey: string) => void;
};

export function FloatingTabBar({ state, descriptors, navigateToTab }: TabBarModel) {
  return (
    <View pointerEvents="box-none" style={styles.host}>
      <View style={styles.pill}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const label = descriptors[route.key]?.options.title ?? route.name;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={() => { if (!focused) navigateToTab(route.key); }}
              style={styles.item}
            >
              <Ionicons name={icons[route.name] ?? "ellipse-outline"} size={18} color={focused ? theme.brand : theme.muted} />
              <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: "absolute", left: 0, right: 0, bottom: 14, alignItems: "center" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 28,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 2,
    ...theme.shadow,
  },
  item: { minWidth: 76, alignItems: "center", justifyContent: "center", paddingHorizontal: 8, paddingVertical: 6, gap: 2 },
  label: { color: theme.muted, fontSize: 12, fontWeight: "600" },
  labelActive: { color: theme.brand },
});
