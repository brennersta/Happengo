import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";

const active = "#6D28D9";
const inactive = "#6B7280";

function tint(color: unknown): string {
  return typeof color === "string" ? color : inactive;
}

export default function TabLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: active,
        tabBarInactiveTintColor: inactive,
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#E5E7EB",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.discover"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" color={tint(color)} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-events"
        options={{
          title: t("tabs.myEvents"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" color={tint(color)} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: t("tabs.friends"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" color={tint(color)} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={tint(color)} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
