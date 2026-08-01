import { randomUUID } from "node:crypto";
import { normalizeBillPayload } from "../domain/normalizers.js";
import { presentBill } from "../presenters/entities.js";
import { addDaysISO, nextDueDateFromRule } from "../../src/dates.js";

export function createBillService({ repository, todayISO, createId = randomUUID }) {
  const missing = () => ({ error: "not found", status: 404 });
  function update(id, payload) {
    const row = repository.findById(id);
    if (!row) return missing();
    const existing = presentBill(row);
    const normalized = normalizeBillPayload(payload, existing);
    if (normalized.error) return { error: normalized.error, status: 400 };

    let dueDate = normalized.due_date;
    let status = normalized.status;
    let lastPaidDueDate = existing.last_paid_due_date;
    const recurring = normalized.recurrence_unit !== "one_time";
    const newlyPaid = status === "paid" && existing.status !== "paid";
    const newlySkipped = status === "skipped" && existing.status !== "skipped";
    if (recurring && (newlyPaid || newlySkipped)) {
      if (newlyPaid) lastPaidDueDate = normalized.due_date;
      const proposed = nextDueDateFromRule(normalized.due_date, normalized.recurrence_unit, normalized.recurrence_interval, normalized.recurrence_day_of_month);
      if (!normalized.recurrence_end_date || proposed <= normalized.recurrence_end_date) {
        dueDate = proposed;
        status = "open";
      }
    } else if (status === "paid") {
      lastPaidDueDate = normalized.due_date;
    }

    const updated = repository.update(id, {
      ...normalized,
      due_date: dueDate,
      status,
      last_paid_due_date: lastPaidDueDate,
      is_subscription: payload?.is_subscription !== undefined ? !!payload.is_subscription : existing.is_subscription,
    });
    return { bill: presentBill(updated) };
  }

  return {
    list(filters) {
      const bills = repository.list(filters).map(presentBill);
      const today = todayISO();
      return {
        bills,
        summary: {
          due_this_week: bills.filter((bill) => bill.status === "open" && bill.due_date <= addDaysISO(today, 7)).length,
          due_this_month: bills.filter((bill) => bill.status === "open" && bill.due_date <= addDaysISO(today, 30)).length,
          autopay_enabled: bills.filter((bill) => bill.autopay_enabled).length,
          overdue: bills.filter((bill) => bill.status === "open" && bill.due_date < today).length,
        },
      };
    },
    create(payload) {
      const normalized = normalizeBillPayload(payload);
      if (normalized.error) return { error: normalized.error, status: 400 };
      const row = repository.create({ ...normalized, id: createId(), last_paid_due_date: normalized.status === "paid" ? normalized.due_date : null, is_subscription: !!payload?.is_subscription });
      return { bill: presentBill(row) };
    },
    update,
    markPaid: (id, payload) => update(id, { ...payload, status: "paid" }),
    skip: (id, payload) => update(id, { ...payload, status: "skipped" }),
    delete(id) {
      return repository.delete(id) ? { deleted: true } : missing();
    },
  };
}
