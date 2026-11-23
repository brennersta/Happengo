import { displayAddress } from "./displayAddress";

test("displayAddress never returns a raw coordinate pair", () => {
  expect(displayAddress("59.43700, 24.75360")).toBeNull();
  expect(displayAddress("-16.07000, -43.85000")).toBeNull();
  expect(displayAddress("  59.4,24.7 ")).toBeNull();
  expect(displayAddress("")).toBeNull();
  expect(displayAddress(null)).toBeNull();
  expect(displayAddress(undefined)).toBeNull();
  expect(displayAddress("Tallinn, Estonia")).toBe("Tallinn, Estonia");
  expect(displayAddress("Near 59.4, 24.7, Tallinn")).toBe("Near 59.4, 24.7, Tallinn");
});
