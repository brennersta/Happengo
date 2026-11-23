const appJson = require("./app.json");

const demo = process.env.EXPO_PUBLIC_DEMO_MODE === "true";

module.exports = {
  expo: {
    ...appJson.expo,
    experiments: {
      ...appJson.expo.experiments,
      ...(demo ? { baseUrl: "/Happengo" } : {}),
    },
  },
};
