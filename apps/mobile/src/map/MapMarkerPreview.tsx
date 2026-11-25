import { Pressable, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import type { DiscoverItem } from "@/incidents/discoverItems";
import { displayAddress } from "@/events/displayAddress";
import { formatEventTime } from "@/events/mapEvents";
import { isHappeningNow } from "@/events/liveState";
import { theme } from "@/theme/theme";
import { GradientButton } from "@/theme/ui";
import type { MapPoint } from "./types";

export function MapMarkerPreview({ item, now, position, mapSize, onClose, onOpen }: {
  item: DiscoverItem;
  now: number;
  position: MapPoint;
  mapSize: { width: number; height: number };
  onClose: () => void;
  onOpen: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [cardHeight, setCardHeight] = useState(0);
  const isEvent = item.kind === "event";
  const title = isEvent ? item.value.title : t(`incidents.categories.${item.value.category}`);
  const live = isEvent && isHappeningNow(item.value.startAt, item.value.endAt, new Date(now));
  const address = displayAddress(item.value.address);
  const cardWidth = Math.max(1, Math.min(350, mapSize.width - 24));
  const aboveTop = position.y - cardHeight - 7;
  const belowTop = position.y + 7;
  const fitsBelow = belowTop + cardHeight <= mapSize.height - 8;
  const opensAbove = aboveTop >= 8 || !fitsBelow;
  const topLimit = Math.max(8, mapSize.height - cardHeight - 8);
  const top = clamp(opensAbove ? aboveTop : belowTop, 8, topLimit);
  const left = clamp(position.x - cardWidth / 2, 8, Math.max(8, mapSize.width - cardWidth - 8));
  const arrowLeft = clamp(position.x - left - 7, 16, Math.max(16, cardWidth - 30));
  const arrowTop = opensAbove ? top + cardHeight - 7 : top - 7;

  return (
    <View pointerEvents="box-none" style={styles.layer}>
      <View pointerEvents="none" style={[styles.arrow, !isEvent && styles.incidentArrow, { left: arrowLeft, top: arrowTop }]} />
      <View onLayout={(event) => {
        const nextHeight = event.nativeEvent.layout.height;
        setCardHeight((current) => current === nextHeight ? current : nextHeight);
      }} style={[styles.card, !isEvent && styles.incidentCard, { left, top, width: cardWidth }]}>
        <View style={styles.header}>
          <Text numberOfLines={1} style={[styles.title, !isEvent && styles.incidentTitle]}>{title}</Text>
          {live ? <Text style={styles.live}>{t("discover.now")}</Text> : null}
          <Pressable accessibilityRole="button" accessibilityLabel={t("discover.closePreview")} onPress={onClose} style={styles.close}>
            <Ionicons name="close" size={18} color={theme.ink} />
          </Pressable>
        </View>
        {isEvent ? (
          <>
            <Text style={styles.meta}>{formatEventTime(item.value, t("localeCode"))}</Text>
            {address ? <Text numberOfLines={1} style={styles.meta}>{address}</Text> : null}
            {item.value.description ? <Text numberOfLines={2} style={styles.description}>{item.value.description}</Text> : null}
            <Text style={styles.meta}>{t("eventDetail.attendingCount", { count: item.value.attendingCount })}</Text>
            <View style={styles.tags}>
              {item.value.tags.slice(0, 3).map((tag) => <Text key={tag} style={styles.tag}>{t(`tags.${tag}`)}</Text>)}
            </View>
          </>
        ) : (
          <>
            <Text numberOfLines={3} style={styles.description}>{item.value.description}</Text>
            {address ? <Text numberOfLines={1} style={styles.meta}>{address}</Text> : null}
            <Text style={styles.meta}>{t("incidents.reportedAgo", { time: relativeTime(item.value.createdAt, i18n.language) })}</Text>
          </>
        )}
        <GradientButton label={t(isEvent ? "discover.viewEvent" : "incidents.viewIncident")} onPress={onOpen} />
      </View>
    </View>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function relativeTime(value: string, locale: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 60_000));
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (minutes < 60) return formatter.format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return formatter.format(-hours, "hour");
  return formatter.format(-Math.floor(hours / 24), "day");
}

const styles = StyleSheet.create({
  layer: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: 3 },
  card: { position: "absolute", padding: 14, gap: 8, backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: theme.line, ...theme.shadow },
  arrow: { position: "absolute", width: 14, height: 14, backgroundColor: "white", borderRightWidth: 1, borderBottomWidth: 1, borderColor: theme.line, transform: [{ rotate: "45deg" }] },
  incidentCard: { backgroundColor: "#fffaf5", borderColor: "#fed7aa" },
  incidentArrow: { backgroundColor: "#fffaf5", borderColor: "#fed7aa" },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, color: theme.ink, fontSize: 17, fontWeight: "800" },
  incidentTitle: { color: "#9a3412" },
  live: { color: theme.live, backgroundColor: theme.liveBg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, fontSize: 11, fontWeight: "700", overflow: "hidden" },
  close: { width: 30, height: 30, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: theme.page },
  meta: { color: theme.muted, fontSize: 12 },
  description: { color: theme.ink, fontSize: 13, lineHeight: 18 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  tag: { color: theme.brand, backgroundColor: "#eeeeff", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, fontSize: 11, overflow: "hidden" },
});
