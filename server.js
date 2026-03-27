import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import express from "express";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 8787);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, "family_hub.sqlite");
const FILES_DIR = path.join(DATA_DIR, "files");
const AUTH_USERNAME = String(process.env.FAMILY_HUB_USERNAME || "family_admin");
const AUTH_PASSWORD = String(process.env.FAMILY_HUB_PASSWORD || "FamilyHub!2026");
const SESSION_COOKIE = "family_hub_session";
const sessions = new Map();

mkdirSync(FILES_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function ensureColumn(table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (cols.some((col) => col.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

function todayISO() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseCookies(cookieHeader) {
  const cookies = {};
  String(cookieHeader || "")
    .split(";")
    .map((piece) => piece.trim())
    .filter(Boolean)
    .forEach((pair) => {
      const idx = pair.indexOf("=");
      if (idx < 0) return;
      const key = decodeURIComponent(pair.slice(0, idx));
      const value = decodeURIComponent(pair.slice(idx + 1));
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

function parseISODate(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  return new Date(Date.UTC(y || 1970, (m || 1) - 1, d || 1));
}

function toISODate(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isValidISODate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ""))) return false;
  return toISODate(parseISODate(iso)) === String(iso);
}

function normalizeSchedule({ dueDate, recurrenceUnit, recurrenceInterval, recurrenceDayOfMonth, recurrenceEndDate }) {
  if (!isValidISODate(dueDate)) {
    return { error: "invalid due_date; expected YYYY-MM-DD" };
  }
  if (!["one_time", "day", "week", "month", "year"].includes(recurrenceUnit)) {
    return { error: "invalid recurrence_unit" };
  }

  const dueDay = Number(String(dueDate).slice(8, 10));
  const normalizedInterval =
    recurrenceUnit === "one_time" ? 1 : Math.max(1, Math.floor(Number(recurrenceInterval || 1)));
  const normalizedDayOfMonth =
    recurrenceUnit === "month" || recurrenceUnit === "year"
      ? recurrenceDayOfMonth
        ? Math.max(1, Math.min(31, Number(recurrenceDayOfMonth)))
        : dueDay
      : null;

  let normalizedEndDate = recurrenceEndDate ? String(recurrenceEndDate) : null;
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

function recurrenceLabel(recurrenceUnit, recurrenceInterval, recurrenceDayOfMonth) {
  if (recurrenceUnit === "one_time") return "one_time";
  const n = Math.max(1, Number(recurrenceInterval || 1));
  const unitBase = recurrenceUnit === "day" ? "day" : recurrenceUnit === "week" ? "week" : recurrenceUnit === "year" ? "year" : "month";
  const unit = n === 1 ? unitBase : `${unitBase}s`;
  if (recurrenceDayOfMonth && (recurrenceUnit === "month" || recurrenceUnit === "year")) {
    return `every ${n} ${unit} on day ${recurrenceDayOfMonth}`;
  }
  return `every ${n} ${unit}`;
}

function nextDueDateFromRule(currentDueDate, recurrenceUnit, recurrenceInterval, recurrenceDayOfMonth) {
  if (recurrenceUnit === "one_time") return currentDueDate;
  const interval = Math.max(1, Number(recurrenceInterval || 1));
  const curr = parseISODate(currentDueDate);

  if (recurrenceUnit === "day") {
    curr.setUTCDate(curr.getUTCDate() + interval);
    return toISODate(curr);
  }
  if (recurrenceUnit === "week") {
    curr.setUTCDate(curr.getUTCDate() + interval * 7);
    return toISODate(curr);
  }

  const monthDelta = recurrenceUnit === "year" ? interval * 12 : interval;
  const targetMonthIndex = curr.getUTCMonth() + monthDelta;
  const targetYear = curr.getUTCFullYear() + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const maxDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const preferredDay = recurrenceDayOfMonth ? Math.max(1, Math.min(31, Number(recurrenceDayOfMonth))) : curr.getUTCDate();
  const targetDay = Math.min(preferredDay, maxDay);
  return toISODate(new Date(Date.UTC(targetYear, targetMonth, targetDay)));
}

db.exec(`
  CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL CHECK (amount >= 0),
    due_date TEXT NOT NULL,
    cadence TEXT NOT NULL,
    payment_source TEXT,
    autopay INTEGER NOT NULL DEFAULT 0 CHECK (autopay IN (0, 1)),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid')),
    paid_on TEXT,
    last_paid_due_date TEXT,
    notes TEXT,
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
    uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(doc_type);
  CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at);
`);

ensureColumn("bills", "recurrence_unit", "recurrence_unit TEXT NOT NULL DEFAULT 'month'");
ensureColumn("bills", "recurrence_interval", "recurrence_interval INTEGER NOT NULL DEFAULT 1");
ensureColumn("bills", "recurrence_day_of_month", "recurrence_day_of_month INTEGER");
ensureColumn("bills", "recurrence_end_date", "recurrence_end_date TEXT");
ensureColumn("bills", "last_paid_due_date", "last_paid_due_date TEXT");
ensureColumn("bills", "payer_name", "payer_name TEXT");
ensureColumn("bills", "confirmer_name", "confirmer_name TEXT");

db.exec(`
  UPDATE bills SET recurrence_unit = 'one_time' WHERE cadence = 'one_time' AND recurrence_unit IS NULL;
  UPDATE bills SET recurrence_unit = 'week', recurrence_interval = 1 WHERE cadence = 'weekly' AND (recurrence_unit IS NULL OR recurrence_unit = '');
  UPDATE bills SET recurrence_unit = 'year', recurrence_interval = 1 WHERE cadence = 'yearly' AND (recurrence_unit IS NULL OR recurrence_unit = '');
  UPDATE bills SET recurrence_unit = 'month', recurrence_interval = 1 WHERE cadence = 'monthly' AND (recurrence_unit IS NULL OR recurrence_unit = '');
`);

const billCount = db.prepare("SELECT COUNT(*) AS count FROM bills").get().count;
if (billCount === 0) {
  const seed = db.prepare(`
    INSERT INTO bills (
      id, title, category, amount, due_date, cadence, recurrence_unit, recurrence_interval, recurrence_day_of_month,
      payment_source, autopay, status, notes, payer_name, confirmer_name
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)
  `);
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  seed.run(
    randomUUID(),
    "Electric Utility",
    "utility",
    165,
    `${yyyy}-${mm}-08`,
    "every 1 month on day 8",
    "month",
    1,
    8,
    "Shared Checking",
    1,
    "Shared home power bill",
    "Biswash",
    "Parent 2",
  );
  seed.run(
    randomUUID(),
    "Water + Sewer",
    "utility",
    88,
    `${yyyy}-${mm}-11`,
    "every 1 month on day 11",
    "month",
    1,
    11,
    "Shared Checking",
    1,
    "City utilities",
    "Parent 2",
    "Biswash",
  );
  seed.run(
    randomUUID(),
    "Home Internet",
    "utility",
    79,
    `${yyyy}-${mm}-13`,
    "every 1 month on day 13",
    "month",
    1,
    13,
    "Shared Card - Visa",
    1,
    "Primary internet plan",
    "Biswash",
    "Parent 2",
  );
  seed.run(
    randomUUID(),
    "Shared Card - Visa",
    "shared_card",
    620,
    `${yyyy}-${mm}-15`,
    "every 1 month on day 15",
    "month",
    1,
    15,
    "Shared Checking",
    1,
    "Statement payment",
    "Biswash",
    "Parent 2",
  );
  seed.run(
    randomUUID(),
    "Shared Card - Amex",
    "shared_card",
    410,
    `${yyyy}-${mm}-21`,
    "every 1 month on day 21",
    "month",
    1,
    21,
    "Shared Checking",
    1,
    "Statement payment",
    "Parent 2",
    "Biswash",
  );
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
  if (username !== AUTH_USERNAME || password !== AUTH_PASSWORD) {
    return res.status(401).json({ error: "invalid credentials" });
  }

  const token = createSession(username);
  setSessionCookie(res, token);
  return res.json({ ok: true, username });
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

app.get("/api/bills", (req, res) => {
  const view = String(req.query.view || "active");
  const where = [];
  const params = [];

  if (view !== "all") where.push("status = 'open'");

  if (req.query.category) {
    where.push("category = ?");
    params.push(String(req.query.category));
  }
  if (req.query.owner) {
    where.push("LOWER(COALESCE(payer_name, '')) LIKE ?");
    params.push(`%${String(req.query.owner).toLowerCase()}%`);
  }
  if (req.query.payment_source) {
    where.push("LOWER(COALESCE(payment_source, '')) LIKE ?");
    params.push(`%${String(req.query.payment_source).toLowerCase()}%`);
  }
  if (req.query.autopay === "yes") where.push("autopay = 1");
  if (req.query.autopay === "no") where.push("autopay = 0");
  if (req.query.status === "open" || req.query.status === "paid") {
    where.push("status = ?");
    params.push(String(req.query.status));
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const rows = db
    .prepare(
      `SELECT
        id, title, category, amount, due_date, cadence, recurrence_unit, recurrence_interval, recurrence_day_of_month,
        recurrence_end_date, payment_source, autopay, status, paid_on, last_paid_due_date, notes, payer_name, confirmer_name, created_at, updated_at
       FROM bills ${whereSql} ORDER BY due_date ASC, created_at DESC`,
    )
    .all(...params);
  res.json({ bills: rows });
});

app.post("/api/bills", (req, res) => {
  const {
    title,
    category,
    amount,
    due_date,
    recurrence_unit = "month",
    recurrence_interval = 1,
    recurrence_day_of_month = null,
    recurrence_end_date = null,
    payment_source = null,
    autopay = false,
    status = "open",
    paid_on = null,
    notes = null,
    payer_name = null,
    confirmer_name = null,
  } = req.body ?? {};

  if (!title || !category || typeof amount !== "number" || !due_date) {
    return res.status(400).json({ error: "title, category, amount, due_date are required" });
  }
  if (!["open", "paid"].includes(status)) {
    return res.status(400).json({ error: "invalid status" });
  }
  const schedule = normalizeSchedule({
    dueDate: due_date,
    recurrenceUnit: recurrence_unit,
    recurrenceInterval: recurrence_interval,
    recurrenceDayOfMonth: recurrence_day_of_month,
    recurrenceEndDate: recurrence_end_date,
  });
  if (schedule.error) return res.status(400).json({ error: schedule.error });

  const bill = {
    id: randomUUID(),
    title: String(title).trim(),
    category: String(category).trim(),
    amount,
    due_date: schedule.dueDate,
    recurrence_unit: schedule.recurrenceUnit,
    recurrence_interval: schedule.recurrenceInterval,
    recurrence_day_of_month: schedule.recurrenceDayOfMonth,
    recurrence_end_date: schedule.recurrenceEndDate,
    cadence: schedule.cadence,
    payment_source: payment_source ? String(payment_source) : null,
    autopay: autopay ? 1 : 0,
    status,
    paid_on: paid_on ? String(paid_on) : null,
    last_paid_due_date: paid_on ? schedule.dueDate : null,
    notes: notes ? String(notes) : null,
    payer_name: payer_name ? String(payer_name) : null,
    confirmer_name: confirmer_name ? String(confirmer_name) : null,
  };

  db.prepare(
    `INSERT INTO bills (
      id, title, category, amount, due_date, cadence, recurrence_unit, recurrence_interval, recurrence_day_of_month,
      recurrence_end_date, payment_source, autopay, status, paid_on, last_paid_due_date, notes, payer_name, confirmer_name
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    bill.id,
    bill.title,
    bill.category,
    bill.amount,
    bill.due_date,
    bill.cadence,
    bill.recurrence_unit,
    bill.recurrence_interval,
    bill.recurrence_day_of_month,
    bill.recurrence_end_date,
    bill.payment_source,
    bill.autopay,
    bill.status,
    bill.paid_on,
    bill.last_paid_due_date,
    bill.notes,
    bill.payer_name,
    bill.confirmer_name,
  );

  res.status(201).json({ bill });
});

app.patch("/api/bills/:id", (req, res) => {
  const { id } = req.params;
  const existing = db
    .prepare(
      `SELECT
        id, title, category, amount, due_date, payment_source, autopay, status, paid_on, last_paid_due_date, notes, recurrence_end_date,
        recurrence_unit, recurrence_interval, recurrence_day_of_month, cadence, payer_name, confirmer_name
       FROM bills WHERE id = ?`,
    )
    .get(id);
  if (!existing) return res.status(404).json({ error: "not found" });

  const allowed = [
    "title",
    "category",
    "amount",
    "due_date",
    "payment_source",
    "autopay",
    "status",
    "paid_on",
    "notes",
    "recurrence_unit",
    "recurrence_interval",
    "recurrence_day_of_month",
    "recurrence_end_date",
    "payer_name",
    "confirmer_name",
  ];
  const patch = req.body ?? {};
  const keys = Object.keys(patch).filter((key) => allowed.includes(key));
  if (keys.length === 0) return res.status(400).json({ error: "no updatable fields provided" });

  const merged = {
    ...existing,
    ...patch,
  };
  if (patch.status && !["open", "paid"].includes(String(patch.status))) {
    return res.status(400).json({ error: "invalid status" });
  }
  const schedule = normalizeSchedule({
    dueDate: String(merged.due_date),
    recurrenceUnit: String(merged.recurrence_unit || "month"),
    recurrenceInterval: merged.recurrence_interval,
    recurrenceDayOfMonth: merged.recurrence_day_of_month,
    recurrenceEndDate: merged.recurrence_end_date,
  });
  if (schedule.error) return res.status(400).json({ error: schedule.error });

  let effectiveStatus = merged.status;
  let effectiveDueDate = schedule.dueDate;
  let effectivePaidOn = merged.paid_on ? String(merged.paid_on) : null;
  let effectiveLastPaidDueDate = merged.last_paid_due_date ? String(merged.last_paid_due_date) : null;
  const effectiveEndDate = schedule.recurrenceEndDate;

  if (patch.status === "paid") {
    effectiveLastPaidDueDate = effectiveDueDate;
  }

  if (patch.status === "paid" && schedule.recurrenceUnit !== "one_time") {
    const proposedNext = nextDueDateFromRule(
      effectiveDueDate,
      schedule.recurrenceUnit,
      schedule.recurrenceInterval,
      schedule.recurrenceDayOfMonth,
    );
    if (effectiveEndDate && proposedNext > effectiveEndDate) {
      effectiveStatus = "paid";
      effectivePaidOn = todayISO();
    } else {
      effectiveDueDate = proposedNext;
      effectiveStatus = "open";
      effectivePaidOn = todayISO();
    }
  }

  const updateData = {
    title: merged.title,
    category: merged.category,
    amount: merged.amount,
    due_date: effectiveDueDate,
    payment_source: merged.payment_source ?? null,
    autopay: merged.autopay ? 1 : 0,
    status: effectiveStatus,
    paid_on: effectivePaidOn,
    last_paid_due_date: effectiveLastPaidDueDate,
    notes: merged.notes ?? null,
    recurrence_unit: schedule.recurrenceUnit,
    recurrence_interval: schedule.recurrenceInterval,
    recurrence_day_of_month: schedule.recurrenceDayOfMonth,
    recurrence_end_date: effectiveEndDate,
    cadence: recurrenceLabel(schedule.recurrenceUnit, schedule.recurrenceInterval, schedule.recurrenceDayOfMonth),
    payer_name: merged.payer_name ?? null,
    confirmer_name: merged.confirmer_name ?? null,
  };

  db.prepare(
    `UPDATE bills
      SET title = ?, category = ?, amount = ?, due_date = ?, payment_source = ?, autopay = ?, status = ?, paid_on = ?,
          last_paid_due_date = ?, notes = ?, recurrence_unit = ?, recurrence_interval = ?, recurrence_day_of_month = ?, cadence = ?,
          recurrence_end_date = ?, payer_name = ?, confirmer_name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
  ).run(
    updateData.title,
    updateData.category,
    updateData.amount,
    updateData.due_date,
    updateData.payment_source,
    updateData.autopay,
    updateData.status,
    updateData.paid_on,
    updateData.last_paid_due_date,
    updateData.notes,
    updateData.recurrence_unit,
    updateData.recurrence_interval,
    updateData.recurrence_day_of_month,
    updateData.cadence,
    updateData.recurrence_end_date,
    updateData.payer_name,
    updateData.confirmer_name,
    id,
  );

  const bill = db
    .prepare(
      `SELECT
        id, title, category, amount, due_date, cadence, recurrence_unit, recurrence_interval, recurrence_day_of_month,
        recurrence_end_date, payment_source, autopay, status, paid_on, last_paid_due_date, notes, payer_name, confirmer_name, created_at, updated_at
       FROM bills WHERE id = ?`,
    )
    .get(id);
  res.json({ bill });
});

app.delete("/api/bills/:id", (req, res) => {
  const { id } = req.params;
  const info = db.prepare("DELETE FROM bills WHERE id = ?").run(id);
  if (info.changes < 1) return res.status(404).json({ error: "not found" });
  res.status(204).send();
});

app.get("/api/documents", (_req, res) => {
  const documents = db
    .prepare(
      `SELECT id, title, doc_type, category, tags, notes, file_name, stored_name, mime_type, size_bytes, uploaded_at
       FROM documents ORDER BY uploaded_at DESC`,
    )
    .all();
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

  if (!title || !docType) {
    try {
      unlinkSync(file.path);
    } catch {
      // ignore
    }
    return res.status(400).json({ error: "title and doc_type are required" });
  }

  const document = {
    id: randomUUID(),
    title,
    doc_type: docType,
    category,
    tags,
    notes,
    file_name: file.originalname,
    stored_name: file.filename,
    mime_type: file.mimetype,
    size_bytes: file.size,
  };

  db.prepare(
    `INSERT INTO documents (id, title, doc_type, category, tags, notes, file_name, stored_name, mime_type, size_bytes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    document.id,
    document.title,
    document.doc_type,
    document.category,
    document.tags,
    document.notes,
    document.file_name,
    document.stored_name,
    document.mime_type,
    document.size_bytes,
  );

  res.status(201).json({ document });
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
      // ignore file cleanup errors
    }
  }
  db.prepare("DELETE FROM documents WHERE id = ?").run(req.params.id);
  res.status(204).send();
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

app.get("*", (req, res) => {
  if (!sessionFromRequest(req)) return res.redirect("/login");
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "file too large (max 25 MB)" });
  }
  res.status(500).json({ error: "internal server error" });
});

app.listen(PORT, () => {
  console.log(`Family Hub listening on http://localhost:${PORT}`);
});
