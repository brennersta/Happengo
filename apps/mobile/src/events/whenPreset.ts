export const DURATION_PRESETS = [30, 60, 120, 240] as const;

export type LocalSlot = { date: string; time: string };

export function formatLocalSlot(value: Date): LocalSlot {
  const date = `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  const time = `${pad(value.getHours())}:${pad(value.getMinutes())}`;
  return { date, time };
}

/** One minute ahead, so "start now" still satisfies the future-start rule. */
export function startNowSlot(now = new Date()): LocalSlot {
  const value = new Date(now.getTime() + 60_000);
  value.setSeconds(0, 0);
  return formatLocalSlot(value);
}

export function addMinutes(slot: LocalSlot, minutes: number): LocalSlot | null {
  const start = parseLocal(slot);
  if (!start || !Number.isInteger(minutes) || minutes <= 0) return null;
  return formatLocalSlot(new Date(start.getTime() + minutes * 60_000));
}

function parseLocal(slot: LocalSlot): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(slot.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.time)) return null;
  const [year, month, day] = slot.date.split("-").map(Number);
  const [hour, minute] = slot.time.split(":").map(Number);
  const value = new Date(year!, month! - 1, day!, hour!, minute!, 0, 0);
  if (value.getFullYear() !== year || value.getMonth() !== month! - 1 || value.getDate() !== day) return null;
  return value;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
