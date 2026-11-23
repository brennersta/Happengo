import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Map } from "@/map/Map";
import { TALLINN, mapStyleUrl } from "@/map/config";
import type { MapBounds, MapMarker } from "@/map/types";
import { fetchClient } from "@/api/client";
import { discoverQuery, emptyDiscoverFilters, type DiscoverFilters } from "@/events/discoverFilters";
import { isHappeningNow } from "@/events/liveState";
import { bboxForBounds, formatEventTime, type MapEvent } from "@/events/mapEvents";
import { EVENT_TAGS } from "@/map/markerStyle";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

const initialBounds: MapBounds = {
  southWest: { longitude: TALLINN.longitude - 0.05, latitude: TALLINN.latitude - 0.03 },
  northEast: { longitude: TALLINN.longitude + 0.05, latitude: TALLINN.latitude + 0.03 },
};

export default function DiscoverScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [bounds, setBounds] = useState(initialBounds);
  const [now, setNow] = useState(() => Date.now());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draft, setDraft] = useState<DiscoverFilters>(emptyDiscoverFilters);
  const [applied, setApplied] = useState<DiscoverFilters>(emptyDiscoverFilters);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const onMapIdle = useCallback((next: MapBounds) => setBounds(next), []);
  const bbox = useMemo(() => bboxForBounds(bounds), [bounds]);
  const eventsQuery = useQuery({
    queryKey: ["discover-events", bbox, applied.tags.join(","), applied.happeningNow],
    queryFn: async () => {
      const { data, error, response } = await fetchClient.GET("/v1/events", {
        params: { query: discoverQuery(bbox, applied) },
      });
      if (error || !data) throw new Error(response.statusText || t("discover.loadError"));
      return data;
    },
    staleTime: 15_000,
  });
  const events: MapEvent[] = eventsQuery.data?.items ?? [];
  const markers: MapMarker[] = events.map((event) => ({
    id: event.id,
    title: event.title,
    coordinate: { longitude: event.longitude, latitude: event.latitude },
    mainTag: event.tags[0] ?? null,
    happeningNow: isHappeningNow(event.startAt, event.endAt, new Date(now)),
  }));

  return (
    <View style={styles.screen}>
      <View style={styles.mapContainer}>
        <Map center={TALLINN} zoom={11} styleUrl={mapStyleUrl()} markers={markers} onMapIdle={onMapIdle}
          onMarkerPress={(id) => router.push({ pathname: "/events/[id]", params: { id } })} />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/events/create")}
          style={styles.createButton}
        >
          <Text style={styles.createButtonText}>＋ {t("discover.createEvent")}</Text>
        </Pressable>
        <View accessibilityLiveRegion="polite" style={styles.status}>
          {eventsQuery.isFetching ? <ActivityIndicator size="small" color="#5b5bd6" /> : null}
          <Text style={styles.statusText}>{t("discover.eventCount", { count: events.length })}</Text>
          {eventsQuery.data?.truncated ? <Text style={styles.note}>{t("discover.truncated")}</Text> : null}
        </View>
      </View>
      <View style={styles.listPanel}>
        <View style={styles.headingRow}>
          <Text style={styles.heading}>{t("discover.eventsInView")}</Text>
          <Pressable accessibilityRole="button" onPress={() => setFiltersOpen((open) => !open)} style={styles.filterButton}>
            <Text style={styles.filterButtonText}>{t("discover.filters")}</Text>
          </Pressable>
        </View>
        {filtersOpen ? (
          <View style={styles.filters}>
            <Text style={styles.filterLabel}>{t("discover.filterTags")}</Text>
            <View style={styles.choiceRow}>
              {EVENT_TAGS.map((tag) => {
                const selected = draft.tags.includes(tag);
                return (
                  <Pressable
                    key={tag}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    onPress={() => setDraft((current) => ({
                      ...current,
                      tags: selected ? current.tags.filter((item) => item !== tag) : [...current.tags, tag],
                    }))}
                    style={[styles.choice, selected && styles.choiceSelected]}
                  >
                    <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{tag}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: draft.happeningNow }}
              onPress={() => setDraft((current) => ({ ...current, happeningNow: !current.happeningNow }))}
              style={[styles.choice, draft.happeningNow && styles.choiceSelected]}
            >
              <Text style={[styles.choiceText, draft.happeningNow && styles.choiceTextSelected]}>{t("discover.happeningNowOnly")}</Text>
            </Pressable>
            <View style={styles.filterActions}>
              <Pressable accessibilityRole="button" onPress={() => { setDraft(emptyDiscoverFilters); setApplied(emptyDiscoverFilters); setFiltersOpen(false); }} style={styles.clearButton}>
                <Text style={styles.clearText}>{t("discover.clear")}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => { setApplied(draft); setFiltersOpen(false); }} style={styles.applyButton}>
                <Text style={styles.applyText}>{t("discover.apply")}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
        {eventsQuery.isError ? (
          <View style={styles.message}>
            <Text style={styles.errorText}>{t("discover.loadError")}</Text>
            <Pressable accessibilityRole="button" onPress={() => void eventsQuery.refetch()} style={styles.retryButton}>
              <Text style={styles.retryText}>{t("discover.retry")}</Text>
            </Pressable>
          </View>
        ) : eventsQuery.isLoading ? (
          <View style={styles.message}><ActivityIndicator /><Text style={styles.muted}>{t("discover.loading")}</Text></View>
        ) : events.length === 0 ? (
          <Text style={styles.muted}>{t(applied.tags.length > 0 || applied.happeningNow ? "discover.noMatches" : "discover.empty")}</Text>
        ) : (
          <FlatList
            data={events}
            keyExtractor={(event) => event.id}
            contentContainerStyle={styles.eventList}
            renderItem={({ item }) => (
              <EventRow
                event={item}
                now={now}
                onPress={() => router.push({ pathname: "/events/[id]", params: { id: item.id } })}
              />
            )}
          />
        )}
      </View>
    </View>
  );
}

function EventRow({ event, now, onPress }: { event: MapEvent; now: number; onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t("discover.openDetails", { title: event.title })} onPress={onPress} style={styles.eventCard}>
      <View style={styles.titleRow}>
        <Text numberOfLines={1} style={styles.eventTitle}>{event.title}</Text>
        {isHappeningNow(event.startAt, event.endAt, new Date(now)) ? <Text style={styles.liveBadge}>{t("discover.happeningNow")}</Text> : null}
      </View>
      <Text style={styles.eventMeta}>{formatEventTime(event, t("localeCode"))}</Text>
      <Text numberOfLines={1} style={styles.eventMeta}>{event.address}</Text>
      <View style={styles.cardFooter}>
        {event.tags[0] ? <Text style={styles.tag}>{event.tags[0]}</Text> : <View />}
        <Text style={styles.eventMeta}>{t("eventDetail.attendingCount", { count: event.attendingCount })}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f7f7fb" },
  mapContainer: { flex: 1, minHeight: 260 },
  status: { position: "absolute", top: 12, right: 12, backgroundColor: "white", borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 8, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 },
  createButton: { position: "absolute", top: 12, left: 12, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#5b5bd6", shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 8, elevation: 3 },
  createButtonText: { color: "white", fontSize: 13, fontWeight: "700" },
  statusText: { color: "#26263a", fontSize: 13, fontWeight: "600" },
  note: { color: "#69697d", fontSize: 11 },
  listPanel: { maxHeight: "42%", minHeight: 150, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, backgroundColor: "white", borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  headingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8 },
  heading: { color: "#24243a", fontSize: 18, fontWeight: "700" },
  filterButton: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#eeeeff" },
  filterButtonText: { color: "#3730a3", fontSize: 13, fontWeight: "700" },
  filters: { gap: 8, marginBottom: 10 },
  filterLabel: { color: "#34344b", fontSize: 13, fontWeight: "600" },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { borderWidth: 1, borderColor: "#d7d7e2", borderRadius: 16, backgroundColor: "white", paddingHorizontal: 10, paddingVertical: 6 },
  choiceSelected: { borderColor: "#5b5bd6", backgroundColor: "#eeeeff" },
  choiceText: { color: "#55556a", fontSize: 12, fontWeight: "600" },
  choiceTextSelected: { color: "#3730a3" },
  filterActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  clearButton: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#f3f3f8" },
  clearText: { color: "#3730a3", fontWeight: "700", fontSize: 13 },
  applyButton: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#5b5bd6" },
  applyText: { color: "white", fontWeight: "700", fontSize: 13 },
  eventList: { paddingBottom: 8 },
  eventCard: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e4e4ed", gap: 4 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  eventTitle: { flex: 1, color: "#26263a", fontWeight: "600", fontSize: 15 },
  eventMeta: { color: "#69697d", fontSize: 12 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 3 },
  tag: { color: "#3730a3", backgroundColor: "#eeeeff", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, fontSize: 10, fontWeight: "600" },
  liveBadge: { overflow: "hidden", color: "#176b57", backgroundColor: "#dff5ed", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, fontSize: 10, fontWeight: "700" },
  message: { alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 18 },
  muted: { color: "#69697d", fontSize: 14 },
  errorText: { color: "#a33333", fontSize: 14 },
  retryButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: "#5b5bd6" },
  retryText: { color: "white", fontWeight: "600" },
});
