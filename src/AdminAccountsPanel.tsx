import { useCallback, useEffect, useState } from "react";
import { supabase, SUPER_ADMIN_EMAIL } from "./lib/supabase";

type Account = { user_id: string; email: string; full_name: string | null; account_status: string; assigned_roles: string[]; created_at: string };

export default function AdminAccountsPanel({ currentUserId }: { currentUserId: string }) {
  const [rows, setRows] = useState<Account[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: queryError } = await supabase.rpc("admin_list_accounts");
      if (queryError) throw queryError;
      const next = (data ?? []) as Account[];
      setRows(next);
      setDraft(previous => Object.fromEntries(next.map(row => [row.user_id, previous[row.user_id] ?? row.account_status])));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load administrator accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  async function act(row: Account, action: string, status?: string) {
    setBusy(row.user_id);
    setError("");
    setNotice("");
    try {
      const { error: actionError } = await supabase.rpc("admin_manage_account", {
        p_target_user_id: row.user_id,
        p_action: action,
        p_role_key: action.includes("platform_admin") ? "platform_admin" : null,
        p_account_status: status ?? null,
      });
      if (actionError) throw actionError;
      setNotice("Administrator account updated successfully.");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The account change failed. No success was reported.");
    } finally {
      setBusy("");
    }
  }

  return <section className="aasa-panel aasa-accounts">
    <div className="aasa-section-heading"><div><p className="aasa-kicker">ACCESS CONTROL</p><h3>Administrator Accounts</h3><p>Manage registered accounts. Changes are validated by database rules and written to the security audit log.</p></div><button className="aasa-secondary" type="button" disabled={loading || !!busy} onClick={() => void reload()}>{loading ? "Refreshing…" : "Refresh"}</button></div>
    <p>{rows.length} registered accounts · {rows.filter(row => row.account_status === "active").length} active</p>
    {notice && <p className="aasa-notice" role="status">{notice}</p>}
    {error && <p className="aasa-error" role="alert">{error}</p>}
    <div className="aasa-account-list">{rows.map(row => {
      const protectedUser = row.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
      const self = row.user_id === currentUserId;
      const admin = row.assigned_roles.includes("platform_admin");
      const rowBusy = busy === row.user_id;
      const nextStatus = draft[row.user_id] ?? row.account_status;
      return <article className="aasa-account-row" key={row.user_id}>
        <strong>{row.full_name || row.email}</strong><p>{row.email}</p>
        <p>Status: {row.account_status} · Roles: {row.assigned_roles.join(", ") || "none"}</p>
        <label>Status <select value={nextStatus} disabled={protectedUser || self || !!busy} onChange={e => setDraft(previous => ({ ...previous, [row.user_id]: e.target.value }))}>{["pending", "active", "suspended", "disabled"].map(status => <option key={status} value={status}>{status}</option>)}</select></label>
        <button type="button" disabled={protectedUser || self || !!busy || nextStatus === row.account_status} onClick={() => void act(row, "set_status", nextStatus)}>Save status</button>
        <button type="button" disabled={protectedUser || self || !!busy || (!admin && row.account_status !== "active")} onClick={() => void act(row, admin ? "revoke_platform_admin" : "assign_platform_admin")}>{rowBusy ? "Saving…" : admin ? "Remove Platform Admin" : "Assign Platform Admin"}</button>
        {(protectedUser || self) && <small>Protected account</small>}
      </article>;
    })}</div>
  </section>;
}
