// Default local Jest runs to CI's timezone, while allowing explicit TZ overrides for portability checks.
process.env.TZ ||= "UTC";

const preset = require("jest-expo/jest-preset");

module.exports = {
  ...preset,
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  transformIgnorePatterns: [
    "/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|expo-.*|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|@happengo|intl-messageformat|@formatjs)/)",
    "/node_modules/react-native-reanimated/plugin/",
    "/node_modules/@react-native/babel-preset/",
  ],
};
