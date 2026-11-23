export const friendTagMaxLength = 30;
export const friendTagMaxCount = 20;

/** Trim, collapse whitespace, and drop case-insensitive duplicates. Keeps the first spelling. */
export function normalizeFriendTags(input: readonly string[]): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const raw of input) {
    const label = raw.trim().replace(/\s+/g, " ");
    if (!label || label.length > friendTagMaxLength || /[\u0000-\u001f]/.test(label)) continue;
    const key = label.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
    if (labels.length >= friendTagMaxCount) break;
  }
  return labels;
}

export function friendInviteUrl(origin: string, path: string): string {
  const base = origin.replace(/\/+$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

export function uniqueFriendTags(friends: readonly { tags: readonly string[] }[]): string[] {
  return normalizeFriendTags(friends.flatMap((friend) => friend.tags));
}
