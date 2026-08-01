import { randomUUID } from "node:crypto";

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function parseCookies(cookieHeader) {
  const cookies = {};
  String(cookieHeader || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((pair) => {
      const index = pair.indexOf("=");
      if (index < 0) return;
      const key = decodeURIComponent(pair.slice(0, index));
      const value = decodeURIComponent(pair.slice(index + 1));
      cookies[key] = value;
    });
  return cookies;
}

export function createSessionManager({ cookieName, createToken = randomUUID, now = Date.now }) {
  if (!cookieName) throw new Error("session cookie name is required");
  const sessions = new Map();

  function sessionFromRequest(req) {
    const token = parseCookies(req.headers?.cookie || "")[cookieName];
    if (!token) return null;
    return sessions.get(token) || null;
  }

  function createSession(username, role = "member") {
    const token = createToken();
    sessions.set(token, { username, role, demo: role === "demo", createdAt: now() });
    return token;
  }

  function clearSession(req) {
    const token = parseCookies(req.headers?.cookie || "")[cookieName];
    if (token) sessions.delete(token);
  }

  function setSessionCookie(res, token) {
    res.setHeader("Set-Cookie", `${cookieName}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}`);
  }

  function clearSessionCookie(res) {
    res.setHeader("Set-Cookie", `${cookieName}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
  }

  function requireAuth(req, res, next) {
    const session = sessionFromRequest(req);
    if (!session) {
      if (req.originalUrl?.startsWith("/api/") || req.path?.startsWith("/api/")) {
        return res.status(401).json({ error: "authentication required" });
      }
      return res.redirect("/login");
    }

    req.user = session;
    return next();
  }

  function isDemoRequest(req) {
    return req.user?.demo === true || req.user?.role === "demo";
  }

  return {
    clearSession,
    clearSessionCookie,
    createSession,
    isDemoRequest,
    requireAuth,
    sessionFromRequest,
    setSessionCookie,
  };
}
