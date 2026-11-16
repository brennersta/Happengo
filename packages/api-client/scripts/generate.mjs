import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveSpecPath } from "./resolve-spec.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(packageRoot, "../..");
const spec = resolveSpecPath(repoRoot);
const out = resolve(packageRoot, "src/generated/schema.ts");

mkdirSync(dirname(out), { recursive: true });
console.log(`openapi-typescript: ${spec}`);
execFileSync("pnpm", ["exec", "openapi-typescript", spec, "-o", out], {
  cwd: packageRoot,
  stdio: "inherit",
});
