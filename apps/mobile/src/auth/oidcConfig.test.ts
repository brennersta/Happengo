import { loadOidcConfiguration } from "./oidcConfig";

test("requires issuer, client id and API audience", () => {
  expect(loadOidcConfiguration({})).toBeNull();
  expect(loadOidcConfiguration({
    EXPO_PUBLIC_OIDC_ISSUER: "https://tenant.example/",
    EXPO_PUBLIC_OIDC_CLIENT_ID: "public-client-id",
  })).toBeNull();
});

test("builds standard OIDC scopes and an Auth0-style API audience", () => {
  const config = loadOidcConfiguration({
    EXPO_PUBLIC_OIDC_ISSUER: "https://tenant.example/",
    EXPO_PUBLIC_OIDC_CLIENT_ID: "public-client-id",
    EXPO_PUBLIC_OIDC_API_AUDIENCE: "https://api.happengo.app",
  });
  expect(config?.scopes).toEqual(["openid", "profile", "email", "offline_access"]);
  expect(config?.extraParams).toEqual({ audience: "https://api.happengo.app" });
});

test("accepts optional provider-defined scopes and only HTTPS issuers outside localhost", () => {
  expect(loadOidcConfiguration({
    EXPO_PUBLIC_OIDC_ISSUER: "https://tenant.example/",
    EXPO_PUBLIC_OIDC_CLIENT_ID: "public-client-id",
    EXPO_PUBLIC_OIDC_API_AUDIENCE: "https://api.happengo.app",
    EXPO_PUBLIC_OIDC_API_SCOPE: "api://happengo/access_as_user",
  })?.scopes).toContain("api://happengo/access_as_user");
  expect(loadOidcConfiguration({
    EXPO_PUBLIC_OIDC_ISSUER: "http://tenant.example/",
    EXPO_PUBLIC_OIDC_CLIENT_ID: "public-client-id",
    EXPO_PUBLIC_OIDC_API_AUDIENCE: "https://api.happengo.app",
    EXPO_PUBLIC_OIDC_API_SCOPE: "events.read",
  })).toBeNull();
  expect(loadOidcConfiguration({
    EXPO_PUBLIC_OIDC_ISSUER: "https://tenant.example/",
    EXPO_PUBLIC_OIDC_CLIENT_ID: "public-client-id",
    EXPO_PUBLIC_OIDC_API_SCOPE: "events.read",
  })).toBeNull();
});

test("uses a separate client registration for web when configured", () => {
  const env = {
    EXPO_PUBLIC_OIDC_ISSUER: "https://tenant.example/",
    EXPO_PUBLIC_OIDC_CLIENT_ID: "native-client",
    EXPO_PUBLIC_OIDC_CLIENT_ID_WEB: "web-client",
    EXPO_PUBLIC_OIDC_API_AUDIENCE: "https://api.happengo.app",
  };
  expect(loadOidcConfiguration(env, "native")?.clientId).toBe("native-client");
  expect(loadOidcConfiguration(env, "web")?.clientId).toBe("web-client");
});
