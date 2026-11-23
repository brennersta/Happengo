import "@/api/client";
import "@/i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { auth } from "@/auth";
import { isDemoBuild, mocksEnabled } from "@/mocks/config";
import { enableMocks } from "@/mocks/enable";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { t } = useTranslation();
  const [queryClient] = useState(() => new QueryClient());
  const [ready, setReady] = useState(!mocksEnabled());
  const demo = mocksEnabled();

  useEffect(() => {
    if (!mocksEnabled()) return;
    let active = true;
    const timeout = setTimeout(() => {
      if (active) setReady(true);
    }, 2000);
    enableMocks()
      .then(async () => {
        if (!isDemoBuild()) return;
        await auth.establishSession({
          accessToken: "demo-session",
          refreshToken: null,
          expiresAtEpochMs: Date.now() + 24 * 60 * 60 * 1000,
        });
      })
      .catch((error: unknown) => {
        console.warn("API mocks did not start.", error);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <View style={styles.root}>
        {demo ? <Text accessibilityRole="text" style={styles.demoBanner}>{t("demo.notice")}</Text> : null}
        <View style={styles.stack}>
          <Stack screenOptions={{ headerShown: false }} />
        </View>
      </View>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  stack: { flex: 1 },
  demoBanner: {
    backgroundColor: "#fff4d6",
    color: "#624314",
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: "center",
  },
});
