import test from "node:test";
import assert from "node:assert/strict";
import { buildCalendarEvents, resolveAgendaRange } from "../../src/calendar.js";

test("calendar events retain overdue records, generate forecasts, and keep dual item deadlines", () => {
  const today = "2026-08-01";
  const events = buildCalendarEvents({
    today,
    from: "2026-07-27",
    through: "2026-09-05",
    bills: [
      {
        id: "bill-internet",
        title: "Internet",
        status: "open",
        due_date: "2026-07-30",
        recurrence_unit: "month",
        recurrence_interval: 1,
        recurrence_day_of_month: 30,
        recurrence_end_date: null,
      },
    ],
    tasks: [
      {
        id: "task-recycling",
        title: "Recycling",
        status: "open",
        due_date: "2026-08-03",
        repeat_unit: "week",
        repeat_interval: 1,
      },
    ],
    items: [
      {
        id: "item-filter",
        name: "Air filter",
        status: "active",
        replace_by_date: "2026-08-05",
        restock_by_date: "2026-08-10",
      },
    ],
    documents: [],
  });

  const overdue = events.find((event) => event.id === "bill:bill-internet:due:2026-07-30");
  assert.equal(overdue.display_date, today);
  assert.equal(overdue.original_due_date, "2026-07-30");
  assert.equal(overdue.is_overdue, true);
  assert.equal(overdue.is_actionable, true);

  const billForecast = events.find((event) => event.id === "bill:bill-internet:due:2026-08-30");
  assert.equal(billForecast.is_forecast, true);
  assert.equal(billForecast.is_actionable, false);

  assert.ok(events.some((event) => event.id === "task:task-recycling:due:2026-08-10" && event.is_forecast));
  assert.ok(events.some((event) => event.id === "item:item-filter:replace:2026-08-05"));
  assert.ok(events.some((event) => event.id === "item:item-filter:restock:2026-08-10"));
});

test("agenda range validation rejects invalid and unbounded requests", () => {
  assert.deepEqual(resolveAgendaRange({ from: "2026-08-01", through: "2026-08-07" }, "2026-08-01"), { from: "2026-08-01", through: "2026-08-07" });
  assert.match(resolveAgendaRange({ from: "nope" }, "2026-08-01").error, /valid/);
  assert.match(resolveAgendaRange({ from: "2026-08-10", through: "2026-08-01" }, "2026-08-01").error, /on or after/);
  assert.match(resolveAgendaRange({ from: "2026-08-01", through: "2027-01-01" }, "2026-08-01").error, /cannot exceed/);
});

test("monthly forecasts keep a valid date across short months", () => {
  const events = buildCalendarEvents({
    today: "2026-01-01",
    from: "2026-01-01",
    through: "2026-04-10",
    bills: [{
      id: "bill-month-end",
      title: "Month end service",
      status: "open",
      due_date: "2026-01-31",
      recurrence_unit: "month",
      recurrence_interval: 1,
      recurrence_day_of_month: 31,
    }],
  });

  assert.ok(events.some((event) => event.id === "bill:bill-month-end:due:2026-02-28" && event.is_forecast));
  assert.ok(events.some((event) => event.id === "bill:bill-month-end:due:2026-03-31" && event.is_forecast));
});
