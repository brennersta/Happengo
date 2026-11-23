import type { components } from "@happengo/api-client";

type Friend = components["schemas"]["FriendResponse"];

export const demoInviteToken = "EREREREREREREREREREREQ";
export const annaInviteToken = "IiIiIiIiIiIiIiIiIiIiIg";
const rotatedInviteToken = "AAAAAAAAAAAAAAAAAAAAAA";

const liisId = "00000000-0000-4000-8000-0000000000a1";
const markusId = "00000000-0000-4000-8000-0000000000a2";
const annaId = "00000000-0000-4000-8000-0000000000a3";

let friends: Friend[] = seedFriends();
let activeToken: string | null = null;
let rotations = 0;

function seedFriends(): Friend[] {
  return [
    { userId: liisId, displayName: "Liis Mets", tags: ["Close", "Family"] },
    { userId: markusId, displayName: "Markus Tamm", tags: ["Music"] },
  ];
}

export function resetDemoFriends(): void {
  friends = seedFriends();
  activeToken = null;
  rotations = 0;
}

export function listDemoFriends(): Friend[] {
  return friends.map((friend) => ({ ...friend, tags: [...friend.tags] }));
}

export function demoInviteStatus(): { active: boolean } {
  return { active: activeToken !== null };
}

export function createDemoInvite(): { token: string; path: string } | null {
  if (activeToken) return null;
  activeToken = demoInviteToken;
  return issued(activeToken);
}

export function rotateDemoInvite(): { token: string; path: string } {
  rotations += 1;
  activeToken = rotations % 2 === 1 ? rotatedInviteToken : demoInviteToken;
  return issued(activeToken);
}

export function previewDemoInvite(token: string): "self" | "missing" | { displayName: string } {
  if (token === annaInviteToken) return { displayName: "Anna Kask" };
  if (token === activeToken) return "self";
  return "missing";
}

export function acceptDemoInvite(token: string): "self" | "missing" | Friend {
  if (token === activeToken) return "self";
  if (token !== annaInviteToken) return "missing";
  const existing = friends.find((friend) => friend.userId === annaId);
  if (existing) return { ...existing, tags: [...existing.tags] };
  const added: Friend = { userId: annaId, displayName: "Anna Kask", tags: [] };
  friends = [...friends, added];
  return { ...added };
}

export function replaceDemoFriendTags(userId: string, tags: string[]): Friend | null {
  const index = friends.findIndex((friend) => friend.userId === userId);
  const current = friends[index];
  if (!current) return null;
  const next = { ...current, tags: [...tags] };
  friends = friends.map((friend, item) => item === index ? next : friend);
  return { ...next, tags: [...next.tags] };
}

export function removeDemoFriend(userId: string): boolean {
  const next = friends.filter((friend) => friend.userId !== userId);
  if (next.length === friends.length) return false;
  friends = next;
  return true;
}

function issued(token: string): { token: string; path: string } {
  return { token, path: `/friends/accept/${token}` };
}
