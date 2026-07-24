import { motion } from "framer-motion";
import { Home } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../api";

export function AuthPage() {
  const [setupRequired, setSetupRequired] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "1") {
      void enterDemo();
      return;
    }

    void api<{ setup_required: boolean }>("/auth/status")
      .then((status) => setSetupRequired(status.setup_required))
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to check login status."));
  }, []);

  async function enterDemo() {
    setBusy(true);
    setError("");
    try {
      await api("/auth/demo", { method: "POST" });
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo login failed.");
      setBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(setupRequired ? "/auth/setup" : "/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
      setBusy(false);
    }
  }

  return (
    <main className="authShell">
      <motion.section className="authPanel" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}>
        <div className="authMark">
          <Home />
        </div>
        <div className="authCopy">
          <span className="eyebrow">Private Household OS</span>
          <h1>Family Hub</h1>
          <p>{setupRequired ? "Create the first household login." : "Sign in to the household dashboard."}</p>
        </div>
        <form className="authForm" onSubmit={(event) => void submit(event)}>
          <label>
            <span>Username</span>
            <input name="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required />
          </label>
          <label>
            <span>Password</span>
            <input name="password" type="password" autoComplete={setupRequired ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          {error && <p className="formError">{error}</p>}
          <button className="authSubmit" type="submit" disabled={busy}>
            {setupRequired ? "Create account" : "Enter Family Hub"}
          </button>
          <button className="authDemo" type="button" onClick={() => void enterDemo()} disabled={busy}>
            View read-only demo
          </button>
        </form>
      </motion.section>
    </main>
  );
}
