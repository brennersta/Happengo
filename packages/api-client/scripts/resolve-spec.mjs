import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The backend owns api/openapi.json. Until that file is on main, generation
 * reads the marked placeholder in this package.
 */
export function resolveSpecPath(repoRoot, exists = existsSync) {
  const owned = resolve(repoRoot, "api/openapi.json");
  if (exists(owned)) return owned;
  return resolve(repoRoot, "packages/api-client/openapi.placeholder.json");
}
