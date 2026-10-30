import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

type Language="en"|"ha"|"ar";
type Task={id:string;project_id:string;title:string;description:string|null;due_date:string|null;priority:string;status:string;progress_percent:number;completion_note:string|null};
type Project={id:string;title:string;project_code:string};
const text={
 en:{title:"My project tasks",intro:"Tasks assigned to you by an authorised AASA project team.",empty:"No project tasks are currently assigned to your member account.",loading:"Loading assigned tasks…",status:"Task status",progress:"Progress (%)",note:"Completion note",save:"Update task",saving:"Saving…",todo:"To do",active:"In progress",blocked:"Blocked",done:"Completed",due:"Due date",project:"Project",error:"Could not load or update your project tasks.",success:"Task progress updated."},
 ha:{title:"Ayyukan da aka ba ni",intro:"Ƙananan ayyukan da tawagar AASA ta ba ka.",empty:"Babu aikin da aka ware wa asusunka a yanzu.",loading:"Ana loda ayyukan da aka ba ka…",status:"Matsayin aiki",progress:"Ci gaba (%)",note:"Bayanin kammalawa",save:"Sabunta aiki",saving:"Ana ajiyewa…",todo:"A jira",active:"Ana yi",blocked:"Ya samu cikas",done:"An kammala",due:"Wa'adi",project:"Aiki",error:"An kasa loda ko sabunta ayyukanka.",success:"An sabunta ci gaban aiki."},
 ar:{title:"مهامي في المشاريع",intro:"المهام المسندة إليك من فريق مشروع AASA مخول.",empty:"لا توجد مهام مشاريع مسندة إلى حساب عضويتك حاليًا.",loading:"جارٍ تحميل المهام المسندة…",status:"حالة المهمة",progress:"نسبة الإنجاز (%)",note:"ملاحظة الإكمال",save:"تحديث المهمة",saving:"جارٍ الحفظ…",todo:"قيد الانتظار",active:"قيد التنفيذ",blocked:"متعطلة",done:"مكتملة",due:"تاريخ الاستحقاق",project:"المشروع",error:"تعذر تحميل مهام المشروع أو تحديثها.",success:"تم تحديث تقدم المهمة."}
} as const;

export default function MyProjectTasks({memberId,lang}:{memberId:string;lang:Language}){
 const t=text[lang];
 const [tasks,setTasks]=useState<Task[]>([]);
 const [projects,setProjects]=useState<Project[]>([]);
 const [statuses,setStatuses]=useState<Record<string,string>>({});
 const [progress,setProgress]=useState<Record<string,string>>({});
 const [notes,setNotes]=useState<Record<string,string>>({});
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState("");
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 async function load(){
  setLoading(true);setError("");
  try{
   const {data,error}=await supabase.from("aasa_project_tasks").select("id,project_id,title,description,due_date,priority,status,progress_percent,completion_note").eq("assigned_to_member_id",memberId).not("status","in","(completed,cancelled)").order("due_date");
   if(error)throw error;
   const rows=(data??[]) as Task[];setTasks(rows);
   const ids=[...new Set(rows.map(x=>x.project_id))];
   if(ids.length){const p=await supabase.from("aasa_projects").select("id,title,project_code").in("id",ids);if(p.error)throw p.error;setProjects((p.data??[]) as Project[]);}else setProjects([]);
  }catch(e){setError(e instanceof Error?e.message:t.error);}
  finally{setLoading(false);}
 }
 useEffect(()=>{void load();},[memberId]);
 async function update(task:Task){
  setBusy(task.id);setError("");setNotice("");
  try{
   const nextStatus=statuses[task.id]??task.status;
   const nextProgress=Number(progress[task.id]??task.progress_percent);
   const nextNote=notes[task.id]??task.completion_note??"";
   const {error}=await supabase.rpc("aasa_update_own_project_task",{p_task_id:task.id,p_status:nextStatus,p_progress_percent:nextProgress,p_completion_note:nextNote||null});
   if(error)throw error;
   await load();setNotice(t.success);
  }catch(e){setError(e instanceof Error?e.message:t.error);}
  finally{setBusy("");}
 }
 const projectName=(id:string)=>{const p=projects.find(x=>x.id===id);return p?p.project_code+" · "+p.title:"AASA project";};
 return <section className="aasa-member-panel aasa-member-project-tasks">
  <p className="aasa-member-kicker">AASA · PROJECT ACCOUNTABILITY</p><h2>{t.title}</h2><p className="aasa-member-project-intro">{t.intro}</p>
  {loading?<p>{t.loading}</p>:tasks.length? <div className="aasa-member-task-list">{tasks.map(task=><article key={task.id}>
   <div className="aasa-member-task-heading"><strong>{task.title}</strong><small>{projectName(task.project_id)}</small></div>
   {task.description&&<p>{task.description}</p>}
   <div className="aasa-member-task-meta"><span>{t.due}: {task.due_date||"—"}</span><span>{task.priority}</span></div>
   <label>{t.status}<select value={statuses[task.id]??task.status} onChange={e=>setStatuses(v=>({...v,[task.id]:e.target.value}))}><option value="todo">{t.todo}</option><option value="in_progress">{t.active}</option><option value="blocked">{t.blocked}</option><option value="completed">{t.done}</option></select></label>
   <label>{t.progress}<input type="number" min="0" max="100" value={progress[task.id]??task.progress_percent} onChange={e=>setProgress(v=>({...v,[task.id]:e.target.value}))}/></label>
   <label>{t.note}<textarea rows={2} maxLength={2000} value={notes[task.id]??task.completion_note??""} onChange={e=>setNotes(v=>({...v,[task.id]:e.target.value}))}/></label>
   <button type="button" disabled={!!busy} onClick={()=>void update(task)}>{busy===task.id?t.saving:t.save}</button>
  </article>)}</div>:<p>{t.empty}</p>}
  {notice&&<p className="aasa-member-task-success" role="status">{notice}</p>}
  {error&&<p className="aasa-member-error" role="alert">{t.error}</p>}
 </section>;
}
