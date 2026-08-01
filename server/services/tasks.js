import { randomUUID } from "node:crypto";
import { normalizeTaskPayload } from "../domain/normalizers.js";
import { presentTask } from "../presenters/entities.js";
import { addDaysISO, nextDueDateFromRule } from "../../src/dates.js";

export function createTaskService({ repository, todayISO, createId = randomUUID }) {
  const missing = () => ({ error: "not found", status: 404 });
  function update(id, payload) {
    const row = repository.findById(id);
    if (!row) return missing();
    const normalized = normalizeTaskPayload(payload, presentTask(row));
    if (normalized.error) return { error: normalized.error, status: 400 };
    return { task: presentTask(repository.update(id, normalized)) };
  }
  return {
    list: () => repository.list().map(presentTask),
    create(payload) {
      const normalized = normalizeTaskPayload(payload);
      if (normalized.error) return { error: normalized.error, status: 400 };
      return { task: presentTask(repository.create({ id: createId(), ...normalized })) };
    },
    update,
    complete(id) {
      const row = repository.findById(id);
      if (!row) return missing();
      const task = presentTask(row);
      const dueDate = !task.due_date || task.repeat_unit === "none" ? task.due_date : nextDueDateFromRule(task.due_date, task.repeat_unit, task.repeat_interval, null);
      return update(id, { status: task.repeat_unit === "none" ? "done" : "open", due_date: dueDate });
    },
    snooze(id, payload) {
      const dueDate = payload?.due_date || addDaysISO(todayISO(), Number(payload?.days || 1));
      return update(id, { status: "snoozed", due_date: dueDate });
    },
    delete(id) {
      return repository.delete(id) ? { deleted: true } : missing();
    },
  };
}
