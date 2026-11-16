import "@/api/client";
import "@/i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { mocksEnabled } from "@/mocks/config";
import { enableMocks } from "@/mocks/enable";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const [ready, setReady] = useState(!mocksEnabled());

  useEffect(() => {
    if (!mocksEnabled()) return;
    let active = true;
    const timeout = setTimeout(() => {
      if (active) setReady(true);
    }, 2000);
    enableMocks()
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
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
