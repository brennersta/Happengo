import { addMinutes, startNowSlot } from "./whenPreset";
import { validateCreateEventForm } from "./createEventForm";

test("start now plus a preset duration stays inside the existing seven-day rule", () => {
  const now = new Date("2026-11-23T10:00:00");
  const start = startNowSlot(now);
  const end = addMinutes(start, 60);
  expect(end).not.toBeNull();
  const result = validateCreateEventForm({
    title: "Choir",
    description: "",
    startDate: start.date,
    startTime: start.time,
    endDate: end!.date,
    endTime: end!.time,
    timeZoneId: "Europe/Tallinn",
    address: "Tallinn, Estonia",
    location: { longitude: 24.75, latitude: 59.43 },
    visibility: "public",
    approvalMode: "open",
    tags: ["Music"],
  }, now);
  expect(result.ok).toBe(true);
});
