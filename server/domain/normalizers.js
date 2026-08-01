import { isValidISODate } from "../../src/dates.js";

const BILL_AMOUNT_TYPES = new Set(["fixed", "estimated", "variable", "unknown"]);

export function normalizeOptionalDate(value, fieldName) {
  if (value === undefined || value === null || value === "") return { value: null };
  const date = String(value).trim();
  if (!isValidISODate(date)) return { error: `invalid ${fieldName}; expected YYYY-MM-DD` };
  return { value: date };
}

export function recurrenceLabel(recurrenceUnit, recurrenceInterval, recurrenceDayOfMonth) {
  if (recurrenceUnit === "one_time") return "one_time";
  const interval = Math.max(1, Number(recurrenceInterval || 1));
  const unitBase = recurrenceUnit === "day" ? "day" : recurrenceUnit === "week" ? "week" : recurrenceUnit === "year" ? "year" : "month";
  const unit = interval === 1 ? unitBase : `${unitBase}s`;
  if (recurrenceDayOfMonth && (recurrenceUnit === "month" || recurrenceUnit === "year")) return `every ${interval} ${unit} on day ${recurrenceDayOfMonth}`;
  return `every ${interval} ${unit}`;
}

export function normalizeSchedule({ dueDate, recurrenceUnit, recurrenceInterval, recurrenceDayOfMonth, recurrenceEndDate }) {
  if (!isValidISODate(dueDate)) return { error: "invalid due_date; expected YYYY-MM-DD" };
  if (!["one_time", "day", "week", "month", "year"].includes(String(recurrenceUnit))) return { error: "invalid recurrence_unit" };

  const dueDay = Number(String(dueDate).slice(8, 10));
  const normalizedInterval = recurrenceUnit === "one_time" ? 1 : Math.max(1, Math.floor(Number(recurrenceInterval || 1)));
  const normalizedDayOfMonth = recurrenceUnit === "month" || recurrenceUnit === "year" ? (recurrenceDayOfMonth ? Math.max(1, Math.min(31, Number(recurrenceDayOfMonth))) : dueDay) : null;
  const normalizedEndDate = recurrenceEndDate ? String(recurrenceEndDate) : null;
  if (normalizedEndDate && !isValidISODate(normalizedEndDate)) return { error: "invalid recurrence_end_date; expected YYYY-MM-DD" };
  if (normalizedEndDate && normalizedEndDate < dueDate) return { error: "recurrence_end_date must be on or after due_date" };

  return {
    dueDate: String(dueDate),
    recurrenceUnit: String(recurrenceUnit),
    recurrenceInterval: normalizedInterval,
    recurrenceDayOfMonth: normalizedDayOfMonth,
    recurrenceEndDate: normalizedEndDate,
    cadence: recurrenceLabel(recurrenceUnit, normalizedInterval, normalizedDayOfMonth),
  };
}

export function normalizeBillPayload(payload, existing = null) {
  const title = payload.title !== undefined ? String(payload.title || "").trim() : existing?.title;
  const category = payload.category !== undefined ? String(payload.category || "").trim() : existing?.category;
  const source = payload.source !== undefined ? String(payload.source || "").trim() : existing?.source;
  const responsibilityLabel = payload.responsibility_label !== undefined ? String(payload.responsibility_label || "").trim() : existing?.responsibility_label;
  const notes = payload.notes !== undefined ? String(payload.notes || "").trim() : existing?.notes;
  const status = payload.status !== undefined ? String(payload.status || "") : existing?.status || "open";
  const autopayEnabled = payload.autopay_enabled !== undefined ? !!payload.autopay_enabled : !!existing?.autopay_enabled;
  const amountType = payload.amount_type !== undefined ? String(payload.amount_type || "").trim() : existing?.amount_type || "fixed";
  const hasAmountPayload = payload.amount !== undefined && payload.amount !== null && String(payload.amount).trim() !== "";
  const amountRaw = hasAmountPayload ? Number(payload.amount) : existing && payload.amount === undefined ? existing.amount : null;
  const currency = payload.currency !== undefined ? String(payload.currency || "").trim().toUpperCase() : existing?.currency || "USD";
  const schedule = normalizeSchedule({
    dueDate: payload.due_date !== undefined ? payload.due_date : existing?.due_date,
    recurrenceUnit: payload.recurrence_unit !== undefined ? payload.recurrence_unit : existing?.recurrence_unit || "month",
    recurrenceInterval: payload.recurrence_interval !== undefined ? payload.recurrence_interval : existing?.recurrence_interval || 1,
    recurrenceDayOfMonth: payload.recurrence_day_of_month !== undefined ? payload.recurrence_day_of_month : existing?.recurrence_day_of_month ?? null,
    recurrenceEndDate: payload.recurrence_end_date !== undefined ? payload.recurrence_end_date : existing?.recurrence_end_date ?? null,
  });
  if (schedule.error) return schedule;
  if (!title) return { error: "title is required" };
  if (!category) return { error: "category is required" };
  if (!BILL_AMOUNT_TYPES.has(amountType)) return { error: "invalid amount type" };
  if (amountRaw !== null && (!Number.isFinite(Number(amountRaw)) || Number(amountRaw) < 0)) return { error: "amount must be a non-negative number" };
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

export function normalizeTaskPayload(payload, existing = null) {
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
  return { title, area: area || null, status, due_date: dueDate.value, repeat_unit: repeatUnit, repeat_interval: repeatUnit === "none" ? 1 : repeatInterval, notes: notes || null };
}

export function normalizeItemPayload(payload, existing = null) {
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
  if (!["filter", "battery", "supply", "appliance_part", "pantry", "cleaning", "other"].includes(type)) return { error: "invalid type" };
  if (!["active", "replaced", "restocked", "archived"].includes(status)) return { error: "invalid status" };
  return { name, type, status, replace_by_date: replaceByDate.value, restock_by_date: restockByDate.value, location: location || null, notes: notes || null };
}

export function normalizeNotePayload(payload, existing = null) {
  const title = payload.title !== undefined ? String(payload.title || "").trim() : existing?.title;
  const body = payload.body !== undefined ? String(payload.body || "").trim() : existing?.body;
  const noteType = payload.note_type !== undefined ? String(payload.note_type || "") : existing?.note_type || "quick_note";
  const tags = payload.tags !== undefined ? String(payload.tags || "").trim() : existing?.tags;
  const isPinned = payload.is_pinned !== undefined ? !!payload.is_pinned : !!existing?.is_pinned;
  const isArchived = payload.is_archived !== undefined ? !!payload.is_archived : !!existing?.is_archived;
  if (!title) return { error: "title is required" };
  if (!body) return { error: "body is required" };
  if (!["quick_note", "checklist", "reference", "idea"].includes(noteType)) return { error: "invalid note_type" };
  return { title, body, note_type: noteType, tags: tags || null, is_pinned: isPinned, is_archived: isArchived };
}
