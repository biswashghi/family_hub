function send(res, result, status = 200) {
  if (result.error) return res.status(result.status || 400).json({ error: result.error });
  return res.status(status).json({ bill: result.bill });
}

export function registerBillRoutes(app, { bills }) {
  app.get("/api/bills", (req, res) => res.json(bills.list(req.query)));
  app.post("/api/bills", (req, res) => send(res, bills.create(req.body ?? {}), 201));
  app.patch("/api/bills/:id", (req, res) => send(res, bills.update(req.params.id, req.body ?? {})));
  app.post("/api/bills/:id/mark-paid", (req, res) => send(res, bills.markPaid(req.params.id, req.body ?? {})));
  app.post("/api/bills/:id/skip", (req, res) => send(res, bills.skip(req.params.id, req.body ?? {})));
  app.delete("/api/bills/:id", (req, res) => {
    const result = bills.delete(req.params.id);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.status(204).send();
  });
}
