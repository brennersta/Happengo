import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { auth } from "@/auth";
import { SignInButton } from "@/auth/SignInButton";
import i18n, { locales, resolveLocale, saveLocale, type AppLocale } from "@/i18n";
import { fetchClient } from "@/api/client";

interface ProfileData { id: string; displayName: string | null }

export default function ProfileScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const session = useQuery({
    queryKey: ["profile-session"],
    queryFn: async () => Boolean(await auth.getAccessToken()),
    staleTime: Infinity,
  });
  const profile = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const response = await fetchClient.GET("/v1/me");
      if (!response.data) throw new Error("profile-load");
      return response.data as ProfileData;
    },
    enabled: session.data === true,
  });
  const [draft, setDraft] = useState<{ id: string; value: string } | null>(null);
  const [languageError, setLanguageError] = useState(false);
  const displayName = profile.data
    ? (draft?.id === profile.data.id ? draft.value : profile.data.displayName ?? "")
    : "";
  const saveName = useMutation({
    mutationFn: async (value: string) => {
      const response = await fetchClient.PUT("/v1/me/display-name", { body: { displayName: value.trim() } });
      if (!response.data) throw new Error("profile-save");
      return response.data as ProfileData;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["my-profile"], updated);
      setDraft(null);
    },
  });

  async function onSignedIn() {
    await queryClient.invalidateQueries({ queryKey: ["profile-session"] });
  }

  async function signOut() {
    await auth.signOut();
    queryClient.setQueryData(["profile-session"], false);
    queryClient.removeQueries({ queryKey: ["my-profile"] });
  }

  async function selectLocale(locale: AppLocale) {
    setLanguageError(false);
    try {
      await saveLocale(locale);
      await i18n.changeLanguage(locale);
    } catch {
      setLanguageError(true);
    }
  }

  const locale = resolveLocale(i18n.resolvedLanguage ?? i18n.language);
  const nameValid = displayName.trim().length > 0 && displayName.trim().length <= 40;
  const nameChanged = Boolean(profile.data && displayName.trim() !== (profile.data.displayName ?? ""));

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>{t("tabs.profile")}</Text>
        {session.isPending ? null : session.data ? (
          <>
            {profile.isPending ? <Text style={styles.body}>{t("profile.loading")}</Text> : profile.isError ? (
              <Text accessibilityRole="alert" style={styles.error}>{t("profile.loadError")}</Text>
            ) : profile.data ? (
              <>
                <Text style={styles.label}>{t("profile.displayName")}</Text>
                <TextInput
                  accessibilityLabel={t("profile.displayName")}
                  maxLength={40}
                  onChangeText={(value) => setDraft({ id: profile.data!.id, value })}
                  placeholder={t("profile.namePlaceholder")}
                  style={styles.input}
                  value={displayName}
                />
                {saveName.isError ? <Text accessibilityRole="alert" style={styles.error}>{t("profile.saveError")}</Text> : null}
                <Pressable
                  accessibilityRole="button"
                  disabled={!nameValid || !nameChanged || saveName.isPending}
                  onPress={() => saveName.mutate(displayName)}
                  style={[styles.actionButton, (!nameValid || !nameChanged || saveName.isPending) && styles.disabled]}
                >
                  <Text style={styles.actionText}>{saveName.isPending ? t("profile.saving") : t("profile.save")}</Text>
                </Pressable>
              </>
            ) : null}
            <Text style={styles.label}>{t("profile.language")}</Text>
            <View style={styles.localeRow}>
              {locales.map((item) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: locale === item }}
                  key={item}
                  onPress={() => void selectLocale(item)}
                  style={[styles.localeButton, locale === item && styles.localeSelected]}
                >
                  <Text style={[styles.localeText, locale === item && styles.localeTextSelected]}>{t(`profile.languages.${item}`)}</Text>
                </Pressable>
              ))}
            </View>
            {languageError ? <Text accessibilityRole="alert" style={styles.error}>{t("profile.languageError")}</Text> : null}
            <Pressable accessibilityRole="button" onPress={() => void signOut()} style={styles.signOutButton}>
              <Text style={styles.signOutText}>{t("auth.signOut")}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.body}>{t("auth.intro")}</Text>
            <SignInButton onSignedIn={() => void onSignedIn()} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#f7f7fb" },
  card: { width: "100%", maxWidth: 460, gap: 10, borderRadius: 18, backgroundColor: "white", padding: 22, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  title: { color: "#202038", fontSize: 23, fontWeight: "700" },
  body: { color: "#69697d", fontSize: 15, lineHeight: 22 },
  label: { color: "#34344b", fontSize: 14, fontWeight: "600", marginTop: 8 },
  input: { minHeight: 46, borderWidth: 1, borderColor: "#d8d8e5", borderRadius: 10, paddingHorizontal: 12, color: "#202038", fontSize: 15 },
  actionButton: { minHeight: 44, justifyContent: "center", alignItems: "center", borderRadius: 10, backgroundColor: "#5b5bd6" },
  actionText: { color: "white", fontWeight: "700" },
  disabled: { opacity: 0.45 },
  localeRow: { flexDirection: "row", gap: 10 },
  localeButton: { flex: 1, minHeight: 44, justifyContent: "center", alignItems: "center", borderRadius: 10, borderWidth: 1, borderColor: "#d8d8e5" },
  localeSelected: { borderColor: "#5b5bd6", backgroundColor: "#eeeeff" },
  localeText: { color: "#55556b", fontWeight: "600" },
  localeTextSelected: { color: "#3730a3" },
  error: { color: "#a33333", fontSize: 13, lineHeight: 18 },
  signOutButton: { minHeight: 44, justifyContent: "center", alignItems: "center", borderRadius: 10, backgroundColor: "#eeeeff", marginTop: 6 },
  signOutText: { color: "#3730a3", fontWeight: "700" },
});
