import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, SUPER_ADMIN_EMAIL } from "./lib/supabase";

type AccountStatus = "pending" | "active" | "suspended" | "disabled";
type ManagedAccount = {
  user_id: string;
  email: string;
  full_name: string | null;
  preferred_language: string;
  account_status: AccountStatus;
  assigned_roles: string[];
  created_at: string;
};

const statusOptions: AccountStatus[] = ["pending", "active", "suspended", "disabled"];

function prettyRole(role: string) {
  return role.split("_").map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export default function AdminAccountsPanel({ currentUserId }: { currentUserId: string }) {
  const [accounts, setAccounts] = useState<ManagedAccount[]>([]);
  const [draftStatuses, setDraftStatuses] = useState<Record<string, AccountStatus>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: requestError } = await supabase.rpc("admin_list_accounts");
    if (requestError) {
      setError(requestError.message);
      setAccounts([]);
    } else {
      const rows = (data ?? []) as ManagedAccount[];
      setAccounts(rows);
      setDraftStatuses(Object.fromEntries(rows.map(row => [row.user_id, row.account_status])));
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadAccounts(); }, [loadAccounts]);

  const filteredAccounts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return accounts;
    return accounts.filter(row =>
      [row.email, row.full_name ?? "", row.account_status, ...row.assigned_roles]
        .some(value => value.toLowerCase().includes(term))
    );
  }, [accounts, search]);

  async function manage(row: ManagedAccount, action: string, accountStatus?: AccountStatus) {
    setWorkingId(row.user_id);
    setError("");
    setNotice("");
    const { error: requestError } = await supabase.rpc("admin_manage_account", {
      p_target_user_id: row.user_id,
      p_action: action,
      p_role_key: action === "assign_platform_admin" || action === "revoke_platform_admin" ? "platform_admin" : null,
      p_account_status: action === "set_status" ? accountStatus : null,
    });
    if (requestError) {
      setError(requestError.message);
    } else {
      setNotice("Change saved and recorded in the security audit log.");
      await loadAccounts();
    }
    setWorkingId("");
  }

  const activeCount = accounts.filter(row => row.account_status === "active").length;
  const adminCount = accounts.filter(row => row.assigned_roles.includes("platform_admin")).length;

  return <section className="aasa-panel aasa-accounts">
    <div className="aasa-section-heading">
      <div>
        <p className="aasa-kicker">ACCESS CONTROL</p>
        <h3>Administrator Accounts</h3>
        <p>Manage existing, registered AASA accounts. Role and status changes are enforced by database functions and recorded in the audit log.</p>
      </div>
      <button type="button" className="aasa-secondary" onClick={() => void loadAccounts()} disabled={loading || !!workingId}>Refresh</button>
    </div>

    <div className="aasa-account-metrics">
      <div><small>Registered accounts</small><strong>{accounts.length}</strong></div>
      <div><small>Active accounts</small><strong>{activeCount}</strong></div>
      <div><small>Platform administrators</small><strong>{adminCount}</strong></div>
    </div>

    <label className="aasa-search-label" htmlFor="aasa-account-search">Search accounts</label>
    <input id="aasa-account-search" className="aasa-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search email, name, status or role" />

    {error && <p className="aasa-error" role="alert">{error}</p>}
    {notice && <p className="aasa-notice" role="status">{notice}</p>}
    {loading ? <p className="aasa-empty">Loading account records…</p> :
      filteredAccounts.length === 0 ? <p className="aasa-empty">No matching registered accounts.</p> :
      <div className="aasa-account-list">
        {filteredAccounts.map(row => {
          const isProtected = row.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
          const isSelf = row.user_id === currentUserId;
          const isWorking = workingId === row.user_id;
          const hasPlatformRole = row.assigned_roles.includes("platform_admin");
          return <article className="aasa-account-row" key={row.user_id}>
            <div className="aasa-account-main">
              <div className="aasa-account-avatar">{(row.full_name || row.email).trim().charAt(0).toUpperCase()}</div>
              <div className="aasa-account-identity">
                <strong>{row.full_name || "Name not provided"}</strong>
                <span>{row.email}</span>
                <small>Registered {new Date(row.created_at).toLocaleDateString()}</small>
              </div>
              <span className={"aasa-status status-" + row.account_status}>{row.account_status}</span>
            </div>
            <div className="aasa-role-list">
              {row.assigned_roles.length ? row.assigned_roles.map(role => <span className="aasa-role-tag" key={role}>{prettyRole(role)}</span>) : <span className="aasa-role-muted">No roles assigned</span>}
            </div>
            <div className="aasa-account-actions">
              <div className="aasa-status-editor">
                <label htmlFor={"status-" + row.user_id}>Account status</label>
                <select id={"status-" + row.user_id} value={draftStatuses[row.user_id] ?? row.account_status} disabled={isProtected || isSelf || isWorking} onChange={event => setDraftStatuses(previous => ({ ...previous, [row.user_id]: event.target.value as AccountStatus }))}>
                  {statusOptions.map(status => <option key={status} value={status}>{status}</option>)}
                </select>
                <button type="button" className="aasa-secondary" disabled={isProtected || isSelf || isWorking || (draftStatuses[row.user_id] ?? row.account_status) === row.account_status} onClick={() => void manage(row, "set_status", draftStatuses[row.user_id])}>{isWorking ? "Saving…" : "Save status"}</button>
              </div>
              <div className="aasa-role-editor">
                {hasPlatformRole ?
                  <button type="button" className="aasa-danger-button" disabled={isProtected || isSelf || isWorking} onClick={() => void manage(row, "revoke_platform_admin")}>Remove Platform Admin</button> :
                  <button type="button" className="aasa-secondary" disabled={isProtected || isSelf || isWorking || row.account_status !== "active"} onClick={() => void manage(row, "assign_platform_admin")}>Assign Platform Admin</button>}
              </div>
            </div>
            {(isProtected || isSelf) && <small className="aasa-protected-note">{isProtected ? "Permanent Super Admin account is protected." : "Your signed-in account cannot be suspended or have its administrator role removed here."}</small>}
          </article>;
        })}
      </div>
    }
    <p className="aasa-accounts-footnote">Only existing accounts are shown. This panel does not create users, delete accounts, or assign the permanent Super Admin role.</p>
  </section>;
}
