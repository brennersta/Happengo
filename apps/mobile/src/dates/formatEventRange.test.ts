import i18n from "@/i18n";
import { formatEventRange } from "./formatEventRange";

const startAt = "2026-11-16T08:43:00.000Z";
const endAt = "2026-11-16T12:43:00.000Z";
const now = new Date("2026-11-16T09:00:00.000Z");

test("lets the locale choose the hour cycle", async () => {
  await i18n.changeLanguage("en");
  expect(
    formatEventRange({
      startAt,
      endAt,
      timeZoneId: "Europe/Tallinn",
      locale: "en",
      todayLabel: i18n.t("dates.today"),
      now,
      viewerTimeZone: "Europe/Tallinn",
    }),
  ).toBe("Today · Mon, Nov 16 · 10:43 AM\u201302:43 PM");

  await i18n.changeLanguage("pt-BR");
  expect(
    formatEventRange({
      startAt,
      endAt,
      timeZoneId: "Europe/Tallinn",
      locale: "pt-BR",
      todayLabel: i18n.t("dates.today"),
      now,
      viewerTimeZone: "Europe/Tallinn",
    }),
  ).toBe("Hoje · seg, 16 nov · 10:43\u201314:43");
});

test("omits Today when the event is on another day in its zone", () => {
  expect(
    formatEventRange({
      startAt,
      endAt,
      timeZoneId: "Europe/Tallinn",
      locale: "en",
      todayLabel: "Today",
      now: new Date("2026-11-15T09:00:00.000Z"),
      viewerTimeZone: "Europe/Tallinn",
    }),
  ).toBe("Mon, Nov 16 · 10:43 AM\u201302:43 PM");
});

test("appends the viewer zone when it differs from the event zone", () => {
  expect(
    formatEventRange({
      startAt,
      endAt,
      timeZoneId: "Europe/Tallinn",
      locale: "en",
      todayLabel: "Today",
      now,
      viewerTimeZone: "America/Sao_Paulo",
    }),
  ).toBe("Today · Mon, Nov 16 · 10:43 AM\u201302:43 PM (05:43 AM\u201309:43 AM GMT-3)");

  expect(
    formatEventRange({
      startAt,
      endAt,
      timeZoneId: "Europe/Tallinn",
      locale: "pt-BR",
      todayLabel: "Hoje",
      now,
      viewerTimeZone: "America/Sao_Paulo",
    }),
  ).toBe("Hoje · seg, 16 nov · 10:43\u201314:43 (05:43\u201309:43 BRT)");
});

test("keeps a multi-day span on both dates", () => {
  expect(
    formatEventRange({
      startAt: "2026-11-16T20:00:00.000Z",
      endAt: "2026-11-18T12:00:00.000Z",
      timeZoneId: "Europe/Tallinn",
      locale: "en",
      todayLabel: "Today",
      now,
      viewerTimeZone: "Europe/Tallinn",
    }),
  ).toBe("Today · Mon, Nov 16 · 10:00 PM \u2013 Wed, Nov 18 · 02:00 PM");
});
