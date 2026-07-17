import path from "node:path";

export function loadConfig(rootDir) {
  const dataDir = process.env.DATA_DIR || path.join(rootDir, "data");

  const config = {
    nodeEnv: process.env.NODE_ENV || "development",
    port: Number(process.env.PORT || 8787),
    host: process.env.HOST || "127.0.0.1",
    dataDir,
    dbPath: process.env.DB_PATH || path.join(dataDir, "family_hub.sqlite"),
    filesDir: path.join(dataDir, "files"),
    sessionCookie: "family_hub_session",
    timeZone: process.env.FAMILY_HUB_TIME_ZONE || "America/Detroit",
    locationLabel: process.env.FAMILY_HUB_LOCATION_LABEL || "Detroit, MI",
    weatherLatitude: Number(process.env.FAMILY_HUB_WEATHER_LATITUDE || 42.3314),
    weatherLongitude: Number(process.env.FAMILY_HUB_WEATHER_LONGITUDE || -83.0458),
    seedDemoData: process.env.FAMILY_HUB_SEED_DEMO_DATA === "1",
  };

  validateConfig(config);
  return config;
}

function validateConfig(config) {
  if (!Number.isFinite(config.port) || config.port < 1 || config.port > 65535) {
    throw new Error("PORT must be a valid TCP port number.");
  }

  if (!Number.isFinite(config.weatherLatitude) || !Number.isFinite(config.weatherLongitude)) {
    throw new Error("FAMILY_HUB_WEATHER_LATITUDE and FAMILY_HUB_WEATHER_LONGITUDE must be numeric.");
  }
}
