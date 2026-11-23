import type { AuthTokens } from "./types";
import type { RefreshTokenStore } from "./memoryRefreshTokenStore";

export function createTokenManager(options: {
  store: RefreshTokenStore;
  refresh: (refreshToken: string) => Promise<AuthTokens>;
  now?: () => number;
  refreshSkewMs?: number;
}) {
  const now = options.now ?? Date.now;
  const refreshSkewMs = options.refreshSkewMs ?? 60_000;
  let activeTokens: AuthTokens | null = null;
  let refreshing: Promise<string | null> | null = null;
  let generation = 0;

  return {
    async establishSession(tokens: AuthTokens): Promise<void> {
      generation += 1;
      if (tokens.refreshToken) await options.store.set(tokens.refreshToken);
      else await options.store.clear();
      activeTokens = tokens;
    },

    async getAccessToken(): Promise<string | null> {
      if (activeTokens && activeTokens.expiresAtEpochMs > now() + refreshSkewMs) {
        return activeTokens.accessToken;
      }
      if (refreshing) return refreshing;

      const currentGeneration = generation;
      const pending = (async () => {
        const refreshToken = activeTokens?.refreshToken ?? await options.store.get();
        if (!refreshToken) return null;
        try {
          const refreshed = await options.refresh(refreshToken);
          if (generation !== currentGeneration) return null;
          const nextTokens = { ...refreshed, refreshToken: refreshed.refreshToken ?? refreshToken };
          await options.store.set(nextTokens.refreshToken!);
          activeTokens = nextTokens;
          return nextTokens.accessToken;
        } catch {
          return null;
        }
      })();
      refreshing = pending;
      try {
        return await pending;
      } finally {
        if (refreshing === pending) refreshing = null;
      }
    },

    async signOut(): Promise<void> {
      generation += 1;
      activeTokens = null;
      await options.store.clear();
    },
  };
}
