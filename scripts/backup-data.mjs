import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { loadConfig } from "../src/config.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = loadConfig(rootDir);
const timestamp = new Date().toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
const backupRoot = path.resolve(process.argv[2] || process.env.BACKUP_DIR || path.join(config.dataDir, "backups"));
const backupDir = path.join(backupRoot, timestamp);
const dbBackupPath = path.join(backupDir, "family_hub.sqlite");
const filesBackupPath = path.join(backupDir, "files");

mkdirSync(backupDir, { recursive: true });

const db = new Database(config.dbPath, { readonly: true });
await db.backup(dbBackupPath);
db.close();

if (existsSync(config.filesDir)) {
  mkdirSync(filesBackupPath, { recursive: true });
  for (const entry of readdirSync(config.filesDir)) {
    if (entry === "backups") continue;
    const source = path.join(config.filesDir, entry);
    const destination = path.join(filesBackupPath, entry);
    if (statSync(source).isDirectory()) {
      cpSync(source, destination, { recursive: true });
    } else {
      copyFileSync(source, destination);
    }
  }
}

console.log(JSON.stringify({ backupDir, dbBackupPath, filesBackupPath }, null, 2));
