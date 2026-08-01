import { randomUUID } from "node:crypto";
import { normalizeNotePayload } from "../domain/normalizers.js";
import { presentNote } from "../presenters/entities.js";

export function createNoteService({ repository, createId = randomUUID }) {
  const notFound = () => ({ error: "not found", status: 404 });
  return {
    list(options) {
      return repository.list(options).map(presentNote);
    },
    create(payload) {
      const normalized = normalizeNotePayload(payload);
      if (normalized.error) return { error: normalized.error, status: 400 };
      return { note: presentNote(repository.create({ id: createId(), ...normalized })) };
    },
    update(id, payload) {
      const row = repository.findById(id);
      if (!row) return notFound();
      const normalized = normalizeNotePayload(payload, presentNote(row));
      if (normalized.error) return { error: normalized.error, status: 400 };
      return { note: presentNote(repository.update(id, normalized)) };
    },
    archive(id, requestedState) {
      const row = repository.findById(id);
      if (!row) return notFound();
      const archived = requestedState === undefined ? !presentNote(row).is_archived : !!requestedState;
      return { note: presentNote(repository.setArchived(id, archived)) };
    },
  };
}
