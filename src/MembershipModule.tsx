import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "./lib/supabase";

type Member = { id: string; member_number: string; full_name: string; email: string | null; phone: string | null; membership_type: string; status: string; joined_on: string; auth_user_id: string | null };
type MemberCard = { id: string; member_id: string; card_number: string; qr_token: string; status: string; issued_at: string };
export default function MembershipModule({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Member[]>([]);
  const [cards, setCards] = useState<MemberCard[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState("ordinary");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function load() {
    const [members, cardRows] = await Promise.all([
      supabase.from("aasa_members").select("id,member_number,full_name,email,phone,membership_type,status,joined_on,auth_user_id").order("created_at", { ascending: false }).limit(250),
      supabase.from("aasa_member_cards").select("id,member_id,card_number,qr_token,status,issued_at").order("issued_at", { ascending: false }).limit(500)
    ]);
    if (members.error) throw members.error;
    if (cardRows.error) throw cardRows.error;
    setRows((members.data ?? []) as Member[]);
    setCards((cardRows.data ?? []) as MemberCard[]);
  }
  useEffect(() => { void load().catch(e => setError(e.message)); }, []);
  async function add(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const memberNo = "AASA-" + new Date().getFullYear() + "-" + crypto.randomUUID().slice(0, 8).toUpperCase();
      const { error } = await supabase.from("aasa_members").insert({ member_number: memberNo, full_name: name.trim(), email: email.trim() || null, phone: phone.trim() || null, membership_type: type, status: "pending", created_by: userId, updated_by: userId });
      if (error) throw error;
      setName(""); setEmail(""); setPhone(""); setType("ordinary");
      await load(); setNotice("Membership application saved as pending. Verify details before activation.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save membership."); }
    finally { setBusy(false); }
  }
  async function setStatus(m: Member, status: string) {
    setBusy(true); setError(""); setNotice("");
    try {
      const { error } = await supabase.from("aasa_members").update({ status, updated_by: userId }).eq("id", m.id);
      if (error) throw error;
      await load(); setNotice("Membership status updated.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update status."); }
    finally { setBusy(false); }
  }
  async function linkAccount(m: Member) {
    setBusy(true); setError(""); setNotice("");
    try { const { error } = await supabase.rpc("aasa_link_member_account_by_email", { p_member_id: m.id }); if (error) throw error; await load(); setNotice("Member account linked after confirmed-email matching."); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not link account."); }
    finally { setBusy(false); }
  }
  async function issueCard(m: Member) {
    setBusy(true); setError(""); setNotice("");
    try { const { error } = await supabase.rpc("aasa_issue_member_card", { p_member_id: m.id }); if (error) throw error; await load(); setNotice("Membership card record issued. QR artwork and public verification view are a separate next step."); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not issue card."); }
    finally { setBusy(false); }
  }
  async function revokeCard(card: MemberCard) {
    setBusy(true); setError(""); setNotice("");
    try { const { error } = await supabase.rpc("aasa_revoke_member_card", { p_card_id: card.id }); if (error) throw error; await load(); setNotice("Membership card revoked."); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not revoke card."); }
    finally { setBusy(false); }
  }
  const filtered = rows.filter(m => [m.full_name,m.member_number,m.email ?? "",m.phone ?? "",m.status].some(v => v.toLowerCase().includes(query.toLowerCase())));
  return <div className="aasa-module-work">
    <section className="aasa-panel"><div className="aasa-section-heading"><div><p className="aasa-kicker">MEMBERSHIP REGISTER</p><h3>Register a member</h3></div><span className="aasa-pill">{rows.length} records loaded</span></div>
      <form className="aasa-member-form" onSubmit={add}><label>Full name<input required maxLength={160} value={name} onChange={e=>setName(e.target.value)} /></label><label>Email (optional)<input type="email" value={email} onChange={e=>setEmail(e.target.value)} /></label><label>Phone (optional)<input value={phone} maxLength={40} onChange={e=>setPhone(e.target.value)} /></label><label>Membership type<select value={type} onChange={e=>setType(e.target.value)}><option value="ordinary">Ordinary</option><option value="associate">Associate</option><option value="honorary">Honorary</option><option value="life">Life</option></select></label><button className="aasa-primary" disabled={busy}>{busy ? "Saving…" : "Save pending member"}</button></form>
      <p className="aasa-muted">New records remain pending until reviewed. No sample members are created. Member-card and QR issuance should follow verified approval.</p>
    </section>
    <section className="aasa-panel"><div className="aasa-section-heading"><div><p className="aasa-kicker">OFFICIAL REGISTER</p><h3>Members</h3></div><input aria-label="Search members" placeholder="Search name, number, email, phone…" value={query} onChange={e=>setQuery(e.target.value)} /></div>
      {filtered.length ? <div className="aasa-table-wrap"><table className="aasa-table"><thead><tr><th>Member no.</th><th>Name</th><th>Contact</th><th>Type</th><th>Status</th><th>Joined</th><th>Card</th><th>Review</th></tr></thead><tbody>{filtered.map(m=><tr key={m.id}><td>{m.member_number}</td><td>{m.full_name}</td><td>{m.email || "—"}<br/>{m.phone || ""}</td><td>{m.membership_type}</td><td><span className="aasa-pill">{m.status}</span></td><td>{m.joined_on}</td><td>{m.status==="active"&&m.email&&!m.auth_user_id&&<button type="button" className="aasa-secondary" disabled={busy} onClick={()=>void linkAccount(m)}>Link verified account</button>}{m.auth_user_id&&<small>Verified account linked</small>}{cards.filter(card=>card.member_id===m.id&&card.status==="active").map(card=><div key={card.id}>{card.card_number}<br/><small>Issued {new Date(card.issued_at).toLocaleDateString()}</small><br/><button type="button" className="aasa-link" disabled={busy} onClick={()=>void revokeCard(card)}>Revoke card</button></div>)}{m.status==="active"&&!cards.some(card=>card.member_id===m.id&&card.status==="active")&&<button type="button" className="aasa-secondary" disabled={busy} onClick={()=>void issueCard(m)}>Issue card</button>}</td><td>{m.status === "pending" ? <><button type="button" className="aasa-secondary" disabled={busy} onClick={()=>void setStatus(m,"active")}>Approve</button> <button type="button" className="aasa-link" disabled={busy} onClick={()=>void setStatus(m,"rejected")}>Reject</button></> : m.status === "active" ? <button type="button" className="aasa-secondary" disabled={busy} onClick={()=>void setStatus(m,"suspended")}>Suspend</button> : m.status === "suspended" ? <button type="button" className="aasa-secondary" disabled={busy} onClick={()=>void setStatus(m,"active")}>Reactivate</button> : "—"}</td></tr>)}</tbody></table></div> : <p className="aasa-muted">No matching membership records. Add verified records using the form above.</p>}
    </section>{notice && <p className="aasa-notice" role="status">{notice}</p>}{error && <p className="aasa-error" role="alert">{error}</p>}
  </div>;
}
