export function createAgendaRepository(db, serializers) {
  const { bill: serializeBill, task: serializeTask, item: serializeItem, document: serializeDocument } = serializers;

  return {
    listSourcesThrough(through) {
      const bills = db
        .prepare("SELECT * FROM bills WHERE status = 'open' AND due_date <= ? ORDER BY due_date ASC, created_at DESC")
        .all(through)
        .map(serializeBill);

      const tasks = db
        .prepare("SELECT * FROM tasks WHERE status IN ('open', 'snoozed') AND due_date IS NOT NULL AND due_date <= ? ORDER BY due_date ASC, created_at DESC")
        .all(through)
        .map(serializeTask);

      const items = db
        .prepare(
          "SELECT * FROM household_items WHERE status = 'active' AND ((replace_by_date IS NOT NULL AND replace_by_date <= ?) OR (restock_by_date IS NOT NULL AND restock_by_date <= ?)) ORDER BY COALESCE(replace_by_date, restock_by_date) ASC, created_at DESC",
        )
        .all(through, through)
        .map(serializeItem);

      const documents = db
        .prepare("SELECT * FROM documents WHERE expiry_date IS NOT NULL AND expiry_date <= ? ORDER BY expiry_date ASC, uploaded_at DESC")
        .all(through)
        .map(serializeDocument);

      return { bills, tasks, items, documents };
    },
  };
}
