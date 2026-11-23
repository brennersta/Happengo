import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useTranslation } from "react-i18next";
import { auth, exchangeAuthorizationCode, loadDiscovery, oidcRequestConfig } from "./oidc";
import { loadOidcConfiguration } from "./oidcConfig";

WebBrowser.maybeCompleteAuthSession();

export function SignInButton({ onSignedIn }: { onSignedIn?: () => void }) {
  const { t } = useTranslation();
  const config = useMemo(() => loadOidcConfiguration(), []);
  const [discovery, setDiscovery] = useState<AuthSession.DiscoveryDocument | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(false);
  const requestConfig = config
    ? oidcRequestConfig(config)
    : {
        clientId: "oidc-not-configured",
        scopes: ["openid"],
        redirectUri: AuthSession.makeRedirectUri({ scheme: "happengo", path: "auth/callback" }),
        usePKCE: true,
        responseType: AuthSession.ResponseType.Code,
      };
  const [request, , promptAsync] = AuthSession.useAuthRequest(requestConfig, discovery);

  useEffect(() => {
    let active = true;
    if (!config) return () => { active = false; };
    void loadDiscovery(config).then((value) => {
      if (active) setDiscovery(value);
    }).catch(() => {
      if (active) setLoadError(true);
    });
    return () => { active = false; };
  }, [config]);

  const unavailable = !config || loadError;
  const disabled = unavailable || !discovery || !request || processing;
  return (
    <>
      {unavailable ? <Text style={styles.muted}>{t(config ? "auth.discoveryError" : "auth.notConfigured")}</Text> : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{t("auth.signInError")}</Text> : null}
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => {
          setError(false);
          setProcessing(true);
          void promptAsync().then(async (result) => {
            if (result.type === "error") {
              setError(true);
              return;
            }
            if (result.type !== "success" || !request?.codeVerifier || !config) return;
            const code = result.params.code;
            if (!code) {
              setError(true);
              return;
            }
            const tokens = await exchangeAuthorizationCode(code, request.codeVerifier, request.redirectUri, config);
            await auth.establishSession(tokens);
            onSignedIn?.();
          }).catch(() => setError(true)).finally(() => setProcessing(false));
        }}
        style={[styles.button, disabled && styles.disabled]}
      >
        {processing ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>{t("auth.signIn")}</Text>}
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  muted: { color: "#69697d", fontSize: 14, lineHeight: 20 },
  error: { color: "#a33333", fontSize: 13, lineHeight: 18 },
  button: { minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: "#5b5bd6", paddingHorizontal: 16, marginTop: 8 },
  buttonText: { color: "white", fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.5 },
});
