function send(res, result, status = 200) {
  if (result.error) return res.status(result.status || 400).json({ error: result.error });
  return res.status(status).json({ document: result.document });
}

export function registerDocumentRoutes(app, { documents, upload }) {
  app.get("/api/documents", (_req, res) => res.json({ documents: documents.list() }));
  app.post("/api/documents", upload.single("file"), (req, res) => send(res, documents.create(req.file, req.body ?? {}), 201));
  app.patch("/api/documents/:id", (req, res) => send(res, documents.update(req.params.id, req.body ?? {})));
  app.post("/api/documents/:id/pin", (req, res) => send(res, documents.pin(req.params.id, req.body?.is_pinned)));
  app.get("/api/documents/:id/download", (req, res) => {
    const result = documents.download(req.params.id);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.download(result.absolute, result.fileName);
  });
  app.delete("/api/documents/:id", (req, res) => {
    const result = documents.delete(req.params.id);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.status(204).send();
  });
}
