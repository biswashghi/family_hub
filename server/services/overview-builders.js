import { addDaysISO } from "../../src/dates.js";

const byTextAscending = (field) => (left, right) => String(left[field] || "9999-12-31").localeCompare(String(right[field] || "9999-12-31"));
const byTextDescending = (field) => (left, right) => String(right[field] || "").localeCompare(String(left[field] || ""));
const createdAt = (record) => record.created_at || record.uploaded_at || "";
const newestFirst = (left, right) => createdAt(right).localeCompare(createdAt(left));

function openBill(bill) {
  return bill.status === "open";
}

function openTask(task) {
  return ["open", "snoozed"].includes(task.status);
}

function activeItem(item) {
  return item.status === "active";
}

export function buildBillSummary(bills, today) {
  const nextWeek = addDaysISO(today, 7);
  const nextMonth = addDaysISO(today, 30);
  return {
    due_this_week: bills.filter((bill) => openBill(bill) && bill.due_date <= nextWeek).length,
    due_this_month: bills.filter((bill) => openBill(bill) && bill.due_date <= nextMonth).length,
    autopay_enabled: bills.filter((bill) => bill.autopay_enabled).length,
    overdue: bills.filter((bill) => openBill(bill) && bill.due_date < today).length,
  };
}

export function buildDashboardOverview({ today, bills, tasks, items, documents, notes }) {
  const nextWeek = addDaysISO(today, 7);
  const nextMonth = addDaysISO(today, 30);
  const upcomingBills = bills.filter((bill) => openBill(bill) && bill.due_date <= nextWeek).sort(byTextAscending("due_date"));
  const tasksToday = tasks.filter((task) => openTask(task) && task.due_date && task.due_date <= today).sort(byTextAscending("due_date"));
  const expiringDocs = documents.filter((document) => document.expiry_date && document.expiry_date <= nextMonth).sort(byTextAscending("expiry_date"));
  const pinnedDocs = documents.filter((document) => document.is_pinned).sort(newestFirst);
  const replaceSoon = items
    .filter((item) => activeItem(item) && ((item.replace_by_date && item.replace_by_date <= nextMonth) || (item.restock_by_date && item.restock_by_date <= nextMonth)))
    .sort((left, right) => String(left.replace_by_date || left.restock_by_date).localeCompare(String(right.replace_by_date || right.restock_by_date)));
  const activeNotes = notes.filter((note) => !note.is_archived).sort((left, right) => Number(right.is_pinned) - Number(left.is_pinned) || newestFirst(left, right));

  return {
    metrics: {
      dueSoonCount: upcomingBills.length,
      tasksTodayCount: tasksToday.length,
      docsExpiringCount: expiringDocs.length,
      replaceSoonCount: replaceSoon.length,
      openBillsCount: bills.filter(openBill).length,
      openTasksCount: tasks.filter(openTask).length,
      storedDocsCount: documents.length,
      activeNotesCount: activeNotes.length,
    },
    upcomingBills: upcomingBills.slice(0, 6),
    tasksToday: tasksToday.slice(0, 6),
    importantDocs: (expiringDocs.length ? expiringDocs : pinnedDocs).slice(0, 5),
    replaceSoon: replaceSoon.slice(0, 6),
    recentNotes: activeNotes.slice(0, 5),
  };
}

export function buildMoneyOverview({ today, bills }) {
  const nextWeek = addDaysISO(today, 7);
  const dueSoon = bills.filter((bill) => openBill(bill) && bill.due_date <= nextWeek).sort(byTextAscending("due_date"));
  const overdue = bills.filter((bill) => openBill(bill) && bill.due_date < today).sort(byTextAscending("due_date"));
  const subscriptions = bills.filter((bill) => bill.is_subscription).sort(byTextAscending("due_date"));
  return {
    today,
    summary: buildBillSummary(bills, today),
    dueSoon: dueSoon.slice(0, 6),
    overdue: overdue.slice(0, 6),
    subscriptions: subscriptions.slice(0, 6),
  };
}

export function buildHomeOverview({ today, tasks, items }) {
  const nextMonth = addDaysISO(today, 30);
  const dueTasks = tasks.filter((task) => openTask(task) && task.due_date && task.due_date <= today).sort(byTextAscending("due_date"));
  const replaceSoon = items.filter((item) => activeItem(item) && item.replace_by_date && item.replace_by_date <= nextMonth).sort(byTextAscending("replace_by_date"));
  const restockSoon = items.filter((item) => activeItem(item) && item.restock_by_date && item.restock_by_date <= nextMonth).sort(byTextAscending("restock_by_date"));
  return {
    today,
    metrics: {
      openTasksCount: tasks.filter(openTask).length,
      dueTodayCount: dueTasks.length,
      replaceSoonCount: replaceSoon.length,
      restockSoonCount: restockSoon.length,
    },
    dueTasks: dueTasks.slice(0, 6),
    replaceSoon: replaceSoon.slice(0, 6),
    restockSoon: restockSoon.slice(0, 6),
  };
}

export function buildDocsOverview({ today, documents }) {
  const nextMonth = addDaysISO(today, 30);
  const pinned = documents.filter((document) => document.is_pinned).sort(newestFirst);
  const expiringSoon = documents.filter((document) => document.expiry_date && document.expiry_date <= nextMonth).sort(byTextAscending("expiry_date"));
  return {
    metrics: { pinnedCount: pinned.length, expiringSoonCount: expiringSoon.length, storedCount: documents.length },
    pinned: pinned.slice(0, 6),
    expiringSoon: expiringSoon.slice(0, 6),
    recent: [...documents].sort(newestFirst).slice(0, 6),
  };
}

export function buildNotesOverview({ notes }) {
  const active = notes.filter((note) => !note.is_archived);
  const pinned = active.filter((note) => note.is_pinned).sort(byTextDescending("created_at"));
  const ideas = active.filter((note) => note.note_type === "idea").sort(byTextDescending("created_at"));
  const recent = [...active].sort((left, right) => Number(right.is_pinned) - Number(left.is_pinned) || newestFirst(left, right));
  return {
    metrics: {
      activeCount: active.length,
      pinnedCount: pinned.length,
      ideaCount: ideas.length,
      archivedCount: notes.filter((note) => note.is_archived).length,
    },
    pinned: pinned.slice(0, 6),
    recent: recent.slice(0, 6),
    ideas: ideas.slice(0, 6),
  };
}
