import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { fetchClient } from "@/api/client";
import { auth } from "@/auth";
import { mocksEnabled } from "@/mocks/config";
import { Map } from "@/map/Map";
import { mapStyleUrl } from "@/map/config";
import { formatEventTime } from "@/events/mapEvents";

export default function EventDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [signedIn, setSignedIn] = useState(false);
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
    enabled: Boolean(event?.isOwner && (signedIn || isDemo)),
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

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={t("createEvent.cancel")} onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{t("eventDetail.title")}</Text>
      </View>
      {eventQuery.isLoading ? (
        <View style={styles.center}><ActivityIndicator /><Text style={styles.muted}>{t("eventDetail.loading")}</Text></View>
      ) : eventQuery.isError || !event ? (
        <View style={styles.center}>
          <Text style={styles.muted}>{t("eventDetail.notFound")}</Text>
          <Pressable accessibilityRole="button" onPress={() => void eventQuery.refetch()} style={styles.retryButton}>
            <Text style={styles.retryText}>{t("discover.retry")}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.map}>
            <Map
              center={{ longitude: event.longitude, latitude: event.latitude }}
              zoom={14}
              styleUrl={mapStyleUrl()}
              markers={[{
                id: event.id,
                title: event.title,
                mainTag: event.tags[0] ?? null,
                happeningNow: event.happeningNow,
                coordinate: { longitude: event.longitude, latitude: event.latitude },
              }]}
            />
          </View>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.meta}>{formatEventTime(event, t("localeCode"))}</Text>
          <Text style={styles.address}>{event.address}</Text>
          <View style={styles.badges}>
            <Text style={styles.badge}>{t(`eventDetail.${event.visibility}`)}</Text>
            <Text style={styles.badge}>{t("eventDetail.attendingCount", { count: event.attendingCount })}</Text>
          </View>
          {event.description ? <Text style={styles.description}>{event.description}</Text> : null}
          {event.tags.length ? <Text style={styles.meta}>{event.tags.join(" · ")}</Text> : null}
          {event.isOwner ? (
            <View style={styles.requests}>
              <Text style={styles.sectionTitle}>{t("eventDetail.requestsTitle")}</Text>
              {requestsQuery.isLoading ? <ActivityIndicator /> : null}
              {requestsQuery.isError ? <Text style={styles.error}>{t("eventDetail.actionError")}</Text> : null}
              {requestsQuery.data?.userIds.length ? requestsQuery.data.userIds.map((userId) => (
                <View key={userId} style={styles.requestRow}>
                  <Text style={styles.requestId}>{userId.slice(0, 8)}</Text>
                  <Pressable accessibilityRole="button" disabled={attendanceMutation.isPending} onPress={() => attendanceMutation.mutate({ type: "approve", userId })} style={styles.actionButton}>
                    <Text style={styles.actionText}>{t("eventDetail.approve")}</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" disabled={attendanceMutation.isPending} onPress={() => attendanceMutation.mutate({ type: "reject", userId })} style={styles.secondaryButton}>
                    <Text style={styles.secondaryText}>{t("eventDetail.reject")}</Text>
                  </Pressable>
                </View>
              )) : <Text style={styles.meta}>{t("eventDetail.noRequests")}</Text>}
            </View>
          ) : (signedIn || isDemo) ? (
            <View style={styles.attendance}>
              {attendanceQuery.isLoading ? <ActivityIndicator /> : null}
              {attendanceQuery.isError || attendanceMutation.isError ? <Text accessibilityRole="alert" style={styles.error}>{t("eventDetail.actionError")}</Text> : null}
              {attendanceQuery.data?.status === "attending" ? (
                <>
                  <Text style={styles.meta}>{t("eventDetail.youAreAttending")}</Text>
                  <Pressable accessibilityRole="button" disabled={attendanceMutation.isPending} onPress={() => attendanceMutation.mutate({ type: "cancel" })} style={styles.secondaryButton}>
                    <Text style={styles.secondaryText}>{t("eventDetail.cancelAttendance")}</Text>
                  </Pressable>
                </>
              ) : attendanceQuery.data?.status === "requested" ? (
                <Text style={styles.meta}>{t("eventDetail.requested")}</Text>
              ) : attendanceQuery.data?.status === "rejected" || attendanceQuery.data?.status === "cancelled" ? (
                <Text style={styles.meta}>{t(`eventDetail.attendance.${attendanceQuery.data.status}`)}</Text>
              ) : (
                <Pressable accessibilityRole="button" disabled={attendanceMutation.isPending} onPress={() => attendanceMutation.mutate({ type: "join" })} style={styles.actionButton}>
                  <Text style={styles.actionText}>{t(event.approvalMode === "open" ? "eventDetail.join" : "eventDetail.requestToJoin")}</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/profile")} style={styles.actionButton}>
              <Text style={styles.actionText}>{t("auth.goToSignIn")}</Text>
            </Pressable>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f7f7fb" },
  header: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, backgroundColor: "white", borderBottomColor: "#e4e4ed", borderBottomWidth: StyleSheet.hairlineWidth },
  backButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "#f3f3f8" },
  backText: { color: "#312e81", fontSize: 27, lineHeight: 31 },
  headerTitle: { color: "#202038", fontSize: 17, fontWeight: "700" },
  content: { padding: 16, gap: 12, maxWidth: 760, width: "100%", alignSelf: "center" },
  map: { height: 260, overflow: "hidden", borderRadius: 16, backgroundColor: "#e6e6ec" },
  title: { color: "#202038", fontSize: 25, lineHeight: 31, fontWeight: "700", marginTop: 4 },
  meta: { color: "#68687d", fontSize: 14 },
  address: { color: "#34344b", fontSize: 16, fontWeight: "500" },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: { color: "#3730a3", backgroundColor: "#eeeeff", borderRadius: 16, paddingHorizontal: 11, paddingVertical: 7, fontSize: 12, fontWeight: "600" },
  description: { color: "#3f3f55", fontSize: 15, lineHeight: 22, marginTop: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  muted: { color: "#69697d", fontSize: 14, textAlign: "center" },
  retryButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: "#5b5bd6" },
  retryText: { color: "white", fontWeight: "600" },
  attendance: { gap: 10, marginTop: 8 },
  requests: { gap: 10, marginTop: 8, padding: 14, backgroundColor: "white", borderRadius: 12 },
  sectionTitle: { color: "#202038", fontSize: 17, fontWeight: "700" },
  requestRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  requestId: { color: "#34344b", fontSize: 13, flex: 1, minWidth: 70 },
  actionButton: { minHeight: 42, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#5b5bd6", paddingHorizontal: 16 },
  actionText: { color: "white", fontWeight: "700" },
  secondaryButton: { minHeight: 40, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#eeeeff", paddingHorizontal: 14 },
  secondaryText: { color: "#3730a3", fontWeight: "700" },
  error: { color: "#a33333", fontSize: 13, lineHeight: 18 },
});
