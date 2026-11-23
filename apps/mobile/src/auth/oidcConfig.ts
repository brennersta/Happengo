import { Platform } from "react-native";

export type OidcConfiguration = {
  issuer: string;
  clientId: string;
  scopes: string[];
  extraParams: Record<string, string>;
};

export function loadOidcConfiguration(
  env: Record<string, string | undefined> = process.env,
  platform: "native" | "web" = Platform.OS === "web" ? "web" : "native",
): OidcConfiguration | null {
  const issuer = env.EXPO_PUBLIC_OIDC_ISSUER?.trim();
  const clientId = (platform === "web" ? env.EXPO_PUBLIC_OIDC_CLIENT_ID_WEB?.trim() : undefined)
    || env.EXPO_PUBLIC_OIDC_CLIENT_ID?.trim();
  const apiScope = env.EXPO_PUBLIC_OIDC_API_SCOPE?.trim();
  const audience = env.EXPO_PUBLIC_OIDC_API_AUDIENCE?.trim();
  if (!issuer || !clientId || !audience || !isValidIssuer(issuer)) return null;

  const scopes = ["openid", "profile", "email", "offline_access", ...(apiScope?.split(/\s+/) ?? [])];
  const extraParams: Record<string, string> = {};
  if (audience) extraParams.audience = audience;
  return { issuer, clientId, scopes: [...new Set(scopes)], extraParams };
}

function isValidIssuer(issuer: string): boolean {
  try {
    const url = new URL(issuer);
    const localHttp = url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    return (url.protocol === "https:" || localHttp) && !url.search && !url.hash;
  } catch {
    return false;
  }
}

