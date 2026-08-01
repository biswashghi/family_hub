import { randomUUID } from "node:crypto";
import { recurrenceLabel } from "../domain/normalizers.js";
import { addDaysISO, parseISODate } from "../../src/dates.js";
import { runMigrations } from "./migrations.js";

export function initializeDatabase({ db, seedDemoData, todayISO }) {
  function ensureColumn(table, column, ddl) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all();
    if (cols.some((col) => col.name === column)) return;
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
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

  runMigrations(db, [
    { version: 1, name: "baseline schema and legacy compatibility migrations", up: createSchema },
  ]);
  if (seedDemoData) {
    seedData();
  }
}
