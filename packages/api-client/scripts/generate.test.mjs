import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

test("generation reads api/openapi.json and has no placeholder fallback", () => {
  const source = readFileSync(new URL("./generate.mjs", import.meta.url), "utf8");
  assert.match(source, /api\/openapi\.json/);
  assert.equal(source.includes("placeholder"), false);
  assert.equal(existsSync(new URL("../openapi.placeholder.json", import.meta.url)), false);
});

test("regenerating the client from api/openapi.json does not change schema.ts", () => {
  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const committed = readFileSync(resolve(packageRoot, "src/generated/schema.ts"), "utf8");
  const dir = mkdtempSync(resolve(tmpdir(), "happengo-openapi-"));
  const out = resolve(dir, "schema.ts");
  try {
    execFileSync(process.execPath, ["./scripts/generate.mjs"], {
      cwd: packageRoot,
      env: { ...process.env, OPENAPI_TYPES_OUT: out },
      stdio: "pipe",
    });
    assert.equal(readFileSync(out, "utf8"), committed);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
