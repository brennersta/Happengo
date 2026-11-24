import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import * as ExpoLinking from "expo-linking";
import Ionicons from "@expo/vector-icons/Ionicons";
import { fetchClient } from "@/api/client";
import { auth } from "@/auth";
import { mocksEnabled } from "@/mocks/config";
import { detailFacts } from "@/events/detailFacts";
import { displayAddress } from "@/events/displayAddress";
import { isHappeningNow } from "@/events/liveState";
import { formatEventTime } from "@/events/mapEvents";
import { theme } from "@/theme/theme";
import { Chip, CoverPlaceholder, GradientButton } from "@/theme/ui";

export default function EventDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [signedIn, setSignedIn] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const isDemo = mocksEnabled();
  useEffect(() => {
    let active = true;
    void auth.getAccessToken().then((token) => {
      if (active) setSignedIn(Boolean(token));
    }).catch(() => {
      if (active) setSignedIn(false);
    });
    return () => { active = false; };
  }, []);
  const eventQuery = useQuery({
    queryKey: ["event", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error, response } = await fetchClient.GET("/v1/events/{id}", { params: { path: { id } } });
      if (error || !data) throw new Error(response.statusText || t("eventDetail.notFound"));
      return data;
    },
  });
  const event = eventQuery.data;
  const attendanceQuery = useQuery({
    queryKey: ["event-attendance", id],
    enabled: Boolean(event && !event.isOwner && (signedIn || isDemo)),
    queryFn: async () => {
      const { data, error, response } = await fetchClient.GET("/v1/events/{eventId}/attendance/me", {
        params: { path: { eventId: id } },
      });
      if (error || !data) throw new Error(response.statusText);
      return data;
    },
  });
  const requestsQuery = useQuery({
    queryKey: ["event-attendance-requests", id],
    enabled: Boolean(event?.isOwner && !event.cancelledAt && (signedIn || isDemo)),
    queryFn: async () => {
      const { data, error, response } = await fetchClient.GET("/v1/events/{eventId}/attendance/requests", {
        params: { path: { eventId: id } },
      });
      if (error || !data) throw new Error(response.statusText);
      return data;
    },
  });
  const attendanceMutation = useMutation({
    mutationFn: async (action: { type: "join" } | { type: "cancel" } | { type: "approve" | "reject"; userId: string }) => {
      if (action.type === "join") {
        const { data, error, response } = await fetchClient.POST("/v1/events/{eventId}/attendance", {
          params: { path: { eventId: id } },
          body: {
            ...(event?.shareToken ? { shareToken: event.shareToken } : {}),
          } as { shareToken: string | null },
        });
        if (error || !data) throw new Error(response.statusText);
        return data;
      }
      if (action.type === "cancel") {
        const { data, error, response } = await fetchClient.POST("/v1/events/{eventId}/attendance/cancel", {
          params: { path: { eventId: id } },
        });
        if (error || !data) throw new Error(response.statusText);
        return data;
      }
      const path = action.type === "approve"
        ? "/v1/events/{eventId}/attendance/requests/{userId}/approve"
        : "/v1/events/{eventId}/attendance/requests/{userId}/reject";
      const { data, error, response } = await fetchClient.POST(path, {
        params: { path: { eventId: id, userId: action.userId } },
      });
      if (error || !data) throw new Error(response.statusText);
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["event", id] }),
        queryClient.invalidateQueries({ queryKey: ["event-attendance", id] }),
        queryClient.invalidateQueries({ queryKey: ["event-attendance-requests", id] }),
        queryClient.invalidateQueries({ queryKey: ["discover-events"] }),
        queryClient.invalidateQueries({ queryKey: ["my-events"] }),
      ]);
    },
  });
  const cancelEventMutation = useMutation({
    mutationFn: async () => {
      const { data, error, response } = await fetchClient.POST("/v1/events/{eventId}/cancel", {
        params: { path: { eventId: id } },
      });
      if (error || !data) throw new Error(response.statusText);
      return data;
    },
    onSuccess: async () => {
      setCancelConfirmOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["event", id] }),
        queryClient.invalidateQueries({ queryKey: ["event-attendance", id] }),
        queryClient.invalidateQueries({ queryKey: ["event-attendance-requests", id] }),
        queryClient.invalidateQueries({ queryKey: ["discover-events"] }),
        queryClient.invalidateQueries({ queryKey: ["my-events"] }),
      ]);
    },
  });

  const address = displayAddress(event?.address);
  const live = event ? !event.cancelledAt && isHappeningNow(event.startAt, event.endAt, new Date()) : false;

  async function shareEvent() {
    const url = ExpoLinking.createURL(`/events/${id}`);
    await Share.share({ message: url, url });
  }

  return (
    <View style={styles.screen}>
      {eventQuery.isLoading ? (
        <View style={styles.center}><ActivityIndicator /><Text style={styles.muted}>{t("eventDetail.loading")}</Text></View>
      ) : eventQuery.isError || !event ? (
        <View style={styles.center}>
          <Text style={styles.muted}>{t("eventDetail.notFound")}</Text>
          <GradientButton label={t("discover.retry")} onPress={() => void eventQuery.refetch()} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>‹ {t("eventDetail.back")}</Text>
          </Pressable>
          {event.cancelledAt ? (
            <View accessibilityRole="alert" style={styles.cancelledBanner}>
              <Text style={styles.cancelledBannerText}>{t("eventDetail.cancelledBanner")}</Text>
            </View>
          ) : null}
          <View style={styles.banner}><CoverPlaceholder tag={event.tags[0]} /></View>
          <View style={styles.card}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{event.title}</Text>
              <View style={styles.titleActions}>
                {live ? <Text style={styles.live}>{t("discover.happeningNow")}</Text> : null}
                <Pressable accessibilityRole="button" accessibilityLabel={t("eventDetail.share")} onPress={() => void shareEvent()} style={styles.iconButton}>
                  <Ionicons name="share-outline" size={18} color={theme.ink} />
                </Pressable>
              </View>
            </View>
            <View style={styles.chips}>
              {event.tags.map((tag) => <Chip key={tag} label={t(`tags.${tag}`)} />)}
            </View>
            {event.isOwner ? (
              <View style={styles.ownerActions}>
                <GradientButton
                  label={t("eventDetail.editEvent")}
                  onPress={() => router.push({ pathname: "/events/create", params: { id: event.id } })}
                />
                {!event.cancelledAt ? (
                  <Pressable accessibilityRole="button" disabled={cancelEventMutation.isPending} onPress={() => setCancelConfirmOpen(true)} style={styles.cancelEventButton}>
                    <Text style={styles.cancelEventText}>{t("eventDetail.cancelEvent")}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            {event.description ? <Text style={styles.description}>{event.description}</Text> : null}
            <View style={styles.facts}>
              {detailFacts(event).map((fact) => {
                if (fact === "when") {
                  return <FactRow key={fact} icon="calendar-outline" label={t("eventDetail.when")} value={formatEventTime(event, t("localeCode"))} />;
                }
                if (fact === "where") {
                  return (
                    <FactRow key={fact} icon="location-outline" label={t("eventDetail.where")} value={address ?? t("discover.addressUnavailable")}>
                      <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`https://www.openstreetmap.org/?mlat=${event.latitude}&mlon=${event.longitude}#map=16/${event.latitude}/${event.longitude}`)}>
                        <Text style={styles.link}>{t("eventDetail.openInMaps")}</Text>
                      </Pressable>
                    </FactRow>
                  );
                }
                if (fact === "host") {
                  return <FactRow key={fact} icon="person-outline" label={t("eventDetail.host")} value={t("eventDetail.hostedByYou")} />;
                }
                if (fact === "attendees") {
                  return <FactRow key={fact} icon="people-outline" label={t("eventDetail.attendees")} value={t("eventDetail.attendingCount", { count: event.attendingCount })} />;
                }
                return (
                  <FactRow
                    key={fact}
                    icon="eye-outline"
                    label={t("eventDetail.access")}
                    value={`${t(`eventDetail.${event.visibility}`)} · ${t(event.approvalMode === "open" ? "eventDetail.joiningOpen" : "eventDetail.joiningApproval")}`}
                  />
                );
              })}
            </View>
            {event.isOwner && !event.cancelledAt ? (
              <View style={styles.requests}>
                <Text style={styles.sectionTitle}>{t("eventDetail.requestsTitle")}</Text>
                {requestsQuery.isLoading ? <ActivityIndicator /> : null}
                {requestsQuery.isError ? <Text style={styles.error}>{t("eventDetail.actionError")}</Text> : null}
                {requestsQuery.data?.userIds.length ? requestsQuery.data.userIds.map((userId) => (
                  <View key={userId} style={styles.requestRow}>
                    <Text style={styles.requestId}>{userId.slice(0, 8)}</Text>
                    <GradientButton label={t("eventDetail.approve")} onPress={() => attendanceMutation.mutate({ type: "approve", userId })} disabled={attendanceMutation.isPending} />
                    <Pressable accessibilityRole="button" disabled={attendanceMutation.isPending} onPress={() => attendanceMutation.mutate({ type: "reject", userId })}>
                      <Text style={styles.link}>{t("eventDetail.reject")}</Text>
                    </Pressable>
                  </View>
                )) : <Text style={styles.meta}>{t("eventDetail.noRequests")}</Text>}
              </View>
            ) : event.cancelledAt ? null : (signedIn || isDemo) ? (
              <View style={styles.attendance}>
                {attendanceQuery.isLoading ? <ActivityIndicator /> : null}
                {attendanceQuery.isError || attendanceMutation.isError ? <Text accessibilityRole="alert" style={styles.error}>{t("eventDetail.actionError")}</Text> : null}
                {attendanceQuery.data?.status === "attending" ? (
                  <>
                    <View style={styles.attending}><Text style={styles.attendingText}>{t("eventDetail.attendingCheck")}</Text></View>
                    <Pressable accessibilityRole="button" disabled={attendanceMutation.isPending} onPress={() => attendanceMutation.mutate({ type: "cancel" })}>
                      <Text style={styles.link}>{t("eventDetail.cancelAttendance")}</Text>
                    </Pressable>
                  </>
                ) : attendanceQuery.data?.status === "requested" ? (
                  <Text style={styles.meta}>{t("eventDetail.requested")}</Text>
                ) : attendanceQuery.data?.status === "rejected" || attendanceQuery.data?.status === "cancelled" ? (
                  <Text style={styles.meta}>{t(`eventDetail.attendance.${attendanceQuery.data.status}`)}</Text>
                ) : (
                  <GradientButton label={t(event.approvalMode === "open" ? "eventDetail.join" : "eventDetail.requestToJoin")} onPress={() => attendanceMutation.mutate({ type: "join" })} disabled={attendanceMutation.isPending} />
                )}
              </View>
            ) : (
              <GradientButton label={t("auth.goToSignIn")} onPress={() => router.push("/(tabs)/profile")} />
            )}
          </View>
        </ScrollView>
      )}
      {cancelConfirmOpen ? (
        <View accessibilityViewIsModal style={styles.modalScrim}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>{t("eventDetail.cancelEventTitle")}</Text>
            <Text style={styles.meta}>{t("eventDetail.cancelEventMessage")}</Text>
            {cancelEventMutation.isError ? <Text accessibilityRole="alert" style={styles.error}>{t("eventDetail.actionError")}</Text> : null}
            <View style={styles.confirmActions}>
              <Pressable accessibilityRole="button" disabled={cancelEventMutation.isPending} onPress={() => setCancelConfirmOpen(false)}>
                <Text style={styles.link}>{t("eventDetail.keepEvent")}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={cancelEventMutation.isPending} onPress={() => cancelEventMutation.mutate()} style={styles.confirmCancelButton}>
                <Text style={styles.confirmCancelText}>{t("eventDetail.confirmCancelEvent")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function FactRow({ icon, label, value, children }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  children?: ReactNode;
}) {
  const named = children == null;
  return (
    <View
      style={styles.fact}
      accessible={named}
      accessibilityRole={named ? "text" : undefined}
      accessibilityLabel={named ? `${label}: ${value}` : undefined}
    >
      <Ionicons name={icon} size={18} color={theme.brand} />
      <View style={styles.factBody}>
        <Text style={styles.factValue}>{value}</Text>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.page },
  content: { padding: 20, gap: 14, width: "100%", maxWidth: 760, alignSelf: "center", paddingBottom: 40 },
  back: { alignSelf: "flex-start" },
  backText: { color: theme.brand, fontWeight: "700", fontSize: 15 },
  banner: { height: 180, borderRadius: 18, overflow: "hidden" },
  card: { backgroundColor: "white", borderRadius: 18, padding: 18, gap: 10, ...theme.shadow },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  title: { flex: 1, color: theme.ink, fontSize: 26, fontWeight: "800" },
  titleActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  live: { color: theme.live, backgroundColor: theme.liveBg, overflow: "hidden", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, fontSize: 12, fontWeight: "700" },
  cancelledBanner: { backgroundColor: "#FDEAEA", borderRadius: 12, padding: 12 },
  cancelledBannerText: { color: theme.danger, fontWeight: "800" },
  ownerActions: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12 },
  cancelEventButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  cancelEventText: { color: theme.danger, fontWeight: "800" },
  iconButton: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: theme.chip },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  description: { color: theme.ink, fontSize: 15, lineHeight: 22, paddingTop: 4 },
  facts: { gap: 14, paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line },
  fact: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  factBody: { flex: 1, gap: 2 },
  factValue: { color: theme.ink, fontSize: 15, lineHeight: 21 },
  meta: { color: theme.muted, fontSize: 14 },
  link: { color: theme.brand, fontWeight: "700" },
  attendance: { gap: 10, marginTop: 6 },
  attending: { backgroundColor: "#DDF6EA", borderRadius: 12, minHeight: 48, alignItems: "center", justifyContent: "center" },
  attendingText: { color: theme.live, fontWeight: "800", fontSize: 16 },
  requests: { gap: 10, marginTop: 8 },
  sectionTitle: { color: theme.ink, fontSize: 16, fontWeight: "700" },
  requestRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  requestId: { color: theme.ink, flex: 1 },
  error: { color: theme.danger },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  muted: { color: theme.muted, textAlign: "center" },
  modalScrim: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(31,27,46,0.45)", alignItems: "center", justifyContent: "center", padding: 20 },
  confirmModal: { width: "100%", maxWidth: 440, borderRadius: 18, backgroundColor: "white", padding: 20, gap: 14, ...theme.shadow },
  confirmTitle: { color: theme.ink, fontSize: 20, fontWeight: "800" },
  confirmActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 14, marginTop: 8 },
  confirmCancelButton: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#FDEAEA" },
  confirmCancelText: { color: theme.danger, fontWeight: "800" },
});
