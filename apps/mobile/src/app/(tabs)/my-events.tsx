import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { auth } from "@/auth";
import { fetchClient } from "@/api/client";
import { mocksEnabled } from "@/mocks/config";
import { formatEventTime } from "@/events/mapEvents";

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

  const filtered = useMemo(() => {
    const visible = (eventsQuery.data ?? []).filter((event) => period === "past"
      ? Date.parse(event.endAt) < now
      : Date.parse(event.endAt) >= now);
    return visible.sort((a, b) => period === "past"
      ? Date.parse(b.endAt) - Date.parse(a.endAt)
      : Date.parse(a.startAt) - Date.parse(b.startAt));
  }, [eventsQuery.data, period, now]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("tabs.myEvents")}</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push("/events/create")} style={styles.createButton}>
          <Text style={styles.createText}>＋ {t("discover.createEvent")}</Text>
        </Pressable>
      </View>
      <View style={styles.segmentRow}>
        <Segment label={t("myEvents.upcoming")} selected={period === "upcoming"} onPress={() => setPeriod("upcoming")} />
        <Segment label={t("myEvents.past")} selected={period === "past"} onPress={() => setPeriod("past")} />
      </View>
      {!signedIn && !isDemo ? (
        <View style={styles.message}>
          <Text style={styles.body}>{t("myEvents.signIn")}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/profile")} style={styles.primaryButton}>
            <Text style={styles.primaryText}>{t("auth.goToSignIn")}</Text>
          </Pressable>
        </View>
      ) : eventsQuery.isLoading ? (
        <View style={styles.message}><ActivityIndicator /><Text style={styles.body}>{t("discover.loading")}</Text></View>
      ) : eventsQuery.isError ? (
        <View style={styles.message}>
          <Text style={styles.body}>{t("myEvents.loadError")}</Text>
          <Pressable accessibilityRole="button" onPress={() => void eventsQuery.refetch()} style={styles.primaryButton}>
            <Text style={styles.primaryText}>{t("discover.retry")}</Text>
          </Pressable>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.message}>
          <Text style={styles.body}>{t(period === "past" ? "myEvents.emptyPast" : "myEvents.emptyUpcoming")}</Text>
          {period === "upcoming" ? <Pressable accessibilityRole="button" onPress={() => router.push("/events/create")} style={styles.primaryButton}>
            <Text style={styles.primaryText}>{t("discover.createEvent")}</Text>
          </Pressable> : null}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(event) => event.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable accessibilityRole="button" accessibilityLabel={t("discover.openDetails", { title: item.title })}
              onPress={() => router.push({ pathname: "/events/[id]", params: { id: item.id } })} style={styles.card}>
              <View style={styles.cardHeading}>
                <Text numberOfLines={1} style={styles.eventTitle}>{item.title}</Text>
                {item.happeningNow ? <Text style={styles.live}>{t("discover.happeningNow")}</Text> : null}
              </View>
              <Text style={styles.meta}>{formatEventTime(item, t("localeCode"))}</Text>
              <Text numberOfLines={1} style={styles.meta}>{item.address}</Text>
              {item.description ? <Text numberOfLines={2} style={styles.description}>{item.description}</Text> : null}
              <View style={styles.footer}>
                {item.tags[0] ? <Text style={styles.tag}>{item.tags[0]}</Text> : null}
                <Text style={styles.meta}>{t("eventDetail.attendingCount", { count: item.attendingCount })}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function Segment({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected }} onPress={onPress} style={[styles.segment, selected && styles.segmentSelected]}>
    <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f7f7fb" },
  header: { padding: 18, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  title: { color: "#202038", fontSize: 24, fontWeight: "700" },
  createButton: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#5b5bd6" },
  createText: { color: "white", fontSize: 13, fontWeight: "700" },
  segmentRow: { marginHorizontal: 18, marginBottom: 10, padding: 4, borderRadius: 12, backgroundColor: "#eaeaf1", flexDirection: "row", gap: 4 },
  segment: { flex: 1, minHeight: 38, justifyContent: "center", alignItems: "center", borderRadius: 9 },
  segmentSelected: { backgroundColor: "white", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  segmentText: { color: "#69697d", fontSize: 13, fontWeight: "600" },
  segmentTextSelected: { color: "#3730a3" },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { padding: 14, marginBottom: 10, borderRadius: 14, backgroundColor: "white", gap: 6, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  cardHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
  eventTitle: { flex: 1, color: "#26263a", fontWeight: "700", fontSize: 16 },
  meta: { color: "#69697d", fontSize: 12 },
  description: { color: "#45455c", fontSize: 13, lineHeight: 19 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  tag: { color: "#3730a3", backgroundColor: "#eeeeff", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12, fontSize: 11, fontWeight: "600" },
  live: { color: "#176b57", backgroundColor: "#dff5ed", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, fontSize: 10, fontWeight: "700" },
  message: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 14 },
  body: { color: "#69697d", fontSize: 14, lineHeight: 21, textAlign: "center" },
  primaryButton: { minHeight: 42, justifyContent: "center", alignItems: "center", borderRadius: 10, paddingHorizontal: 16, backgroundColor: "#5b5bd6" },
  primaryText: { color: "white", fontWeight: "700" },
});
