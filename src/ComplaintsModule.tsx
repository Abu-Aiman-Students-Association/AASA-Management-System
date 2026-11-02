import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

type Row = { id:string; case_ref:string; category:string; priority:string; status:string; description:string; decision:string|null; assigned_reviewer_id:string|null; created_at:string; decision_recorded_at:string|null };
type Appeal = { id:string; complaint_id:string; appeal_text:string; status:string; outcome:string|null; created_at:string };

const copy = {
 en:{kicker:"CONFIDENTIAL COMPLAINTS",submit:"Submit a complaint",category:"Category",priority:"Priority",details:"Details",send:"Submit confidential complaint",mine:"My complaints",register:"Complaints register",ref:"Reference",status:"Status",review:"Review",empty:"No complaint records yet.",low:"Low",normal:"Normal",high:"High",urgent:"Urgent",appeal:"Submit an appeal",appealText:"Explain why you are appealing",sendAppeal:"Submit appeal",appeals:"Appeals",take:"Assign to me",decision:"Record decision",decisionText:"Decision and reasons",saveDecision:"Save decision",reviewing:"Under review",error:"Unable to complete this action.",success:"Your submission was saved.",confidential:"Only you and authorised reviewers can view this confidential record.",governance:"Governance",leadership:"Leadership conduct",finance:"Finance",membership:"Membership",election:"Election",safeguarding:"Safeguarding",other:"Other",appealState:"Appeal status",outcome:"Outcome",saveAppeal:"Save appeal review",underReview:"Under review",upheld:"Upheld",rejected:"Rejected"},
 ha:{kicker:"KORAFE-KORAFE NA SIRRI",submit:"Shigar da ƙorafi",category:"Nau'i",priority:"Muhimmanci",details:"Bayani",send:"Aika ƙorafi cikin sirri",mine:"Korafe-korafena",register:"Rajistar korafe-korafe",ref:"Lambar ƙorafi",status:"Matsayi",review:"Bita",empty:"Babu ƙorafi tukuna.",low:"Ƙarami",normal:"Matsakaici",high:"Babba",urgent:"Gaggawa",appeal:"Ɗaukaka ƙara",appealText:"Bayyana dalilin ɗaukaka ƙarar",sendAppeal:"Aika ɗaukaka ƙara",appeals:"Ɗaukaka ƙara",take:"Ɗauki alhakin ƙorafin",decision:"Rubuta hukunci",decisionText:"Hukunci da dalilansa",saveDecision:"Ajiye hukunci",reviewing:"Ana dubawa",error:"An kasa kammala wannan aiki.",success:"An adana bayananka.",confidential:"Kai da masu izini kawai za ku iya ganin wannan ƙorafi.",governance:"Gudanarwa",leadership:"Halayen shugabanci",finance:"Kuɗi",membership:"Membobinta",election:"Zaɓe",safeguarding:"Kariya",other:"Sauran",appealState:"Matsayin ɗaukaka ƙara",outcome:"Sakamako",saveAppeal:"Ajiye bitar ɗaukaka ƙara",underReview:"Ana dubawa",upheld:"An amince",rejected:"An ƙi"},
 ar:{kicker:"شكاوى سرية",submit:"تقديم شكوى",category:"الفئة",priority:"الأولوية",details:"التفاصيل",send:"إرسال شكوى سرية",mine:"شكاواي",register:"سجل الشكاوى",ref:"المرجع",status:"الحالة",review:"مراجعة",empty:"لا توجد شكاوى بعد.",low:"منخفض",normal:"عادي",high:"مرتفع",urgent:"عاجل",appeal:"تقديم استئناف",appealText:"اشرح سبب الاستئناف",sendAppeal:"إرسال الاستئناف",appeals:"الاستئنافات",take:"تعييني للمراجعة",decision:"تسجيل القرار",decisionText:"القرار والأسباب",saveDecision:"حفظ القرار",reviewing:"قيد المراجعة",error:"تعذر إكمال هذا الإجراء.",success:"تم حفظ الإرسال.",confidential:"يمكنك والمراجعون المخولون فقط رؤية هذا السجل السري.",governance:"الحوكمة",leadership:"سلوك القيادة",finance:"المالية",membership:"العضوية",election:"الانتخابات",safeguarding:"الحماية",other:"أخرى",appealState:"حالة الاستئناف",outcome:"النتيجة",saveAppeal:"حفظ مراجعة الاستئناف",underReview:"قيد المراجعة",upheld:"مقبول",rejected:"مرفوض"}
} as const;

