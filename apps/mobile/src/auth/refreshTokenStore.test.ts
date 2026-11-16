import { readFileSync } from "node:fs";
import path from "node:path";
import { createMemoryRefreshTokenStore } from "./memoryRefreshTokenStore";

test("the in-memory store round-trips a refresh token", async () => {
  const store = createMemoryRefreshTokenStore();
  expect(await store.get()).toBeNull();
  await store.set("refresh-1");
  expect(await store.get()).toBe("refresh-1");
  await store.clear();
  expect(await store.get()).toBeNull();
});

test("the web refresh-token module does not touch localStorage", () => {
  const source = readFileSync(path.join(__dirname, "refreshTokenStore.web.ts"), "utf8");
  expect(source).not.toMatch(/localStorage/);
});
