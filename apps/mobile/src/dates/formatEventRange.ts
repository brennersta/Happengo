const EN_DASH = "\u2013";

export type FormatEventRangeInput = {
  startAt: string;
  endAt: string;
  timeZoneId: string;
  locale: string;
  todayLabel: string;
  now?: Date;
  viewerTimeZone?: string;
};

/**
 * Renders an event's start and end in the event's IANA zone.
 * The clock is 24-hour for every locale. Month and weekday still follow the locale.
 * When the viewer's zone differs, their clock and short zone name are appended.
 */
export function formatEventRange(input: FormatEventRangeInput): string {
  const start = new Date(input.startAt);
  const end = new Date(input.endAt);
  const now = input.now ?? new Date();
  const viewerTimeZone =
    input.viewerTimeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const startDay = formatDay(start, input.locale, input.timeZoneId);
  const isToday = calendarDay(start, input.timeZoneId) === calendarDay(now, input.timeZoneId);
  const dayLabel = isToday ? `${input.todayLabel} · ${startDay}` : startDay;
  const sameDay = calendarDay(start, input.timeZoneId) === calendarDay(end, input.timeZoneId);
  const clock = sameDay
    ? `${formatClock(start, input.locale, input.timeZoneId)}${EN_DASH}${formatClock(end, input.locale, input.timeZoneId)}`
    : `${formatClock(start, input.locale, input.timeZoneId)} ${EN_DASH} ${formatDay(end, input.locale, input.timeZoneId)} · ${formatClock(end, input.locale, input.timeZoneId)}`;
  return `${dayLabel} · ${clock}${viewerSuffix(start, end, input.locale, input.timeZoneId, viewerTimeZone)}`;
}

function viewerSuffix(
  start: Date,
  end: Date,
  locale: string,
  eventZone: string,
  viewerZone: string,
): string {
  if (eventZone.trim() === viewerZone.trim()) return "";
  const startClock = formatClock(start, locale, viewerZone);
  const endClock = formatClock(end, locale, viewerZone);
  return ` (${startClock}${EN_DASH}${endClock} ${zoneName(start, locale, viewerZone)})`;
}

function formatDay(date: Date, locale: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone,
  }).formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday");
  const rest = parts.filter((part) => part.type === "day" || part.type === "month");
  if (!weekday || rest.length === 0) {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone }).format(date);
  }
  return `${stripPeriod(weekday.value)}, ${rest.map((part) => stripPeriod(part.value)).join(" ")}`;
}

function formatClock(date: Date, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  })
    .format(date)
    .replace(/[\u202f\u00a0]/g, "");
}

function zoneName(date: Date, locale: string, timeZone: string): string {
  const name = new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "short",
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName");
  return name?.value ?? timeZone;
}

function calendarDay(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function stripPeriod(value: string): string {
  return value.endsWith(".") ? value.slice(0, -1) : value;
}
