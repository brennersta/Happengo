const coordinateOnly = /^-?\d{1,3}\.\d+\s*,\s*-?\d{1,3}\.\d+$/;

export function displayAddress(address: string | null | undefined): string | null {
  const trimmed = address?.trim() ?? "";
  if (!trimmed || coordinateOnly.test(trimmed)) return null;
  return trimmed;
}
