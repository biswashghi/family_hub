function toBoolean(value) {
  return value === true || value === 1;
}

export function presentBill(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    source: row.payment_source,
    responsibility_label: row.responsibility_label,
    amount: row.amount,
    amount_type: row.amount_type || "fixed",
    currency: row.currency,
    due_date: row.due_date,
    status: row.status,
    autopay_enabled: toBoolean(row.autopay),
    notes: row.notes,
    recurrence_unit: row.recurrence_unit,
    recurrence_interval: row.recurrence_interval,
    recurrence_day_of_month: row.recurrence_day_of_month,
    recurrence_end_date: row.recurrence_end_date,
    last_paid_due_date: row.last_paid_due_date,
    is_subscription: toBoolean(row.is_subscription),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function presentTask(row) {
  return {
    id: row.id,
    title: row.title,
    area: row.area,
    status: row.status,
    due_date: row.due_date,
    repeat_unit: row.repeat_unit,
    repeat_interval: row.repeat_interval,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function presentItem(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    status: row.status,
    replace_by_date: row.replace_by_date,
    restock_by_date: row.restock_by_date,
    location: row.location,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function presentDocument(row) {
  return {
    id: row.id,
    title: row.title,
    type: row.doc_type,
    category: row.category,
    tags: row.tags,
    notes: row.notes,
    file_name: row.file_name,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    is_pinned: toBoolean(row.is_pinned),
    expiry_date: row.expiry_date,
    created_at: row.uploaded_at,
    updated_at: row.updated_at,
  };
}

export function presentNote(row) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    note_type: row.note_type,
    tags: row.tags,
    is_pinned: toBoolean(row.is_pinned),
    is_archived: toBoolean(row.is_archived),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
