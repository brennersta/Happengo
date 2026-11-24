import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { fetchClient } from "@/api/client";
import { AddressSearch } from "@/geocoding/AddressSearch";
import type { GeocodePlace } from "@/geocoding/photon";
import { discoverQuery, emptyDiscoverFilters, type DiscoverFilters } from "@/events/discoverFilters";
import { displayAddress } from "@/events/displayAddress";
import { isHappeningNow } from "@/events/liveState";
import { bboxForBounds, formatEventTime, type MapEvent } from "@/events/mapEvents";
import { Map } from "@/map/Map";
import { TALLINN, mapStyleUrl } from "@/map/config";
import { EVENT_TAGS } from "@/map/markerStyle";
import type { MapBounds, MapFocus, MapMarker } from "@/map/types";
import type { SavedMapView } from "@/map/mapView";
import { initialMapView } from "@/map/mapView";
import { readSavedMapView, saveMapView } from "@/map/mapViewStorage";
import { readGrantedDeviceLocation, requestDeviceLocation } from "@/map/deviceLocation";
import { theme, wideLayoutWidth } from "@/theme/theme";
import { Chip, CoverPlaceholder, GradientButton, GradientHeader } from "@/theme/ui";

const initialBounds: MapBounds = {
  southWest: { longitude: TALLINN.longitude - 0.05, latitude: TALLINN.latitude - 0.03 },
  northEast: { longitude: TALLINN.longitude + 0.05, latitude: TALLINN.latitude + 0.03 },
};

