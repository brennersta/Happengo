import * as AuthSession from "expo-auth-session";
import { Platform } from "react-native";
import { refreshTokenStore } from "./refreshTokenStore";
import { createTokenManager } from "./tokenManager";
import { loadOidcConfiguration, type OidcConfiguration } from "./oidcConfig";
import type { AuthClient, AuthTokens } from "./types";

let discoveryPromise: Promise<AuthSession.DiscoveryDocument> | null = null;

export async function loadDiscovery(config = loadOidcConfiguration()): Promise<AuthSession.DiscoveryDocument> {
  if (!config) throw new Error("OIDC is not configured.");
  if (!discoveryPromise) {
    discoveryPromise = AuthSession.fetchDiscoveryAsync(config.issuer).catch((error: unknown) => {
      discoveryPromise = null;
      throw error;
    });
  }
  return discoveryPromise;
}

export async function exchangeAuthorizationCode(
  code: string,
  codeVerifier: string,
  redirectUri: string,
  config = loadOidcConfiguration(),
): Promise<AuthTokens> {
  if (!config) throw new Error("OIDC is not configured.");
  const discovery = await loadDiscovery(config);
  const response = await AuthSession.exchangeCodeAsync({
    clientId: config.clientId,
    code,
    redirectUri,
    extraParams: { code_verifier: codeVerifier },
  }, discovery);
  return toAuthTokens(response, response.refreshToken ?? null);
}

async function refreshTokens(refreshToken: string, config = loadOidcConfiguration()): Promise<AuthTokens> {
  if (!config) throw new Error("OIDC is not configured.");
  const discovery = await loadDiscovery(config);
  const response = await AuthSession.refreshAsync({
    clientId: config.clientId,
    refreshToken,
    scopes: config.scopes,
    extraParams: config.extraParams,
  }, discovery);
  return toAuthTokens(response, response.refreshToken ?? refreshToken);
}

function toAuthTokens(
  response: AuthSession.TokenResponse,
  refreshToken: string | null,
): AuthTokens {
  return {
    accessToken: response.accessToken,
    refreshToken,
    expiresAtEpochMs: Date.now() + (response.expiresIn ?? 300) * 1000,
  };
}

const manager = createTokenManager({
  store: refreshTokenStore,
  refresh: (token) => refreshTokens(token),
});

export const auth: AuthClient = {
  getAccessToken: manager.getAccessToken,
  establishSession: manager.establishSession,
  signOut: manager.signOut,
};

export function oidcRequestConfig(config: OidcConfiguration) {
  const platform = Platform.OS === "web" ? "web" : "native";
  const redirectUri = platform === "web"
    ? process.env.EXPO_PUBLIC_OIDC_REDIRECT_URI_WEB?.trim()
    : process.env.EXPO_PUBLIC_OIDC_REDIRECT_URI_NATIVE?.trim();
  return {
    clientId: config.clientId,
    scopes: config.scopes,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    redirectUri: redirectUri || process.env.EXPO_PUBLIC_OIDC_REDIRECT_URI?.trim()
      || AuthSession.makeRedirectUri({ scheme: "happengo", path: "auth/callback" }),
    extraParams: config.extraParams,
  };
}
