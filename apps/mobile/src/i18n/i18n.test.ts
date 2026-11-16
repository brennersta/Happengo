import i18n, { resolveLocale } from "./index";
import { messageKeys } from "./catalog";
import en from "./locales/en.json";
import ptBR from "./locales/pt-BR.json";

test("device locale maps to en or pt-BR, otherwise English", () => {
  expect(resolveLocale("pt-BR")).toBe("pt-BR");
  expect(resolveLocale("pt_BR")).toBe("pt-BR");
  expect(resolveLocale("pt-br")).toBe("pt-BR");
  expect(resolveLocale("en-US")).toBe("en");
  expect(resolveLocale("en")).toBe("en");
  expect(resolveLocale("pt")).toBe("en");
  expect(resolveLocale("fr-FR")).toBe("en");
  expect(resolveLocale(undefined)).toBe("en");
});

test("EN and pt-BR catalogs have the same keys", () => {
  expect(messageKeys(ptBR).sort()).toEqual(messageKeys(en).sort());
});

test("tab labels and empty states are translated", async () => {
  await i18n.changeLanguage("en");
  expect(i18n.t("tabs.discover")).toBe("Discover");
  expect(i18n.t("tabs.myEvents")).toBe("My Events");
  expect(i18n.t("tabs.friends")).toBe("Friends");
  expect(i18n.t("tabs.profile")).toBe("Profile");
  expect(i18n.t("myEvents.empty")).toBe("Events you attend or create will appear here.");
  expect(i18n.t("friends.empty")).toBe(
    "Invite friends to create private events and share photos.",
  );

  await i18n.changeLanguage("pt-BR");
  expect(i18n.t("tabs.discover")).toBe("Descobrir");
  expect(i18n.t("tabs.myEvents")).toBe("Meus Eventos");
  expect(i18n.t("tabs.friends")).toBe("Amigos");
  expect(i18n.t("tabs.profile")).toBe("Perfil");
  expect(i18n.t("dates.today")).toBe("Hoje");
});

test("ICU plurals are available for later copy", async () => {
  await i18n.changeLanguage("en");
  i18n.addResource("en", "translation", "dev.icu", "{count, plural, one {# event} other {# events}}");
  expect(i18n.t("dev.icu", { count: 1 })).toBe("1 event");
  expect(i18n.t("dev.icu", { count: 2 })).toBe("2 events");
});
