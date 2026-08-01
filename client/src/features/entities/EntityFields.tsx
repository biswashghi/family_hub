import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import type { Bill, DocumentRecord, Item, Note, Task } from "../../api";
import { api, todayISO } from "../../api";
import type { ModalState } from "../../types";

export function EntityFields({ modal, today = todayISO() }: { modal: ModalState; today?: string }) {
  if (modal.kind === "bill") return <BillFields bill={modal.item} today={today} />;
  if (modal.kind === "task") return <TaskFields task={modal.item} today={today} />;
  if (modal.kind === "item") return <ItemFields item={modal.item} />;
  if (modal.kind === "document") return <DocumentFields document={modal.item} mode={modal.mode} />;
  return <NoteFields note={modal.item} />;
}

function BillFields({ bill, today }: { bill?: Bill; today: string }) {
  return <>
    <Field name="title" label="Title" defaultValue={bill?.title} required />
    <Field name="category" label="Category" defaultValue={bill?.category || "other"} required />
    <Field name="amount" label="Amount" type="number" step="0.01" defaultValue={bill?.amount ?? ""} />
    <SelectField name="amount_type" label="Amount type" defaultValue={bill?.amount_type || "fixed"} options={["fixed", "estimated", "variable", "unknown"]} />
    <Field name="due_date" label="Due date" type="date" defaultValue={bill?.due_date || today} required />
    <Field name="source" label="Source" defaultValue={bill?.source || ""} />
    <Field name="responsibility_label" label="Responsibility" defaultValue={bill?.responsibility_label || ""} />
    <SelectField name="status" label="Status" defaultValue={bill?.status || "open"} options={["open", "paid", "skipped"]} />
    <SelectField name="recurrence_unit" label="Recurrence" defaultValue={bill?.recurrence_unit || "month"} options={["one_time", "day", "week", "month", "year"]} />
    <Field name="recurrence_interval" label="Interval" type="number" defaultValue={String(bill?.recurrence_interval || 1)} />
    <Field name="currency" label="Currency" defaultValue={bill?.currency || "USD"} />
    <CheckField name="autopay_enabled" label="Autopay" defaultChecked={!!bill?.autopay_enabled} />
    <CheckField name="is_subscription" label="Subscription" defaultChecked={!!bill?.is_subscription} />
    <TextArea name="notes" label="Notes" defaultValue={bill?.notes || ""} />
  </>;
}

function TaskFields({ task, today }: { task?: Task; today: string }) {
  return <>
    <Field name="title" label="Title" defaultValue={task?.title} required />
    <Field name="area" label="Area" defaultValue={task?.area || ""} />
    <Field name="due_date" label="Due date" type="date" defaultValue={task?.due_date || today} />
    <SelectField name="status" label="Status" defaultValue={task?.status || "open"} options={["open", "done", "snoozed"]} />
    <SelectField name="repeat_unit" label="Repeat" defaultValue={task?.repeat_unit || "none"} options={["none", "day", "week", "month"]} />
    <Field name="repeat_interval" label="Repeat interval" type="number" defaultValue={String(task?.repeat_interval || 1)} />
    <TextArea name="notes" label="Notes" defaultValue={task?.notes || ""} />
  </>;
}

function ItemFields({ item }: { item?: Item }) {
  return <>
    <Field name="name" label="Name" defaultValue={item?.name} required />
    <SelectField name="type" label="Type" defaultValue={item?.type || "other"} options={["filter", "battery", "supply", "appliance_part", "pantry", "cleaning", "other"]} />
    <SelectField name="status" label="Status" defaultValue={item?.status || "active"} options={["active", "replaced", "restocked", "archived"]} />
    <Field name="replace_by_date" label="Replace by" type="date" defaultValue={item?.replace_by_date || ""} />
    <Field name="restock_by_date" label="Restock by" type="date" defaultValue={item?.restock_by_date || ""} />
    <Field name="location" label="Location" defaultValue={item?.location || ""} />
    <TextArea name="notes" label="Notes" defaultValue={item?.notes || ""} />
  </>;
}

function DocumentFields({ document, mode }: { document?: DocumentRecord; mode: "create" | "edit" }) {
  return <>
    <Field name="title" label="Title" defaultValue={document?.title} required />
    {mode === "create" && <Field name="file" label="File" type="file" required />}
    <Field name="doc_type" label="Type" defaultValue={document?.type || "document"} required />
    <Field name="category" label="Category" defaultValue={document?.category || ""} />
    <Field name="expiry_date" label="Expiry date" type="date" defaultValue={document?.expiry_date || ""} />
    <Field name="tags" label="Tags" defaultValue={document?.tags || ""} />
    <CheckField name="is_pinned" label="Pinned" defaultChecked={!!document?.is_pinned} />
    <TextArea name="notes" label="Notes" defaultValue={document?.notes || ""} />
  </>;
}

function NoteFields({ note }: { note?: Note }) {
  return <>
    <Field name="title" label="Title" defaultValue={note?.title} required />
    <SelectField name="note_type" label="Type" defaultValue={note?.note_type || "quick_note"} options={["quick_note", "checklist", "reference", "idea"]} />
    <Field name="tags" label="Tags" defaultValue={note?.tags || ""} />
    <CheckField name="is_pinned" label="Pinned" defaultChecked={!!note?.is_pinned} />
    <CheckField name="is_archived" label="Archived" defaultChecked={!!note?.is_archived} />
    <TextArea name="body" label="Body" defaultValue={note?.body || ""} required />
  </>;
}

function Field({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return <label><span>{label}</span><input {...props} /></label>;
}

function TextArea({ label, ...props }: { label: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <label className="fullField"><span>{label}</span><textarea rows={3} {...props} /></label>;
}

function SelectField({ label, options, ...props }: { label: string; options: string[] } & SelectHTMLAttributes<HTMLSelectElement>) {
  return <label><span>{label}</span><select {...props}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function CheckField({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return <label className="checkField"><input type="checkbox" {...props} /><span>{label}</span></label>;
}

export async function submitEntityForm(modal: ModalState, form: FormData) {
  if (modal.kind === "document") {
    if (modal.mode === "create") return api("/api/documents", { method: "POST", body: form });
    return api(`/api/documents/${modal.item?.id}`, { method: "PATCH", body: JSON.stringify(formObject(form, ["is_pinned"])) });
  }

  const body = formObject(form, ["autopay_enabled", "is_subscription", "is_pinned", "is_archived"]);
  if (modal.kind === "bill") {
    body.amount = body.amount === "" ? null : Number(body.amount);
    body.recurrence_interval = Number(body.recurrence_interval || 1);
  }
  if (modal.kind === "task") body.repeat_interval = Number(body.repeat_interval || 1);

  const resource = modal.kind === "bill" ? "bills" : modal.kind === "task" ? "tasks" : modal.kind === "item" ? "items" : "notes";
  const path = modal.mode === "create" ? `/api/${resource}` : `/api/${resource}/${modal.item?.id}`;
  return api(path, { method: modal.mode === "create" ? "POST" : "PATCH", body: JSON.stringify(body) });
}

function formObject(form: FormData, booleans: string[] = []) {
  const result: Record<string, string | boolean | number | null> = {};
  for (const [key, value] of form.entries()) if (!(value instanceof File)) result[key] = value;
  for (const booleanKey of booleans) result[booleanKey] = form.get(booleanKey) === "on";
  return result;
}
