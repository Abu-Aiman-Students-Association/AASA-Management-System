import { useEffect, useState, type FormEvent } from "react";
import {
  appwriteConfigReady,
  checkAppwriteConnection,
  getCurrentAccount,
  requestPasswordRecovery,
  signInWithEmail,
  signOut,
} from "./lib/appwrite";

type ConnectionState = "idle" | "checking" | "connected" | "error";
type View = "login" | "recovery";

export default function App() {
  const [connection, setConnection] = useState<ConnectionState>("idle");
  const [message, setMessage] = useState("Connection has not been tested yet.");
  const [user, setUser] = useState<{ $id: string; name: string; email: string } | null>(null);
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    let active = true;
    if (appwriteConfigReady) {
      getCurrentAccount()
        .then((current) => {
          if (active) setUser({ $id: current.$id, name: current.name, email: current.email });
        })
        .catch(() => {
          // A missing session is expected for signed-out visitors.
        });
    }
    return () => { active = false; };
  }, []);

  async function testConnection() {
    setConnection("checking");
    setMessage("Checking Appwrite endpoint…");
    try {
      await checkAppwriteConnection();
      setConnection("connected");
      setMessage("Appwrite responded to the connection check.");
    } catch (error) {
      setConnection("error");
      setMessage(error instanceof Error ? error.message : "Connection check failed.");
    }
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setAuthError(false);
    setAuthMessage("");
    try {
      const current = await signInWithEmail(email, password);
      setUser({ $id: current.$id, name: current.name, email: current.email });
      setPassword("");
      setAuthMessage("Signed in successfully. Member access permissions still need to be configured.");
    } catch (error) {
      setAuthError(true);
      setAuthMessage(error instanceof Error ? error.message : "Sign-in failed. Check your details and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setAuthError(false);
    setAuthMessage("");
    try {
      await requestPasswordRecovery(email);
      setAuthMessage("If the account exists and email delivery is configured, Appwrite will send a password recovery link.");
    } catch (error) {
      setAuthError(true);
      setAuthMessage(error instanceof Error ? error.message : "Could not request password recovery.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    try {
      await signOut();
      setUser(null);
      setAuthMessage("You have signed out.");
      setAuthError(false);
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Sign-out failed.");
      setAuthError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true">A</div>
        <div>
          <p className="eyebrow">ABU-AIMAN STUDENTS' ASSOCIATION</p>
          <h1>AASA Management System</h1>
        </div>
        <span className="version">FOUNDATION · 0.2</span>
      </header>

      <section className="welcome">
        <p className="eyebrow light">WELCOME</p>
        <h2>One trusted place to manage AASA.</h2>
        <p className="intro">A secure, multilingual foundation for association administration. Core modules will be added in stages, with real data and access controls—not sample records presented as real.</p>
      </section>

      <section className="status-card" aria-labelledby="auth-heading">
        <div className="status-heading">
          <div><p className="eyebrow">ACCOUNT SECURITY</p><h3 id="auth-heading">{user ? "Your account" : view === "recovery" ? "Reset password" : "Sign in to AASA"}</h3></div>
          <span className={`status-pill ${user ? "connected" : "idle"}`}>{user ? "Signed in" : "Secure sign-in"}</span>
        </div>
        {user ? (
          <div className="account-panel">
            <p className="account-name">{user.name || "AASA account"}</p>
            <p className="account-email">{user.email}</p>
            <p className="small-note">Identity verified by Appwrite. Access to association records is not enabled until role and database permissions are configured.</p>
            <button type="button" onClick={handleSignOut} disabled={busy}>{busy ? "Please wait…" : "Sign out"}</button>
          </div>
        ) : view === "recovery" ? (
          <form className="auth-form" onSubmit={handleRecovery}>
            <p className="form-help">Enter the email address linked to your account. Appwrite will send a recovery link if recovery email delivery is configured.</p>
            <label htmlFor="recovery-email">Email address</label>
            <input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <button type="submit" disabled={busy || !appwriteConfigReady}>{busy ? "Sending…" : "Send recovery link"}</button>
            <button type="button" className="secondary-button" onClick={() => { setView("login"); setAuthMessage(""); }}>Back to sign in</button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleSignIn}>
            <p className="form-help">Use an account created by an authorized AASA administrator. Public self-registration is not enabled yet.</p>
            <label htmlFor="login-email">Email address</label>
            <input id="login-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <label htmlFor="login-password">Password</label>
            <input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="submit" disabled={busy || !appwriteConfigReady}>{busy ? "Signing in…" : "Sign in"}</button>
            <button type="button" className="text-button" onClick={() => { setView("recovery"); setAuthMessage(""); }}>Forgot password?</button>
          </form>
        )}
        {authMessage && <p className={`status-message ${authError ? "error-text" : ""}`} role="status">{authMessage}</p>}
        {!appwriteConfigReady && <p className="hint">Appwrite settings are missing. Check the public endpoint and project ID configuration.</p>}
      </section>

      <section className="status-card" aria-labelledby="connection-heading">
        <div className="status-heading">
          <div><p className="eyebrow">BACKEND SETUP</p><h3 id="connection-heading">Appwrite connection</h3></div>
          <span className={`status-pill ${connection}`}>{connection === "connected" ? "Connected" : connection === "checking" ? "Checking" : connection === "error" ? "Needs attention" : "Not tested"}</span>
        </div>
        <p className="status-message" role="status">{message}</p>
        <button type="button" onClick={testConnection} disabled={connection === "checking" || !appwriteConfigReady}>{connection === "checking" ? "Testing…" : "Test Appwrite connection"}</button>
        <p className="small-note">Connectivity check only; database collections and record permissions are configured separately.</p>
      </section>

      <section className="module-grid" aria-label="Planned modules">
        <article className="module-card"><span>01</span><h3>Members &amp; records</h3><p>Member profiles and verified association records.</p><small>Planned</small></article>
        <article className="module-card"><span>02</span><h3>Administration</h3><p>Roles, approvals, meetings, and governance workflows.</p><small>Planned</small></article>
        <article className="module-card"><span>03</span><h3>Finance</h3><p>Transparent dues, transactions, and financial reports.</p><small>Planned</small></article>
      </section>
      <footer>ABU-AIMAN STUDENTS' ASSOCIATION · Built in stages with security and accountability in mind.</footer>
    </main>
  );
}
