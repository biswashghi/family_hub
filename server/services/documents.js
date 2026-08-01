import { randomUUID } from "node:crypto";
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";
import { normalizeOptionalDate } from "../domain/normalizers.js";
import { presentDocument } from "../presenters/entities.js";

export function createDocumentService({ repository, filesDir, createId = randomUUID }) {
  const missing = () => ({ error: "not found", status: 404 });
  const removeFile = (filePath) => {
    if (!filePath || !existsSync(filePath)) return;
    try { unlinkSync(filePath); } catch { /* best-effort cleanup */ }
  };
  return {
    list: () => repository.list().map(presentDocument),
    create(file, payload) {
      if (!file) return { error: "file is required", status: 400 };
      const title = String(payload.title || "").trim();
      const docType = String(payload.doc_type || "").trim();
      const expiry = normalizeOptionalDate(payload.expiry_date, "expiry_date");
      if (expiry.error || !title || !docType) {
        removeFile(file.path);
        return { error: expiry.error || "title and doc_type are required", status: 400 };
      }
      const row = repository.create({
        id: createId(), title, doc_type: docType,
        category: payload.category ? String(payload.category).trim() : null,
        tags: payload.tags ? String(payload.tags).trim() : null,
        notes: payload.notes ? String(payload.notes).trim() : null,
        file_name: file.originalname, stored_name: file.filename, mime_type: file.mimetype, size_bytes: file.size,
        is_pinned: !!payload.is_pinned, expiry_date: expiry.value,
      });
      return { document: presentDocument(row) };
    },
    update(id, payload) {
      const row = repository.findById(id);
      if (!row) return missing();
      const current = presentDocument(row);
      const title = payload.title !== undefined ? String(payload.title || "").trim() : current.title;
      const expiry = payload.expiry_date !== undefined ? normalizeOptionalDate(payload.expiry_date, "expiry_date") : { value: current.expiry_date };
      if (expiry.error) return { error: expiry.error, status: 400 };
      if (!title) return { error: "title is required", status: 400 };
      const updated = repository.update(id, {
        title,
        category: payload.category !== undefined ? String(payload.category || "").trim() || null : current.category,
        tags: payload.tags !== undefined ? String(payload.tags || "").trim() || null : current.tags,
        notes: payload.notes !== undefined ? String(payload.notes || "").trim() || null : current.notes,
        is_pinned: payload.is_pinned !== undefined ? !!payload.is_pinned : current.is_pinned,
        expiry_date: expiry.value,
      });
      return { document: presentDocument(updated) };
    },
    pin(id, requestedState) {
      const row = repository.findById(id);
      if (!row) return missing();
      const current = presentDocument(row);
      const updated = repository.setPinned(id, requestedState === undefined ? !current.is_pinned : !!requestedState);
      return { document: presentDocument(updated) };
    },
    download(id) {
      const row = repository.findById(id);
      if (!row) return missing();
      const absolute = path.join(filesDir, row.stored_name);
      if (!existsSync(absolute)) return { error: "file missing on disk", status: 404 };
      return { absolute, fileName: row.file_name };
    },
    delete(id) {
      const row = repository.findById(id);
      if (!row) return missing();
      removeFile(path.join(filesDir, row.stored_name));
      repository.delete(id);
      return { deleted: true };
    },
  };
}
