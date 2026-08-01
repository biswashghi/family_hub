export function registerAgendaRoutes(app, { agendaService }) {
  app.get("/api/agenda", (req, res) => {
    const agenda = agendaService.getAgenda(req.query);
    if (agenda.error) return res.status(agenda.status || 400).json({ error: agenda.error });
    return res.json(agenda);
  });
}
