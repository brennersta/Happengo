/** Dev mocks stay on unless explicitly disabled. A web export enables them only when the flag is exactly "true". */
export function mocksEnabled(): boolean {
  if (process.env.EXPO_PUBLIC_API_MOCK === "true") return true;
  return __DEV__ && process.env.EXPO_PUBLIC_API_MOCK !== "false";
}
