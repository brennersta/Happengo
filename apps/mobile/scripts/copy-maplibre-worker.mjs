import { cpSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

let packageJson;
try {
  packageJson = require.resolve("maplibre-gl/package.json");
} catch {
  console.error("maplibre-gl is not installed; the web map worker cannot be copied.");
  process.exit(1);
}

const worker = join(dirname(packageJson), "dist/maplibre-gl-worker.mjs");
if (!existsSync(worker)) {
  console.error(`MapLibre worker not found at ${worker}`);
  process.exit(1);
}

const destDir = join(appRoot, "public/maplibre");
mkdirSync(destDir, { recursive: true });
cpSync(worker, join(destDir, "maplibre-gl-worker.mjs"));
