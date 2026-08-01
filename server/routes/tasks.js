function send(res, result, status = 200) {
  if (result.error) return res.status(result.status || 400).json({ error: result.error });
  return res.status(status).json({ task: result.task });
}

export function registerTaskRoutes(app, { tasks }) {
  app.get("/api/tasks", (_req, res) => res.json({ tasks: tasks.list() }));
  app.post("/api/tasks", (req, res) => send(res, tasks.create(req.body ?? {}), 201));
  app.patch("/api/tasks/:id", (req, res) => send(res, tasks.update(req.params.id, req.body ?? {})));
  app.post("/api/tasks/:id/complete", (req, res) => send(res, tasks.complete(req.params.id)));
  app.post("/api/tasks/:id/snooze", (req, res) => send(res, tasks.snooze(req.params.id, req.body ?? {})));
  app.delete("/api/tasks/:id", (req, res) => {
    const result = tasks.delete(req.params.id);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.status(204).send();
  });
}
