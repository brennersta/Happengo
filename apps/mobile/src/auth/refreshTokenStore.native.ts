import * as SecureStore from "expo-secure-store";
import type { RefreshTokenStore } from "./memoryRefreshTokenStore";

const key = "happengo.refreshToken";

export const refreshTokenStore: RefreshTokenStore = {
  get() {
    return SecureStore.getItemAsync(key);
  },
  set(token) {
    return SecureStore.setItemAsync(key, token);
  },
  async clear() {
    await SecureStore.deleteItemAsync(key);
  },
};
