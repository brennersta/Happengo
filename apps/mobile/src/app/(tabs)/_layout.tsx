import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { FloatingTabBar } from "@/navigation/FloatingTabBar";

export default function TabLayout() {
  const { t } = useTranslation();
  return (
    <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: t("tabs.discover") }} />
      <Tabs.Screen name="my-events" options={{ title: t("tabs.myEvents") }} />
      <Tabs.Screen name="friends" options={{ title: t("tabs.friends") }} />
      <Tabs.Screen name="profile" options={{ title: t("tabs.profile") }} />
      <Tabs.Screen name="../moderation" options={{ href: null }} />
    </Tabs>
  );
}