export default function DiscoverScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= wideLayoutWidth;
  const [mode, setMode] = useState<"map" | "list">("map");
  const [initialView, setInitialView] = useState<SavedMapView | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [bounds, setBounds] = useState(initialBounds);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draft, setDraft] = useState<DiscoverFilters>(emptyDiscoverFilters);
  const [applied, setApplied] = useState<DiscoverFilters>(emptyDiscoverFilters);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    let active = true;
    void Promise.all([readGrantedDeviceLocation(), readSavedMapView()]).then(([location, saved]) => {
      if (active) setInitialView(initialMapView(location, saved));
    }).catch(() => {
      void readSavedMapView().then((saved) => {
        if (active) setInitialView(initialMapView(null, saved));
      });
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!locationDenied) return;
    const timer = setTimeout(() => setLocationDenied(false), 3500);
    return () => clearTimeout(timer);
  }, [locationDenied]);
  const onMapIdle = useCallback((next: MapBounds, zoom: number) => {
    setBounds(next);
    void saveMapView({
      center: {
        longitude: (next.southWest.longitude + next.northEast.longitude) / 2,
        latitude: (next.southWest.latitude + next.northEast.latitude) / 2,
      },
      zoom,
    });
  }, []);
  const bbox = useMemo(() => bboxForBounds(bounds), [bounds]);
  const center = useMemo(() => ({
    longitude: (bounds.southWest.longitude + bounds.northEast.longitude) / 2,
    latitude: (bounds.southWest.latitude + bounds.northEast.latitude) / 2,
  }), [bounds]);
  const filtered = applied.tags.length > 0 || applied.happeningNow;
  const loadEvents = useCallback(async (filters: DiscoverFilters) => {
    const { data, error, response } = await fetchClient.GET("/v1/events", {
      params: { query: discoverQuery(bbox, filters) },
    });
    if (error || !data) throw new Error(response.statusText || t("discover.loadError"));
    return data;
  }, [bbox, t]);
  const viewportQuery = useQuery({
    queryKey: ["discover-events", bbox, "", false],
    queryFn: () => loadEvents(emptyDiscoverFilters),
    staleTime: 15_000,
  });
  const filteredQuery = useQuery({
    queryKey: ["discover-events", bbox, applied.tags.join(","), applied.happeningNow],
    enabled: filtered,
    queryFn: () => loadEvents(applied),
    staleTime: 15_000,
  });
  const activeQuery = filtered ? filteredQuery : viewportQuery;
  const events: MapEvent[] = activeQuery.data?.items ?? [];
  const countSource = viewportQuery.data?.items ?? [];
  const markers: MapMarker[] = events.map((event) => ({
    id: event.id,
    title: event.title,
    coordinate: { longitude: event.longitude, latitude: event.latitude },
    mainTag: event.tags[0] ?? null,
    tagLabel: event.tags[0] ? t(`tags.${event.tags[0]}`) : null,
    happeningNow: isHappeningNow(event.startAt, event.endAt, new Date(now)),
  }));
  const activeCount = applied.tags.length + (applied.happeningNow ? 1 : 0);
  const showMap = mode === "map" || wide;
  const showList = mode === "list";

  function choosePlace(place: GeocodePlace) {
    setFocus({ longitude: place.longitude, latitude: place.latitude, key: Date.now() });
    if (!wide) setMode("map");
  }

  async function locateMe() {
    setLocating(true);
    setLocationDenied(false);
    try {
      const location = await requestDeviceLocation();
      if (!location) {
        setLocationDenied(true);
        return;
      }
      setFocus({ ...location, key: Date.now() });
    } catch {
      setLocationDenied(true);
    } finally {
      setLocating(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.body}>
        {showMap ? (
          <View style={styles.mapPane}>
            {initialView ? <Map center={initialView.center} zoom={initialView.zoom} styleUrl={mapStyleUrl()} markers={markers} focus={focus} onMapIdle={onMapIdle}
              onMarkerPress={(id) => router.push({ pathname: "/events/[id]", params: { id } })} /> : <View style={styles.mapLoading}><ActivityIndicator /></View>}
            <View style={styles.locationControl}>
              {locationDenied ? <Text accessibilityLiveRegion="polite" style={styles.locationMessage}>{t("discover.locationDenied")}</Text> : null}
              <Pressable accessibilityRole="button" accessibilityLabel={t("discover.locateMe")} disabled={locating} onPress={() => void locateMe()} style={styles.locateButton}>
                {locating ? <ActivityIndicator size="small" color={theme.brand} /> : <Ionicons name="locate-outline" size={18} color={theme.brand} />}
                <Text style={styles.locateText}>{t("discover.locateMe")}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
        {showList ? (
          <View style={[styles.listPane, !wide && styles.listFull]}>
            <Text style={[styles.listHeading, !showMap && styles.listHeadingUnderBar]}>{t("discover.eventsNearYou", { count: events.length })}</Text>
            {activeQuery.isError ? (
              <View style={styles.message}>
                <Text style={styles.errorText}>{t("discover.loadError")}</Text>
                <GradientButton label={t("discover.retry")} onPress={() => void activeQuery.refetch()} />
              </View>
            ) : activeQuery.isLoading ? (
              <View style={styles.message}><ActivityIndicator /><Text style={styles.muted}>{t("discover.loading")}</Text></View>
            ) : events.length === 0 ? (
              <Text style={styles.muted}>{t(filtered ? "discover.noMatches" : "discover.empty")}</Text>
            ) : (
              <ScrollView contentContainerStyle={styles.listContent}>
                {events.map((event) => (
                  <EventCard key={event.id} event={event} now={now} onPress={() => router.push({ pathname: "/events/[id]", params: { id: event.id } })} />
                ))}
              </ScrollView>
            )}
          </View>
        ) : null}
      </View>

      <View style={[styles.toolbar, showList && wide && styles.toolbarShift, !showMap && styles.toolbarInline]} pointerEvents="box-none">
        <View style={styles.bar}>
          <AddressSearch center={center} onSelect={choosePlace} />
          <View style={styles.segment}>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: mode === "map" }} accessibilityLabel={t("discover.mapView")} onPress={() => setMode("map")} style={[styles.segmentButton, mode === "map" && styles.segmentOn]}>
              <Ionicons name="map-outline" size={18} color={mode === "map" ? "white" : theme.ink} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: mode === "list" }} accessibilityLabel={t("discover.listView")} onPress={() => setMode("list")} style={[styles.segmentButton, mode === "list" && styles.segmentOn]}>
              <Ionicons name="list-outline" size={18} color={mode === "list" ? "white" : theme.ink} />
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={activeCount ? t("discover.filtersCount", { count: activeCount }) : t("discover.filters")}
            accessibilityState={{ expanded: filtersOpen }}
            onPress={() => setFiltersOpen(true)}
            style={styles.iconButton}
          >
            <Ionicons name="options-outline" size={18} color={theme.ink} />
            {activeCount ? <View style={styles.badge}><Text style={styles.badgeText}>{activeCount}</Text></View> : null}
          </Pressable>
          <View style={styles.createWrap}>
            <GradientButton label={wide ? `+ ${t("discover.createEvent")}` : "+"} onPress={() => router.push("/events/create")} />
          </View>
        </View>
        <View style={styles.countPill}>
          {activeQuery.isFetching ? <ActivityIndicator size="small" color={theme.brand} /> : null}
          <Text style={styles.countText}>{t("discover.countPill", { count: events.length })}</Text>
        </View>
      </View>

      {filtersOpen ? (
        <FilterDrawer
          draft={draft}
          counts={countSource}
          onChange={setDraft}
          onClose={() => setFiltersOpen(false)}
          onApply={() => { setApplied(draft); setFiltersOpen(false); }}
          onClear={() => { setDraft(emptyDiscoverFilters); setApplied(emptyDiscoverFilters); setFiltersOpen(false); }}
        />
      ) : null}
    </View>
  );
}

