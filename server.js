import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import express from "express";
import multer from "multer";
import { loadConfig } from "./src/config.js";
import { addDaysISO, isValidISODate, localTodayISO, nextDueDateFromRule, parseISODate } from "./src/dates.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = loadConfig(__dirname);
const PORT = config.port;
const HOST = config.host;
const DATA_DIR = config.dataDir;
const DB_PATH = config.dbPath;
const FILES_DIR = config.filesDir;
const SESSION_COOKIE = config.sessionCookie;
const APP_TIME_ZONE = config.timeZone;
const LOCATION_LABEL = config.locationLabel;
const WEATHER_LATITUDE = config.weatherLatitude;
const WEATHER_LONGITUDE = config.weatherLongitude;
const SEED_DEMO_DATA = config.seedDemoData;
const sessions = new Map();
const BILL_AMOUNT_TYPES = new Set(["fixed", "estimated", "variable", "unknown"]);

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password, passwordHash) {
  const [scheme, salt, storedHash] = String(passwordHash || "").split(":");
  if (scheme !== "scrypt" || !salt || !storedHash) return false;
  const candidate = Buffer.from(scryptSync(password, salt, 64).toString("hex"), "hex");
  const stored = Buffer.from(storedHash, "hex");
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}

function getAuthUser() {
  return db.prepare("SELECT * FROM auth_users ORDER BY created_at ASC LIMIT 1").get() || null;
}

