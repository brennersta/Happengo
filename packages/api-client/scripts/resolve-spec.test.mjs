import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { resolveSpecPath } from "./resolve-spec.mjs";

test("prefers api/openapi.json when the backend spec is present", () => {
  const repo = "/repo";
  const owned = resolve(repo, "api/openapi.json");
  const chosen = resolveSpecPath(repo, (candidate) => candidate === owned);
  assert.equal(chosen, owned);
});

test("uses the placeholder until the backend spec is committed", () => {
  const repo = "/repo";
  const chosen = resolveSpecPath(repo, () => false);
  assert.equal(chosen, resolve(repo, "packages/api-client/openapi.placeholder.json"));
});

test("placeholder is marked and does not invent a tag enum", () => {
  const spec = JSON.parse(
    readFileSync(new URL("../openapi.placeholder.json", import.meta.url), "utf8"),
  );
  assert.equal(spec["x-happengo-placeholder"], true);
  assert.match(spec.info.description, /PLACEHOLDER/);
  assert.equal(typeof spec.paths["/health"].get, "object");
  assert.equal(typeof spec.paths["/v1/events"].get, "object");
  assert.equal(JSON.stringify(spec).includes("Music"), false);
});
