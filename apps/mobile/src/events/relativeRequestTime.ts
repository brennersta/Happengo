export function formatRelativeRequestTime(
  requestedAt: string,
  locale: string,
  now = Date.now(),
): string {
  const elapsedSeconds = Math.max(0, Math.floor((now - new Date(requestedAt).getTime()) / 1000));
  let value: number;
  let unit: Intl.RelativeTimeFormatUnit;

  if (elapsedSeconds < 60) {
    value = elapsedSeconds;
    unit = "second";
  } else if (elapsedSeconds < 60 * 60) {
    value = Math.floor(elapsedSeconds / 60);
    unit = "minute";
  } else if (elapsedSeconds < 24 * 60 * 60) {
    value = Math.floor(elapsedSeconds / (60 * 60));
    unit = "hour";
  } else {
    value = Math.floor(elapsedSeconds / (24 * 60 * 60));
    unit = "day";
  }

  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(-value, unit);
}
