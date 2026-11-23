import { isDemoBuild, mocksEnabled } from "./config";

test("a normal production build does not mock, on web or native", () => {
  expect(mocksEnabled({}, false, "web")).toBe(false);
  expect(mocksEnabled({}, false, "native")).toBe(false);
  expect(mocksEnabled({ EXPO_PUBLIC_API_MOCK: "true" }, false, "native")).toBe(false);
});

test("the demo flag enables mocks only for the web export", () => {
  const env = { EXPO_PUBLIC_DEMO_MODE: "true" };
  expect(isDemoBuild(env)).toBe(true);
  expect(mocksEnabled(env, false, "web")).toBe(true);
  expect(mocksEnabled(env, false, "native")).toBe(false);
});

test("local dev mocks unless the API mock flag is false", () => {
  expect(mocksEnabled({}, true, "native")).toBe(true);
  expect(mocksEnabled({ EXPO_PUBLIC_API_MOCK: "false" }, true, "web")).toBe(false);
});
