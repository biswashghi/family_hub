export function localTodayISO(timeZone = "America/Detroit", now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function parseISODate(iso) {
  const [year, month, day] = String(iso || "").split("-").map(Number);
  return new Date(Date.UTC(year || 1970, (month || 1) - 1, day || 1));
}

export function toISODate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysISO(iso, days) {
  const date = parseISODate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toISODate(date);
}

export function isValidISODate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ""))) return false;
  return toISODate(parseISODate(iso)) === String(iso);
}

export function nextDueDateFromRule(currentDueDate, recurrenceUnit, recurrenceInterval, recurrenceDayOfMonth) {
  if (recurrenceUnit === "one_time") return currentDueDate;
  const interval = Math.max(1, Number(recurrenceInterval || 1));
  const current = parseISODate(currentDueDate);

  if (recurrenceUnit === "day") {
    current.setUTCDate(current.getUTCDate() + interval);
    return toISODate(current);
  }
  if (recurrenceUnit === "week") {
    current.setUTCDate(current.getUTCDate() + interval * 7);
    return toISODate(current);
  }

  const monthDelta = recurrenceUnit === "year" ? interval * 12 : interval;
  const targetMonthIndex = current.getUTCMonth() + monthDelta;
  const targetYear = current.getUTCFullYear() + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const maxDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const preferredDay = recurrenceDayOfMonth ? Math.max(1, Math.min(31, Number(recurrenceDayOfMonth))) : current.getUTCDate();
  const targetDay = Math.min(preferredDay, maxDay);
  return toISODate(new Date(Date.UTC(targetYear, targetMonth, targetDay)));
}
