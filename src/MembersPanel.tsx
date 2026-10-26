import { useCallback, useEffect, useMemo, useState } from "react";
import { appwriteConfigReady, getCurrentAccount, secureApi } from "./lib/appwrite";

type Member = {
  $id: string;
  member_number?: string;
  full_name?: string;
  email?: string;
  phone_number?: string;
  membership_status?: string;
  joined_at?: string;
  is_test_record?: boolean;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Could not load member records.";
}

export default function MembersPanel() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (!appwriteConfigReady) throw new Error("Appwrite is not configured. Set the public project endpoint and project ID.");
      await getCurrentAccount();
      const response = await secureApi<{ rows?: Member[] }>("/members");
      setMembers((response.rows || []).filter((row) => row.is_test_record !== true));
      setLoaded(true);
    } catch (cause) {
      setMembers([]);
      setError(errorMessage(cause));
      setLoaded(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadMembers(); }, [loadMembers]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return members;
    return members.filter((member) =>
      [member.member_number, member.full_name, member.email, member.phone_number, member.membership_status]
        .some((value) => (value ?? "").toLocaleLowerCase().includes(term))
    );
  }, [members, search]);

  return (
    <section className="members-workspace" aria-labelledby="members-heading">
      <div className="members-heading-row">
        <div>
          <p className="eyebrow">MEMBERSHIP MANAGEMENT</p>
          <h2 id="members-heading">Members &amp; Profiles</h2>
          <p className="members-subtitle">Search verified member records, review membership status and keep association records accurate.</p>
        </div>
        <button className="outline-button" type="button" onClick={() => void loadMembers()} disabled={loading}>
          {loading ? "Refreshing…" : "↻ Refresh records"}
        </button>
      </div>

      <div className="members-stats">
        <div><span>Visible records</span><strong>{loaded ? filtered.length : "—"}</strong></div>
        <div><span>Active members</span><strong>{loaded ? members.filter((m) => m.membership_status === "ACTIVE").length : "—"}</strong></div>
        <div><span>Data source</span><strong>Secure API</strong></div>
      </div>

      <div className="members-table-card">
        <div className="members-toolbar">
          <div><h3>Member directory</h3><p>Only verified live records are shown. Test records are excluded.</p></div>
          <label className="member-search">
            <span aria-hidden="true">⌕</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, ID, email…" aria-label="Search member records" />
          </label>
        </div>

        {loading && <div className="members-state"><span className="loading-spinner" />Loading secure member records…</div>}
        {!loading && error && <div className="members-state members-error"><span className="state-icon">◇</span><strong>Member data is protected</strong><p>{error}</p><small>No records have been created or changed by this screen.</small></div>}
        {!loading && !error && loaded && filtered.length === 0 && <div className="members-state"><span className="state-icon">⌕</span><strong>{members.length === 0 ? "No member records yet" : "No matching members"}</strong><p>{members.length === 0 ? "The AASA Members table currently has no non-test records accessible to this account." : "Try another name, member number or contact detail."}</p></div>}
        {!loading && !error && filtered.length > 0 && <div className="members-table-wrap"><table className="members-table"><thead><tr><th>Member</th><th>Member ID</th><th>Contact</th><th>Status</th><th>Joined</th></tr></thead><tbody>{filtered.map((member) => <tr key={member.$id}><td><strong>{member.full_name || "Name not provided"}</strong><small>{member.email || "No email on record"}</small></td><td><span className="member-id">{member.member_number || "—"}</span></td><td>{member.phone_number || "—"}</td><td><span className={`member-status ${(member.membership_status || "UNKNOWN").toLowerCase()}`}>{(member.membership_status || "UNKNOWN").replaceAll("_", " ")}</span></td><td>{member.joined_at ? new Date(member.joined_at).toLocaleDateString() : "—"}</td></tr>)}</tbody></table></div>}
      </div>
      <p className="members-security-note"><span>ⓘ</span> Member records are read through server-side role checks and audit logging. Writes remain disabled in this screen.</p>
    </section>
  );
}
