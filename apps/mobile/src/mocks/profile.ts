export interface DemoProfile {
  id: string;
  displayName: string;
}

const profile: DemoProfile = { id: "demo-user", displayName: "Demo User" };

export function getDemoProfile(): DemoProfile {
  return { ...profile };
}

export function updateDemoDisplayName(value: unknown): DemoProfile | null {
  if (typeof value !== "string") return null;
  const displayName = value.trim();
  if (displayName.length < 1 || displayName.length > 40) return null;
  profile.displayName = displayName;
  return getDemoProfile();
}
