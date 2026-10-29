import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "./lib/supabase";

type Member = {
  id: string; member_number: string; full_name: string; email: string | null;
  phone: string | null; membership_type: string; status: string; joined_on: string;
  date_of_birth: string | null; gender: string | null; address: string | null;
  notes: string | null; auth_user_id: string | null;
};
type MemberCard = { id: string; member_id: string; card_number: string; qr_token: string; status: string; issued_at: string };
export default function MembershipModule({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Member[]>([]);
  const [cards, setCards] = useState<MemberCard[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [type, setType] = useState("ordinary");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function load() {
    const [members, cardRows] = await Promise.all([
      supabase.from("aasa_members").select("id,member_number,full_name,email,phone,membership_type,status,joined_on,date_of_birth,gender,address,notes,auth_user_id").order("created_at", { ascending: false }).limit(250),
      supabase.from("aasa_member_cards").select("id,member_id,card_number,qr_token,status,issued_at").order("issued_at", { ascending: false }).limit(500)
    ]);
    if (members.error) throw members.error;
    if (cardRows.error) throw cardRows.error;
    setRows((members.data ?? []) as Member[]);
    setCards((cardRows.data ?? []) as MemberCard[]);
  }
  useEffect(() => { void load().catch(e => setError(e instanceof Error ? e.message : "Could not load membership records.")); }, []);
  async function add(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const memberNo = "AASA-" + new Date().getFullYear() + "-" + crypto.randomUUID().slice(0, 8).toUpperCase();
      const { error } = await supabase.from("aasa_members").insert({
        member_number: memberNo, full_name: name.trim(), email: email.trim() || null,
        phone: phone.trim() || null, date_of_birth: dob || null, gender: gender || null,
        address: address.trim() || null, notes: notes.trim() || null,
        membership_type: type, status: "pending", created_by: userId, updated_by: userId
      });
      if (error) throw error;
      setName(""); setEmail(""); setPhone(""); setDob(""); setGender(""); setAddress(""); setNotes(""); setType("ordinary");
      await load(); setNotice("Member record saved as pending. Review identity and details before approval.");
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
    try { const { error } = await supabase.rpc("aasa_issue_member_card", { p_member_id: m.id }); if (error) throw error; await load(); setNotice("Membership card record issued. Visual card artwork and public QR verification still require their dedicated release."); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not issue card."); }
    finally { setBusy(false); }
  }
  async function revokeCard(card: MemberCard) {
    setBusy(true); setError(""); setNotice("");
    try { const { error } = await supabase.rpc("aasa_revoke_member_card", { p_card_id: card.id }); if (error) throw error; await load(); setNotice("Membership card revoked."); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not revoke card."); }
    finally { setBusy(false); }
  }
  const filtered = rows.filter(m =>
    (statusFilter === "all" || m.status === statusFilter) &&
    [m.full_name,m.member_number,m.email ?? "",m.phone ?? "",m.status].some(v => v.toLowerCase().includes(query.toLowerCase()))
  );
  return <div className="aasa-module-work">
    <section className="aasa-panel">
      <div className="aasa-section-heading"><div><p className="aasa-kicker">MEMBERSHIP REGISTER</p><h3>Register a member</h3></div><span className="aasa-pill">{rows.length} records loaded</span></div>
      <form className="aasa-member-form" onSubmit={add}>
        <label>Full name *<input required minLength={2} maxLength={160} value={name} onChange={e=>setName(e.target.value)} autoComplete="name" /></label>
        <label>Email address<input type="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" /></label>
        <label>Phone number<input type="tel" maxLength={40} value={phone} onChange={e=>setPhone(e.target.value)} autoComplete="tel" /></label>
        <label>Date of birth<input type="date" value={dob} max={new Date().toISOString().slice(0,10)} onChange={e=>setDob(e.target.value)} /></label>
        <label>Gender<select value={gender} onChange={e=>setGender(e.target.value)}><option value="">Prefer not to say / Not provided</option><option value="male">Male</option><option value="female">Female</option><option value="prefer_not_to_say">Prefer not to say</option></select></label>
        <label>Membership type<select value={type} onChange={e=>setType(e.target.value)}><option value="ordinary">Ordinary</option><option value="associate">Associate</option><option value="honorary">Honorary</option><option value="life">Life</option></select></label>
        <label>Residential address<textarea rows={2} maxLength={500} value={address} onChange={e=>setAddress(e.target.value)} autoComplete="street-address" /></label>
        <label>Administrative notes (restricted)<textarea rows={2} maxLength={1000} value={notes} onChange={e=>setNotes(e.target.value)} /></label>
        <button className="aasa-primary" disabled={busy}>{busy ? "Saving…" : "Save pending member"}</button>
      </form>
      <p className="aasa-muted">Required fields are marked *. New records remain pending until reviewed. Do not enter sensitive personal information in administrative notes. Photo upload, printable card artwork and public QR verification are not yet part of this form.</p>
    </section>
    <section className="aasa-panel">
      <div className="aasa-section-heading"><div><p className="aasa-kicker">OFFICIAL REGISTER</p><h3>Members</h3></div>
        <div className="aasa-register-filters"><input aria-label="Search members" placeholder="Search name, number, email, phone…" value={query} onChange={e=>setQuery(e.target.value)} />
        <select aria-label="Filter by membership status" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">All statuses</option><option value="pending">Pending</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="inactive">Inactive</option><option value="rejected">Rejected</option></select></div>
      </div>
      {filtered.length ? <div className="aasa-table-wrap"><table className="aasa-table"><thead><tr><th>Member no.</th><th>Name & details</th><th>Contact</th><th>Type</th><th>Status</th><th>Joined</th><th>Card</th><th>Review</th></tr></thead><tbody>{filtered.map(m=><tr key={m.id}>
        <td>{m.member_number}</td><td><strong>{m.full_name}</strong><br/><small>DOB: {m.date_of_birth || "—"} · Gender: {m.gender || "—"}</small>{m.address && <><br/><small>{m.address}</small></>}{m.notes && <><br/><small>Admin note: {m.notes}</small></>}</td>
        <td>{m.email || "—"}<br/>{m.phone || "—"}</td><td>{m.membership_type}</td><td><span className="aasa-pill">{m.status}</span></td><td>{m.joined_on}</td>
        <td>{m.status==="active"&&m.email&&!m.auth_user_id&&<button type="button" className="aasa-secondary" disabled={busy} onClick={()=>void linkAccount(m)}>Link verified account</button>}{m.auth_user_id&&<small>Verified account linked</small>}{cards.filter(card=>card.member_id===m.id&&card.status==="active").map(card=><div key={card.id}>{card.card_number}<br/><small>Issued {new Date(card.issued_at).toLocaleDateString()}</small><br/><button type="button" className="aasa-link" disabled={busy} onClick={()=>void revokeCard(card)}>Revoke card</button></div>)}{m.status==="active"&&!cards.some(card=>card.member_id===m.id&&card.status==="active")&&<button type="button" className="aasa-secondary" disabled={busy} onClick={()=>void issueCard(m)}>Issue card</button>}</td>
        <td>{m.status === "pending" ? <><button type="button" className="aasa-secondary" disabled={busy} onClick={()=>void setStatus(m,"active")}>Approve</button> <button type="button" className="aasa-link" disabled={busy} onClick={()=>void setStatus(m,"rejected")}>Reject</button></> : m.status === "active" ? <button type="button" className="aasa-secondary" disabled={busy} onClick={()=>void setStatus(m,"suspended")}>Suspend</button> : m.status === "suspended" ? <button type="button" className="aasa-secondary" disabled={busy} onClick={()=>void setStatus(m,"active")}>Reactivate</button> : "—"}</td>
      </tr>)}</tbody></table></div> : <p className="aasa-muted">No matching membership records. Add verified records using the form above.</p>}
    </section>{notice && <p className="aasa-notice" role="status">{notice}</p>}{error && <p className="aasa-error" role="alert">{error}</p>}
  </div>;
}
