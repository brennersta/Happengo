export async function enableMocks(): Promise<void> {
  // The static demo cannot use the MSW worker. Production Metro replaces the
  // `msw` package with an empty module, so `http.get` throws
  // "Cannot read properties of undefined (reading 'get')".
  if (process.env.EXPO_PUBLIC_DEMO_MODE === "true") {
    const { enableFetchMocks } = await import("./fetchMock");
    await enableFetchMocks();
    return;
  }
  if (!__DEV__) return;
  const { setupWorker } = await import("msw/browser");
  const { handlers } = await import("./handlers");
  const worker = setupWorker(...handlers);
  const base = (process.env.EXPO_BASE_URL ?? "").replace(/\/$/, "");
  await worker.start({
    onUnhandledFrame: "bypass",
    quiet: true,
    serviceWorker: { url: `${base}/mockServiceWorker.js` },
  });
}
