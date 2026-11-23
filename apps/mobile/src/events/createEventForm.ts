import type { components } from "@happengo/api-client";
import type { LngLat } from "@/map/types";
import type { EventTag } from "@/map/markerStyle";

export type CreateEventFormValues = {
  title: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  timeZoneId: string;
  address: string;
  location: LngLat;
  visibility: components["schemas"]["EventVisibility"];
  approvalMode: components["schemas"]["ApprovalMode"];
  tags: EventTag[];
  invitedFriendTags?: string[];
};

export type CreateEventFormResult =
  | { ok: true; request: components["schemas"]["CreateEventRequest"] }
  | { ok: false; error: "title" | "description" | "start" | "end" | "duration" | "timeZone" | "address" | "location" | "tags" };

export function validateCreateEventForm(
  values: CreateEventFormValues,
  now = new Date(),
): CreateEventFormResult {
  const title = values.title.trim();
  const description = values.description.trim();
  const address = values.address.trim();
  if (!title || title.length > 200) return { ok: false, error: "title" };
  if (description.length > 4000) return { ok: false, error: "description" };
  if (!isValidTimeZone(values.timeZoneId)) return { ok: false, error: "timeZone" };
  if (!address || address.length > 500) return { ok: false, error: "address" };
  if (values.tags.length === 0) return { ok: false, error: "tags" };
  if (!Number.isFinite(values.location.longitude) || values.location.longitude < -180 || values.location.longitude > 180
    || !Number.isFinite(values.location.latitude) || values.location.latitude < -90 || values.location.latitude > 90) {
    return { ok: false, error: "location" };
  }

  const startAt = localDateTimeToIso(values.startDate, values.startTime);
  const endAt = localDateTimeToIso(values.endDate, values.endTime);
  if (!startAt || Date.parse(startAt) < now.getTime()) return { ok: false, error: "start" };
  if (!endAt || Date.parse(endAt) <= now.getTime() || Date.parse(endAt) <= Date.parse(startAt)) {
    return { ok: false, error: "end" };
  }
  if (Date.parse(endAt) - Date.parse(startAt) > 7 * 24 * 60 * 60 * 1000) {
    return { ok: false, error: "duration" };
  }

  return {
    ok: true,
    request: {
      title,
      description: description || null,
      startAt,
      endAt,
      timeZoneId: values.timeZoneId,
      address,
      longitude: values.location.longitude,
      latitude: values.location.latitude,
      visibility: values.visibility,
      approvalMode: values.approvalMode,
      tags: values.tags,
      ...(values.visibility === "friends_only"
        ? { invitedFriendTags: values.invitedFriendTags ?? [] }
        : {}),
    },
  };
}

export function localDateTimeToIso(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const value = new Date(year!, month! - 1, day!, hour!, minute!, 0, 0);
  if (
    value.getFullYear() !== year || value.getMonth() !== month! - 1 || value.getDate() !== day
    || value.getHours() !== hour || value.getMinutes() !== minute
  ) return null;
  return value.toISOString();
}

export function defaultLocalSlot(offsetHours: number, now = new Date()): { date: string; time: string } {
  const value = new Date(now);
  value.setMinutes(0, 0, 0);
  value.setHours(value.getHours() + offsetHours);
  const date = `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  const time = `${pad(value.getHours())}:${pad(value.getMinutes())}`;
  return { date, time };
}

export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Tallinn";
  } catch {
    return "Europe/Tallinn";
  }
}

function isValidTimeZone(value: string): boolean {
  if (!value.trim()) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
