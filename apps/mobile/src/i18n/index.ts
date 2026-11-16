import * as Localization from "expo-localization";
import i18n from "i18next";
import ICU from "i18next-icu";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import ptBR from "./locales/pt-BR.json";

export const locales = ["en", "pt-BR"] as const;
export type AppLocale = (typeof locales)[number];

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

if (!i18n.isInitialized) {
  // The instance method, not i18next's named `use` export.
  // eslint-disable-next-line import/no-named-as-default-member
  void i18n.use(ICU).use(initReactI18next).init({
    resources: {
      en: { translation: en },
      "pt-BR": { translation: ptBR },
    },
    lng: resolveLocale(deviceLanguageTag()),
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
}

export default i18n;
