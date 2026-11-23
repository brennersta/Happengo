import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { auth } from "@/auth";
import { SignInButton } from "@/auth/SignInButton";

export default function ProfileScreen() {
  const { t } = useTranslation();
  const [signedIn, setSignedIn] = useState(false);
  const [checking, setChecking] = useState(true);
  const checkSession = useCallback(() => {
    let active = true;
    void auth.getAccessToken().then((token) => {
      if (!active) return;
      setSignedIn(Boolean(token));
      setChecking(false);
    }).catch(() => {
      if (active) setChecking(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => checkSession(), [checkSession]);
  const onSignedIn = useCallback(() => setSignedIn(true), []);
  async function signOut() {
    await auth.signOut();
    setSignedIn(false);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>{t("tabs.profile")}</Text>
        <Text style={styles.body}>{t(signedIn ? "auth.signedIn" : "auth.intro")}</Text>
        {checking ? null : signedIn ? (
          <Pressable accessibilityRole="button" onPress={() => void signOut()} style={styles.signOutButton}>
            <Text style={styles.signOutText}>{t("auth.signOut")}</Text>
          </Pressable>
        ) : <SignInButton onSignedIn={onSignedIn} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#f7f7fb" },
  card: { width: "100%", maxWidth: 460, gap: 10, borderRadius: 18, backgroundColor: "white", padding: 22, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  title: { color: "#202038", fontSize: 23, fontWeight: "700" },
  body: { color: "#69697d", fontSize: 15, lineHeight: 22 },
  signOutButton: { minHeight: 44, justifyContent: "center", alignItems: "center", borderRadius: 10, backgroundColor: "#eeeeff", marginTop: 6 },
  signOutText: { color: "#3730a3", fontWeight: "700" },
});
