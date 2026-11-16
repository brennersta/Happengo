export function mocksEnabled(): boolean {
  return __DEV__ && process.env.EXPO_PUBLIC_API_MOCK !== "false";
}
