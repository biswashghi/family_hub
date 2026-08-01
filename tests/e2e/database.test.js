import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { openDatabase } from "../../server/db/database.js";
import { initializeDatabase } from "../../server/db/initialize.js";
import { runMigrations } from "../../server/db/migrations.js";

test("database initialization is repeatable and records the baseline migration", () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "family-hub-db-"));
  const db = openDatabase(path.join(directory, "test.sqlite"));
  try {
    const options = { db, seedDemoData: false, todayISO: () => "2026-08-01" };
    initializeDatabase(options);
    initializeDatabase(options);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name);
    for (const table of ["auth_users", "bills", "tasks", "household_items", "documents", "notes", "schema_migrations"]) assert.ok(tables.includes(table));
    assert.deepEqual(db.prepare("SELECT version, name FROM schema_migrations").all(), [{ version: 1, name: "baseline schema and legacy compatibility migrations" }]);
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("migration runner applies ordered migrations once", () => {
  const db = new Database(":memory:");
  const applied = [];
  const migrations = [
    { version: 2, name: "second", up: () => applied.push(2) },
    { version: 1, name: "first", up: () => applied.push(1) },
  ];
  runMigrations(db, migrations);
  runMigrations(db, migrations);
  assert.deepEqual(applied, [1, 2]);
  assert.deepEqual(db.prepare("SELECT version FROM schema_migrations ORDER BY version").all().map((row) => row.version), [1, 2]);
  db.close();
});
