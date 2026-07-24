import { Check, FileText, NotebookPen, ReceiptText, Repeat2 } from "lucide-react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { Bill, DocumentRecord, Item, Note, Task } from "../api";
import { formatBillAmount, formatShortDate } from "../api";
import type { QueueItem } from "../types";
import { Empty } from "./ui";

export function QueueRow({ item, index }: { item: QueueItem; index: number }) {
  return (
    <motion.article className={`queueRow ${item.kind}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.025 }}>
      <span className="rowDate">{item.date}</span>
      <div>
        <strong>{item.title}</strong>
        <span>{item.detail}</span>
      </div>
      <b>{item.value}</b>
    </motion.article>
  );
}

export function CardStack<T>({ items, render, empty = "Nothing here yet." }: { items: T[]; render: (item: T) => ReactNode; empty?: string }) {
  if (!items.length) return <Empty label={empty} />;
  return <div className="cardStack">{items.map((item, index) => <motion.div key={index} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.025 }}>{render(item)}</motion.div>)}</div>;
}

export function BillRow({ bill, compact, actions }: { bill: Bill; compact?: boolean; actions?: ReactNode }) {
  return (
    <article className={`dataRow ${compact ? "compact" : ""}`}>
      <span className="rowGlyph coral">
        <ReceiptText />
      </span>
      <div>
        <strong>{bill.title}</strong>
        <span>{bill.source || "No source"} / {bill.responsibility_label || "Household"} / {formatShortDate(bill.due_date)}</span>
      </div>
      <b>{formatBillAmount(bill)}</b>
      {actions}
    </article>
  );
}

export function TaskRow({ task, compact, actions }: { task: Task; compact?: boolean; actions?: ReactNode }) {
  return (
    <article className={`dataRow ${compact ? "compact" : ""}`}>
      <span className="rowGlyph mint">
        <Check />
      </span>
      <div>
        <strong>{task.title}</strong>
        <span>{task.area || "household"} / {task.due_date ? formatShortDate(task.due_date) : "No due date"}</span>
      </div>
      <b>{task.status}</b>
      {actions}
    </article>
  );
}

export function ItemRow({ item, actions }: { item: Item; actions?: ReactNode }) {
  return (
    <article className="dataRow">
      <span className="rowGlyph gold">
        <Repeat2 />
      </span>
      <div>
        <strong>{item.name}</strong>
        <span>{item.location || item.type} / {item.replace_by_date ? `Replace ${formatShortDate(item.replace_by_date)}` : item.restock_by_date ? `Restock ${formatShortDate(item.restock_by_date)}` : "No target"}</span>
      </div>
      <b>{item.status}</b>
      {actions}
    </article>
  );
}

export function DocumentRow({ document, actions }: { document: DocumentRecord; actions?: ReactNode }) {
  return (
    <article className="dataRow">
      <span className="rowGlyph blue">
        <FileText />
      </span>
      <div>
        <strong>{document.title}</strong>
        <span>{document.category || document.type} / {document.expiry_date ? `Expires ${formatShortDate(document.expiry_date)}` : "stored"}</span>
      </div>
      <b>{document.is_pinned ? "Pinned" : "Doc"}</b>
      {actions}
    </article>
  );
}

export function NoteRow({ note, actions }: { note: Note; actions?: ReactNode }) {
  return (
    <article className="dataRow">
      <span className="rowGlyph coral">
        <NotebookPen />
      </span>
      <div>
        <strong>{note.title}</strong>
        <span>{note.tags || note.note_type}</span>
      </div>
      <b>{note.is_pinned ? "Pinned" : note.is_archived ? "Archived" : "Note"}</b>
      {actions}
    </article>
  );
}
