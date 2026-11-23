import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { fetchClient } from "@/api/client";
import { auth } from "@/auth";
import { friendInviteUrl, normalizeFriendTags } from "@/friends/friendTags";
import { mocksEnabled } from "@/mocks/config";
import { theme } from "@/theme/theme";
import { Chip, GradientButton } from "@/theme/ui";

export default function FriendsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isDemo = mocksEnabled();
  const [signedIn, setSignedIn] = useState(isDemo);
  const [token, setToken] = useState<string | null>(null);
  const [path, setPath] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const inviteStarted = useRef(false);

  useEffect(() => {
    if (isDemo) return;
    let active = true;
    void auth.getAccessToken().then((value) => { if (active) setSignedIn(Boolean(value)); })
      .catch(() => { if (active) setSignedIn(false); });
    return () => { active = false; };
  }, [isDemo]);

  const friendsQuery = useQuery({
    queryKey: ["friends"],
    enabled: signedIn || isDemo,
    queryFn: async () => {
      const { data, error } = await fetchClient.GET("/v1/friends");
      if (error || !data) throw new Error(t("friends.loadError"));
      return data;
    },
  });
  const inviteQuery = useQuery({
    queryKey: ["friend-invite"],
    enabled: signedIn || isDemo,
    queryFn: async () => {
      const { data, error } = await fetchClient.GET("/v1/friends/invite");
      if (error || !data) throw new Error(t("friends.loadError"));
      return data;
    },
  });
  const issue = useMutation({
    mutationFn: async (rotate: boolean) => {
      const result = rotate
        ? await fetchClient.POST("/v1/friends/invite/rotate")
        : await fetchClient.POST("/v1/friends/invite");
      if (result.error || !result.data) throw new Error(t("friends.loadError"));
      return result.data;
    },
    onSuccess: async (issued) => {
      setToken(issued.token);
      setPath(issued.path);
      setCopied(false);
      await queryClient.invalidateQueries({ queryKey: ["friend-invite"] });
    },
  });

  useEffect(() => {
    if (!inviteQuery.data || inviteQuery.data.active || token || inviteStarted.current) return;
    inviteStarted.current = true;
    issue.mutate(false);
  }, [inviteQuery.data, issue, token]);

  const tags = useMutation({
    mutationFn: async (input: { userId: string; next: string[] }) => {
      const { data, error } = await fetchClient.PUT("/v1/friends/{userId}/tags", {
        params: { path: { userId: input.userId } },
        body: { tags: normalizeFriendTags(input.next) },
      });
      if (error || !data) throw new Error(t("friends.loadError"));
      return data;
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["friends"] }); },
  });
  const remove = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await fetchClient.DELETE("/v1/friends/{userId}", { params: { path: { userId } } });
      if (error) throw new Error(t("friends.loadError"));
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["friends"] }); },
  });

  const origin = typeof window === "undefined" ? "" : window.location.origin + (process.env.EXPO_BASE_URL ?? "");
  const link = token && path ? friendInviteUrl(origin, path) : null;

  async function copy() {
    if (!link) return;
    const clipboard = globalThis.navigator?.clipboard;
    if (!clipboard) return;
    await clipboard.writeText(link);
    setCopied(true);
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t("tabs.friends")}</Text>
        {!signedIn && !isDemo ? (
          <View style={styles.message}>
            <Text style={styles.body}>{t("friends.signIn")}</Text>
            <GradientButton label={t("auth.goToSignIn")} onPress={() => router.push("/(tabs)/profile")} />
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t("friends.inviteTitle")}</Text>
              <Text style={styles.body}>{t("friends.inviteHelp")}</Text>
              {link ? <Text selectable style={styles.link}>{link}</Text> : <Text style={styles.body}>{t("friends.activeHidden")}</Text>}
              <View style={styles.actions}>
                {link ? <GradientButton label={copied ? t("friends.copied") : t("friends.copy")} onPress={() => void copy()} /> : null}
                <Pressable accessibilityRole="button" onPress={() => issue.mutate(true)} style={styles.secondary}>
                  <Text style={styles.secondaryText}>{t("friends.rotate")}</Text>
                </Pressable>
              </View>
            </View>
            <Text style={styles.note}>{t("friends.privateTags")}</Text>
            {friendsQuery.isError ? <Text style={styles.body}>{t("friends.loadError")}</Text> : null}
            {friendsQuery.data?.length === 0 ? <Text style={styles.body}>{t("friends.emptyList")}</Text> : null}
            {friendsQuery.data?.map((friend) => (
              <View key={friend.userId} style={styles.card}>
                <View style={styles.heading}>
                  <Text style={styles.name}>{friend.displayName || t("friends.unnamed")}</Text>
                  <Pressable accessibilityRole="button" onPress={() => remove.mutate(friend.userId)}>
                    <Text style={styles.remove}>{t("friends.remove")}</Text>
                  </Pressable>
                </View>
                <View style={styles.chips}>
                  {friend.tags.map((tag) => <Chip key={tag} label={tag} />)}
                </View>
                <View style={styles.addRow}>
                  <TextInput
                    value={drafts[friend.userId] ?? ""}
                    onChangeText={(value) => setDrafts((current) => ({ ...current, [friend.userId]: value }))}
                    placeholder={t("friends.tagPlaceholder")}
                    placeholderTextColor={theme.muted}
                    style={styles.input}
                    maxLength={30}
                  />
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      const draft = drafts[friend.userId] ?? "";
                      tags.mutate({ userId: friend.userId, next: [...friend.tags, draft] });
                      setDrafts((current) => ({ ...current, [friend.userId]: "" }));
                    }}
                    style={styles.secondary}
                  >
                    <Text style={styles.secondaryText}>{t("friends.addTag")}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.page },
  content: { padding: 20, paddingBottom: 120, gap: 14, width: "100%", maxWidth: 760, alignSelf: "center" },
  title: { color: theme.brand, fontSize: 32, fontWeight: "800" },
  card: { backgroundColor: theme.card, borderRadius: 18, padding: 16, gap: 10, ...theme.shadow },
  cardTitle: { color: theme.ink, fontSize: 18, fontWeight: "800" },
  body: { color: theme.muted, fontSize: 14, lineHeight: 20 },
  link: { color: theme.ink, fontSize: 14 },
  actions: { flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" },
  secondary: { borderRadius: 12, backgroundColor: theme.chip, paddingHorizontal: 14, paddingVertical: 10 },
  secondaryText: { color: theme.brand, fontWeight: "700" },
  note: { color: theme.muted, fontSize: 13 },
  heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  name: { color: theme.ink, fontSize: 18, fontWeight: "800", flex: 1 },
  remove: { color: theme.danger, fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  addRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: { flex: 1, minHeight: 40, borderRadius: 12, backgroundColor: theme.page, paddingHorizontal: 12, color: theme.ink },
  message: { paddingVertical: 24, gap: 12, alignItems: "center" },
});
