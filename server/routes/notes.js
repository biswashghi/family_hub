function sendResult(res, result, successStatus = 200) {
  if (result.error) return res.status(result.status || 400).json({ error: result.error });
  return res.status(successStatus).json(result);
}

export function registerNoteRoutes(app, { notes }) {
  app.get("/api/notes", (req, res) => {
    const includeArchived = String(req.query.include_archived || "") === "1";
    res.json({ notes: notes.list({ includeArchived }) });
  });
  app.post("/api/notes", (req, res) => sendResult(res, notes.create(req.body ?? {}), 201));
  app.patch("/api/notes/:id", (req, res) => sendResult(res, notes.update(req.params.id, req.body ?? {})));
  app.post("/api/notes/:id/archive", (req, res) => sendResult(res, notes.archive(req.params.id, req.body?.is_archived)));
}
