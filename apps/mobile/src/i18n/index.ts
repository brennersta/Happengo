import * as Localization from "expo-localization";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import i18n from "i18next";
import ICU from "i18next-icu";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import ptBR from "./locales/pt-BR.json";

export const locales = ["en", "pt-BR"] as const;
export type AppLocale = (typeof locales)[number];
const localeStorageKey = "happengo.locale";

export function resolveLocale(languageTag: string | null | undefined): AppLocale {
  if (!languageTag) return "en";
  const tag = languageTag.replaceAll("_", "-").toLowerCase();
  if (tag === "pt-br") return "pt-BR";
  if (tag === "en" || tag.startsWith("en-")) return "en";
  return "en";
}

function deviceLanguageTag(): string | undefined {
  try {
    return Localization.getLocales()[0]?.languageTag;
  } catch {
    return undefined;
  }
}

export const i18nReady = !i18n.isInitialized ? (() => {
  // The instance method, not i18next's named `use` export.
  // eslint-disable-next-line import/no-named-as-default-member
  return i18n.use(ICU).use(initReactI18next).init({
    resources: {
      en: { translation: en },
      "pt-BR": { translation: ptBR },
    },
    lng: resolveLocale(deviceLanguageTag()),
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
})() : Promise.resolve();

export async function readSavedLocale(): Promise<AppLocale | null> {
  try {
    const value = Platform.OS === "web"
      ? globalThis.localStorage?.getItem(localeStorageKey) ?? null
      : await SecureStore.getItemAsync(localeStorageKey);
    return value && locales.includes(value as AppLocale) ? value as AppLocale : null;
  } catch {
    return null;
  }
}

export async function saveLocale(locale: AppLocale): Promise<void> {
  if (!locales.includes(locale)) return;
  if (Platform.OS === "web") {
    globalThis.localStorage?.setItem(localeStorageKey, locale);
    return;
  }
  await SecureStore.setItemAsync(localeStorageKey, locale);
}

export default i18n;
