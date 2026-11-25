import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { fetchClient } from "@/api/client";
import { theme } from "@/theme/theme";
import { GradientButton } from "@/theme/ui";

type QueueItem = {
  targetType: "event" | "incident";
  targetId: string;
  title: string | null;
  category: "fire" | "traffic_collision" | "other" | null;
  description: string | null;
  address: string | null;
  reportCount: number;
  priorityReview: boolean;
  reasons: ("inappropriate_content" | "spam_scam" | "fake_misleading" | "harassment_unsafe")[];
  resolved: boolean;
};

export default function ModerationScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [isModerator, setIsModerator] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  useEffect(() => {
    let active = true;
    void fetchClient.GET("/v1/me").then(({ data }) => {
      if (active) {
        setIsModerator(Boolean((data as unknown as { isModerator?: boolean } | undefined)?.isModerator));
        setSessionReady(true);
      }
    }).catch(() => { if (active) setSessionReady(true); });
    return () => { active = false; };
  }, []);
  const queue = useQuery({
    queryKey: ["moderation-queue"],
    enabled: sessionReady && isModerator,
    queryFn: async () => {
      const { data, error } = await fetchClient.GET("/v1/moderation/queue" as never, {} as never);
      if (error || !data) throw new Error("queue-load");
      return (data as unknown as { items: QueueItem[] }).items;
    },
  });
  const action = useMutation({
    mutationFn: async ({ item, kind }: { item: QueueItem; kind: "close" | "hide" }) => {
      const path = kind === "close" ? "/v1/moderation/incidents/{id}/close" : "/v1/moderation/events/{id}/hide";
      const { data, error } = await fetchClient.POST(path as never, {
        params: { path: { id: item.targetId } },
        body: { reason: reasons[item.targetId]?.trim() },
      } as never);
      if (error || !data) throw new Error("moderation-action");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["moderation-queue"] });
    },
  });
  return <View style={styles.screen}><ScrollView contentContainerStyle={styles.content}>
    <Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={styles.back}>‹ {t("eventDetail.back")}</Text></Pressable>
    <Text style={styles.title}>{t("moderation.title")}</Text>
    {!isModerator ? <Text style={styles.meta}>{t("moderation.signIn")}</Text> : queue.isLoading ? <ActivityIndicator /> : queue.isError ? <Text accessibilityRole="alert" style={styles.error}>{t("moderation.error")}</Text>
      : queue.data?.length ? queue.data.map((item) => <View key={`${item.targetType}-${item.targetId}`} style={styles.card}>
        <View style={styles.heading}><Text style={styles.itemTitle}>{item.title ?? t(`incidents.categories.${item.category ?? "other"}`)}</Text>{item.priorityReview ? <Text style={styles.priority}>{t("moderation.priority")}</Text> : null}</View>
        <Text style={styles.meta}>{t(`discover.kind.${item.targetType === "event" ? "events" : "incidents"}`)} · {t("moderation.reportCount", { count: item.reportCount })}</Text>
        {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
        {item.address ? <Text style={styles.meta}>{item.address}</Text> : null}
        <Text style={styles.meta}>{item.reasons.map((reason) => t(`reports.reasons.${reason}`)).join(" · ")}</Text>
        {item.resolved ? <Text style={styles.resolved}>{t("moderation.resolved")}</Text> : <>
          <TextInput accessibilityLabel={t("moderation.reason")} maxLength={500} onChangeText={(value) => setReasons((values) => ({ ...values, [item.targetId]: value }))} placeholder={t("moderation.reasonPlaceholder")} style={styles.input} value={reasons[item.targetId] ?? ""} />
          <GradientButton disabled={!reasons[item.targetId]?.trim() || action.isPending} label={t(item.targetType === "incident" ? "moderation.close" : "moderation.hide")} onPress={() => action.mutate({ item, kind: item.targetType === "incident" ? "close" : "hide" })} />
        </>}
      </View>) : <Text style={styles.meta}>{t("moderation.empty")}</Text>}
    {action.isError ? <Text accessibilityRole="alert" style={styles.error}>{t("moderation.actionError")}</Text> : null}
  </ScrollView></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.page },
  content: { padding: 20, gap: 14, width: "100%", maxWidth: 800, alignSelf: "center", paddingBottom: 48 },
  back: { color: theme.brand, fontSize: 15, fontWeight: "700" },
  title: { color: theme.ink, fontSize: 26, fontWeight: "800" },
  card: { backgroundColor: "white", borderRadius: 16, padding: 16, gap: 10, ...theme.shadow },
  heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  itemTitle: { color: theme.ink, fontSize: 18, fontWeight: "800", flexShrink: 1 },
  priority: { color: "#9a3412", backgroundColor: "#ffedd5", borderRadius: 10, overflow: "hidden", paddingHorizontal: 9, paddingVertical: 5, fontSize: 12, fontWeight: "800" },
  description: { color: theme.ink, lineHeight: 21 },
  meta: { color: theme.muted },
  resolved: { color: "#047857", fontWeight: "700" },
  input: { minHeight: 44, borderWidth: 1, borderColor: theme.line, borderRadius: 10, paddingHorizontal: 12, color: theme.ink },
  error: { color: theme.danger },
});