function EventCard({ event, now, onPress }: { event: MapEvent; now: number; onPress: () => void }) {
  const { t } = useTranslation();
  const live = isHappeningNow(event.startAt, event.endAt, new Date(now));
  const address = displayAddress(event.address);
  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={styles.thumb}><CoverPlaceholder tag={event.tags[0]} /></View>
        <View style={styles.cardBody}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={styles.cardTitle}>{event.title}</Text>
            {live ? <Text style={styles.nowBadge}>{t("discover.now")}</Text> : null}
          </View>
          <Text style={styles.meta}>{formatEventTime(event, t("localeCode"))}</Text>
          <Text numberOfLines={1} style={styles.meta}>{address ?? t("discover.addressUnavailable")}</Text>
          <Text style={styles.meta}>{t("eventDetail.attendingCount", { count: event.attendingCount })}</Text>
          {event.friendsGoing && event.friendsGoing.count > 0 ? (
            <View accessibilityRole="text" accessibilityLabel={t("discover.friendsGoingBadge", { count: event.friendsGoing.count })} style={styles.friendsBadge}>
              <Ionicons name="people-outline" size={13} color={theme.brand} />
              <Text style={styles.friendsBadgeText}>{t("discover.friendsGoingBadge", { count: event.friendsGoing.count })}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <GradientButton label={t("discover.viewEvent")} onPress={onPress} />
    </View>
  );
}

function FilterDrawer({
  draft,
  counts,
  onChange,
  onClose,
  onApply,
  onClear,
}: {
  draft: DiscoverFilters;
  counts: MapEvent[];
  onChange: (next: DiscoverFilters) => void;
  onClose: () => void;
  onApply: () => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.drawerScrim}>
      <Pressable accessibilityLabel={t("discover.closeFilters")} style={styles.scrim} onPress={onClose} />
      <View accessibilityViewIsModal style={styles.drawer}>
        <GradientHeader>
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>{t("discover.filters")}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t("discover.closeFilters")} onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={18} color="white" />
            </Pressable>
          </View>
        </GradientHeader>
        <ScrollView contentContainerStyle={styles.drawerBody}>
          <Text style={styles.section}>{t("discover.filterByTags")}</Text>
          <View style={styles.chips}>
            {EVENT_TAGS.map((tag) => {
              const selected = draft.tags.includes(tag);
              const count = counts.filter((event) => event.tags.includes(tag)).length;
              return (
                <Chip
                  key={tag}
                  label={t(`tags.${tag}`)}
                  count={count}
                  selected={selected}
                  onPress={() => onChange({
                    ...draft,
                    tags: selected ? draft.tags.filter((item) => item !== tag) : [...draft.tags, tag],
                  })}
                />
              );
            })}
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: draft.happeningNow }}
            onPress={() => onChange({ ...draft, happeningNow: !draft.happeningNow })}
            style={styles.toggleRow}
          >
            <Text style={styles.toggleLabel}>{t("discover.happeningNowOnly")}</Text>
            <View style={[styles.switchTrack, draft.happeningNow && styles.switchOn]}>
              <View style={[styles.switchThumb, draft.happeningNow && styles.switchThumbOn]} />
            </View>
          </Pressable>
          <GradientButton label={t("discover.applyFilters")} onPress={onApply} />
          <Pressable accessibilityRole="button" onPress={onClear} style={styles.clearButton}>
            <Text style={styles.clearText}>{t("discover.clear")}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.page },
  body: { flex: 1, flexDirection: "row" },
  mapPane: { flex: 1 },
  mapLoading: { flex: 1, alignItems: "center", justifyContent: "center" },
  locationControl: { position: "absolute", right: 16, bottom: 20, alignItems: "flex-end", gap: 8 },
  locateButton: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, borderRadius: 22, backgroundColor: "white", ...theme.shadow },
  locateText: { color: theme.ink, fontSize: 14, fontWeight: "700" },
  locationMessage: { maxWidth: 240, paddingVertical: 8, paddingHorizontal: 12, overflow: "hidden", borderRadius: 10, backgroundColor: "white", color: theme.ink, fontSize: 13, ...theme.shadow },
  listPane: { width: 420, maxWidth: "46%", backgroundColor: "white", borderLeftWidth: 1, borderLeftColor: theme.line },
  listFull: { width: "100%", maxWidth: "100%" },
  listHeading: { color: theme.ink, fontSize: 20, fontWeight: "700", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  listHeadingUnderBar: { paddingTop: 8 },
  listContent: { padding: 16, paddingBottom: 110, gap: 12 },
  toolbar: { position: "absolute", top: 12, right: 12, left: 64, alignItems: "flex-end", gap: 8, zIndex: 4 },
  toolbarShift: { right: 432 },
  toolbarInline: { position: "relative", top: 0, left: 0, right: 0, paddingHorizontal: 12, paddingTop: 12 },
  bar: { flexDirection: "row", alignItems: "center", gap: 8, maxWidth: 760, alignSelf: "flex-end" },
  segment: { flexDirection: "row", backgroundColor: "white", borderRadius: 12, overflow: "hidden", ...theme.shadow },
  segmentButton: { width: 40, height: 42, alignItems: "center", justifyContent: "center" },
  segmentOn: { backgroundColor: "#1F1B2E" },
  iconButton: { width: 42, height: 42, borderRadius: 12, backgroundColor: "white", alignItems: "center", justifyContent: "center", ...theme.shadow },
  badge: { position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: theme.brand, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  badgeText: { color: "white", fontSize: 10, fontWeight: "700" },
  createWrap: { ...theme.shadow, borderRadius: 12 },
  countPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "white", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, ...theme.shadow },
  countText: { color: theme.ink, fontSize: 13, fontWeight: "700" },
  card: { backgroundColor: "white", borderRadius: 16, padding: 12, gap: 10, borderWidth: 1, borderColor: theme.line },
  cardRow: { flexDirection: "row", gap: 12 },
  thumb: { width: 92, height: 72, borderRadius: 12, overflow: "hidden" },
  cardBody: { flex: 1, gap: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { flex: 1, color: theme.ink, fontSize: 16, fontWeight: "700" },
  nowBadge: { color: theme.live, backgroundColor: theme.liveBg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, fontSize: 11, fontWeight: "700", overflow: "hidden" },
  meta: { color: theme.muted, fontSize: 12 },
  friendsBadge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3, borderRadius: 10, backgroundColor: "#EEEEFF", paddingHorizontal: 7, paddingVertical: 3 },
  friendsBadgeText: { color: theme.brand, fontSize: 11, fontWeight: "700" },
  message: { padding: 24, gap: 10, alignItems: "center" },
  muted: { color: theme.muted, fontSize: 14, padding: 16 },
  errorText: { color: theme.danger, fontSize: 14 },
  drawerScrim: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, flexDirection: "row", zIndex: 8 },
  scrim: { flex: 1, backgroundColor: "rgba(31,27,46,0.28)" },
  drawer: { width: 360, maxWidth: "100%", backgroundColor: "white", ...theme.shadow },
  drawerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  drawerTitle: { color: "white", fontSize: 20, fontWeight: "700" },
  closeButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  drawerBody: { padding: 16, gap: 14, paddingBottom: 32 },
  section: { color: theme.ink, fontSize: 16, fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: theme.line, borderRadius: 12, padding: 12 },
  toggleLabel: { color: theme.ink, fontSize: 15, fontWeight: "600" },
  switchTrack: { width: 42, height: 24, borderRadius: 12, backgroundColor: "#DDD8EA", padding: 2 },
  switchOn: { backgroundColor: theme.brand },
  switchThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: "white" },
  switchThumbOn: { marginLeft: 18 },
  clearButton: { alignItems: "center", paddingVertical: 8 },
  clearText: { color: theme.brand, fontWeight: "700" },
});
