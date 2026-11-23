import { Platform } from "react-native";

/**
 * The public demo is an explicit web export (`EXPO_PUBLIC_DEMO_MODE=true`).
 * A normal production build, including native, does not enable it.
 * Local dev still mocks unless `EXPO_PUBLIC_API_MOCK=false`.
 */
export function isDemoBuild(env?: Record<string, string | undefined>): boolean {
  const value = env ? env.EXPO_PUBLIC_DEMO_MODE : process.env.EXPO_PUBLIC_DEMO_MODE;
  return value === "true";
}

export function mocksEnabled(
  env?: Record<string, string | undefined>,
  dev: boolean = typeof __DEV__ === "boolean" ? __DEV__ : false,
  platform: "web" | "native" = Platform.OS === "web" ? "web" : "native",
): boolean {
  const source = env ?? process.env;
  const demo = env ? env.EXPO_PUBLIC_DEMO_MODE === "true" : process.env.EXPO_PUBLIC_DEMO_MODE === "true";
  if (demo) return platform === "web";
  return dev && source.EXPO_PUBLIC_API_MOCK !== "false";
}
