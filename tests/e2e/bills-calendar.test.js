import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import puppeteer from "puppeteer";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(fn, timeoutMs = 10000, label = "condition") {
  const start = Date.now();
  let lastError = null;
  while (Date.now() - start < timeoutMs) {
    try {
      const value = await fn();
      if (value) return value;
    } catch (err) {
      lastError = err;
    }
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${label}${lastError ? `: ${String(lastError.message || lastError)}` : ""}`);
}

function addDaysIsoUTC(isoDate, days) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + days);
  const yy = base.getUTCFullYear();
  const mm = String(base.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(base.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function todayIsoLocal() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function currentMonthIsoDay(day) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function setInputValue(page, selector, value) {
  await page.$eval(
    selector,
    (el, v) => {
      el.focus();
      el.value = "";
      el.value = String(v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    },
    value,
  );
}

async function login(page, baseUrl) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle0" });
  await setInputValue(page, "#username", "family_admin");
  await setInputValue(page, "#password", "FamilyHub!2026");
  await page.click('button[type="submit"]');
  await page.waitForSelector("#billOpenEditorBtn");
}

test("Bills modal, recurrence projection, and pay advancement", async (t) => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "family-hub-e2e-"));
  const port = 9900 + Math.floor(Math.random() * 400);
  const baseUrl = `http://127.0.0.1:${port}`;

  const server = spawn("node", ["server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: tempRoot,
      DB_PATH: path.join(tempRoot, "family_hub_test.sqlite"),
    },
    stdio: "pipe",
  });

  await t.test("server boots", async () => {
    await waitFor(async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      return res.ok;
    }, 15000, "api health");
  });

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(12000);

    await t.test("modal starts closed, draft persists on close, reset clears draft", async () => {
      await login(page, baseUrl);
      await page.waitForSelector("#billModal.hidden");

      await page.click("#billOpenEditorBtn");
      await page.waitForSelector("#billModal:not(.hidden)");

      const draftTitle = `Draft ${Date.now()}`;
      await setInputValue(page, "#billTitle", draftTitle);
      await page.click("#billModalCloseBtn");
      await page.waitForSelector("#billModal.hidden");

      await page.click("#billOpenEditorBtn");
      await page.waitForSelector("#billModal:not(.hidden)");
      const restored = await page.$eval("#billTitle", (el) => el.value);
      assert.equal(restored, draftTitle);

      await page.click("#billResetBtn");
      const resetValue = await page.$eval("#billTitle", (el) => el.value);
      assert.equal(resetValue, "");
      await page.click("#billModalCloseBtn");
    });

    await t.test("every 3 months recurrence projects into future calendar month", async () => {
      const title = `Quarterly Water ${Date.now()}`;
      await page.click("#billOpenEditorBtn");
      await page.waitForSelector("#billModal:not(.hidden)");
      await setInputValue(page, "#billTitle", title);
      await page.select("#billCategory", "utility");
      await setInputValue(page, "#billAmount", "111");
      await setInputValue(page, "#billDueDate", currentMonthIsoDay(10));
      await setInputValue(page, "#billRecurrenceInterval", "3");
      await page.select("#billRecurrenceUnit", "month");
      await setInputValue(page, "#billRecurrenceDayOfMonth", "10");
      await page.click("#billSubmitBtn");
      await page.waitForSelector("#billModal.hidden");

      await page.waitForSelector(`button[title="Edit ${title}"]`);
      await page.click("#billCalNextBtn");
      await page.click("#billCalNextBtn");
      await page.click("#billCalNextBtn");
      await page.waitForSelector(`button[title="Edit ${title}"]`);
    });

    await t.test("pay action advances recurring due date", async () => {
      const title = `Biweekly Pay ${Date.now()}`;
      const startDue = todayIsoLocal();
      const expectedNextDue = addDaysIsoUTC(startDue, 14);

      await page.click("#billOpenEditorBtn");
      await page.waitForSelector("#billModal:not(.hidden)");
      await setInputValue(page, "#billTitle", title);
      await page.select("#billCategory", "other");
      await setInputValue(page, "#billAmount", "77");
      await setInputValue(page, "#billDueDate", startDue);
      await setInputValue(page, "#billRecurrenceInterval", "2");
      await page.select("#billRecurrenceUnit", "week");
      await page.click("#billSubmitBtn");
      await page.waitForSelector("#billModal.hidden");

      const id = await waitFor(async () => {
        return page.evaluate((billTitle) => {
          const rows = Array.from(document.querySelectorAll("#billRows tr"));
          const row = rows.find((item) => item.textContent && item.textContent.includes(billTitle));
          if (!row) return null;
          const editBtn = row.querySelector('button[data-action="edit"]');
          return editBtn?.dataset?.id || null;
        }, title);
      }, 10000, "newly created bill row id");

      await page.click(`button[data-action="mark-paid"][data-id="${id}"]`);

      await waitFor(async () => {
        const bill = await page.evaluate(async (billId) => {
          const res = await fetch("/api/bills?view=all");
          if (!res.ok) return null;
          const json = await res.json();
          return (json.bills || []).find((item) => item.id === billId) || null;
        }, id);
        if (!bill) return false;
        return bill.due_date === expectedNextDue && bill.status === "open";
      }, 12000, "paid recurrence advancement");
    });
  } finally {
    await browser.close();
    if (!server.killed) {
      server.kill("SIGTERM");
      server.kill("SIGKILL");
    }
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
