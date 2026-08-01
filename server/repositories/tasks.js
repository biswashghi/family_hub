export function createTaskRepository(db) {
  return {
    list() {
      return db.prepare("SELECT * FROM tasks ORDER BY COALESCE(due_date, '9999-12-31') ASC, created_at DESC").all();
    },
    findById(id) {
      return db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) || null;
    },
    create(task) {
      db.prepare("INSERT INTO tasks (id, title, area, status, due_date, repeat_unit, repeat_interval, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .run(task.id, task.title, task.area, task.status, task.due_date, task.repeat_unit, task.repeat_interval, task.notes);
      return this.findById(task.id);
    },
    update(id, task) {
      const result = db.prepare("UPDATE tasks SET title = ?, area = ?, status = ?, due_date = ?, repeat_unit = ?, repeat_interval = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(task.title, task.area, task.status, task.due_date, task.repeat_unit, task.repeat_interval, task.notes, id);
      return result.changes ? this.findById(id) : null;
    },
    delete(id) {
      return db.prepare("DELETE FROM tasks WHERE id = ?").run(id).changes > 0;
    },
  };
}