export default function ComplaintsModule({userId,canReview,lang="en"}:{userId:string;canReview:boolean;lang?:"en"|"ha"|"ar"}) {
 const t=copy[lang];
 const [rows,setRows]=useState<Row[]>([]),[appeals,setAppeals]=useState<Appeal[]>([]);
 const [description,setDescription]=useState(""),[category,setCategory]=useState("Governance"),[priority,setPriority]=useState("NORMAL");
 const [appealDrafts,setAppealDrafts]=useState<Record<string,string>>({}),[decisions,setDecisions]=useState<Record<string,string>>({}),[appealOutcomes,setAppealOutcomes]=useState<Record<string,string>>({});
 const [error,setError]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
 async function load(){
  const [cr,ar]=await Promise.all([
   supabase.from("aasa_complaints").select("id,case_ref,category,priority,status,description,decision,assigned_reviewer_id,created_at,decision_recorded_at").order("created_at",{ascending:false}).limit(300),
   supabase.from("aasa_complaint_appeals").select("id,complaint_id,appeal_text,status,outcome,created_at").order("created_at",{ascending:false}).limit(300)
  ]);
  if(cr.error) throw cr.error;
  if(ar.error) throw ar.error;
  setRows((cr.data??[]) as Row[]);setAppeals((ar.data??[]) as Appeal[]);
 }
 useEffect(()=>{void load().catch(e=>setError(e.message||t.error));},[userId]);
 async function submit(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError("");setNotice("");
  try{
   const ref="AASA-CMP-"+new Date().getFullYear()+"-"+crypto.randomUUID().slice(0,8).toUpperCase();
   const {error}=await supabase.from("aasa_complaints").insert({case_ref:ref,submitted_by:userId,category,priority,confidential:true,description:description.trim()});
   if(error)throw error;setDescription("");setNotice(t.success);await load();
  }catch(e){setError(e instanceof Error?e.message:t.error)}finally{setBusy(false)}
 }
 async function submitAppeal(row:Row){
  const appeal_text=(appealDrafts[row.id]||"").trim();if(appeal_text.length<10){setError(t.error);return}
  setBusy(true);setError("");setNotice("");
  try{const {error}=await supabase.from("aasa_complaint_appeals").insert({complaint_id:row.id,submitted_by:userId,appeal_text});if(error)throw error;setAppealDrafts(v=>({...v,[row.id]:""}));setNotice(t.success);await load()}
  catch(e){setError(e instanceof Error?e.message:t.error)}finally{setBusy(false)}
 }
 async function take(row:Row){
  setBusy(true);setError("");
  try{const {error}=await supabase.rpc("aasa_assign_complaint_to_self",{p_complaint_id:row.id});if(error)throw error;await load()}
  catch(e){setError(e instanceof Error?e.message:t.error)}finally{setBusy(false)}
 }
 async function reviewAppeal(appeal:Appeal,status:"UNDER_REVIEW"|"UPHELD"|"REJECTED"){
  const outcome=(appealOutcomes[appeal.id]||"").trim();if(outcome.length<10){setError(t.error);return}
  setBusy(true);setError("");
  try{const {error}=await supabase.rpc("aasa_review_complaint_appeal",{p_appeal_id:appeal.id,p_status:status,p_outcome:outcome});if(error)throw error;setAppealOutcomes(v=>({...v,[appeal.id]:""}));await load()}
  catch(e){setError(e instanceof Error?e.message:t.error)}finally{setBusy(false)}
 }
 async function decide(row:Row){
  const decision=(decisions[row.id]||"").trim();if(decision.length<10){setError(t.error);return}
  setBusy(true);setError("");
  try{const {error}=await supabase.rpc("aasa_record_complaint_decision",{p_complaint_id:row.id,p_decision:decision,p_status:"DECISION_RECORDED"});if(error)throw error;setDecisions(v=>({...v,[row.id]:""}));await load()}
  catch(e){setError(e instanceof Error?e.message:t.error)}finally{setBusy(false)}
 }
 return <div className="aasa-module-work">
  <section className="aasa-panel"><p className="aasa-kicker">{t.kicker}</p><h3>{t.submit}</h3><p>{t.confidential}</p>
   <form className="aasa-member-form" onSubmit={submit}>
    <label>{t.category}<select value={category} onChange={e=>setCategory(e.target.value)}><option value="Governance">{t.governance}</option><option value="Leadership conduct">{t.leadership}</option><option value="Finance">{t.finance}</option><option value="Membership">{t.membership}</option><option value="Election">{t.election}</option><option value="Safeguarding">{t.safeguarding}</option><option value="Other">{t.other}</option></select></label>
    <label>{t.priority}<select value={priority} onChange={e=>setPriority(e.target.value)}><option value="LOW">{t.low}</option><option value="NORMAL">{t.normal}</option><option value="HIGH">{t.high}</option><option value="URGENT">{t.urgent}</option></select></label>
    <label className="aasa-full-span">{t.details}<textarea required minLength={10} maxLength={12000} rows={5} value={description} onChange={e=>setDescription(e.target.value)}/></label>
    <button className="aasa-primary" disabled={busy}>{t.send}</button>
   </form>
  </section>
  <section className="aasa-panel"><h3>{canReview?t.register:t.mine}</h3>
   {rows.length===0?<p>{t.empty}</p>:<div className="aasa-table-wrap"><table className="aasa-table"><thead><tr><th>{t.ref}</th><th>{t.category}</th><th>{t.priority}</th><th>{t.status}</th>{canReview&&<th>{t.review}</th>}</tr></thead><tbody>
    {rows.map(row=><tr key={row.id}><td><strong>{row.case_ref}</strong><details><summary>{t.details}</summary><p>{row.description}</p>{row.decision&&<p><b>{t.decision}:</b> {row.decision}</p>}
      {canReview&&<div className="aasa-member-form">
       {!row.assigned_reviewer_id&&<button type="button" className="aasa-secondary" disabled={busy} onClick={()=>void take(row)}>{t.take}</button>}
       {row.assigned_reviewer_id===userId&&<><label>{t.decisionText}<textarea rows={3} minLength={10} value={decisions[row.id]||""} onChange={e=>setDecisions(v=>({...v,[row.id]:e.target.value}))}/></label><button type="button" className="aasa-primary" disabled={busy} onClick={()=>void decide(row)}>{t.saveDecision}</button></>}
      </div>}
      {!canReview&&["DECISION_RECORDED","RESOLVED","CLOSED"].includes(row.status)&&!appeals.some(a=>a.complaint_id===row.id&&["SUBMITTED","UNDER_REVIEW"].includes(a.status))&&<div className="aasa-member-form"><label>{t.appealText}<textarea rows={3} minLength={10} value={appealDrafts[row.id]||""} onChange={e=>setAppealDrafts(v=>({...v,[row.id]:e.target.value}))}/></label><button type="button" className="aasa-primary" disabled={busy} onClick={()=>void submitAppeal(row)}>{t.sendAppeal}</button></div>}
      {appeals.filter(a=>a.complaint_id===row.id).map(a=><div key={a.id}><p><b>{t.appeals} · {a.status}:</b> {a.appeal_text}{a.outcome&&<span> — {t.outcome}: {a.outcome}</span>}</p>{canReview&&["SUBMITTED","UNDER_REVIEW"].includes(a.status)&&<div className="aasa-member-form"><label>{t.outcome}<textarea rows={2} minLength={10} value={appealOutcomes[a.id]||""} onChange={e=>setAppealOutcomes(v=>({...v,[a.id]:e.target.value}))}/></label><div><button type="button" className="aasa-secondary" disabled={busy} onClick={()=>void reviewAppeal(a,"UNDER_REVIEW")}>{t.underReview}</button><button type="button" className="aasa-primary" disabled={busy} onClick={()=>void reviewAppeal(a,"UPHELD")}>{t.upheld}</button><button type="button" className="aasa-secondary" disabled={busy} onClick={()=>void reviewAppeal(a,"REJECTED")}>{t.rejected}</button></div></div>}</div>)}
    </details></td><td>{row.category}</td><td>{row.priority}</td><td>{row.status}</td>{canReview&&<td>{row.assigned_reviewer_id===userId?t.reviewing:row.assigned_reviewer_id?"Assigned":"Unassigned"}</td>}</tr>)}
   </tbody></table></div>}
  </section>
  {notice&&<p className="aasa-notice" role="status">{notice}</p>}{error&&<p className="aasa-error" role="alert">{error}</p>}
 </div>;
}
