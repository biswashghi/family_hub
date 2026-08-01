export function createItemRepository(db) {
  return {
    list() {
      return db.prepare("SELECT * FROM household_items ORDER BY COALESCE(replace_by_date, restock_by_date, '9999-12-31') ASC, created_at DESC").all();
    },
    findById(id) {
      return db.prepare("SELECT * FROM household_items WHERE id = ?").get(id) || null;
    },
    create(item) {
      db.prepare("INSERT INTO household_items (id, name, type, status, replace_by_date, restock_by_date, location, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .run(item.id, item.name, item.type, item.status, item.replace_by_date, item.restock_by_date, item.location, item.notes);
      return this.findById(item.id);
    },
    update(id, item) {
      const result = db.prepare("UPDATE household_items SET name = ?, type = ?, status = ?, replace_by_date = ?, restock_by_date = ?, location = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(item.name, item.type, item.status, item.replace_by_date, item.restock_by_date, item.location, item.notes, id);
      return result.changes ? this.findById(id) : null;
    },
  };
}
