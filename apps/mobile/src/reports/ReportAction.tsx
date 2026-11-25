import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { fetchClient } from "@/api/client";
import { REPORT_REASONS, type ReportReason } from "./reasons";

export function ReportAction({ targetType, targetId, signedIn }: { targetType: "event" | "incident"; targetId: string; signedIn: boolean }) {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const mutation = useMutation({
    mutationFn: async (reason: ReportReason) => {
      const { data, error } = await fetchClient.POST("/v1/reports" as never, { body: { targetType, targetId, reason } } as never);
      if (error || !data) throw new Error("report-failed");
      return data;
    },
    onSuccess: async () => {
      setOpen(false);
      setSubmitted(true);
      await queryClient.invalidateQueries({ queryKey: ["moderation-queue"] });
    },
  });
  return <View style={styles.root}>
    {!signedIn ? <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/profile")} style={styles.reportButton}><Text style={styles.reportText}>{t("reports.signIn")}</Text></Pressable> : submitted ? <Text accessibilityRole="text" style={styles.success}>{t("reports.submitted")}</Text> : <>
      <Pressable accessibilityRole="button" onPress={() => setOpen((value) => !value)} style={styles.reportButton}><Text style={styles.reportText}>{t("reports.report")}</Text></Pressable>
      {open ? <View style={styles.reasonList}>
        {REPORT_REASONS.map((reason) => <Pressable accessibilityRole="button" disabled={mutation.isPending} key={reason} onPress={() => mutation.mutate(reason)} style={styles.reason}><Text style={styles.reasonText}>{t(`reports.reasons.${reason}`)}</Text></Pressable>)}
        {mutation.isError ? <Text accessibilityRole="alert" style={styles.error}>{t("reports.error")}</Text> : null}
      </View> : null}
    </>}
  </View>;
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  reportButton: { alignSelf: "flex-start", paddingVertical: 9, paddingHorizontal: 12 },
  reportText: { color: "#6b7280", fontWeight: "700" },
  reasonList: { gap: 6 },
  reason: { minHeight: 40, justifyContent: "center", borderRadius: 9, backgroundColor: "#f3f4f6", paddingHorizontal: 12 },
  reasonText: { color: "#292943" },
  error: { color: "#a33333" },
  success: { color: "#047857", fontWeight: "700", padding: 10 },
});
