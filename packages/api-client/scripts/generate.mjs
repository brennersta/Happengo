import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const spec = resolve(packageRoot, "../../api/openapi.json");
const out = process.env.OPENAPI_TYPES_OUT
  ? resolve(process.env.OPENAPI_TYPES_OUT)
  : resolve(packageRoot, "src/generated/schema.ts");

if (!existsSync(spec)) {
  console.error("api/openapi.json is missing. The backend owns that file.");
  process.exit(1);
}

mkdirSync(dirname(out), { recursive: true });
console.log(`openapi-typescript: ${spec}`);
const openApiPackage = fileURLToPath(import.meta.resolve("openapi-typescript"));
const openApiCli = resolve(dirname(openApiPackage), "../bin/cli.js");
execFileSync(process.execPath, [openApiCli, spec, "-o", out], {
  cwd: packageRoot,
  stdio: "inherit",
});
