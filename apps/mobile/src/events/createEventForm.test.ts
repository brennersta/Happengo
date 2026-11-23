import { defaultLocalSlot, localDateTimeToIso, validateCreateEventForm, type CreateEventFormValues } from "./createEventForm";

const now = new Date("2026-11-17T10:00:00.000Z");
const start = new Date(now.getTime() + 60 * 60_000);
const end = new Date(now.getTime() + 3 * 60 * 60_000);

function localParts(value: Date) {
  return {
    date: `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`,
    time: `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`,
  };
}

function formValues(): CreateEventFormValues {
  const startParts = localParts(start);
  const endParts = localParts(end);
  return {
    title: "Dinner",
    description: "With family",
    startDate: startParts.date,
    startTime: startParts.time,
    endDate: endParts.date,
    endTime: endParts.time,
    timeZoneId: "Europe/Tallinn",
    address: "Tallinn",
    location: { longitude: 24.7536, latitude: 59.437 },
    visibility: "public",
    approvalMode: "open",
    tags: ["Food"],
  };
}

test("creates an API request with local times converted to instants", () => {
  const result = validateCreateEventForm(formValues(), now);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Expected a valid event form.");
  expect(result.request.title).toBe("Dinner");
  expect(result.request.startAt).toBe(start.toISOString());
  expect(result.request.endAt).toBe(end.toISOString());
  expect(result.request.timeZoneId).toBe("Europe/Tallinn");
});

test("rejects a missing title and an invalid local calendar date", () => {
  expect(validateCreateEventForm({ ...formValues(), title: " " }, now)).toEqual({ ok: false, error: "title" });
  expect(localDateTimeToIso("2026-02-31", "10:00")).toBeNull();
});

test("rejects invalid time order, duration, timezone, and location", () => {
  const base = formValues();
  expect(validateCreateEventForm({ ...base, endTime: base.startTime }, now)).toEqual({ ok: false, error: "end" });
  expect(validateCreateEventForm({ ...base, endDate: "2026-11-25" }, now)).toEqual({ ok: false, error: "duration" });
  expect(validateCreateEventForm({ ...base, timeZoneId: "Mars/Olympus" }, now)).toEqual({ ok: false, error: "timeZone" });
  expect(validateCreateEventForm({ ...base, location: { longitude: 181, latitude: 59 } }, now)).toEqual({ ok: false, error: "location" });
});

test("default slots are future local times on the hour", () => {
  const slots = defaultLocalSlot(1, new Date(2026, 10, 17, 10, 42));
  expect(slots).toEqual({ date: "2026-11-17", time: "11:00" });
});
