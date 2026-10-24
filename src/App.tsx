import { useState } from "react";
import { appwriteConfigReady, checkAppwriteConnection } from "./lib/appwrite";

type ConnectionState = "idle" | "checking" | "connected" | "error";

export default function App() {
  const [connection, setConnection] = useState<ConnectionState>("idle");
  const [message, setMessage] = useState("Connection has not been tested yet.");

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

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true">A</div>
        <div>
          <p className="eyebrow">ABU-AIMAN STUDENTS' ASSOCIATION</p>
          <h1>AASA Management System</h1>
        </div>
        <span className="version">FOUNDATION · 0.1</span>
      </header>

      <section className="welcome">
        <p className="eyebrow light">WELCOME</p>
        <h2>One trusted place to manage AASA.</h2>
        <p className="intro">A secure, multilingual foundation for association administration. Core modules will be added in stages, with real data and access controls—not sample records presented as real.</p>
      </section>

      <section className="status-card" aria-labelledby="connection-heading">
        <div className="status-heading">
          <div>
            <p className="eyebrow">BACKEND SETUP</p>
            <h3 id="connection-heading">Appwrite connection</h3>
          </div>
          <span className={`status-pill ${connection}`}>
            {connection === "connected" ? "Connected" : connection === "checking" ? "Checking" : connection === "error" ? "Needs attention" : "Not tested"}
          </span>
        </div>
        <p className="status-message" role="status">{message}</p>
        {!appwriteConfigReady && <p className="hint">Local environment settings are missing. Copy <code>.env.example</code> to <code>.env.local</code> and check the public Appwrite endpoint and project ID.</p>}
        <button type="button" onClick={testConnection} disabled={connection === "checking" || !appwriteConfigReady}>
          {connection === "checking" ? "Testing…" : "Test Appwrite connection"}
        </button>
        <p className="small-note">This checks connectivity only. Authentication, database collections, permissions, and production hosting are not configured by this test.</p>
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