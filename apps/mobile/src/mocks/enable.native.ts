import { enableFetchMocks } from "./fetchMock";

/**
 * MSW has no React Native entry. A dev build patches fetch with the same
 * in-memory routes the web demo uses. Production native builds do not.
 */
export async function enableMocks(): Promise<void> {
  if (!__DEV__) return;
  await enableFetchMocks();
}
