/** Half-open event window from ADR 0003: happening while start <= now < end, ended at end. */
export function isHappeningNow(startAt: string, endAt: string, now: Date): boolean {
  const time = now.getTime();
  return Date.parse(startAt) <= time && time < Date.parse(endAt);
}

export function hasEnded(endAt: string, now: Date): boolean {
  return Date.parse(endAt) <= now.getTime();
}
