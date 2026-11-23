import { eventGridColumns } from "./eventGrid";

test("My Events is one column when narrow and three across a wide window", () => {
  expect(eventGridColumns(390)).toBe(1);
  expect(eventGridColumns(719)).toBe(1);
  expect(eventGridColumns(720)).toBe(2);
  expect(eventGridColumns(1079)).toBe(2);
  expect(eventGridColumns(1080)).toBe(3);
  expect(eventGridColumns(1280)).toBe(3);
});
