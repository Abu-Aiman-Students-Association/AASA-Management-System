import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "./lib/supabase";

type Position = { id:string; title:string; description:string|null; status:string; term_start:string|null; term_end:string|null };
type Committee = { id:string; name:string; purpose:string|null; status:string; formed_on:string };
type Member = { id:string; full_name:string; member_number:string; status:string };
type Appointment = { id:string; position_id:string; member_id:string; start_date:string; end_date:string|null; status:string; approved_by:string|null };
type CommitteeMember = { committee_id:string; member_id:string; committee_role:string; joined_on:string; left_on:string|null };

export default function GovernanceModule({userId}:{userId:string}) {
 const [positions,setPositions]=useState<Position[]>([]);
 const [committees,setCommittees]=useState<Committee[]>([]);
 const [members,setMembers]=useState<Member[]>([]);
 const [appointments,setAppointments]=useState<Appointment[]>([]);
 const [committeeMembers,setCommitteeMembers]=useState<CommitteeMember[]>([]);
 const [title,setTitle]=useState(""); const [description,setDescription]=useState("");
 const [termStart,setTermStart]=useState(""); const [termEnd,setTermEnd]=useState("");
 const [name,setName]=useState(""); const [purpose,setPurpose]=useState("");
 const [leaderPosition,setLeaderPosition]=useState(""); const [leaderMember,setLeaderMember]=useState(""); const [leaderStart,setLeaderStart]=useState(new Date().toISOString().slice(0,10)); const [leaderEnd,setLeaderEnd]=useState("");
 const [committeeId,setCommitteeId]=useState(""); const [committeeMemberId,setCommitteeMemberId]=useState(""); const [committeeRole,setCommitteeRole]=useState("member");
 const [query,setQuery]=useState(""); const [busy,setBusy]=useState(false); const [loading,setLoading]=useState(true); const [error,setError]=useState(""); const [notice,setNotice]=useState("");

 async function load() {
   setLoading(true);
   try {
     const [p,c,m,a,cm]=await Promise.all([
       supabase.from("aasa_positions").select("id,title,description,status,term_start,term_end").order("title"),
       supabase.from("aasa_committees").select("id,name,purpose,status,formed_on").order("name"),
       supabase.from("aasa_members").select("id,full_name,member_number,status").eq("status","active").order("full_name").limit(1000),
       supabase.from("aasa_leadership_appointments").select("id,position_id,member_id,start_date,end_date,status,approved_by").order("start_date",{ascending:false}).limit(500),
       supabase.from("aasa_committee_members").select("committee_id,member_id,committee_role,joined_on,left_on").order("joined_on",{ascending:false}).limit(1000)
     ]);
     for (const r of [p,c,m,a,cm]) if (r.error) throw r.error;
     setPositions(p.data??[]); setCommittees(c.data??[]); setMembers(m.data??[]); setAppointments(a.data??[]); setCommitteeMembers(cm.data??[]);
     setError("");
   } finally { setLoading(false); }
 }
 useEffect(()=>{void load().catch(e=>setError(e instanceof Error?e.message:"Could not load governance records."))},[]);

 async function run(action:()=>Promise<void>, success:string) {
   setBusy(true); setError(""); setNotice("");
   try { await action(); await load(); setNotice(success); }
   catch(e) { setError(e instanceof Error?e.message:"The change was not saved."); }
   finally { setBusy(false); }
 }
 async function addPosition(e:FormEvent) {
   e.preventDefault();
   if (termStart && termEnd && termEnd < termStart) { setError("The term end date cannot be earlier than the start date."); return; }
   await run(async()=>{const {error}=await supabase.from("aasa_positions").insert({title:title.trim(),description:description.trim()||null,term_start:termStart||null,term_end:termEnd||null,created_by:userId});if(error)throw error;setTitle("");setDescription("");setTermStart("");setTermEnd("");},"Leadership position saved.");
 }
 async function addCommittee(e:FormEvent) {
   e.preventDefault();
   await run(async()=>{const {error}=await supabase.from("aasa_committees").insert({name:name.trim(),purpose:purpose.trim()||null,created_by:userId});if(error)throw error;setName("");setPurpose("");},"Committee saved.");
 }
 async function appoint(e:FormEvent) {
   e.preventDefault();
   if (!leaderPosition || !leaderMember) { setError("Choose both a position and an active member."); return; }
   if (leaderEnd && leaderEnd < leaderStart) { setError("The appointment end date cannot be earlier than its start date."); return; }
   await run(async()=>{
     const {data:existing,error:readError}=await supabase.from("aasa_leadership_appointments").select("id").eq("position_id",leaderPosition).eq("status","active").is("end_date",null).limit(1);
     if(readError)throw readError;
     if(existing?.length)throw new Error("This position already has an active appointment. End the current appointment before assigning a successor.");
     const {error}=await supabase.from("aasa_leadership_appointments").insert({position_id:leaderPosition,member_id:leaderMember,start_date:leaderStart,end_date:leaderEnd||null,status:"active",approved_by:userId});
     if(error)throw error;setLeaderMember("");setLeaderEnd("");
   },"Leadership appointment recorded.");
 }
 async function addCommitteeMember(e:FormEvent) {
   e.preventDefault();
   if(!committeeId||!committeeMemberId){setError("Choose a committee and an active member.");return;}
   await run(async()=>{
     const existing=committeeMembers.some(x=>x.committee_id===committeeId&&x.member_id===committeeMemberId&&!x.left_on);
     if(existing)throw new Error("This member is already serving on the selected committee.");
     const {error}=await supabase.from("aasa_committee_members").insert({committee_id:committeeId,member_id:committeeMemberId,committee_role:committeeRole,joined_on:new Date().toISOString().slice(0,10)});
     if(error)throw error;setCommitteeMemberId("");setCommitteeRole("member");
   },"Committee membership recorded.");
 }
 async function endAppointment(row:Appointment) {
   if(!window.confirm("End this leadership appointment? The historical record will be retained."))return;
   await run(async()=>{const {error}=await supabase.from("aasa_leadership_appointments").update({status:"completed",end_date:new Date().toISOString().slice(0,10)}).eq("id",row.id).eq("status","active");if(error)throw error;const {error:positionError}=await supabase.from("aasa_positions").update({status:"vacant"}).eq("id",row.position_id);if(positionError)throw positionError;},"Appointment ended; history retained.");
 }
 async function leaveCommittee(row:CommitteeMember) {
   if(!window.confirm("Record that this member has left the committee? The history will be retained."))return;
   await run(async()=>{const {error}=await supabase.from("aasa_committee_members").update({left_on:new Date().toISOString().slice(0,10)}).eq("committee_id",row.committee_id).eq("member_id",row.member_id).is("left_on",null);if(error)throw error;},"Committee service period closed.");
 }
 const activeAppointments=appointments.filter(x=>x.status==="active"&&!x.end_date);
 const activeCommitteeMembers=committeeMembers.filter(x=>!x.left_on);
 const memberName=(id:string)=>members.find(x=>x.id===id)?.full_name??"Member record";
 const positionName=(id:string)=>positions.find(x=>x.id===id)?.title??"Position record";
 const committeeName=(id:string)=>committees.find(x=>x.id===id)?.name??"Committee record";
 const filteredPositions=positions.filter(x=>(x.title+" "+(x.description??"")).toLowerCase().includes(query.toLowerCase()));
 return <div className="aasa-module-work">
   <div className="aasa-governance-hero"><div><p className="aasa-kicker">GOVERNANCE · LEADERSHIP · ACCOUNTABILITY</p><h3>Leadership & committee centre</h3><p>Manage official roles, appointment terms and committee service history from the verified member register.</p></div><button type="button" className="aasa-secondary" disabled={loading||busy} onClick={()=>void load().catch(e=>setError(e.message))}>{loading?"Refreshing…":"Refresh records"}</button></div>
   <div className="aasa-overview-cards"><article><small>Defined positions</small><strong>{positions.length}</strong><p>Official leadership roles</p></article><article><small>Active appointments</small><strong>{activeAppointments.length}</strong><p>Current role holders</p></article><article><small>Committees</small><strong>{committees.length}</strong><p>Recorded working groups</p></article><article><small>Serving committee members</small><strong>{activeCommitteeMembers.length}</strong><p>Active assignments</p></article></div>
   <section className="aasa-panel"><div className="aasa-section-heading"><div><p className="aasa-kicker">01 · POSITION DIRECTORY</p><h3>Leadership positions</h3><p>Define roles and optional term boundaries before making an appointment.</p></div><input aria-label="Search positions" placeholder="Search positions…" value={query} onChange={e=>setQuery(e.target.value)}/></div>
     <form className="aasa-member-form" onSubmit={addPosition}><label>Position title *<input required minLength={2} maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Responsibilities / description<textarea rows={2} maxLength={1000} value={description} onChange={e=>setDescription(e.target.value)}/></label><label>Term starts<input type="date" value={termStart} onChange={e=>setTermStart(e.target.value)}/></label><label>Term ends<input type="date" min={termStart||undefined} value={termEnd} onChange={e=>setTermEnd(e.target.value)}/></label><button className="aasa-primary" disabled={busy}>{busy?"Saving…":"Create position"}</button></form>
     {filteredPositions.length?<div className="aasa-table-wrap"><table className="aasa-table"><thead><tr><th>Position</th><th>Responsibilities</th><th>Term</th><th>Status</th><th>Current holder</th></tr></thead><tbody>{filteredPositions.map(p=><tr key={p.id}><td><strong>{p.title}</strong></td><td>{p.description||"—"}</td><td>{p.term_start||"Open"} – {p.term_end||"Open"}</td><td><span className="aasa-pill">{p.status}</span></td><td>{activeAppointments.filter(a=>a.position_id===p.id).map(a=>memberName(a.member_id)).join(", ")||"Vacant"}</td></tr>)}</tbody></table></div>:<p className="aasa-muted">{loading?"Loading positions…":"No positions match the search. Create official positions as authorised."}</p>}
   </section>
   <section className="aasa-panel"><div className="aasa-section-heading"><div><p className="aasa-kicker">02 · APPOINTMENTS</p><h3>Appoint a leader</h3><p>Only active members can be appointed. The database remains the final authority for permissions.</p></div></div>
     <form className="aasa-member-form" onSubmit={appoint}><label>Position *<select required value={leaderPosition} onChange={e=>setLeaderPosition(e.target.value)}><option value="">Choose a position</option>{positions.filter(p=>p.status!=="inactive").map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label><label>Active member *<select required value={leaderMember} onChange={e=>setLeaderMember(e.target.value)}><option value="">Choose a member</option>{members.map(m=><option key={m.id} value={m.id}>{m.full_name} · {m.member_number}</option>)}</select></label><label>Appointment starts *<input required type="date" value={leaderStart} onChange={e=>setLeaderStart(e.target.value)}/></label><label>Appointment ends (optional)<input type="date" min={leaderStart} value={leaderEnd} onChange={e=>setLeaderEnd(e.target.value)}/></label><button className="aasa-primary" disabled={busy||!positions.length||!members.length}>{busy?"Saving…":"Record appointment"}</button></form>
     {appointments.length?<div className="aasa-table-wrap"><table className="aasa-table"><thead><tr><th>Position</th><th>Member</th><th>Period</th><th>Status</th><th>Action</th></tr></thead><tbody>{appointments.map(a=><tr key={a.id}><td>{positionName(a.position_id)}</td><td>{memberName(a.member_id)}</td><td>{a.start_date} – {a.end_date||"Present"}</td><td><span className="aasa-pill">{a.status}</span></td><td>{a.status==="active"&&!a.end_date?<button type="button" className="aasa-secondary" disabled={busy} onClick={()=>void endAppointment(a)}>End appointment</button>:"—"}</td></tr>)}</tbody></table></div>:<p className="aasa-muted">No leadership appointments recorded.</p>}
   </section>
   <section className="aasa-panel"><div className="aasa-section-heading"><div><p className="aasa-kicker">03 · COMMITTEE DIRECTORY</p><h3>Committees and mandates</h3></div></div>
     <form className="aasa-member-form" onSubmit={addCommittee}><label>Committee name *<input required minLength={2} maxLength={140} value={name} onChange={e=>setName(e.target.value)}/></label><label>Purpose / mandate<textarea rows={2} maxLength={1000} value={purpose} onChange={e=>setPurpose(e.target.value)}/></label><button className="aasa-primary" disabled={busy}>{busy?"Saving…":"Create committee"}</button></form>
     {committees.length?<div className="aasa-table-wrap"><table className="aasa-table"><thead><tr><th>Committee</th><th>Mandate</th><th>Status</th><th>Formed</th><th>Serving</th></tr></thead><tbody>{committees.map(c=><tr key={c.id}><td><strong>{c.name}</strong></td><td>{c.purpose||"—"}</td><td>{c.status}</td><td>{c.formed_on}</td><td>{activeCommitteeMembers.filter(x=>x.committee_id===c.id).length}</td></tr>)}</tbody></table></div>:<p className="aasa-muted">No committees recorded. Create a committee with its approved mandate.</p>}
   </section>
   <section className="aasa-panel"><p className="aasa-kicker">04 · COMMITTEE ROSTERS</p><h3>Assign committee members</h3><form className="aasa-member-form" onSubmit={addCommitteeMember}><label>Committee *<select required value={committeeId} onChange={e=>setCommitteeId(e.target.value)}><option value="">Choose a committee</option>{committees.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Active member *<select required value={committeeMemberId} onChange={e=>setCommitteeMemberId(e.target.value)}><option value="">Choose a member</option>{members.map(m=><option key={m.id} value={m.id}>{m.full_name} · {m.member_number}</option>)}</select></label><label>Committee role<select value={committeeRole} onChange={e=>setCommitteeRole(e.target.value)}><option value="member">Member</option><option value="chair">Chair</option><option value="secretary">Secretary</option><option value="treasurer">Treasurer</option><option value="vice_chair">Vice-chair</option></select></label><button className="aasa-primary" disabled={busy||!committees.length||!members.length}>{busy?"Saving…":"Assign to committee"}</button></form>
     {committeeMembers.length?<div className="aasa-table-wrap"><table className="aasa-table"><thead><tr><th>Committee</th><th>Member</th><th>Role</th><th>Joined</th><th>Left</th><th>Action</th></tr></thead><tbody>{committeeMembers.map((cm,i)=><tr key={cm.committee_id+"-"+cm.member_id+"-"+i}><td>{committeeName(cm.committee_id)}</td><td>{memberName(cm.member_id)}</td><td>{cm.committee_role.replace(/_/g," ")}</td><td>{cm.joined_on}</td><td>{cm.left_on||"Serving"}</td><td>{!cm.left_on?<button type="button" className="aasa-secondary" disabled={busy} onClick={()=>void leaveCommittee(cm)}>End service</button>:"—"}</td></tr>)}</tbody></table></div>:<p className="aasa-muted">No committee assignments recorded.</p>}
   </section>
   {notice&&<p className="aasa-notice" role="status">{notice}</p>}{error&&<p className="aasa-error" role="alert">{error}</p>}
 </div>;
}
