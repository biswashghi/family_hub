import { existsSync } from "node:fs";
import path from "node:path";
import express from "express";
import { createSessionManager } from "./auth/session-manager.js";
import { errorHandler } from "./http/error-handler.js";
import { createDocumentUpload } from "./http/upload.js";
import { presentBill, presentDocument, presentItem, presentTask } from "./presenters/entities.js";
import { createAgendaRepository } from "./repositories/agenda-repository.js";
import { createBillRepository } from "./repositories/bills.js";
import { createDocumentRepository } from "./repositories/documents.js";
import { createItemRepository } from "./repositories/items.js";
import { createNoteRepository } from "./repositories/notes.js";
import { createTaskRepository } from "./repositories/tasks.js";
import { createUserRepository } from "./repositories/users.js";
import { registerAgendaRoutes } from "./routes/agenda.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerBillRoutes } from "./routes/bills.js";
import { registerDocumentRoutes } from "./routes/documents.js";
import { registerItemRoutes } from "./routes/items.js";
import { registerNoteRoutes } from "./routes/notes.js";
import { registerOverviewRoutes } from "./routes/overviews.js";
import { registerTaskRoutes } from "./routes/tasks.js";
import { createAgendaService } from "./services/agenda-service.js";
import { createBillService } from "./services/bills.js";
import { createDocumentService } from "./services/documents.js";
import { createItemService } from "./services/items.js";
import { createNoteService } from "./services/notes.js";
import { createOverviewService } from "./services/overviews.js";
import { createTaskService } from "./services/tasks.js";
import { createDemoApiHandler } from "../src/demo.js";

export function createApp({ config, db, rootDir, todayISO }) {
  const sessions = createSessionManager({ cookieName: config.sessionCookie });
  const upload = createDocumentUpload(config.filesDir);
  const billService = createBillService({ repository: createBillRepository(db), todayISO });
  const taskService = createTaskService({ repository: createTaskRepository(db), todayISO });
  const itemService = createItemService({ repository: createItemRepository(db) });
  const documentService = createDocumentService({ repository: createDocumentRepository(db), filesDir: config.filesDir });
  const noteService = createNoteService({ repository: createNoteRepository(db) });
  const overviewService = createOverviewService({ bills: billService, tasks: taskService, items: itemService, documents: documentService, notes: noteService, todayISO });
  const handleDemoApi = createDemoApiHandler({ todayISO });
  const app = express();

  function sendReactApp(res) {
    const indexPath = path.join(rootDir, "public", "app", "index.html");
    if (existsSync(indexPath)) return res.sendFile(indexPath);
    return res.status(503).send("Family Hub frontend has not been built. Run npm run build before starting the server.");
  }

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  registerAuthRoutes(app, {
    users: createUserRepository(db),
    sessions: {
      clearSession: sessions.clearSession,
      clearSessionCookie: sessions.clearSessionCookie,
      createSession: sessions.createSession,
      setSessionCookie: sessions.setSessionCookie,
    },
  });

  app.get("/api/session", (req, res) => {
    const session = sessions.sessionFromRequest(req);
    if (!session) return res.status(401).json({ error: "authentication required" });
    return res.json({ authenticated: true, username: session.username, demo: !!session.demo });
  });

  app.use("/api", (req, res, next) => {
    if (req.path === "/health") return next();
    return sessions.requireAuth(req, res, next);
  });
  app.use("/api", (req, res, next) => {
    if (!sessions.isDemoRequest(req)) return next();
    return handleDemoApi(req, res, next);
  });

  app.get("/api/environment", (_req, res) => {
    res.json({
      today: todayISO(),
      location: { label: config.locationLabel, latitude: config.weatherLatitude, longitude: config.weatherLongitude },
      timeZone: config.timeZone,
    });
  });

  registerOverviewRoutes(app, { overviews: overviewService });
  registerAgendaRoutes(app, {
    agendaService: createAgendaService({
      repository: createAgendaRepository(db, { bill: presentBill, task: presentTask, item: presentItem, document: presentDocument }),
      todayISO,
    }),
  });
  registerBillRoutes(app, { bills: billService });
  registerTaskRoutes(app, { tasks: taskService });
  registerItemRoutes(app, { items: itemService });
  registerDocumentRoutes(app, { documents: documentService, upload });
  registerNoteRoutes(app, { notes: noteService });

  app.get("/login", (_req, res) => sendReactApp(res));
  app.use((req, res, next) => {
    if (req.path === "/login" || req.path.startsWith("/auth/") || req.path.startsWith("/app/") || req.path.startsWith("/api/")) return next();
    if (sessions.sessionFromRequest(req)) return next();
    return res.redirect("/login");
  });
  app.use(express.static(path.join(rootDir, "public"), { index: false }));
  app.get("*", (_req, res) => sendReactApp(res));
  app.use(errorHandler);
  return app;
}
