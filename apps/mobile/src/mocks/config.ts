export function mocksEnabled(): boolean {
  return process.env.EXPO_PUBLIC_API_MOCK !== "false";
}
