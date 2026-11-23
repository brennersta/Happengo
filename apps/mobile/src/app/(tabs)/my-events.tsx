import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { auth } from "@/auth";
import { fetchClient } from "@/api/client";
import { mocksEnabled } from "@/mocks/config";
import { displayAddress } from "@/events/displayAddress";
import { hasEnded, isHappeningNow } from "@/events/liveState";
import { formatEventTime } from "@/events/mapEvents";
import { theme } from "@/theme/theme";
import { Chip, CoverPlaceholder, GradientButton } from "@/theme/ui";

type EventPeriod = "upcoming" | "past";

export default function MyEventsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  const [period, setPeriod] = useState<EventPeriod>("upcoming");
  const isDemo = mocksEnabled();

  useFocusEffect(useCallback(() => {
    let active = true;
    void auth.getAccessToken().then((token) => { if (active) setSignedIn(Boolean(token)); })
      .catch(() => { if (active) setSignedIn(false); });
    return () => { active = false; };
  }, []));

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const eventsQuery = useQuery({
    queryKey: ["my-events"],
    enabled: signedIn || isDemo,
    queryFn: async () => {
      const { data, error, response } = await fetchClient.GET("/v1/events/mine");
      if (error || !data) throw new Error(response.statusText || t("myEvents.loadError"));
      return data.items;
    },
  });
  const groups = useMemo(() => {
    const items = eventsQuery.data ?? [];
    const upcoming = items.filter((event) => !hasEnded(event.endAt, new Date(now)))
      .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
    const past = items.filter((event) => hasEnded(event.endAt, new Date(now)))
      .sort((a, b) => Date.parse(b.endAt) - Date.parse(a.endAt));
    return { upcoming, past };
  }, [eventsQuery.data, now]);
  const filtered = groups[period];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t("tabs.myEvents")}</Text>
        <View style={styles.tabs}>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: period === "upcoming" }} onPress={() => setPeriod("upcoming")} style={[styles.tab, period === "upcoming" && styles.tabOn]}>
            <Text style={[styles.tabText, period === "upcoming" && styles.tabTextOn]}>{t("myEvents.upcomingCount", { count: groups.upcoming.length })}</Text>
          </Pressable>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: period === "past" }} onPress={() => setPeriod("past")} style={[styles.tab, period === "past" && styles.tabOn]}>
            <Text style={[styles.tabText, period === "past" && styles.tabTextOn]}>{t("myEvents.pastCount", { count: groups.past.length })}</Text>
          </Pressable>
        </View>
        {!signedIn && !isDemo ? (
          <View style={styles.message}>
            <Text style={styles.body}>{t("myEvents.signIn")}</Text>
            <GradientButton label={t("auth.goToSignIn")} onPress={() => router.push("/(tabs)/profile")} />
          </View>
        ) : eventsQuery.isLoading ? (
          <View style={styles.message}><ActivityIndicator /><Text style={styles.body}>{t("discover.loading")}</Text></View>
        ) : eventsQuery.isError ? (
          <View style={styles.message}>
            <Text style={styles.body}>{t("myEvents.loadError")}</Text>
            <GradientButton label={t("discover.retry")} onPress={() => void eventsQuery.refetch()} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.message}>
            <Text style={styles.body}>{t(period === "past" ? "myEvents.emptyPast" : "myEvents.emptyUpcoming")}</Text>
          </View>
        ) : filtered.map((item) => {
          const live = isHappeningNow(item.startAt, item.endAt, new Date(now));
          const ended = hasEnded(item.endAt, new Date(now));
          const address = displayAddress(item.address);
          return (
            <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={t("discover.openDetails", { title: item.title })}
              onPress={() => router.push({ pathname: "/events/[id]", params: { id: item.id } })} style={styles.card}>
              <View style={styles.cover}><CoverPlaceholder tag={item.tags[0]} /></View>
              <View style={styles.cardBody}>
                <View style={styles.heading}>
                  <Text style={styles.eventTitle}>{item.title}</Text>
                  {live ? <Text style={styles.badge}>{t("myEvents.ongoing")}</Text> : null}
                  {ended ? <Text style={styles.ended}>{t("myEvents.ended")}</Text> : null}
                </View>
                {item.description ? <Text numberOfLines={2} style={styles.description}>{item.description}</Text> : null}
                <Text style={styles.meta}>{address ?? t("discover.addressUnavailable")}</Text>
                <Text style={styles.meta}>{formatEventTime(item, t("localeCode"))}</Text>
                <Text style={styles.meta}>{t("eventDetail.attendingCount", { count: item.attendingCount })}</Text>
                <View style={styles.tags}>
                  {item.tags.map((tag) => <Chip key={tag} label={t(`tags.${tag}`)} />)}
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.page },
  content: { padding: 20, paddingBottom: 120, gap: 14, width: "100%", maxWidth: 920, alignSelf: "center" },
  title: { color: theme.brand, fontSize: 32, fontWeight: "800" },
  tabs: { flexDirection: "row", gap: 8 },
  tab: { borderRadius: 12, backgroundColor: "white", paddingHorizontal: 14, paddingVertical: 8 },
  tabOn: { backgroundColor: theme.brand },
  tabText: { color: theme.muted, fontWeight: "700" },
  tabTextOn: { color: "white" },
  card: { backgroundColor: "white", borderRadius: 18, overflow: "hidden", ...theme.shadow },
  cover: { height: 140 },
  cardBody: { padding: 14, gap: 6 },
  heading: { flexDirection: "row", alignItems: "center", gap: 8 },
  eventTitle: { flex: 1, color: theme.ink, fontSize: 18, fontWeight: "800" },
  badge: { color: "white", backgroundColor: "#1F1B2E", overflow: "hidden", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, fontSize: 11, fontWeight: "700" },
  ended: { color: theme.muted, backgroundColor: theme.chip, overflow: "hidden", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, fontSize: 11, fontWeight: "700" },
  description: { color: theme.ink, fontSize: 14, lineHeight: 20 },
  meta: { color: theme.muted, fontSize: 13 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  message: { paddingVertical: 24, gap: 12, alignItems: "center" },
  body: { color: theme.muted, textAlign: "center" },
});
