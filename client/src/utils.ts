import type { AppData, QueueItem } from "./types";
import { formatBillAmount, formatShortDate } from "./api";

export function buildQueue(data: AppData): QueueItem[] {
  const bills = data.agenda?.bills || data.dashboard?.upcomingBills || [];
  const tasks = data.agenda?.tasks || data.dashboard?.tasksToday || [];
  const docs = data.agenda?.documents || data.dashboard?.importantDocs || [];
  const items = data.agenda?.items || data.dashboard?.replaceSoon || [];
  const notes = data.dashboard?.recentNotes || [];

  return [
    ...bills.map((bill) => ({
      id: `bill-${bill.id}`,
      kind: "bill" as const,
      date: formatShortDate(bill.due_date),
      title: bill.title,
      detail: `${bill.source || "No source"} / ${bill.responsibility_label || "Household"}`,
      value: formatBillAmount(bill),
    })),
    ...tasks.map((task) => ({
      id: `task-${task.id}`,
      kind: "task" as const,
      date: formatShortDate(task.due_date),
      title: task.title,
      detail: task.area || "household",
      value: task.status,
    })),
    ...items.map((item) => ({
      id: `item-${item.id}`,
      kind: "item" as const,
      date: formatShortDate(item.replace_by_date || item.restock_by_date),
      title: item.name,
      detail: item.location || item.type,
      value: item.replace_by_date ? "Replace" : "Restock",
    })),
    ...docs.map((doc) => ({
      id: `doc-${doc.id}`,
      kind: "doc" as const,
      date: formatShortDate(doc.expiry_date),
      title: doc.title,
      detail: doc.category || doc.type,
      value: doc.is_pinned ? "Pinned" : "Review",
    })),
    ...notes.slice(0, 2).map((note) => ({
      id: `note-${note.id}`,
      kind: "note" as const,
      date: "Saved",
      title: note.title,
      detail: note.tags || note.note_type,
      value: note.is_pinned ? "Pinned" : "Note",
    })),
  ].slice(0, 10);
}
