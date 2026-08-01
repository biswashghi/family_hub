function send(res, result, status = 200) {
  if (result.error) return res.status(result.status || 400).json({ error: result.error });
  return res.status(status).json({ item: result.item });
}

export function registerItemRoutes(app, { items }) {
  app.get("/api/items", (_req, res) => res.json({ items: items.list() }));
  app.post("/api/items", (req, res) => send(res, items.create(req.body ?? {}), 201));
  app.patch("/api/items/:id", (req, res) => send(res, items.update(req.params.id, req.body ?? {})));
  app.post("/api/items/:id/replace", (req, res) => send(res, items.replace(req.params.id, req.body ?? {})));
  app.post("/api/items/:id/restock", (req, res) => send(res, items.restock(req.params.id, req.body ?? {})));
}
