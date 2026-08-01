export function createUserRepository(db) {
  const first = () => db.prepare("SELECT * FROM auth_users ORDER BY created_at ASC LIMIT 1").get() || null;
  return {
    first,
    create({ id, username, passwordHash }) {
      db.prepare("INSERT INTO auth_users (id, username, password_hash) VALUES (?, ?, ?)").run(id, username, passwordHash);
      return first();
    },
  };
}
