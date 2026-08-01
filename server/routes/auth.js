import { randomUUID } from "node:crypto";
import { hashPassword, verifyPassword } from "../../src/auth.js";

export function registerAuthRoutes(app, { users, sessions }) {
  app.post("/auth/login", (req, res) => {
    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "");
    const authUser = users.first();
    if (!authUser) return res.status(409).json({ error: "setup required", setup_required: true });
    if (username !== authUser.username || !verifyPassword(password, authUser.password_hash)) return res.status(401).json({ error: "invalid credentials" });
    const token = sessions.createSession(username);
    sessions.setSessionCookie(res, token);
    return res.json({ ok: true, username });
  });

  app.get("/auth/status", (_req, res) => res.json({ setup_required: !users.first() }));

  app.post("/auth/setup", (req, res) => {
    if (users.first()) return res.status(409).json({ error: "setup already complete" });
    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "");
    if (username.length < 3) return res.status(400).json({ error: "username must be at least 3 characters" });
    if (password.length < 12) return res.status(400).json({ error: "password must be at least 12 characters" });
    users.create({ id: randomUUID(), username, passwordHash: hashPassword(password) });
    const token = sessions.createSession(username);
    sessions.setSessionCookie(res, token);
    return res.status(201).json({ ok: true, username });
  });

  app.post("/auth/demo", (_req, res) => {
    const username = "demo_guest";
    const token = sessions.createSession(username, "demo");
    sessions.setSessionCookie(res, token);
    return res.json({ ok: true, username, demo: true });
  });

  app.post("/auth/logout", (req, res) => {
    sessions.clearSession(req);
    sessions.clearSessionCookie(res);
    return res.status(204).send();
  });
}
