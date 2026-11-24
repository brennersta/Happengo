import { defaultLocalSlot, eventDateTimeFields, localDateTimeToIso, validateCreateEventForm, type CreateEventFormValues } from "./createEventForm";

const now = new Date("2026-11-17T10:00:00.000Z");
const start = new Date(now.getTime() + 60 * 60_000);
const end = new Date(now.getTime() + 3 * 60 * 60_000);

function formValues(): CreateEventFormValues {
  const timeZoneId = "Europe/Tallinn";
  const startParts = eventDateTimeFields(start.toISOString(), timeZoneId)!;
  const endParts = eventDateTimeFields(end.toISOString(), timeZoneId)!;
  return {
    title: "Dinner",
    description: "With family",
    startDate: startParts.date,
    startTime: startParts.time,
    endDate: endParts.date,
    endTime: endParts.time,
    timeZoneId,
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

test("keeps tag selection order and requires at least one tag", () => {
  const ordered = validateCreateEventForm({ ...formValues(), tags: ["Nightlife", "Music", "Food"] }, now);
  expect(ordered.ok).toBe(true);
  if (!ordered.ok) throw new Error("Expected a valid event form.");
  expect(ordered.request.tags).toEqual(["Nightlife", "Music", "Food"]);
  expect(validateCreateEventForm({ ...formValues(), tags: [] }, now)).toEqual({ ok: false, error: "tags" });
});

test("default slots are future local times on the hour", () => {
  const slots = defaultLocalSlot(1, new Date(2026, 10, 17, 10, 42));
  expect(slots).toEqual({ date: "2026-11-17", time: "11:00" });
});

test("converts and displays local date-times in the selected event timezone", () => {
  const instant = localDateTimeToIso("2026-11-17", "13:00", "Europe/Tallinn");
  expect(instant).toBe("2026-11-17T11:00:00.000Z");
  expect(eventDateTimeFields(instant!, "Europe/Tallinn")).toEqual({ date: "2026-11-17", time: "13:00" });
});

test("rejects local times in a daylight-saving gap", () => {
  expect(localDateTimeToIso("2026-03-29", "03:30", "Europe/Tallinn")).toBeNull();
});
