export function createNoteRepository(db) {
  return {
    list({ includeArchived = false } = {}) {
      const sql = includeArchived
        ? "SELECT * FROM notes ORDER BY is_archived ASC, is_pinned DESC, created_at DESC"
        : "SELECT * FROM notes WHERE is_archived = 0 ORDER BY is_pinned DESC, created_at DESC";
      return db.prepare(sql).all();
    },
    findById(id) {
      return db.prepare("SELECT * FROM notes WHERE id = ?").get(id) || null;
    },
    create(note) {
      db.prepare("INSERT INTO notes (id, title, body, note_type, tags, is_pinned, is_archived) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(note.id, note.title, note.body, note.note_type, note.tags, note.is_pinned ? 1 : 0, note.is_archived ? 1 : 0);
      return this.findById(note.id);
    },
    update(id, note) {
      const result = db.prepare("UPDATE notes SET title = ?, body = ?, note_type = ?, tags = ?, is_pinned = ?, is_archived = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(note.title, note.body, note.note_type, note.tags, note.is_pinned ? 1 : 0, note.is_archived ? 1 : 0, id);
      return result.changes ? this.findById(id) : null;
    },
    setArchived(id, archived) {
      const result = db.prepare("UPDATE notes SET is_archived = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(archived ? 1 : 0, id);
      return result.changes ? this.findById(id) : null;
    },
  };
}
