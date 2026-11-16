export async function enableMocks(): Promise<void> {
  if (!__DEV__) return;
  const { setupWorker } = await import("msw/browser");
  const { handlers } = await import("./handlers");
  const worker = setupWorker(...handlers);
  await worker.start({
    onUnhandledFrame: "bypass",
    quiet: true,
    serviceWorker: { url: "/mockServiceWorker.js" },
  });
}
