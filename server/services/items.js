import { randomUUID } from "node:crypto";
import { normalizeItemPayload } from "../domain/normalizers.js";
import { presentItem } from "../presenters/entities.js";

export function createItemService({ repository, createId = randomUUID }) {
  const missing = () => ({ error: "not found", status: 404 });
  function update(id, payload) {
    const row = repository.findById(id);
    if (!row) return missing();
    const normalized = normalizeItemPayload(payload, presentItem(row));
    if (normalized.error) return { error: normalized.error, status: 400 };
    return { item: presentItem(repository.update(id, normalized)) };
  }
  return {
    list: () => repository.list().map(presentItem),
    create(payload) {
      const normalized = normalizeItemPayload(payload);
      if (normalized.error) return { error: normalized.error, status: 400 };
      return { item: presentItem(repository.create({ id: createId(), ...normalized })) };
    },
    update,
    replace: (id, payload) => update(id, { status: "replaced", ...payload }),
    restock: (id, payload) => update(id, { status: "restocked", ...payload }),
  };
}
