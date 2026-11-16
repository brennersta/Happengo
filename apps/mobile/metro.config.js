const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Hierarchical lookup stays on. @expo/metro-runtime depends on pretty-format 29,
// and Jest hoists 30 to the repo root. Turning lookup off makes the web dev
// server load 30 and crash in the HMR client.

module.exports = config;
