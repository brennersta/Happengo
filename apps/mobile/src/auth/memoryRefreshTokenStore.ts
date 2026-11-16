export interface RefreshTokenStore {
  get(): Promise<string | null>;
  set(token: string): Promise<void>;
  clear(): Promise<void>;
}

export function createMemoryRefreshTokenStore(): RefreshTokenStore {
  let token: string | null = null;
  return {
    async get() {
      return token;
    },
    async set(value) {
      token = value;
    },
    async clear() {
      token = null;
    },
  };
}

export const memoryRefreshTokenStore = createMemoryRefreshTokenStore();
