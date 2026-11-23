export function eventGridColumns(width: number): 1 | 2 | 3 {
  if (width >= 1080) return 3;
  if (width >= 720) return 2;
  return 1;
}
