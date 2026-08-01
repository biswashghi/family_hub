export function registerOverviewRoutes(app, { overviews }) {
  app.get("/api/dashboard", (_req, res) => res.json(overviews.dashboard()));
  app.get("/api/money/overview", (_req, res) => res.json(overviews.money()));
  app.get("/api/home/overview", (_req, res) => res.json(overviews.home()));
  app.get("/api/docs/overview", (_req, res) => res.json(overviews.docs()));
  app.get("/api/notes/overview", (_req, res) => res.json(overviews.notes()));
}
