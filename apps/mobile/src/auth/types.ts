/**
 * Provisional auth seam. No identity provider is wired.
 *
 * Planned flow (ADR 0005): OIDC authorization code with PKCE, a short-lived
 * bearer access token, and a refresh token stored in expo-secure-store on
 * native. On web the refresh token stays in memory and is never written to
 * localStorage. Where the web client keeps it durably is still open.
 */
export type AuthTokens = {
  accessToken: string;
  refreshToken: string | null;
  expiresAtEpochMs: number;
};

export interface AuthClient {
  getAccessToken(): Promise<string | null>;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
}
