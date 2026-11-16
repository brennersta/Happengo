import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("generation reads api/openapi.json and has no placeholder fallback", () => {
  const source = readFileSync(new URL("./generate.mjs", import.meta.url), "utf8");
  assert.match(source, /api\/openapi\.json/);
  assert.equal(source.includes("placeholder"), false);
  assert.equal(existsSync(new URL("../openapi.placeholder.json", import.meta.url)), false);
});
