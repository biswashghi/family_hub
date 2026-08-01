export function createDocumentRepository(db) {
  return {
    list() {
      return db.prepare("SELECT * FROM documents ORDER BY is_pinned DESC, COALESCE(expiry_date, '9999-12-31') ASC, uploaded_at DESC").all();
    },
    findById(id) {
      return db.prepare("SELECT * FROM documents WHERE id = ?").get(id) || null;
    },
    create(document) {
      db.prepare("INSERT INTO documents (id, title, doc_type, category, tags, notes, file_name, stored_name, mime_type, size_bytes, is_pinned, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run(document.id, document.title, document.doc_type, document.category, document.tags, document.notes, document.file_name, document.stored_name, document.mime_type, document.size_bytes, document.is_pinned ? 1 : 0, document.expiry_date);
      return this.findById(document.id);
    },
    update(id, document) {
      const result = db.prepare("UPDATE documents SET title = ?, category = ?, tags = ?, notes = ?, is_pinned = ?, expiry_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(document.title, document.category, document.tags, document.notes, document.is_pinned ? 1 : 0, document.expiry_date, id);
      return result.changes ? this.findById(id) : null;
    },
    setPinned(id, pinned) {
      const result = db.prepare("UPDATE documents SET is_pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(pinned ? 1 : 0, id);
      return result.changes ? this.findById(id) : null;
    },
    delete(id) {
      return db.prepare("DELETE FROM documents WHERE id = ?").run(id).changes > 0;
    },
  };
}
