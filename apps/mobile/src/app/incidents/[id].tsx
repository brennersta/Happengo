import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Ionicons from "@expo/vector-icons/Ionicons";
import { fetchClient } from "@/api/client";
import { auth } from "@/auth";
import { mocksEnabled } from "@/mocks/config";
import { theme } from "@/theme/theme";
import { GradientButton } from "@/theme/ui";
import type { components } from "@happengo/api-client";

type Vote = Exclude<components["schemas"]["IncidentVoteValue"], null>;

export default function IncidentDetailScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [signedIn, setSignedIn] = useState(false);
  const demo = mocksEnabled();
  useEffect(() => {
    let active = true;
    void auth.getAccessToken().then((token) => { if (active) setSignedIn(Boolean(token)); }).catch(() => { if (active) setSignedIn(false); });
    return () => { active = false; };
  }, []);
  const incidentQuery = useQuery({
    queryKey: ["incident", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error, response } = await fetchClient.GET("/v1/incidents/{id}", { params: { path: { id } } });
      if (error || !data) throw new Error(response.statusText);
      return data;
    },
  });
  const voteMutation = useMutation({
    mutationFn: async (vote: Vote) => {
      const { data, error } = await fetchClient.POST("/v1/incidents/{id}/vote", { params: { path: { id } }, body: { vote } });
      if (error || !data) throw new Error("vote failed");
      return data;
    },
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["incident", id] }), queryClient.invalidateQueries({ queryKey: ["discover-incidents"] })]);
    },
  });
  const closeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await fetchClient.POST("/v1/incidents/{id}/close", { params: { path: { id } } });
      if (error || !data) throw new Error("close failed");
      return data;
    },
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["incident", id] }), queryClient.invalidateQueries({ queryKey: ["discover-incidents"] })]);
    },
  });
  const incident = incidentQuery.data;
  return <View style={styles.screen}>
    {incidentQuery.isLoading ? <View style={styles.center}><ActivityIndicator /><Text style={styles.muted}>{t("incidents.loading")}</Text></View>
      : incidentQuery.isError || !incident ? <View style={styles.center}><Text style={styles.muted}>{t("incidents.notFound")}</Text><GradientButton label={t("discover.retry")} onPress={() => void incidentQuery.refetch()} /></View>
      : <ScrollView contentContainerStyle={styles.content}>
        <Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={styles.back}>‹ {t("eventDetail.back")}</Text></Pressable>
        {!incident.isActive ? <View accessibilityRole="alert" style={styles.closed}><Text style={styles.closedText}>{t("incidents.closed")}</Text></View> : null}
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <View style={styles.icon}><Ionicons name={incident.category === "fire" ? "flame" : incident.category === "traffic_collision" ? "car-sport" : "alert-circle"} size={28} color="#c2410c" /></View>
            <Text style={styles.title}>{t(`incidents.categories.${incident.category}`)}</Text>
          </View>
          <Text style={styles.description}>{incident.description}</Text>
          <Text style={styles.meta}>{incident.address}</Text>
          <View style={styles.separator} />
          <Fact label={t("incidents.reported")}>{relative(incident.createdAt, i18n.language)}</Fact>
          <Fact label={t("incidents.lastConfirmed")}>{relative(incident.lastConfirmedAt, i18n.language)}</Fact>
          <Fact label={t("incidents.communityStatus")}>{t("incidents.voteCounts", { stillThere: incident.stillThereCount, gone: incident.goneCount })}</Fact>
          {incident.isActive ? (signedIn || demo ? <>
            <View style={styles.voteRow}>
              <Pressable accessibilityRole="button" accessibilityState={{ selected: incident.myVote === "still_there" }} disabled={voteMutation.isPending} onPress={() => voteMutation.mutate("still_there")} style={[styles.vote, incident.myVote === "still_there" && styles.voteSelected]}><Text style={[styles.voteText, incident.myVote === "still_there" && styles.voteTextSelected]}>{t("incidents.stillThere")}</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityState={{ selected: incident.myVote === "gone" }} disabled={voteMutation.isPending} onPress={() => voteMutation.mutate("gone")} style={[styles.vote, incident.myVote === "gone" && styles.voteSelected]}><Text style={[styles.voteText, incident.myVote === "gone" && styles.voteTextSelected]}>{t("incidents.gone")}</Text></Pressable>
            </View>
            {(voteMutation.isError || closeMutation.isError) ? <Text accessibilityRole="alert" style={styles.error}>{t("incidents.actionError")}</Text> : null}
            {incident.isReporter ? <Pressable accessibilityRole="button" disabled={closeMutation.isPending} onPress={() => closeMutation.mutate()} style={styles.closeButton}><Text style={styles.closeText}>{t("incidents.closeIncident")}</Text></Pressable> : null}
          </> : <GradientButton label={t("incidents.signInToVote")} onPress={() => router.push("/(tabs)/profile")} />) : null}
        </View>
      </ScrollView>}
  </View>;
}

function Fact({ label, children }: { label: string; children: string }) { return <View style={styles.fact}><Text style={styles.factLabel}>{label}</Text><Text style={styles.factValue}>{children}</Text></View>; }
function relative(value: string, locale: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 60_000));
  const fmt = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (minutes < 60) return fmt.format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return fmt.format(-hours, "hour");
  return fmt.format(-Math.floor(hours / 24), "day");
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.page },
  content: { padding: 20, gap: 14, width: "100%", maxWidth: 760, alignSelf: "center", paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  back: { color: theme.brand, fontSize: 15, fontWeight: "700" },
  card: { backgroundColor: "white", borderRadius: 18, padding: 18, gap: 13, ...theme.shadow },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 52, height: 52, borderRadius: 15, backgroundColor: "#ffedd5", alignItems: "center", justifyContent: "center" },
  title: { color: "#9a3412", fontSize: 24, fontWeight: "800" },
  description: { color: theme.ink, fontSize: 16, lineHeight: 23 },
  meta: { color: theme.muted, fontSize: 14 },
  separator: { height: 1, backgroundColor: theme.line },
  fact: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  factLabel: { color: theme.muted, fontSize: 14 },
  factValue: { color: theme.ink, fontSize: 14, fontWeight: "600" },
  voteRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  vote: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", backgroundColor: "#fff7ed", borderWidth: 1, borderColor: "#fed7aa", borderRadius: 12 },
  voteSelected: { backgroundColor: "#c2410c", borderColor: "#c2410c" },
  voteText: { color: "#9a3412", fontWeight: "800" },
  voteTextSelected: { color: "white" },
  closeButton: { alignItems: "center", minHeight: 46, justifyContent: "center", borderRadius: 12, backgroundColor: "#fff0f0" },
  closeText: { color: theme.danger, fontWeight: "800" },
  closed: { padding: 14, backgroundColor: "#f2f0f6", borderRadius: 12 },
  closedText: { color: theme.muted, fontWeight: "800" },
  error: { color: theme.danger },
  muted: { color: theme.muted },
});
