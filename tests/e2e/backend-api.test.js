import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadConfig } from "../../src/config.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withEnv(patch, fn) {
  const previous = {};
  for (const key of Object.keys(patch)) {
    previous[key] = process.env[key];
    if (patch[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = patch[key];
    }
  }
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

async function waitFor(fn, timeoutMs = 10000, label = "condition") {
  const start = Date.now();
  let lastError = null;
  while (Date.now() - start < timeoutMs) {
    try {
      const value = await fn();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${label}${lastError ? `: ${String(lastError.message || lastError)}` : ""}`);
}

function addDaysISO(iso, days) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

async function startServer() {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "family-hub-api-"));
  const port = 10300 + Math.floor(Math.random() * 400);
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawn("node", ["server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      DATA_DIR: tempRoot,
      DB_PATH: path.join(tempRoot, "family_hub_test.sqlite"),
      FAMILY_HUB_TIME_ZONE: "America/Detroit",
    },
    stdio: "pipe",
  });

  let logs = "";
  server.stdout.on("data", (chunk) => {
    logs += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    logs += chunk.toString();
  });

  await waitFor(async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    return response.ok;
  }, 15000, "api health");

  return { baseUrl, tempRoot, server, getLogs: () => logs };
}

async function stopServer(context) {
  if (!context.server.killed) {
    context.server.kill("SIGTERM");
    await sleep(300);
    if (!context.server.killed) context.server.kill("SIGKILL");
  }
  rmSync(context.tempRoot, { recursive: true, force: true });
}

async function login(baseUrl) {
  const setupStatus = await fetch(`${baseUrl}/auth/status`);
  assert.equal(setupStatus.status, 200);
  const status = await setupStatus.json();
  if (status.setup_required) {
    const setupResponse = await fetch(`${baseUrl}/auth/setup`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "family_admin", password: "FamilyHub!2026" }),
    });
    assert.equal(setupResponse.status, 201);
    const setupCookie = setupResponse.headers.get("set-cookie");
    assert.ok(setupCookie);
    return setupCookie.split(";")[0];
  }

  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "family_admin", password: "FamilyHub!2026" }),
  });
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie");
  assert.ok(cookie);
  return cookie.split(";")[0];
}

async function demoLogin(baseUrl) {
  const response = await fetch(`${baseUrl}/auth/demo`, { method: "POST" });
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie");
  assert.ok(cookie);
  return cookie.split(";")[0];
}

async function api(baseUrl, cookie, pathName, options = {}) {
  const response = await fetch(`${baseUrl}${pathName}`, {
    ...options,
    headers: {
      cookie,
      ...(options.body && !(options.body instanceof FormData) ? { "content-type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : null;
  return { response, body };
}

test("backend workflow actions support richer frontend use cases", async () => {
  const context = await startServer();
  try {
    const cookie = await login(context.baseUrl);
    const dueDate = "2026-07-14";

    const createdBill = await api(context.baseUrl, cookie, "/api/bills", {
      method: "POST",
      body: JSON.stringify({
        title: "API recurring bill",
        category: "utility",
        amount: 42,
        currency: "USD",
        due_date: dueDate,
        recurrence_unit: "week",
        recurrence_interval: 2,
      }),
    });
    assert.equal(createdBill.response.status, 201);

    const paid = await api(context.baseUrl, cookie, `/api/bills/${createdBill.body.bill.id}/mark-paid`, { method: "POST" });
    assert.equal(paid.response.status, 200);
    assert.equal(paid.body.bill.status, "open");
    assert.equal(paid.body.bill.last_paid_due_date, dueDate);
    assert.equal(paid.body.bill.due_date, addDaysISO(dueDate, 14));

    const skipped = await api(context.baseUrl, cookie, `/api/bills/${createdBill.body.bill.id}/skip`, { method: "POST" });
    assert.equal(skipped.response.status, 200);
    assert.equal(skipped.body.bill.status, "open");
    assert.equal(skipped.body.bill.due_date, addDaysISO(dueDate, 28));

    const unknownAmountBill = await api(context.baseUrl, cookie, "/api/bills", {
      method: "POST",
      body: JSON.stringify({
        title: "Variable utility bill",
        category: "utility",
        amount: null,
        amount_type: "unknown",
        currency: "USD",
        due_date: dueDate,
      }),
    });
    assert.equal(unknownAmountBill.response.status, 201);
    assert.equal(unknownAmountBill.body.bill.amount, null);
    assert.equal(unknownAmountBill.body.bill.amount_type, "unknown");

    const createdTask = await api(context.baseUrl, cookie, "/api/tasks", {
      method: "POST",
      body: JSON.stringify({
        title: "API recurring task",
        area: "kitchen",
        due_date: dueDate,
        repeat_unit: "week",
        repeat_interval: 1,
      }),
    });
    assert.equal(createdTask.response.status, 201);

    const completedTask = await api(context.baseUrl, cookie, `/api/tasks/${createdTask.body.task.id}/complete`, { method: "POST" });
    assert.equal(completedTask.response.status, 200);
    assert.equal(completedTask.body.task.status, "open");
    assert.equal(completedTask.body.task.due_date, addDaysISO(dueDate, 7));

    const snoozedTask = await api(context.baseUrl, cookie, `/api/tasks/${createdTask.body.task.id}/snooze`, {
      method: "POST",
      body: JSON.stringify({ days: 3 }),
    });
    assert.equal(snoozedTask.response.status, 200);
    assert.equal(snoozedTask.body.task.status, "snoozed");

    const createdNote = await api(context.baseUrl, cookie, "/api/notes", {
      method: "POST",
      body: JSON.stringify({ title: "API note", body: "Archive me", note_type: "quick_note" }),
    });
    assert.equal(createdNote.response.status, 201);

    const archivedNote = await api(context.baseUrl, cookie, `/api/notes/${createdNote.body.note.id}/archive`, { method: "POST" });
    assert.equal(archivedNote.response.status, 200);
    assert.equal(archivedNote.body.note.is_archived, true);

    for (const endpoint of ["/api/agenda", "/api/money/overview", "/api/home/overview", "/api/docs/overview", "/api/notes/overview"]) {
      const overview = await api(context.baseUrl, cookie, endpoint);
      assert.equal(overview.response.status, 200, `${endpoint} should return 200`);
      assert.ok(overview.body, `${endpoint} should return a JSON body`);
    }

    const moneyOverview = await api(context.baseUrl, cookie, "/api/money/overview");
    assert.equal(typeof moneyOverview.body.summary.due_this_week, "number");

    const homeOverview = await api(context.baseUrl, cookie, "/api/home/overview");
    assert.equal(typeof homeOverview.body.metrics.openTasksCount, "number");
  } finally {
    await stopServer(context);
  }
});

test("demo login is read-only and uses sample data", async () => {
  const context = await startServer();
  try {
    const cookie = await demoLogin(context.baseUrl);

    const session = await api(context.baseUrl, cookie, "/api/session");
    assert.equal(session.response.status, 200);
    assert.equal(session.body.demo, true);

    const dashboard = await api(context.baseUrl, cookie, "/api/dashboard");
    assert.equal(dashboard.response.status, 200);
    assert.ok(dashboard.body.upcomingBills.length > 0);
    assert.ok(dashboard.body.tasksToday.length > 0);

    const createBill = await api(context.baseUrl, cookie, "/api/bills", {
      method: "POST",
      body: JSON.stringify({
        title: "Should not save",
        category: "utility",
        amount: 1,
        currency: "USD",
        due_date: "2026-07-14",
      }),
    });
    assert.equal(createBill.response.status, 403);
    assert.match(createBill.body.error, /read-only/i);

    const realCookie = await login(context.baseUrl);
    const realBills = await api(context.baseUrl, realCookie, "/api/bills");
    assert.equal(realBills.response.status, 200);
    assert.equal(realBills.body.bills.length, 0);
  } finally {
    await stopServer(context);
  }
});

test("production config no longer requires env credentials", () => {
  const config = withEnv(
    {
      NODE_ENV: "production",
    },
    () => loadConfig(process.cwd()),
  );
  assert.equal(config.nodeEnv, "production");
});

test("invalid document metadata cleans up uploaded file", async () => {
  const context = await startServer();
  try {
    const cookie = await login(context.baseUrl);
    const form = new FormData();
    form.set("title", "Bad expiry");
    form.set("doc_type", "txt");
    form.set("expiry_date", "not-a-date");
    form.set("file", new Blob(["temporary upload"], { type: "text/plain" }), "bad-expiry.txt");

    const result = await api(context.baseUrl, cookie, "/api/documents", {
      method: "POST",
      body: form,
    });

    assert.equal(result.response.status, 400);
    assert.match(result.body.error, /invalid expiry_date/);
    assert.deepEqual(readdirSync(path.join(context.tempRoot, "files")), []);
  } finally {
    await stopServer(context);
  }
});
