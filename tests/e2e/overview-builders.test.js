import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBillSummary,
  buildDashboardOverview,
  buildDocsOverview,
  buildHomeOverview,
  buildMoneyOverview,
  buildNotesOverview,
} from "../../server/services/overview-builders.js";

const today = "2026-08-01";
const bills = [
  { id: "overdue", status: "open", due_date: "2026-07-31", autopay_enabled: false, is_subscription: false },
  { id: "soon", status: "open", due_date: "2026-08-04", autopay_enabled: true, is_subscription: true },
  { id: "later", status: "open", due_date: "2026-08-20", autopay_enabled: false, is_subscription: false },
];
const tasks = [
  { id: "due", status: "open", due_date: today, created_at: today },
  { id: "future", status: "open", due_date: "2026-08-02", created_at: today },
];
const items = [
  { id: "replace", status: "active", replace_by_date: "2026-08-10", restock_by_date: null, created_at: today },
  { id: "restock", status: "active", replace_by_date: null, restock_by_date: "2026-08-12", created_at: today },
];
const documents = [
  { id: "pinned", is_pinned: true, expiry_date: null, created_at: today },
  { id: "expiring", is_pinned: false, expiry_date: "2026-08-15", created_at: today },
];
const notes = [
  { id: "idea", note_type: "idea", is_pinned: true, is_archived: false, created_at: today },
  { id: "archived", note_type: "reference", is_pinned: false, is_archived: true, created_at: today },
];

test("overview builders use the same uncapped metrics and bounded record lists", () => {
  assert.deepEqual(buildBillSummary(bills, today), { due_this_week: 2, due_this_month: 3, autopay_enabled: 1, overdue: 1 });
  assert.equal(buildMoneyOverview({ today, bills }).dueSoon.length, 2);
  assert.equal(buildHomeOverview({ today, tasks, items }).metrics.openTasksCount, 2);
  assert.equal(buildDocsOverview({ today, documents }).metrics.expiringSoonCount, 1);
  assert.equal(buildNotesOverview({ notes }).metrics.archivedCount, 1);

  const dashboard = buildDashboardOverview({ today, bills, tasks, items, documents, notes });
  assert.equal(dashboard.metrics.openBillsCount, 3);
  assert.deepEqual(dashboard.importantDocs.map((document) => document.id), ["expiring"]);
  assert.deepEqual(dashboard.replaceSoon.map((item) => item.id), ["replace", "restock"]);
});
