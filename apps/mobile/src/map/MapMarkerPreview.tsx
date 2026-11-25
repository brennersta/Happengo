import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import type { DiscoverItem } from "@/incidents/discoverItems";
import { displayAddress } from "@/events/displayAddress";
import { formatEventTime } from "@/events/mapEvents";
import { isHappeningNow } from "@/events/liveState";
import { theme } from "@/theme/theme";
import { GradientButton } from "@/theme/ui";

export function MapMarkerPreview({ item, now, onClose, onOpen }: {
  item: DiscoverItem;
  now: number;
  onClose: () => void;
  onOpen: () => void;
}) {
  const { t, i18n } = useTranslation();
  const isEvent = item.kind === "event";
  const title = isEvent ? item.value.title : t(`incidents.categories.${item.value.category}`);
  const live = isEvent && isHappeningNow(item.value.startAt, item.value.endAt, new Date(now));
  const address = displayAddress(item.value.address);

  return (
    <View pointerEvents="box-none" style={styles.position}>
      <View style={[styles.card, !isEvent && styles.incidentCard]}>
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

function relativeTime(value: string, locale: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 60_000));
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (minutes < 60) return formatter.format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return formatter.format(-hours, "hour");
  return formatter.format(-Math.floor(hours / 24), "day");
}

const styles = StyleSheet.create({
  position: { position: "absolute", left: 12, right: 12, bottom: 14, alignItems: "center", zIndex: 3 },
  card: { width: "100%", maxWidth: 350, padding: 14, gap: 8, backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: theme.line, ...theme.shadow },
  incidentCard: { backgroundColor: "#fffaf5", borderColor: "#fed7aa" },
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
