import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./server/app.js";
import { openDatabase } from "./server/db/database.js";
import { initializeDatabase } from "./server/db/initialize.js";
import { loadConfig } from "./src/config.js";
import { localTodayISO } from "./src/dates.js";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const config = loadConfig(rootDir);
const todayISO = () => localTodayISO(config.timeZone);

mkdirSync(config.filesDir, { recursive: true });
const db = openDatabase(config.dbPath);
initializeDatabase({ db, seedDemoData: config.seedDemoData, todayISO });

const app = createApp({ config, db, rootDir, todayISO });
app.listen(config.port, config.host, () => {
  console.log(`Family Hub listening on http://${config.host}:${config.port}`);
});
