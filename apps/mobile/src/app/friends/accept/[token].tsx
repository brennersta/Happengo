import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { fetchClient } from "@/api/client";
import { theme } from "@/theme/theme";
import { GradientButton } from "@/theme/ui";

export default function AcceptFriendScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token } = useLocalSearchParams<{ token: string }>();
  const [doneName, setDoneName] = useState<string | null>(null);
  const preview = useQuery({
    queryKey: ["friend-invite-preview", token],
    enabled: Boolean(token) && doneName === null,
    queryFn: async () => {
      const { data, error, response } = await fetchClient.GET("/v1/friends/invites/{token}", {
        params: { path: { token: token ?? "" } },
      });
      if (response.status === 409) return { kind: "self" as const };
      if (error || !data) return { kind: "missing" as const };
      return { kind: "ready" as const, name: data.displayName || t("friends.unnamed") };
    },
  });
  const accept = useMutation({
    mutationFn: async () => {
      const { data, error } = await fetchClient.POST("/v1/friends/invites/{token}/accept", {
        params: { path: { token: token ?? "" } },
      });
      if (error || !data) throw new Error(t("friends.acceptError"));
      return data;
    },
    onSuccess: async (friend) => {
      setDoneName(friend.displayName || t("friends.unnamed"));
      await queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
  });

  const ready = preview.data?.kind === "ready" ? preview.data : null;
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        {doneName ? (
          <>
            <Text style={styles.title}>{t("friends.accepted", { name: doneName })}</Text>
            <GradientButton label={t("friends.openFriends")} onPress={() => router.replace("/(tabs)/friends")} />
          </>
        ) : preview.data?.kind === "self" ? (
          <Text style={styles.body}>{t("friends.selfInvite")}</Text>
        ) : preview.data?.kind === "missing" ? (
          <Text style={styles.body}>{t("friends.unknownInvite")}</Text>
        ) : ready ? (
          <>
            <Text style={styles.title}>{t("friends.acceptTitle", { name: ready.name })}</Text>
            <Text style={styles.body}>{t("friends.acceptBody")}</Text>
            {accept.isError ? <Text style={styles.error}>{t("friends.acceptError")}</Text> : null}
            <GradientButton label={t("friends.accept")} onPress={() => accept.mutate()} busy={accept.isPending} />
          </>
        ) : (
          <Text style={styles.body}>{t("discover.loading")}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.page, alignItems: "center", justifyContent: "center", padding: 20 },
  card: { width: "100%", maxWidth: 480, backgroundColor: theme.card, borderRadius: 18, padding: 20, gap: 14, ...theme.shadow },
  title: { color: theme.ink, fontSize: 24, fontWeight: "800" },
  body: { color: theme.muted, fontSize: 15, lineHeight: 22 },
  error: { color: theme.danger },
});
