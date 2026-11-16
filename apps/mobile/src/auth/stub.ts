import type { AuthClient } from "./types";

export const auth: AuthClient = {
  async getAccessToken() {
    return null;
  },
  async signIn() {},
  async signOut() {},
};
