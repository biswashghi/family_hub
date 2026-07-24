import { motion } from "framer-motion";
import type { FormEvent, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import type { Bill, DocumentRecord, Item, Note, Task } from "../api";
import { api, todayISO } from "../api";
import type { ModalState } from "../types";

export function EntityModal({
  modal,
  error,
  demo,
  onClose,
  onSubmit,
}: {
  modal: ModalState;
  error: string;
  demo: boolean;
  onClose: () => void;
  onSubmit: (action: () => Promise<unknown>) => void;
}) {
  const title = `${modal.mode === "create" ? "Add" : "Edit"} ${modal.kind === "item" ? "item" : modal.kind}`;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (demo) return;
    const form = new FormData(event.currentTarget);
    onSubmit(() => submitEntityForm(modal, form));
  }

  return (
    <motion.div className="modalBackdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="entityModal" initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }}>
        <div className="modalHeader">
          <h2>{title}</h2>
          <button className="iconAction" type="button" onClick={onClose} aria-label="Close">
            x
          </button>
        </div>
        <form className="entityForm" onSubmit={submit}>
          {modal.kind === "bill" && <BillFields bill={modal.item} />}
          {modal.kind === "task" && <TaskFields task={modal.item} />}
          {modal.kind === "item" && <ItemFields item={modal.item} />}
          {modal.kind === "document" && <DocumentFields document={modal.item} mode={modal.mode} />}
          {modal.kind === "note" && <NoteFields note={modal.item} />}
          {error && <p className="formError">{error}</p>}
          {demo && <p className="formError">Demo mode is read-only.</p>}
          <div className="modalActions">
            <button className="actionButton quiet" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="actionButton primary" type="submit" disabled={demo}>
              Save
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function BillFields({ bill }: { bill?: Bill }) {
  return (
    <>
      <Field name="title" label="Title" defaultValue={bill?.title} required />
      <Field name="category" label="Category" defaultValue={bill?.category || "other"} required />
      <Field name="amount" label="Amount" type="number" step="0.01" defaultValue={bill?.amount ?? ""} />
      <SelectField name="amount_type" label="Amount type" defaultValue={bill?.amount_type || "fixed"} options={["fixed", "estimated", "variable", "unknown"]} />
      <Field name="due_date" label="Due date" type="date" defaultValue={bill?.due_date || todayISO()} required />
      <Field name="source" label="Source" defaultValue={bill?.source || ""} />
      <Field name="responsibility_label" label="Responsibility" defaultValue={bill?.responsibility_label || ""} />
      <SelectField name="status" label="Status" defaultValue={bill?.status || "open"} options={["open", "paid", "skipped"]} />
      <SelectField name="recurrence_unit" label="Recurrence" defaultValue="month" options={["one_time", "day", "week", "month", "year"]} />
      <Field name="recurrence_interval" label="Interval" type="number" defaultValue="1" />
      <Field name="currency" label="Currency" defaultValue={bill?.currency || "USD"} />
      <CheckField name="autopay_enabled" label="Autopay" defaultChecked={!!bill?.autopay_enabled} />
      <CheckField name="is_subscription" label="Subscription" defaultChecked={!!bill?.is_subscription} />
      <TextArea name="notes" label="Notes" defaultValue={bill?.notes || ""} />
    </>
  );
}

function TaskFields({ task }: { task?: Task }) {
  return (
    <>
      <Field name="title" label="Title" defaultValue={task?.title} required />
      <Field name="area" label="Area" defaultValue={task?.area || ""} />
      <Field name="due_date" label="Due date" type="date" defaultValue={task?.due_date || todayISO()} />
      <SelectField name="status" label="Status" defaultValue={task?.status || "open"} options={["open", "done", "snoozed"]} />
      <SelectField name="repeat_unit" label="Repeat" defaultValue={task?.repeat_unit || "none"} options={["none", "day", "week", "month"]} />
      <Field name="repeat_interval" label="Repeat interval" type="number" defaultValue={String(task?.repeat_interval || 1)} />
      <TextArea name="notes" label="Notes" defaultValue={task?.notes || ""} />
    </>
  );
}

function ItemFields({ item }: { item?: Item }) {
  return (
    <>
      <Field name="name" label="Name" defaultValue={item?.name} required />
      <SelectField name="type" label="Type" defaultValue={item?.type || "other"} options={["filter", "battery", "supply", "appliance_part", "pantry", "cleaning", "other"]} />
      <SelectField name="status" label="Status" defaultValue={item?.status || "active"} options={["active", "replaced", "restocked", "archived"]} />
      <Field name="replace_by_date" label="Replace by" type="date" defaultValue={item?.replace_by_date || ""} />
      <Field name="restock_by_date" label="Restock by" type="date" defaultValue={item?.restock_by_date || ""} />
      <Field name="location" label="Location" defaultValue={item?.location || ""} />
      <TextArea name="notes" label="Notes" defaultValue={item?.notes || ""} />
    </>
  );
}

function DocumentFields({ document, mode }: { document?: DocumentRecord; mode: "create" | "edit" }) {
  return (
    <>
      <Field name="title" label="Title" defaultValue={document?.title} required />
      {mode === "create" && <Field name="file" label="File" type="file" required />}
      <Field name="doc_type" label="Type" defaultValue={document?.type || "document"} required />
      <Field name="category" label="Category" defaultValue={document?.category || ""} />
      <Field name="expiry_date" label="Expiry date" type="date" defaultValue={document?.expiry_date || ""} />
      <Field name="tags" label="Tags" defaultValue={document?.tags || ""} />
      <CheckField name="is_pinned" label="Pinned" defaultChecked={!!document?.is_pinned} />
      <TextArea name="notes" label="Notes" defaultValue={document?.notes || ""} />
    </>
  );
}

function NoteFields({ note }: { note?: Note }) {
  return (
    <>
      <Field name="title" label="Title" defaultValue={note?.title} required />
      <SelectField name="note_type" label="Type" defaultValue={note?.note_type || "quick_note"} options={["quick_note", "checklist", "reference", "idea"]} />
      <Field name="tags" label="Tags" defaultValue={note?.tags || ""} />
      <CheckField name="is_pinned" label="Pinned" defaultChecked={!!note?.is_pinned} />
      <CheckField name="is_archived" label="Archived" defaultChecked={!!note?.is_archived} />
      <TextArea name="body" label="Body" defaultValue={note?.body || ""} required />
    </>
  );
}

function Field({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label>
      <span>{label}</span>
      <input {...props} />
    </label>
  );
}

function TextArea({ label, ...props }: { label: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="fullField">
      <span>{label}</span>
      <textarea rows={3} {...props} />
    </label>
  );
}

function SelectField({ label, options, ...props }: { label: string; options: string[] } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label>
      <span>{label}</span>
      <select {...props}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckField({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="checkField">
      <input type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
}

async function submitEntityForm(modal: ModalState, form: FormData) {
  if (modal.kind === "document") {
    if (modal.mode === "create") {
      return api("/api/documents", { method: "POST", body: form });
    }
    return api(`/api/documents/${modal.item?.id}`, { method: "PATCH", body: JSON.stringify(formObject(form, ["is_pinned"])) });
  }

  const body = formObject(form, ["autopay_enabled", "is_subscription", "is_pinned", "is_archived"]);
  if (modal.kind === "bill") {
    body.amount = body.amount === "" ? null : Number(body.amount);
    body.recurrence_interval = Number(body.recurrence_interval || 1);
  }
  if (modal.kind === "task") {
    body.repeat_interval = Number(body.repeat_interval || 1);
  }

  const path =
    modal.kind === "bill"
      ? modal.mode === "create"
        ? "/api/bills"
        : `/api/bills/${modal.item?.id}`
      : modal.kind === "task"
        ? modal.mode === "create"
          ? "/api/tasks"
          : `/api/tasks/${modal.item?.id}`
        : modal.kind === "item"
          ? modal.mode === "create"
            ? "/api/items"
            : `/api/items/${modal.item?.id}`
          : modal.kind === "note"
            ? modal.mode === "create"
              ? "/api/notes"
              : `/api/notes/${modal.item?.id}`
            : "";

  return api(path, {
    method: modal.mode === "create" ? "POST" : "PATCH",
    body: JSON.stringify(body),
  });
}

function formObject(form: FormData, booleans: string[] = []) {
  const result: Record<string, string | boolean | number | null> = {};
  for (const [key, value] of form.entries()) {
    if (value instanceof File) continue;
    result[key] = value;
  }
  for (const booleanKey of booleans) {
    result[booleanKey] = form.get(booleanKey) === "on";
  }
  return result;
}
