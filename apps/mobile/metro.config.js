const { getDefaultConfig } = require("expo/metro-config");
const { resolve } = require("metro-resolver");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const devMocks = path.resolve(projectRoot, "src/mocks/empty.ts");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Production bundles must not ship MSW. The stub has no `http` export, so a
// production import of the handlers throws on `http.get`. The static demo
// uses src/mocks/fetchMock.ts instead and does not import `msw`.
if (process.env.NODE_ENV === "production") {
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === "msw" || moduleName.startsWith("msw/") || moduleName.startsWith("@mswjs/")) {
      return { type: "sourceFile", filePath: devMocks };
    }
    return resolve(context, moduleName, platform);
  };
}

// Hierarchical lookup stays on. @expo/metro-runtime depends on pretty-format 29,
// and Jest hoists 30 to the repo root. Turning lookup off makes the web dev
// server load 30 and crash in the HMR client.

module.exports = config;
