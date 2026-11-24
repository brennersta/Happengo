import { formatRelativeRequestTime } from "./relativeRequestTime";

const now = Date.parse("2026-11-24T12:00:00.000Z");

test("formats the time since a request in English and Brazilian Portuguese", () => {
  const requestedAt = new Date(now - 5 * 60_000).toISOString();
  expect(formatRelativeRequestTime(requestedAt, "en", now)).toBe("5 minutes ago");
  expect(formatRelativeRequestTime(requestedAt, "pt-BR", now)).toBe("há 5 minutos");
});

test("handles future timestamps without saying the request came from the future", () => {
  const requestedAt = new Date(now + 60_000).toISOString();
  expect(formatRelativeRequestTime(requestedAt, "en", now)).toBe("now");
});
