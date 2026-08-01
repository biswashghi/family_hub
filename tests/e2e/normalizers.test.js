import test from "node:test";
import assert from "node:assert/strict";
import { normalizeBillPayload, normalizeItemPayload, normalizeNotePayload, normalizeTaskPayload } from "../../server/domain/normalizers.js";

test("entity normalizers enforce API rules independently of Express", () => {
  assert.match(normalizeBillPayload({ title: "Bill", category: "utility", amount: null, amount_type: "fixed", due_date: "2026-08-01", recurrence_unit: "month" }).error, /fixed amount/);
  assert.equal(normalizeBillPayload({ title: "Bill", category: "utility", amount: null, amount_type: "unknown", due_date: "2026-08-01", recurrence_unit: "month" }).amount, null);
  assert.match(normalizeTaskPayload({ title: "Task", status: "invalid" }).error, /status/);
  assert.match(normalizeItemPayload({ name: "Filter", type: "invalid" }).error, /type/);
  assert.match(normalizeNotePayload({ title: "Note", body: "" }).error, /body/);
});

test("partial updates preserve existing values", () => {
  const existing = { title: "Original", area: "kitchen", status: "open", due_date: "2026-08-01", repeat_unit: "week", repeat_interval: 2, notes: "keep" };
  assert.deepEqual(normalizeTaskPayload({ status: "snoozed" }, existing), { ...existing, status: "snoozed" });
});