mkdirSync(FILES_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function todayISO() {
  return localTodayISO(APP_TIME_ZONE);
}

function ensureColumn(table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (cols.some((col) => col.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

function parseCookies(cookieHeader) {
  const cookies = {};
  String(cookieHeader || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((pair) => {
      const index = pair.indexOf("=");
      if (index < 0) return;
      const key = decodeURIComponent(pair.slice(0, index));
      const value = decodeURIComponent(pair.slice(index + 1));
      cookies[key] = value;
    });
  return cookies;
}

function sessionFromRequest(req) {
  const token = parseCookies(req.headers.cookie || "")[SESSION_COOKIE];
  if (!token) return null;
  return sessions.get(token) || null;
}

function createSession(username) {
  const token = randomUUID();
  sessions.set(token, { username, createdAt: Date.now() });
  return token;
}

function clearSession(req) {
  const token = parseCookies(req.headers.cookie || "")[SESSION_COOKIE];
  if (!token) return;
  sessions.delete(token);
}

function setSessionCookie(res, token) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000`);
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
}

function requireAuth(req, res, next) {
  const session = sessionFromRequest(req);
  if (!session) {
    if (req.path.startsWith("/api/")) {
      return res.status(401).json({ error: "authentication required" });
    }
    return res.redirect("/login");
  }

  req.user = session;
  return next();
}

function normalizeOptionalDate(value, fieldName) {
  if (value === undefined || value === null || value === "") return { value: null };
  const date = String(value).trim();
  if (!isValidISODate(date)) return { error: `invalid ${fieldName}; expected YYYY-MM-DD` };
  return { value: date };
}

function recurrenceLabel(recurrenceUnit, recurrenceInterval, recurrenceDayOfMonth) {
  if (recurrenceUnit === "one_time") return "one_time";
  const interval = Math.max(1, Number(recurrenceInterval || 1));
  const unitBase = recurrenceUnit === "day" ? "day" : recurrenceUnit === "week" ? "week" : recurrenceUnit === "year" ? "year" : "month";
  const unit = interval === 1 ? unitBase : `${unitBase}s`;
  if (recurrenceDayOfMonth && (recurrenceUnit === "month" || recurrenceUnit === "year")) {
    return `every ${interval} ${unit} on day ${recurrenceDayOfMonth}`;
  }
  return `every ${interval} ${unit}`;
}

function normalizeSchedule({ dueDate, recurrenceUnit, recurrenceInterval, recurrenceDayOfMonth, recurrenceEndDate }) {
  if (!isValidISODate(dueDate)) {
    return { error: "invalid due_date; expected YYYY-MM-DD" };
  }
  if (!["one_time", "day", "week", "month", "year"].includes(String(recurrenceUnit))) {
    return { error: "invalid recurrence_unit" };
  }

  const dueDay = Number(String(dueDate).slice(8, 10));
  const normalizedInterval = recurrenceUnit === "one_time" ? 1 : Math.max(1, Math.floor(Number(recurrenceInterval || 1)));
  const normalizedDayOfMonth =
    recurrenceUnit === "month" || recurrenceUnit === "year"
      ? recurrenceDayOfMonth
        ? Math.max(1, Math.min(31, Number(recurrenceDayOfMonth)))
        : dueDay
      : null;

  const normalizedEndDate = recurrenceEndDate ? String(recurrenceEndDate) : null;
  if (normalizedEndDate) {
    if (!isValidISODate(normalizedEndDate)) {
      return { error: "invalid recurrence_end_date; expected YYYY-MM-DD" };
    }
    if (normalizedEndDate < dueDate) {
      return { error: "recurrence_end_date must be on or after due_date" };
    }
  }

  return {
    dueDate: String(dueDate),
    recurrenceUnit: String(recurrenceUnit),
    recurrenceInterval: normalizedInterval,
    recurrenceDayOfMonth: normalizedDayOfMonth,
    recurrenceEndDate: normalizedEndDate,
    cadence: recurrenceLabel(recurrenceUnit, normalizedInterval, normalizedDayOfMonth),
  };
}

function boolToInt(value) {
  return value ? 1 : 0;
}

function intToBool(value) {
  return Number(value) === 1;
}

function respondValidationError(res, normalized) {
  if (!normalized?.error) return false;
  res.status(400).json({ error: normalized.error });
  return true;
}

function getRowById(table, id) {
  return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
}

function getRequiredRow(res, table, id) {
  const row = getRowById(table, id);
  if (!row) {
    res.status(404).json({ error: "not found" });
    return null;
  }
  return row;
}

function sendCreatedEntity(res, statusCode, key, table, serializer, id) {
  const row = getRowById(table, id);
  res.status(statusCode).json({ [key]: serializer(row) });
}

function sendUpdatedEntity(res, key, table, serializer, id) {
  const row = getRowById(table, id);
  res.json({ [key]: serializer(row) });
}

function deleteRequiredRow(res, table, id) {
  const info = db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
  if (info.changes < 1) {
    res.status(404).json({ error: "not found" });
    return false;
  }
  res.status(204).send();
  return true;
}

function cleanupUploadedFile(file) {
  if (!file?.path) return;
  try {
    unlinkSync(file.path);
  } catch {
    // ignore
  }
}

function normalizeBillPayload(payload, existing = null) {
  const title = payload.title !== undefined ? String(payload.title || "").trim() : existing?.title;
  const category = payload.category !== undefined ? String(payload.category || "").trim() : existing?.category;
  const source = payload.source !== undefined ? String(payload.source || "").trim() : existing?.source;
  const responsibilityLabel =
    payload.responsibility_label !== undefined ? String(payload.responsibility_label || "").trim() : existing?.responsibility_label;
  const notes = payload.notes !== undefined ? String(payload.notes || "").trim() : existing?.notes;
  const status = payload.status !== undefined ? String(payload.status || "") : existing?.status || "open";
  const autopayEnabled = payload.autopay_enabled !== undefined ? !!payload.autopay_enabled : !!existing?.autopay_enabled;
  const amountType =
    payload.amount_type !== undefined ? String(payload.amount_type || "").trim() : existing?.amount_type || "fixed";
  const hasAmountPayload = payload.amount !== undefined && payload.amount !== null && String(payload.amount).trim() !== "";
  const amountRaw = hasAmountPayload ? Number(payload.amount) : existing && payload.amount === undefined ? existing.amount : null;
  const currency = payload.currency !== undefined ? String(payload.currency || "").trim().toUpperCase() : existing?.currency || "USD";
  const schedule = normalizeSchedule({
    dueDate: payload.due_date !== undefined ? payload.due_date : existing?.due_date,
    recurrenceUnit: payload.recurrence_unit !== undefined ? payload.recurrence_unit : existing?.recurrence_unit || "month",
    recurrenceInterval: payload.recurrence_interval !== undefined ? payload.recurrence_interval : existing?.recurrence_interval || 1,
    recurrenceDayOfMonth:
      payload.recurrence_day_of_month !== undefined ? payload.recurrence_day_of_month : existing?.recurrence_day_of_month ?? null,
    recurrenceEndDate: payload.recurrence_end_date !== undefined ? payload.recurrence_end_date : existing?.recurrence_end_date ?? null,
  });
  if (schedule.error) return schedule;

  if (!title) return { error: "title is required" };
  if (!category) return { error: "category is required" };
  if (!BILL_AMOUNT_TYPES.has(amountType)) return { error: "invalid amount type" };
  if (amountRaw !== null && (!Number.isFinite(Number(amountRaw)) || Number(amountRaw) < 0)) {
    return { error: "amount must be a non-negative number" };
  }
  if (amountType === "fixed" && amountRaw === null) return { error: "fixed amount is required" };
  if (!["open", "paid", "skipped"].includes(status)) return { error: "invalid status" };
  if (!currency) return { error: "currency is required" };

  return {
    title,
    category,
    source: source || null,
    responsibility_label: responsibilityLabel || null,
    notes: notes || null,
    status,
    autopay_enabled: autopayEnabled,
    amount: amountRaw === null ? null : Number(Number(amountRaw).toFixed(2)),
    amount_type: amountType,
    currency,
    due_date: schedule.dueDate,
    recurrence_unit: schedule.recurrenceUnit,
    recurrence_interval: schedule.recurrenceInterval,
    recurrence_day_of_month: schedule.recurrenceDayOfMonth,
    recurrence_end_date: schedule.recurrenceEndDate,
    cadence: schedule.cadence,
  };
}

function normalizeTaskPayload(payload, existing = null) {
  const title = payload.title !== undefined ? String(payload.title || "").trim() : existing?.title;
  const area = payload.area !== undefined ? String(payload.area || "").trim() : existing?.area;
  const status = payload.status !== undefined ? String(payload.status || "") : existing?.status || "open";
  const dueDate = payload.due_date !== undefined ? normalizeOptionalDate(payload.due_date, "due_date") : { value: existing?.due_date ?? null };
  if (dueDate.error) return dueDate;
  const notes = payload.notes !== undefined ? String(payload.notes || "").trim() : existing?.notes;
  const repeatUnit = payload.repeat_unit !== undefined ? String(payload.repeat_unit || "") : existing?.repeat_unit || "none";
  const repeatInterval = payload.repeat_interval !== undefined ? Math.max(1, Math.floor(Number(payload.repeat_interval || 1))) : Number(existing?.repeat_interval || 1);

  if (!title) return { error: "title is required" };
  if (!["open", "done", "snoozed"].includes(status)) return { error: "invalid status" };
  if (!["none", "day", "week", "month"].includes(repeatUnit)) return { error: "invalid repeat_unit" };

  return {
    title,
    area: area || null,
    status,
    due_date: dueDate.value,
    repeat_unit: repeatUnit,
    repeat_interval: repeatUnit === "none" ? 1 : repeatInterval,
    notes: notes || null,
  };
}

function normalizeItemPayload(payload, existing = null) {
  const name = payload.name !== undefined ? String(payload.name || "").trim() : existing?.name;
  const type = payload.type !== undefined ? String(payload.type || "") : existing?.type || "other";
  const status = payload.status !== undefined ? String(payload.status || "") : existing?.status || "active";
  const replaceByDate = payload.replace_by_date !== undefined ? normalizeOptionalDate(payload.replace_by_date, "replace_by_date") : { value: existing?.replace_by_date ?? null };
  if (replaceByDate.error) return replaceByDate;
  const restockByDate = payload.restock_by_date !== undefined ? normalizeOptionalDate(payload.restock_by_date, "restock_by_date") : { value: existing?.restock_by_date ?? null };
  if (restockByDate.error) return restockByDate;
  const location = payload.location !== undefined ? String(payload.location || "").trim() : existing?.location;
  const notes = payload.notes !== undefined ? String(payload.notes || "").trim() : existing?.notes;

  if (!name) return { error: "name is required" };
  if (!["filter", "battery", "supply", "appliance_part", "pantry", "cleaning", "other"].includes(type)) {
    return { error: "invalid type" };
  }
  if (!["active", "replaced", "restocked", "archived"].includes(status)) return { error: "invalid status" };

  return {
    name,
    type,
    status,
    replace_by_date: replaceByDate.value,
    restock_by_date: restockByDate.value,
    location: location || null,
    notes: notes || null,
  };
}

function normalizeNotePayload(payload, existing = null) {
  const title = payload.title !== undefined ? String(payload.title || "").trim() : existing?.title;
  const body = payload.body !== undefined ? String(payload.body || "").trim() : existing?.body;
  const noteType = payload.note_type !== undefined ? String(payload.note_type || "") : existing?.note_type || "quick_note";
  const tags = payload.tags !== undefined ? String(payload.tags || "").trim() : existing?.tags;
  const isPinned = payload.is_pinned !== undefined ? !!payload.is_pinned : !!existing?.is_pinned;
  const isArchived = payload.is_archived !== undefined ? !!payload.is_archived : !!existing?.is_archived;

  if (!title) return { error: "title is required" };
  if (!body) return { error: "body is required" };
  if (!["quick_note", "checklist", "reference", "idea"].includes(noteType)) return { error: "invalid note_type" };

  return {
    title,
    body,
    note_type: noteType,
    tags: tags || null,
    is_pinned: isPinned,
    is_archived: isArchived,
  };
}

function serializeBill(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    source: row.payment_source,
    responsibility_label: row.responsibility_label,
    amount: row.amount,
    amount_type: row.amount_type || "fixed",
    currency: row.currency,
    due_date: row.due_date,
    status: row.status,
    autopay_enabled: intToBool(row.autopay),
    notes: row.notes,
    recurrence_unit: row.recurrence_unit,
    recurrence_interval: row.recurrence_interval,
    recurrence_day_of_month: row.recurrence_day_of_month,
    recurrence_end_date: row.recurrence_end_date,
    last_paid_due_date: row.last_paid_due_date,
    is_subscription: intToBool(row.is_subscription),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function serializeTask(row) {
  return {
    id: row.id,
    title: row.title,
    area: row.area,
    status: row.status,
    due_date: row.due_date,
    repeat_unit: row.repeat_unit,
    repeat_interval: row.repeat_interval,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function serializeItem(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    status: row.status,
    replace_by_date: row.replace_by_date,
    restock_by_date: row.restock_by_date,
    location: row.location,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function serializeDocument(row) {
  return {
    id: row.id,
    title: row.title,
    type: row.doc_type,
    category: row.category,
    tags: row.tags,
    notes: row.notes,
    file_name: row.file_name,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    is_pinned: intToBool(row.is_pinned),
    expiry_date: row.expiry_date,
    created_at: row.uploaded_at,
    updated_at: row.updated_at,
  };
}

function serializeNote(row) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    note_type: row.note_type,
    tags: row.tags,
    is_pinned: intToBool(row.is_pinned),
    is_archived: intToBool(row.is_archived),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function shouldAdvanceRecurringBill(existing, nextStatus, schedule) {
  return nextStatus === "paid" && existing.status !== "paid" && schedule.recurrenceUnit !== "one_time";
}

function shouldSkipRecurringBill(existing, nextStatus, schedule) {
  return nextStatus === "skipped" && existing.status !== "skipped" && schedule.recurrenceUnit !== "one_time";
}

function applyBillUpdate(id, payload) {
  const existingRow = getRowById("bills", id);
  if (!existingRow) return { error: "not found", status: 404 };
  const existing = serializeBill(existingRow);
  const normalized = normalizeBillPayload(payload ?? {}, existing);
  if (normalized.error) return { error: normalized.error, status: 400 };

  let nextDueDate = normalized.due_date;
  let nextStatus = normalized.status;
  let lastPaidDueDate = existing.last_paid_due_date;

  const schedule = {
    recurrenceUnit: normalized.recurrence_unit,
    recurrenceInterval: normalized.recurrence_interval,
    recurrenceDayOfMonth: normalized.recurrence_day_of_month,
    recurrenceEndDate: normalized.recurrence_end_date,
  };

  if (shouldAdvanceRecurringBill(existing, normalized.status, schedule)) {
    lastPaidDueDate = normalized.due_date;
    const proposedNext = nextDueDateFromRule(normalized.due_date, schedule.recurrenceUnit, schedule.recurrenceInterval, schedule.recurrenceDayOfMonth);
    if (schedule.recurrenceEndDate && proposedNext > schedule.recurrenceEndDate) {
      nextStatus = "paid";
    } else {
      nextDueDate = proposedNext;
      nextStatus = "open";
    }
  } else if (shouldSkipRecurringBill(existing, normalized.status, schedule)) {
    const proposedNext = nextDueDateFromRule(normalized.due_date, schedule.recurrenceUnit, schedule.recurrenceInterval, schedule.recurrenceDayOfMonth);
    if (schedule.recurrenceEndDate && proposedNext > schedule.recurrenceEndDate) {
      nextStatus = "skipped";
    } else {
      nextDueDate = proposedNext;
      nextStatus = "open";
    }
  } else if (normalized.status === "paid") {
    lastPaidDueDate = normalized.due_date;
  }

  db.prepare(
    `UPDATE bills
     SET title = ?, category = ?, amount = ?, amount_type = ?, currency = ?, due_date = ?, cadence = ?, payment_source = ?, responsibility_label = ?,
         autopay = ?, status = ?, notes = ?, recurrence_unit = ?, recurrence_interval = ?, recurrence_day_of_month = ?,
         recurrence_end_date = ?, last_paid_due_date = ?, is_subscription = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
  ).run(
    normalized.title,
    normalized.category,
    normalized.amount,
    normalized.amount_type,
    normalized.currency,
    nextDueDate,
    normalized.cadence,
    normalized.source,
    normalized.responsibility_label,
    boolToInt(normalized.autopay_enabled),
    nextStatus,
    normalized.notes,
    normalized.recurrence_unit,
    normalized.recurrence_interval,
    normalized.recurrence_day_of_month,
    normalized.recurrence_end_date,
    lastPaidDueDate,
    boolToInt(payload?.is_subscription !== undefined ? !!payload.is_subscription : existing.is_subscription),
    id,
  );

  return { bill: serializeBill(getRowById("bills", id)) };
}

function applyTaskUpdate(id, payload) {
  const existing = getRowById("tasks", id);
  if (!existing) return { error: "not found", status: 404 };
  const normalized = normalizeTaskPayload(payload ?? {}, serializeTask(existing));
  if (normalized.error) return { error: normalized.error, status: 400 };

  db.prepare(
    `UPDATE tasks
     SET title = ?, area = ?, status = ?, due_date = ?, repeat_unit = ?, repeat_interval = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
  ).run(normalized.title, normalized.area, normalized.status, normalized.due_date, normalized.repeat_unit, normalized.repeat_interval, normalized.notes, id);

  return { task: serializeTask(getRowById("tasks", id)) };
}

function nextTaskDueDate(task) {
  if (!task.due_date || task.repeat_unit === "none") return task.due_date;
  return nextDueDateFromRule(task.due_date, task.repeat_unit, task.repeat_interval, null);
}

function sendActionResult(res, key, result) {
  if (result.error) return res.status(result.status || 400).json({ error: result.error });
  return res.json({ [key]: result[key] });
}

function migrateBillsStatusCheck() {
  const table = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'bills'").get();
  if (!table?.sql || table.sql.includes("'skipped'")) return;

  db.exec(`
    PRAGMA foreign_keys = OFF;

    CREATE TABLE bills_next (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL CHECK (amount >= 0),
      amount_type TEXT NOT NULL DEFAULT 'fixed' CHECK (amount_type IN ('fixed', 'estimated', 'variable', 'unknown')),
      currency TEXT NOT NULL DEFAULT 'USD',
      due_date TEXT NOT NULL,
      cadence TEXT NOT NULL,
      payment_source TEXT,
      responsibility_label TEXT,
      autopay INTEGER NOT NULL DEFAULT 0 CHECK (autopay IN (0, 1)),
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'skipped')),
      last_paid_due_date TEXT,
      notes TEXT,
      recurrence_unit TEXT NOT NULL DEFAULT 'month',
      recurrence_interval INTEGER NOT NULL DEFAULT 1,
      recurrence_day_of_month INTEGER,
      recurrence_end_date TEXT,
      is_subscription INTEGER NOT NULL DEFAULT 0 CHECK (is_subscription IN (0, 1)),
      payer_name TEXT,
      confirmer_name TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    INSERT INTO bills_next (
      id, title, category, amount, amount_type, currency, due_date, cadence, payment_source, responsibility_label,
      autopay, status, last_paid_due_date, notes, recurrence_unit, recurrence_interval, recurrence_day_of_month,
      recurrence_end_date, is_subscription, payer_name, confirmer_name, created_at, updated_at
    )
    SELECT
      id, title, category, amount, COALESCE(NULLIF(amount_type, ''), 'fixed'), COALESCE(NULLIF(currency, ''), 'USD'), due_date, cadence, payment_source, responsibility_label,
      autopay, status, last_paid_due_date, notes, recurrence_unit, recurrence_interval, recurrence_day_of_month,
      recurrence_end_date, is_subscription, payer_name, confirmer_name, created_at, updated_at
    FROM bills;

    DROP TABLE bills;
    ALTER TABLE bills_next RENAME TO bills;
    CREATE INDEX IF NOT EXISTS idx_bills_status_due ON bills(status, due_date);

    PRAGMA foreign_keys = ON;
  `);
}

function migrateBillsFlexibleAmounts() {
  const table = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'bills'").get();
  if (!table?.sql) return;
  if (table.sql.includes("amount_type") && !table.sql.includes("amount REAL NOT NULL")) return;

  db.exec(`
    PRAGMA foreign_keys = OFF;

    CREATE TABLE bills_next (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL CHECK (amount IS NULL OR amount >= 0),
      amount_type TEXT NOT NULL DEFAULT 'fixed' CHECK (amount_type IN ('fixed', 'estimated', 'variable', 'unknown')),
      currency TEXT NOT NULL DEFAULT 'USD',
      due_date TEXT NOT NULL,
      cadence TEXT NOT NULL,
      payment_source TEXT,
      responsibility_label TEXT,
      autopay INTEGER NOT NULL DEFAULT 0 CHECK (autopay IN (0, 1)),
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'skipped')),
      last_paid_due_date TEXT,
      notes TEXT,
      recurrence_unit TEXT NOT NULL DEFAULT 'month',
      recurrence_interval INTEGER NOT NULL DEFAULT 1,
      recurrence_day_of_month INTEGER,
      recurrence_end_date TEXT,
      is_subscription INTEGER NOT NULL DEFAULT 0 CHECK (is_subscription IN (0, 1)),
      payer_name TEXT,
      confirmer_name TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    INSERT INTO bills_next (
      id, title, category, amount, amount_type, currency, due_date, cadence, payment_source, responsibility_label,
      autopay, status, last_paid_due_date, notes, recurrence_unit, recurrence_interval, recurrence_day_of_month,
      recurrence_end_date, is_subscription, payer_name, confirmer_name, created_at, updated_at
    )
    SELECT
      id, title, category, amount, COALESCE(NULLIF(amount_type, ''), 'fixed'), COALESCE(NULLIF(currency, ''), 'USD'), due_date, cadence, payment_source, responsibility_label,
      autopay, status, last_paid_due_date, notes, recurrence_unit, recurrence_interval, recurrence_day_of_month,
      recurrence_end_date, is_subscription, payer_name, confirmer_name, created_at, updated_at
    FROM bills;

    DROP TABLE bills;
    ALTER TABLE bills_next RENAME TO bills;
    CREATE INDEX IF NOT EXISTS idx_bills_status_due ON bills(status, due_date);

    PRAGMA foreign_keys = ON;
  `);
}

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL CHECK (amount IS NULL OR amount >= 0),
      amount_type TEXT NOT NULL DEFAULT 'fixed' CHECK (amount_type IN ('fixed', 'estimated', 'variable', 'unknown')),
      currency TEXT NOT NULL DEFAULT 'USD',
      due_date TEXT NOT NULL,
      cadence TEXT NOT NULL,
      payment_source TEXT,
      responsibility_label TEXT,
      autopay INTEGER NOT NULL DEFAULT 0 CHECK (autopay IN (0, 1)),
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'skipped')),
      last_paid_due_date TEXT,
      notes TEXT,
      recurrence_unit TEXT NOT NULL DEFAULT 'month',
      recurrence_interval INTEGER NOT NULL DEFAULT 1,
      recurrence_day_of_month INTEGER,
      recurrence_end_date TEXT,
      is_subscription INTEGER NOT NULL DEFAULT 0 CHECK (is_subscription IN (0, 1)),
      payer_name TEXT,
      confirmer_name TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_bills_status_due ON bills(status, due_date);

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      doc_type TEXT NOT NULL,
      category TEXT,
      tags TEXT,
      notes TEXT,
      file_name TEXT NOT NULL,
      stored_name TEXT NOT NULL UNIQUE,
      mime_type TEXT,
      size_bytes INTEGER NOT NULL,
      is_pinned INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0, 1)),
      expiry_date TEXT,
      uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at);

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      area TEXT,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'snoozed')),
      due_date TEXT,
      repeat_unit TEXT NOT NULL DEFAULT 'none' CHECK (repeat_unit IN ('none', 'day', 'week', 'month')),
      repeat_interval INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status_due ON tasks(status, due_date);

    CREATE TABLE IF NOT EXISTS household_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      replace_by_date TEXT,
      restock_by_date TEXT,
      location TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_household_items_dates ON household_items(status, replace_by_date, restock_by_date);

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      note_type TEXT NOT NULL DEFAULT 'quick_note',
      tags TEXT,
      is_pinned INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0, 1)),
      is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);
  `);

  ensureColumn("bills", "currency", "currency TEXT NOT NULL DEFAULT 'USD'");
  ensureColumn("bills", "responsibility_label", "responsibility_label TEXT");
  ensureColumn("bills", "is_subscription", "is_subscription INTEGER NOT NULL DEFAULT 0 CHECK (is_subscription IN (0, 1))");
  ensureColumn("bills", "payer_name", "payer_name TEXT");
  ensureColumn("bills", "confirmer_name", "confirmer_name TEXT");
  ensureColumn("bills", "amount_type", "amount_type TEXT NOT NULL DEFAULT 'fixed' CHECK (amount_type IN ('fixed', 'estimated', 'variable', 'unknown'))");
  migrateBillsStatusCheck();
  migrateBillsFlexibleAmounts();
  ensureColumn("documents", "is_pinned", "is_pinned INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0, 1))");
  ensureColumn("documents", "expiry_date", "expiry_date TEXT");
  ensureColumn("documents", "updated_at", "updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP");

  db.exec(`
    UPDATE bills
    SET responsibility_label = COALESCE(responsibility_label, payer_name, confirmer_name)
    WHERE responsibility_label IS NULL;

    UPDATE bills
    SET currency = 'USD'
    WHERE currency IS NULL OR currency = '';

    UPDATE documents
    SET updated_at = uploaded_at
    WHERE updated_at IS NULL OR updated_at = '';
  `);
}

function seedData() {
  const billCount = db.prepare("SELECT COUNT(*) AS count FROM bills").get().count;
  if (billCount === 0) {
    const insert = db.prepare(`
      INSERT INTO bills (
        id, title, category, amount, amount_type, currency, due_date, cadence, payment_source, responsibility_label,
        autopay, status, notes, recurrence_unit, recurrence_interval, recurrence_day_of_month, recurrence_end_date, is_subscription
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const today = todayISO();
    const month = String(parseISODate(today).getUTCMonth() + 1).padStart(2, "0");
    const year = parseISODate(today).getUTCFullYear();
    const records = [
      ["Home Internet", "internet", 79, `${year}-${month}-15`, "Shared Visa", "Biswash", 1, "Primary internet plan", 0],
      ["Water + Sewer", "home", 88, `${year}-${month}-18`, "Shared Checking", "Household", 1, "City utilities", 0],
      ["Shared Card Payment", "shared_card", 620, `${year}-${month}-20`, "Shared Checking", "Biswash", 1, "Statement payment", 0],
      ["Music Subscription", "other", 16, `${year}-${month}-24`, "Shared Card", "Household", 1, "Streaming plan", 1],
    ];
    for (const [title, category, amount, dueDate, source, responsibility, autopay, notes, isSubscription] of records) {
      insert.run(
        randomUUID(),
        title,
        category,
        amount,
        "fixed",
        "USD",
        dueDate,
        recurrenceLabel("month", 1, Number(String(dueDate).slice(8, 10))),
        source,
        responsibility,
        autopay,
        "open",
        notes,
        "month",
        1,
        Number(String(dueDate).slice(8, 10)),
        null,
        isSubscription,
      );
    }
  }

  const taskCount = db.prepare("SELECT COUNT(*) AS count FROM tasks").get().count;
  if (taskCount === 0) {
    const insert = db.prepare(`
      INSERT INTO tasks (id, title, area, status, due_date, repeat_unit, repeat_interval, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const today = todayISO();
    insert.run(randomUUID(), "Refill detergent", "laundry", "open", today, "month", 1, "Check the utility closet stock.");
    insert.run(randomUUID(), "Take out recycling", "kitchen", "open", addDaysISO(today, 1), "week", 1, "Tuesday evening pickup.");
    insert.run(randomUUID(), "Review school form", "admin", "open", addDaysISO(today, 2), "none", 1, "Needs signature this week.");
  }

  const itemCount = db.prepare("SELECT COUNT(*) AS count FROM household_items").get().count;
  if (itemCount === 0) {
    const insert = db.prepare(`
      INSERT INTO household_items (id, name, type, status, replace_by_date, restock_by_date, location, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const today = todayISO();
    insert.run(randomUUID(), "HVAC filter", "filter", "active", addDaysISO(today, 9), null, "Hall closet", "16x25x1 size.");
    insert.run(randomUUID(), "Toothbrush heads", "supply", "active", null, addDaysISO(today, 18), "Upstairs bathroom", "Order the preferred soft pack.");
    insert.run(randomUUID(), "AA batteries", "battery", "active", null, addDaysISO(today, 12), "Utility drawer", "Restock before travel kit refill.");
  }

  const noteCount = db.prepare("SELECT COUNT(*) AS count FROM notes").get().count;
  if (noteCount === 0) {
    const insert = db.prepare(`
      INSERT INTO notes (id, title, body, note_type, tags, is_pinned)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insert.run(randomUUID(), "Paint code", "Guest room wall color: SW 7632 and trim sample is in the desk drawer.", "reference", "home,paint", 1);
    insert.run(randomUUID(), "Gift idea", "Keep a running list of small thoughtful gift ideas instead of trying to remember them later.", "idea", "family,gifts", 0);
    insert.run(randomUUID(), "Travel checklist", "Chargers, meds, headphones, backup battery, copies of IDs.", "checklist", "travel", 0);
  }
}

createSchema();
if (SEED_DEMO_DATA) {
  seedData();
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, FILES_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").replace(/[^.\w-]/g, "");
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
});

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/auth/login", (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  const authUser = getAuthUser();
  if (!authUser) {
    return res.status(409).json({ error: "setup required", setup_required: true });
  }
  if (username !== authUser.username || !verifyPassword(password, authUser.password_hash)) {
    return res.status(401).json({ error: "invalid credentials" });
  }

  const token = createSession(username);
  setSessionCookie(res, token);
  return res.json({ ok: true, username });
});

app.get("/auth/status", (_req, res) => {
  res.json({ setup_required: !getAuthUser() });
});

app.post("/auth/setup", (req, res) => {
  if (getAuthUser()) {
    return res.status(409).json({ error: "setup already complete" });
  }

  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  if (username.length < 3) return res.status(400).json({ error: "username must be at least 3 characters" });
  if (password.length < 12) return res.status(400).json({ error: "password must be at least 12 characters" });

  db.prepare("INSERT INTO auth_users (id, username, password_hash) VALUES (?, ?, ?)").run(randomUUID(), username, hashPassword(password));
  const token = createSession(username);
  setSessionCookie(res, token);
  return res.status(201).json({ ok: true, username });
});

app.post("/auth/logout", (req, res) => {
  clearSession(req);
  clearSessionCookie(res);
  return res.status(204).send();
});

app.get("/api/session", (req, res) => {
  const session = sessionFromRequest(req);
  if (!session) return res.status(401).json({ error: "authentication required" });
  return res.json({ authenticated: true, username: session.username });
});

app.use("/api", (req, res, next) => {
  if (req.path === "/health") return next();
  return requireAuth(req, res, next);
});

app.get("/api/environment", (_req, res) => {
  res.json({
    location: {
      label: LOCATION_LABEL,
      latitude: WEATHER_LATITUDE,
      longitude: WEATHER_LONGITUDE,
    },
    timeZone: APP_TIME_ZONE,
  });
});

app.get("/api/dashboard", (_req, res) => {
  const today = todayISO();
  const nextWeek = addDaysISO(today, 7);
  const nextMonth = addDaysISO(today, 30);

  const upcomingBills = db
    .prepare(
      `SELECT * FROM bills
       WHERE status = 'open' AND due_date <= ?
       ORDER BY due_date ASC, created_at DESC
       LIMIT 6`,
    )
    .all(nextWeek)
    .map(serializeBill);

  const tasksToday = db
    .prepare(
      `SELECT * FROM tasks
       WHERE status IN ('open', 'snoozed') AND due_date IS NOT NULL AND due_date <= ?
       ORDER BY due_date ASC, created_at DESC
       LIMIT 6`,
    )
    .all(today)
    .map(serializeTask);

  const docsExpiring = db
    .prepare(
      `SELECT * FROM documents
       WHERE expiry_date IS NOT NULL AND expiry_date <= ?
       ORDER BY expiry_date ASC, uploaded_at DESC
       LIMIT 5`,
    )
    .all(nextMonth)
    .map(serializeDocument);

  const pinnedDocs = db
    .prepare(
      `SELECT * FROM documents
       WHERE is_pinned = 1
       ORDER BY uploaded_at DESC
       LIMIT 5`,
    )
    .all()
    .map(serializeDocument);

  const importantDocs = docsExpiring.length > 0 ? docsExpiring : pinnedDocs;

  const replaceSoon = db
    .prepare(
      `SELECT * FROM household_items
       WHERE status = 'active'
         AND ((replace_by_date IS NOT NULL AND replace_by_date <= ?) OR (restock_by_date IS NOT NULL AND restock_by_date <= ?))
       ORDER BY COALESCE(replace_by_date, restock_by_date) ASC, created_at DESC
       LIMIT 6`,
    )
    .all(nextMonth, nextMonth)
    .map(serializeItem);

  const recentNotes = db
    .prepare(
      `SELECT * FROM notes
       WHERE is_archived = 0
       ORDER BY is_pinned DESC, created_at DESC
       LIMIT 5`,
    )
    .all()
    .map(serializeNote);

  const dueSoonCount = upcomingBills.length;
  const tasksTodayCount = db.prepare(`SELECT COUNT(*) AS count FROM tasks WHERE status IN ('open', 'snoozed') AND due_date IS NOT NULL AND due_date <= ?`).get(today).count;
  const docsExpiringCount = db.prepare(`SELECT COUNT(*) AS count FROM documents WHERE expiry_date IS NOT NULL AND expiry_date <= ?`).get(nextMonth).count;
  const replaceSoonCount = db.prepare(`SELECT COUNT(*) AS count FROM household_items WHERE status = 'active' AND ((replace_by_date IS NOT NULL AND replace_by_date <= ?) OR (restock_by_date IS NOT NULL AND restock_by_date <= ?))`).get(nextMonth, nextMonth).count;
  const openBillsCount = db.prepare(`SELECT COUNT(*) AS count FROM bills WHERE status = 'open'`).get().count;
  const openTasksCount = db.prepare(`SELECT COUNT(*) AS count FROM tasks WHERE status IN ('open', 'snoozed')`).get().count;
  const storedDocsCount = db.prepare(`SELECT COUNT(*) AS count FROM documents`).get().count;
  const activeNotesCount = db.prepare(`SELECT COUNT(*) AS count FROM notes WHERE is_archived = 0`).get().count;

  res.json({
    metrics: {
      dueSoonCount,
      tasksTodayCount,
      docsExpiringCount,
      replaceSoonCount,
      openBillsCount,
      openTasksCount,
      storedDocsCount,
      activeNotesCount,
    },
    upcomingBills,
    tasksToday,
    importantDocs,
    replaceSoon,
    recentNotes,
  });
});

app.get("/api/agenda", (_req, res) => {
  const today = todayISO();
  const nextMonth = addDaysISO(today, 30);

  const bills = db
    .prepare(
      `SELECT * FROM bills
       WHERE status = 'open' AND due_date <= ?
       ORDER BY due_date ASC, created_at DESC
       LIMIT 8`,
    )
    .all(nextMonth)
    .map(serializeBill);

  const tasks = db
    .prepare(
      `SELECT * FROM tasks
       WHERE status IN ('open', 'snoozed') AND due_date IS NOT NULL AND due_date <= ?
       ORDER BY due_date ASC, created_at DESC
       LIMIT 8`,
    )
    .all(nextMonth)
    .map(serializeTask);

  const items = db
    .prepare(
      `SELECT * FROM household_items
       WHERE status = 'active'
         AND ((replace_by_date IS NOT NULL AND replace_by_date <= ?) OR (restock_by_date IS NOT NULL AND restock_by_date <= ?))
       ORDER BY COALESCE(replace_by_date, restock_by_date) ASC, created_at DESC
       LIMIT 8`,
    )
    .all(nextMonth, nextMonth)
    .map(serializeItem);

  const documents = db
    .prepare(
      `SELECT * FROM documents
       WHERE is_pinned = 1 OR (expiry_date IS NOT NULL AND expiry_date <= ?)
       ORDER BY COALESCE(expiry_date, '9999-12-31') ASC, uploaded_at DESC
       LIMIT 8`,
    )
    .all(nextMonth)
    .map(serializeDocument);

  res.json({ today, through: nextMonth, bills, tasks, items, documents });
});

app.get("/api/money/overview", (_req, res) => {
  const today = todayISO();
  const nextWeek = addDaysISO(today, 7);
  const nextMonth = addDaysISO(today, 30);

  const dueSoon = db
    .prepare(
      `SELECT * FROM bills
       WHERE status = 'open' AND due_date <= ?
       ORDER BY due_date ASC, created_at DESC
       LIMIT 6`,
    )
    .all(nextWeek)
    .map(serializeBill);

  const overdue = db
    .prepare(
      `SELECT * FROM bills
       WHERE status = 'open' AND due_date < ?
       ORDER BY due_date ASC, created_at DESC
       LIMIT 6`,
    )
    .all(today)
    .map(serializeBill);

  const subscriptions = db
    .prepare(
      `SELECT * FROM bills
       WHERE is_subscription = 1
       ORDER BY due_date ASC, created_at DESC
       LIMIT 6`,
    )
    .all()
    .map(serializeBill);

  const summary = {
    due_this_week: db.prepare("SELECT COUNT(*) AS count FROM bills WHERE status = 'open' AND due_date <= ?").get(nextWeek).count,
    due_this_month: db.prepare("SELECT COUNT(*) AS count FROM bills WHERE status = 'open' AND due_date <= ?").get(nextMonth).count,
    autopay_enabled: db.prepare("SELECT COUNT(*) AS count FROM bills WHERE autopay = 1").get().count,
    overdue: db.prepare("SELECT COUNT(*) AS count FROM bills WHERE status = 'open' AND due_date < ?").get(today).count,
  };

  res.json({ today, summary, dueSoon, overdue, subscriptions });
});

app.get("/api/home/overview", (_req, res) => {
  const today = todayISO();
  const nextMonth = addDaysISO(today, 30);

  const dueTasks = db
    .prepare(
      `SELECT * FROM tasks
       WHERE status IN ('open', 'snoozed') AND due_date IS NOT NULL AND due_date <= ?
       ORDER BY due_date ASC, created_at DESC
       LIMIT 6`,
    )
    .all(today)
    .map(serializeTask);

  const replaceSoon = db
    .prepare(
      `SELECT * FROM household_items
       WHERE status = 'active' AND replace_by_date IS NOT NULL AND replace_by_date <= ?
       ORDER BY replace_by_date ASC, created_at DESC
       LIMIT 6`,
    )
    .all(nextMonth)
    .map(serializeItem);

  const restockSoon = db
    .prepare(
      `SELECT * FROM household_items
       WHERE status = 'active' AND restock_by_date IS NOT NULL AND restock_by_date <= ?
       ORDER BY restock_by_date ASC, created_at DESC
       LIMIT 6`,
    )
    .all(nextMonth)
    .map(serializeItem);

  const metrics = {
    openTasksCount: db.prepare("SELECT COUNT(*) AS count FROM tasks WHERE status IN ('open', 'snoozed')").get().count,
    dueTodayCount: db.prepare("SELECT COUNT(*) AS count FROM tasks WHERE status IN ('open', 'snoozed') AND due_date IS NOT NULL AND due_date <= ?").get(today).count,
    replaceSoonCount: db.prepare("SELECT COUNT(*) AS count FROM household_items WHERE status = 'active' AND replace_by_date IS NOT NULL AND replace_by_date <= ?").get(nextMonth).count,
    restockSoonCount: db.prepare("SELECT COUNT(*) AS count FROM household_items WHERE status = 'active' AND restock_by_date IS NOT NULL AND restock_by_date <= ?").get(nextMonth).count,
  };

  res.json({ today, metrics, dueTasks, replaceSoon, restockSoon });
});

app.get("/api/docs/overview", (_req, res) => {
  const nextMonth = addDaysISO(todayISO(), 30);

  const pinned = db
    .prepare("SELECT * FROM documents WHERE is_pinned = 1 ORDER BY uploaded_at DESC LIMIT 6")
    .all()
    .map(serializeDocument);
  const expiringSoon = db
    .prepare("SELECT * FROM documents WHERE expiry_date IS NOT NULL AND expiry_date <= ? ORDER BY expiry_date ASC, uploaded_at DESC LIMIT 6")
    .all(nextMonth)
    .map(serializeDocument);
  const recent = db.prepare("SELECT * FROM documents ORDER BY uploaded_at DESC LIMIT 6").all().map(serializeDocument);

  const metrics = {
    pinnedCount: db.prepare("SELECT COUNT(*) AS count FROM documents WHERE is_pinned = 1").get().count,
    expiringSoonCount: db.prepare("SELECT COUNT(*) AS count FROM documents WHERE expiry_date IS NOT NULL AND expiry_date <= ?").get(nextMonth).count,
    storedCount: db.prepare("SELECT COUNT(*) AS count FROM documents").get().count,
  };

  res.json({ metrics, pinned, expiringSoon, recent });
});

app.get("/api/notes/overview", (_req, res) => {
  const pinned = db
    .prepare("SELECT * FROM notes WHERE is_archived = 0 AND is_pinned = 1 ORDER BY created_at DESC LIMIT 6")
    .all()
    .map(serializeNote);
  const recent = db
    .prepare("SELECT * FROM notes WHERE is_archived = 0 ORDER BY is_pinned DESC, created_at DESC LIMIT 6")
    .all()
    .map(serializeNote);
  const ideas = db
    .prepare("SELECT * FROM notes WHERE is_archived = 0 AND note_type = 'idea' ORDER BY created_at DESC LIMIT 6")
    .all()
    .map(serializeNote);

  const metrics = {
    activeCount: db.prepare("SELECT COUNT(*) AS count FROM notes WHERE is_archived = 0").get().count,
    pinnedCount: db.prepare("SELECT COUNT(*) AS count FROM notes WHERE is_archived = 0 AND is_pinned = 1").get().count,
    ideaCount: db.prepare("SELECT COUNT(*) AS count FROM notes WHERE is_archived = 0 AND note_type = 'idea'").get().count,
    archivedCount: db.prepare("SELECT COUNT(*) AS count FROM notes WHERE is_archived = 1").get().count,
  };

  res.json({ metrics, pinned, recent, ideas });
});

app.get("/api/bills", (req, res) => {
  const where = [];
  const params = [];

  if (req.query.status) {
    where.push("status = ?");
    params.push(String(req.query.status));
  }
  if (req.query.category) {
    where.push("category = ?");
    params.push(String(req.query.category));
  }
  if (req.query.source) {
    where.push("LOWER(COALESCE(payment_source, '')) LIKE ?");
    params.push(`%${String(req.query.source).toLowerCase()}%`);
  }
  if (req.query.responsibility) {
    where.push("LOWER(COALESCE(responsibility_label, '')) LIKE ?");
    params.push(`%${String(req.query.responsibility).toLowerCase()}%`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const rows = db
    .prepare(`SELECT * FROM bills ${whereSql} ORDER BY due_date ASC, created_at DESC`)
    .all(...params)
    .map(serializeBill);

  const summary = {
    due_this_week: rows.filter((bill) => bill.status === "open" && bill.due_date <= addDaysISO(todayISO(), 7)).length,
    due_this_month: rows.filter((bill) => bill.status === "open" && bill.due_date <= addDaysISO(todayISO(), 30)).length,
    autopay_enabled: rows.filter((bill) => bill.autopay_enabled).length,
    overdue: rows.filter((bill) => bill.status === "open" && bill.due_date < todayISO()).length,
  };

  res.json({ bills: rows, summary });
});

app.post("/api/bills", (req, res) => {
  const normalized = normalizeBillPayload(req.body ?? {});
  if (respondValidationError(res, normalized)) return;

  const id = randomUUID();
  db.prepare(
    `INSERT INTO bills (
      id, title, category, amount, amount_type, currency, due_date, cadence, payment_source, responsibility_label,
      autopay, status, notes, recurrence_unit, recurrence_interval, recurrence_day_of_month, recurrence_end_date, last_paid_due_date, is_subscription
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    normalized.title,
    normalized.category,
    normalized.amount,
    normalized.amount_type,
    normalized.currency,
    normalized.due_date,
    normalized.cadence,
    normalized.source,
    normalized.responsibility_label,
    boolToInt(normalized.autopay_enabled),
    normalized.status,
    normalized.notes,
    normalized.recurrence_unit,
    normalized.recurrence_interval,
    normalized.recurrence_day_of_month,
    normalized.recurrence_end_date,
    normalized.status === "paid" ? normalized.due_date : null,
    boolToInt(!!req.body?.is_subscription),
  );

  sendCreatedEntity(res, 201, "bill", "bills", serializeBill, id);
});

app.patch("/api/bills/:id", (req, res) => {
  sendActionResult(res, "bill", applyBillUpdate(req.params.id, req.body ?? {}));
});

app.post("/api/bills/:id/mark-paid", (req, res) => {
  sendActionResult(res, "bill", applyBillUpdate(req.params.id, { ...(req.body ?? {}), status: "paid" }));
});

app.post("/api/bills/:id/skip", (req, res) => {
  sendActionResult(res, "bill", applyBillUpdate(req.params.id, { ...(req.body ?? {}), status: "skipped" }));
});

app.delete("/api/bills/:id", (req, res) => {
  deleteRequiredRow(res, "bills", req.params.id);
});

app.get("/api/tasks", (_req, res) => {
  const tasks = db.prepare("SELECT * FROM tasks ORDER BY COALESCE(due_date, '9999-12-31') ASC, created_at DESC").all().map(serializeTask);
  res.json({ tasks });
});

app.post("/api/tasks", (req, res) => {
  const normalized = normalizeTaskPayload(req.body ?? {});
  if (respondValidationError(res, normalized)) return;

  const id = randomUUID();
  db.prepare(
    `INSERT INTO tasks (id, title, area, status, due_date, repeat_unit, repeat_interval, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, normalized.title, normalized.area, normalized.status, normalized.due_date, normalized.repeat_unit, normalized.repeat_interval, normalized.notes);

  sendCreatedEntity(res, 201, "task", "tasks", serializeTask, id);
});

app.patch("/api/tasks/:id", (req, res) => {
  sendActionResult(res, "task", applyTaskUpdate(req.params.id, req.body ?? {}));
});

app.post("/api/tasks/:id/complete", (req, res) => {
  const existing = getRowById("tasks", req.params.id);
  if (!existing) return res.status(404).json({ error: "not found" });
  const task = serializeTask(existing);
  const dueDate = nextTaskDueDate(task);
  const status = task.repeat_unit === "none" ? "done" : "open";
  sendActionResult(res, "task", applyTaskUpdate(req.params.id, { status, due_date: dueDate }));
});

app.post("/api/tasks/:id/snooze", (req, res) => {
  const snoozedUntil = req.body?.due_date || addDaysISO(todayISO(), Number(req.body?.days || 1));
  sendActionResult(res, "task", applyTaskUpdate(req.params.id, { status: "snoozed", due_date: snoozedUntil }));
});

app.delete("/api/tasks/:id", (req, res) => {
  deleteRequiredRow(res, "tasks", req.params.id);
});

app.get("/api/items", (_req, res) => {
  const items = db
    .prepare("SELECT * FROM household_items ORDER BY COALESCE(replace_by_date, restock_by_date, '9999-12-31') ASC, created_at DESC")
    .all()
    .map(serializeItem);
  res.json({ items });
});

app.post("/api/items", (req, res) => {
  const normalized = normalizeItemPayload(req.body ?? {});
  if (respondValidationError(res, normalized)) return;

  const id = randomUUID();
  db.prepare(
    `INSERT INTO household_items (id, name, type, status, replace_by_date, restock_by_date, location, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, normalized.name, normalized.type, normalized.status, normalized.replace_by_date, normalized.restock_by_date, normalized.location, normalized.notes);

  sendCreatedEntity(res, 201, "item", "household_items", serializeItem, id);
});

app.patch("/api/items/:id", (req, res) => {
  const existing = getRequiredRow(res, "household_items", req.params.id);
  if (!existing) return;
  const normalized = normalizeItemPayload(req.body ?? {}, serializeItem(existing));
  if (respondValidationError(res, normalized)) return;

  db.prepare(
    `UPDATE household_items
     SET name = ?, type = ?, status = ?, replace_by_date = ?, restock_by_date = ?, location = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
  ).run(normalized.name, normalized.type, normalized.status, normalized.replace_by_date, normalized.restock_by_date, normalized.location, normalized.notes, req.params.id);

  sendUpdatedEntity(res, "item", "household_items", serializeItem, req.params.id);
});

app.post("/api/items/:id/replace", (req, res) => {
  const existing = getRequiredRow(res, "household_items", req.params.id);
  if (!existing) return;
  const normalized = normalizeItemPayload({ status: "replaced", ...(req.body ?? {}) }, serializeItem(existing));
  if (respondValidationError(res, normalized)) return;

  db.prepare(
    `UPDATE household_items
     SET name = ?, type = ?, status = ?, replace_by_date = ?, restock_by_date = ?, location = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
  ).run(normalized.name, normalized.type, normalized.status, normalized.replace_by_date, normalized.restock_by_date, normalized.location, normalized.notes, req.params.id);

  sendUpdatedEntity(res, "item", "household_items", serializeItem, req.params.id);
});

app.post("/api/items/:id/restock", (req, res) => {
  const existing = getRequiredRow(res, "household_items", req.params.id);
  if (!existing) return;
  const normalized = normalizeItemPayload({ status: "restocked", ...(req.body ?? {}) }, serializeItem(existing));
  if (respondValidationError(res, normalized)) return;

  db.prepare(
    `UPDATE household_items
     SET name = ?, type = ?, status = ?, replace_by_date = ?, restock_by_date = ?, location = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
  ).run(normalized.name, normalized.type, normalized.status, normalized.replace_by_date, normalized.restock_by_date, normalized.location, normalized.notes, req.params.id);

  sendUpdatedEntity(res, "item", "household_items", serializeItem, req.params.id);
});

app.get("/api/documents", (_req, res) => {
  const documents = db
    .prepare(`SELECT * FROM documents ORDER BY is_pinned DESC, COALESCE(expiry_date, '9999-12-31') ASC, uploaded_at DESC`)
    .all()
    .map(serializeDocument);
  res.json({ documents });
});

app.post("/api/documents", upload.single("file"), (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: "file is required" });

  const title = String(req.body.title || "").trim();
  const docType = String(req.body.doc_type || "").trim();
  const category = req.body.category ? String(req.body.category).trim() : null;
  const tags = req.body.tags ? String(req.body.tags).trim() : null;
  const notes = req.body.notes ? String(req.body.notes).trim() : null;
  const expiry = normalizeOptionalDate(req.body.expiry_date, "expiry_date");
  if (expiry.error) {
    cleanupUploadedFile(file);
    return res.status(400).json({ error: expiry.error });
  }

  if (!title || !docType) {
    cleanupUploadedFile(file);
    return res.status(400).json({ error: "title and doc_type are required" });
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO documents (id, title, doc_type, category, tags, notes, file_name, stored_name, mime_type, size_bytes, is_pinned, expiry_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, title, docType, category, tags, notes, file.originalname, file.filename, file.mimetype, file.size, boolToInt(!!req.body.is_pinned), expiry.value);

  sendCreatedEntity(res, 201, "document", "documents", serializeDocument, id);
});

app.patch("/api/documents/:id", (req, res) => {
  const existing = getRequiredRow(res, "documents", req.params.id);
  if (!existing) return;

  const title = req.body.title !== undefined ? String(req.body.title || "").trim() : existing.title;
  const category = req.body.category !== undefined ? String(req.body.category || "").trim() : existing.category;
  const tags = req.body.tags !== undefined ? String(req.body.tags || "").trim() : existing.tags;
  const notes = req.body.notes !== undefined ? String(req.body.notes || "").trim() : existing.notes;
  const isPinned = req.body.is_pinned !== undefined ? !!req.body.is_pinned : intToBool(existing.is_pinned);
  const expiry = req.body.expiry_date !== undefined ? normalizeOptionalDate(req.body.expiry_date, "expiry_date") : { value: existing.expiry_date };
  if (respondValidationError(res, expiry)) return;
  if (!title) return res.status(400).json({ error: "title is required" });

  db.prepare(
    `UPDATE documents
     SET title = ?, category = ?, tags = ?, notes = ?, is_pinned = ?, expiry_date = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
  ).run(title, category || null, tags || null, notes || null, boolToInt(isPinned), expiry.value, req.params.id);

  sendUpdatedEntity(res, "document", "documents", serializeDocument, req.params.id);
});

app.post("/api/documents/:id/pin", (req, res) => {
  const existing = getRequiredRow(res, "documents", req.params.id);
  if (!existing) return;
  const nextPinned = req.body?.is_pinned !== undefined ? !!req.body.is_pinned : !intToBool(existing.is_pinned);

  db.prepare("UPDATE documents SET is_pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(boolToInt(nextPinned), req.params.id);
  sendUpdatedEntity(res, "document", "documents", serializeDocument, req.params.id);
});

app.get("/api/documents/:id/download", (req, res) => {
  const document = db.prepare("SELECT id, file_name, stored_name FROM documents WHERE id = ?").get(req.params.id);
  if (!document) return res.status(404).json({ error: "not found" });
  const absolute = path.join(FILES_DIR, document.stored_name);
  if (!existsSync(absolute)) return res.status(404).json({ error: "file missing on disk" });
  res.download(absolute, document.file_name);
});

app.delete("/api/documents/:id", (req, res) => {
  const document = db.prepare("SELECT stored_name FROM documents WHERE id = ?").get(req.params.id);
  if (!document) return res.status(404).json({ error: "not found" });
  const absolute = path.join(FILES_DIR, document.stored_name);
  if (existsSync(absolute)) {
    try {
      unlinkSync(absolute);
    } catch {
      // ignore
    }
  }
  db.prepare("DELETE FROM documents WHERE id = ?").run(req.params.id);
  res.status(204).send();
});

app.get("/api/notes", (req, res) => {
  const includeArchived = String(req.query.include_archived || "") === "1";
  const statement = includeArchived
    ? "SELECT * FROM notes ORDER BY is_archived ASC, is_pinned DESC, created_at DESC"
    : "SELECT * FROM notes WHERE is_archived = 0 ORDER BY is_pinned DESC, created_at DESC";
  const notes = db.prepare(statement).all().map(serializeNote);
  res.json({ notes });
});

app.post("/api/notes", (req, res) => {
  const normalized = normalizeNotePayload(req.body ?? {});
  if (respondValidationError(res, normalized)) return;

  const id = randomUUID();
  db.prepare(
    `INSERT INTO notes (id, title, body, note_type, tags, is_pinned, is_archived)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, normalized.title, normalized.body, normalized.note_type, normalized.tags, boolToInt(normalized.is_pinned), boolToInt(normalized.is_archived));

  sendCreatedEntity(res, 201, "note", "notes", serializeNote, id);
});

app.patch("/api/notes/:id", (req, res) => {
  const existing = getRequiredRow(res, "notes", req.params.id);
  if (!existing) return;
  const normalized = normalizeNotePayload(req.body ?? {}, serializeNote(existing));
  if (respondValidationError(res, normalized)) return;

  db.prepare(
    `UPDATE notes
     SET title = ?, body = ?, note_type = ?, tags = ?, is_pinned = ?, is_archived = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
  ).run(normalized.title, normalized.body, normalized.note_type, normalized.tags, boolToInt(normalized.is_pinned), boolToInt(normalized.is_archived), req.params.id);

  sendUpdatedEntity(res, "note", "notes", serializeNote, req.params.id);
});

app.post("/api/notes/:id/archive", (req, res) => {
  const existing = getRequiredRow(res, "notes", req.params.id);
  if (!existing) return;
  const nextArchived = req.body?.is_archived !== undefined ? !!req.body.is_archived : !intToBool(existing.is_archived);

  db.prepare("UPDATE notes SET is_archived = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(boolToInt(nextArchived), req.params.id);
  sendUpdatedEntity(res, "note", "notes", serializeNote, req.params.id);
});

app.get("/login", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.use((req, res, next) => {
  if (req.path === "/login" || req.path.startsWith("/auth/")) return next();
  if (req.path.startsWith("/api/")) return next();
  if (sessionFromRequest(req)) return next();
  return res.redirect("/login");
});

app.use(express.static(path.join(__dirname, "public")));

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "file too large (max 25 MB)" });
  }
  res.status(500).json({ error: "internal server error" });
});

app.listen(PORT, HOST, () => {
  console.log(`Family Hub listening on http://${HOST}:${PORT}`);
});
