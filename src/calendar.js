import { addDaysISO, isValidISODate, nextDueDateFromRule } from "./dates.js";

export const MAX_AGENDA_RANGE_DAYS = 84;

const KIND_ORDER = { bill: 0, task: 1, item: 2, document: 3 };

export function resolveAgendaRange(query, today) {
  const from = String(query?.from || today);
  const through = String(query?.through || addDaysISO(from, 30));
  if (!isValidISODate(from) || !isValidISODate(through)) return { error: "from and through must be valid YYYY-MM-DD dates" };
  if (through < from) return { error: "through must be on or after from" };
  if (addDaysISO(from, MAX_AGENDA_RANGE_DAYS) < through) return { error: `agenda range cannot exceed ${MAX_AGENDA_RANGE_DAYS} days` };
  return { from, through };
}

function inRange(iso, from, through) {
  return !!iso && iso >= from && iso <= through;
}

function rangeIncludesToday(today, from, through) {
  return today >= from && today <= through;
}

function makeEvent({ kind, source, action = "due", scheduledDate, displayDate = scheduledDate, today, isForecast = false, isOverdue = false }) {
  return {
    id: `${kind}:${source.id}:${action}:${scheduledDate}`,
    kind,
    source_id: source.id,
    action,
    title: kind === "item" ? source.name : source.title,
    scheduled_date: scheduledDate,
    display_date: displayDate,
    original_due_date: isOverdue ? scheduledDate : null,
    is_forecast: isForecast,
    is_overdue: isOverdue,
    is_actionable: !isForecast,
    source,
    today,
  };
}

function pushPersistedOrOverdue(events, { kind, source, action, scheduledDate, today, from, through }) {
  if (!scheduledDate) return;
  if (scheduledDate < today) {
    if (rangeIncludesToday(today, from, through)) {
      events.push(makeEvent({ kind, source, action, scheduledDate, displayDate: today, today, isOverdue: true }));
    }
    return;
  }
  if (inRange(scheduledDate, from, through)) {
    events.push(makeEvent({ kind, source, action, scheduledDate, today }));
  }
}

function expandFutureOccurrences({ kind, source, action, startDate, recurrenceUnit, recurrenceInterval, recurrenceDayOfMonth, recurrenceEndDate, today, from, through, noneUnit }) {
  if (!startDate || !recurrenceUnit || recurrenceUnit === noneUnit) return [];
  const events = [];
  let occurrence = startDate;
  let attempts = 0;
  while (attempts < 500) {
    attempts += 1;
    const next = nextDueDateFromRule(occurrence, recurrenceUnit, recurrenceInterval, recurrenceDayOfMonth);
    if (next === occurrence || (recurrenceEndDate && next > recurrenceEndDate) || next > through) break;
    occurrence = next;
    if (occurrence >= from) {
      events.push(makeEvent({ kind, source, action, scheduledDate: occurrence, today, isForecast: true }));
    }
  }
  return events;
}

export function buildCalendarEvents({ today, from, through, bills = [], tasks = [], items = [], documents = [] }) {
  const events = [];

  for (const bill of bills) {
    if (bill.status !== "open") continue;
    pushPersistedOrOverdue(events, { kind: "bill", source: bill, action: "due", scheduledDate: bill.due_date, today, from, through });
    events.push(
      ...expandFutureOccurrences({
        kind: "bill",
        source: bill,
        action: "due",
        startDate: bill.due_date,
        recurrenceUnit: bill.recurrence_unit,
        recurrenceInterval: bill.recurrence_interval,
        recurrenceDayOfMonth: bill.recurrence_day_of_month,
        recurrenceEndDate: bill.recurrence_end_date,
        today,
        from,
        through,
        noneUnit: "one_time",
      }),
    );
  }

  for (const task of tasks) {
    if (!task.due_date || !["open", "snoozed"].includes(task.status)) continue;
    pushPersistedOrOverdue(events, { kind: "task", source: task, action: "due", scheduledDate: task.due_date, today, from, through });
    events.push(
      ...expandFutureOccurrences({
        kind: "task",
        source: task,
        action: "due",
        startDate: task.due_date,
        recurrenceUnit: task.repeat_unit,
        recurrenceInterval: task.repeat_interval,
        today,
        from,
        through,
        noneUnit: "none",
      }),
    );
  }

  for (const item of items) {
    if (item.status !== "active") continue;
    pushPersistedOrOverdue(events, { kind: "item", source: item, action: "replace", scheduledDate: item.replace_by_date, today, from, through });
    pushPersistedOrOverdue(events, { kind: "item", source: item, action: "restock", scheduledDate: item.restock_by_date, today, from, through });
  }

  for (const document of documents) {
    if (!document.expiry_date) continue;
    pushPersistedOrOverdue(events, { kind: "document", source: document, action: "expires", scheduledDate: document.expiry_date, today, from, through });
  }

  return events.sort(
    (a, b) =>
      a.display_date.localeCompare(b.display_date) ||
      Number(b.is_overdue) - Number(a.is_overdue) ||
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
      a.title.localeCompare(b.title) ||
      a.id.localeCompare(b.id),
  );
}
