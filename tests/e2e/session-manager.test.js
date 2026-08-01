import test from "node:test";
import assert from "node:assert/strict";
import { createSessionManager, parseCookies } from "../../server/auth/session-manager.js";

test("session manager creates, reads, and clears member and demo sessions", () => {
  let sequence = 0;
  const manager = createSessionManager({ cookieName: "test_session", createToken: () => `token-${++sequence}`, now: () => 1234 });

  const memberToken = manager.createSession("owner");
  assert.equal(memberToken, "token-1");
  assert.deepEqual(manager.sessionFromRequest({ headers: { cookie: `test_session=${memberToken}` } }), {
    username: "owner",
    role: "member",
    demo: false,
    createdAt: 1234,
  });

  const demoToken = manager.createSession("guest", "demo");
  assert.equal(manager.sessionFromRequest({ headers: { cookie: `test_session=${demoToken}` } }).demo, true);

  manager.clearSession({ headers: { cookie: `test_session=${memberToken}` } });
  assert.equal(manager.sessionFromRequest({ headers: { cookie: `test_session=${memberToken}` } }), null);
});

test("session cookies are parsed and emitted without exposing the token to scripts", () => {
  assert.deepEqual(parseCookies("a=one; encoded=hello%20world"), { a: "one", encoded: "hello world" });

  const manager = createSessionManager({ cookieName: "test_session", createToken: () => "token" });
  const headers = new Map();
  const response = { setHeader: (name, value) => headers.set(name, value) };
  manager.setSessionCookie(response, "private token");
  assert.match(headers.get("Set-Cookie"), /^test_session=private%20token; HttpOnly; Path=\/; SameSite=Lax;/);
  manager.clearSessionCookie(response);
  assert.match(headers.get("Set-Cookie"), /Max-Age=0$/);
});
