export function createBillRepository(db) {
  return {
    list(filters = {}) {
      const where = [];
      const params = [];
      if (filters.status) { where.push("status = ?"); params.push(String(filters.status)); }
      if (filters.category) { where.push("category = ?"); params.push(String(filters.category)); }
      if (filters.source) { where.push("LOWER(COALESCE(payment_source, '')) LIKE ?"); params.push(`%${String(filters.source).toLowerCase()}%`); }
      if (filters.responsibility) { where.push("LOWER(COALESCE(responsibility_label, '')) LIKE ?"); params.push(`%${String(filters.responsibility).toLowerCase()}%`); }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      return db.prepare(`SELECT * FROM bills ${whereSql} ORDER BY due_date ASC, created_at DESC`).all(...params);
    },
    findById(id) {
      return db.prepare("SELECT * FROM bills WHERE id = ?").get(id) || null;
    },
    create(bill) {
      db.prepare(`INSERT INTO bills (id, title, category, amount, amount_type, currency, due_date, cadence, payment_source, responsibility_label, autopay, status, notes, recurrence_unit, recurrence_interval, recurrence_day_of_month, recurrence_end_date, last_paid_due_date, is_subscription) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(bill.id, bill.title, bill.category, bill.amount, bill.amount_type, bill.currency, bill.due_date, bill.cadence, bill.source, bill.responsibility_label, bill.autopay_enabled ? 1 : 0, bill.status, bill.notes, bill.recurrence_unit, bill.recurrence_interval, bill.recurrence_day_of_month, bill.recurrence_end_date, bill.last_paid_due_date, bill.is_subscription ? 1 : 0);
      return this.findById(bill.id);
    },
    update(id, bill) {
      const result = db.prepare(`UPDATE bills SET title = ?, category = ?, amount = ?, amount_type = ?, currency = ?, due_date = ?, cadence = ?, payment_source = ?, responsibility_label = ?, autopay = ?, status = ?, notes = ?, recurrence_unit = ?, recurrence_interval = ?, recurrence_day_of_month = ?, recurrence_end_date = ?, last_paid_due_date = ?, is_subscription = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(bill.title, bill.category, bill.amount, bill.amount_type, bill.currency, bill.due_date, bill.cadence, bill.source, bill.responsibility_label, bill.autopay_enabled ? 1 : 0, bill.status, bill.notes, bill.recurrence_unit, bill.recurrence_interval, bill.recurrence_day_of_month, bill.recurrence_end_date, bill.last_paid_due_date, bill.is_subscription ? 1 : 0, id);
      return result.changes ? this.findById(id) : null;
    },
    delete(id) {
      return db.prepare("DELETE FROM bills WHERE id = ?").run(id).changes > 0;
    },
  };
}
