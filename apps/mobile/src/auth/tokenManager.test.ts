import { createMemoryRefreshTokenStore } from "./memoryRefreshTokenStore";
import { createTokenManager } from "./tokenManager";

const now = 1_800_000_000_000;

test("returns a fresh access token without refreshing", async () => {
  const refresh = jest.fn();
  const manager = createTokenManager({ store: createMemoryRefreshTokenStore(), refresh, now: () => now });
  await manager.establishSession({ accessToken: "access", refreshToken: "refresh", expiresAtEpochMs: now + 300_000 });

  await expect(manager.getAccessToken()).resolves.toBe("access");
  expect(refresh).not.toHaveBeenCalled();
});

test("refreshes an expired access token and persists a rotated refresh token", async () => {
  const store = createMemoryRefreshTokenStore();
  await store.set("refresh-old");
  const manager = createTokenManager({
    store,
    refresh: async (token) => {
      expect(token).toBe("refresh-old");
      return { accessToken: "access-new", refreshToken: "refresh-new", expiresAtEpochMs: now + 300_000 };
    },
    now: () => now,
  });

  await expect(manager.getAccessToken()).resolves.toBe("access-new");
  await expect(store.get()).resolves.toBe("refresh-new");
});

test("shares concurrent refresh work", async () => {
  const store = createMemoryRefreshTokenStore();
  await store.set("refresh");
  let signalStarted!: () => void;
  const started = new Promise<void>((resolve) => { signalStarted = resolve; });
  let release!: (tokens: { accessToken: string; refreshToken: string; expiresAtEpochMs: number }) => void;
  const refresh = jest.fn(() => {
    signalStarted();
    return new Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAtEpochMs: number;
    }>((resolve) => { release = resolve; });
  });
  const manager = createTokenManager({ store, refresh, now: () => now });

  const first = manager.getAccessToken();
  const second = manager.getAccessToken();
  await started;
  release({ accessToken: "access", refreshToken: "refresh-next", expiresAtEpochMs: now + 300_000 });

  await expect(Promise.all([first, second])).resolves.toEqual(["access", "access"]);
  expect(refresh).toHaveBeenCalledTimes(1);
});

test("sign out clears memory and persisted tokens", async () => {
  const store = createMemoryRefreshTokenStore();
  const manager = createTokenManager({ store, refresh: jest.fn(), now: () => now });
  await manager.establishSession({ accessToken: "access", refreshToken: "refresh", expiresAtEpochMs: now + 300_000 });

  await manager.signOut();

  await expect(manager.getAccessToken()).resolves.toBeNull();
  await expect(store.get()).resolves.toBeNull();
});
