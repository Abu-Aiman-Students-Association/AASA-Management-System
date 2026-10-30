import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "./lib/supabase";

type Language = "en" | "ha" | "ar";
type Member = { id: string; full_name: string; member_number: string; has_login: boolean };
type Project = {
  id: string; project_code: string; title: string; proposal: string; objectives: string; expected_outcomes: string;
  project_owner_member_id: string; assigned_committee_id: string | null; budget_request: number; approved_budget: number | null;
  currency: string; start_date: string | null; target_end_date: string | null; actual_end_date: string | null;
  status: string; approval_status: string; approval_note: string | null; completion_status: string;
  completion_report: string | null; completion_review_note: string | null; created_at: string;
};
type Committee = { id: string; name: string };
type TeamMember = { project_id: string; member_id: string; project_role: string; assigned_at: string };
type Milestone = { id: string; project_id: string; title: string; description: string | null; due_date: string | null; status: string };
type Task = { id: string; project_id: string; milestone_id: string | null; title: string; description: string | null; assigned_to_member_id: string | null; due_date: string | null; priority: string; status: string; progress_percent: number; completion_note: string | null };
type Progress = { id: string; project_id: string; reporting_period: string; progress_percent: number; report_body: string; submitted_by: string; created_at: string };
type Risk = { id: string; project_id: string; title: string; description: string; likelihood: string; impact: string; mitigation_plan: string | null; status: string; owner_member_id: string | null };
type Document = { id: string; title: string; document_type: string; storage_path: string; visibility: string; archived_at: string | null };
type ProjectDocument = { project_id: string; document_id: string; added_at: string };

const copy = {
  en: {
    kicker:"PROJECTS · DEVELOPMENT · ACCOUNTABILITY", title:"Projects & Development", intro:"Turn approved proposals into accountable work plans, assigned tasks and verifiable outcomes.",
    refresh:"Refresh", projects:"Projects", active:"Active", awaiting:"Awaiting approval", overdue:"Overdue tasks", create:"Submit project proposal",
    projectTitle:"Project title *", proposal:"Proposal / background *", objectives:"Objectives *", outcomes:"Expected outcomes *", owner:"Project owner *", committee:"Responsible committee", noCommittee:"No committee assigned", budget:"Budget requested (NGN)", start:"Planned start", due:"Target completion", submit:"Submit for approval", search:"Search projects…", all:"All statuses",
    planned:"Planned", approved:"Approved", running:"Active", paused:"Paused", completed:"Completed", cancelled:"Cancelled", pending:"Pending review", rejected:"Rejected",
    noProjects:"No project records yet. Submit an authorised proposal to begin; no sample projects are created.",
    details:"Project workspace", overview:"Overview", team:"Team", milestones:"Milestones", tasks:"Tasks", progress:"Progress reports", risks:"Risks", documents:"Supporting documents",
    code:"Project reference", ownerLabel:"Owner", budgetRequested:"Budget requested", budgetApproved:"Approved budget", approval:"Budget approval", status:"Status", dates:"Timeline",
    reviewBudget:"Review budget request", approvedAmount:"Approved amount (NGN)", reviewNote:"Decision note", approve:"Approve budget", reject:"Reject proposal", activate:"Start project", pause:"Pause", resume:"Resume", cancel:"Cancel project",
    addTeam:"Assign team member", member:"Active member", role:"Project role", add:"Add", remove:"Remove", ownerRole:"Owner", lead:"Team lead", memberRole:"Team member", observer:"Observer",
    addMilestone:"Add milestone", milestoneTitle:"Milestone title *", milestoneDue:"Due date", milestoneDesc:"Description", milestoneStatus:"Milestone status",
    addTask:"Create task", taskTitle:"Task title *", taskDesc:"Task description", assignTo:"Assign to", noAssignee:"Unassigned", priority:"Priority", taskDue:"Deadline", taskStatus:"Task status", progressPercent:"Progress %",
    todo:"To do", inProgress:"In progress", blocked:"Blocked", low:"Low", normal:"Normal", high:"High", urgent:"Urgent",
    addReport:"Submit progress report", reportDate:"Reporting date", reportPercent:"Overall progress %", reportBody:"Progress summary *", noReports:"No progress reports recorded.",
    addRisk:"Record project risk", riskTitle:"Risk title *", riskDesc:"Risk description *", likelihood:"Likelihood", impact:"Impact", mitigation:"Mitigation plan", riskOwner:"Responsible member", riskStatus:"Risk status", open:"Open", mitigating:"Mitigating", accepted:"Accepted", closed:"Closed",
    linkDocument:"Link existing official document", selectDocument:"Select an active document", link:"Link document", openDocument:"Open", noDocuments:"No linked supporting documents.", noAccessDocs:"Document linking requires Documents & Reports permission.",
    completion:"Completion approval", finalReport:"Final report * (minimum 50 characters)", requestCompletion:"Submit for completion approval", reviewCompletion:"Review completion", approveCompletion:"Approve completion", rejectCompletion:"Return for correction",
    save:"Save", saving:"Saving…", loading:"Loading…", noMembers:"No active members available.", noTasks:"No tasks recorded.", noMilestones:"No milestones recorded.", noRisks:"No project risks recorded.", teamEmpty:"No team assignments recorded.", selectProject:"Select a project to view its workspace.",
    success:"Changes saved.", error:"Could not complete the action.", export:"Export project register", dueSoon:"Due", overdueLabel:"Overdue", noPermission:"Your account does not have permission to manage this area.",
    budgetPending:"Budget decision is pending.", budgetRejected:"Budget request was rejected. Revise the proposal and resubmit.", completionPending:"Final report is awaiting independent review.", completionRejected:"Completion was returned for correction.",
  },
  ha: {
    kicker:"AYUKAN AIKI · CI GABA · RIƘON AMANA", title:"Ayyuka da Ci gaban Ƙungiya", intro:"Mayar da shawarwarin ayyuka zuwa tsare-tsare, rarraba aiki da sakamakon da za a iya tantancewa.",
    refresh:"Sabunta", projects:"Ayyuka", active:"Masu gudana", awaiting:"Masu jiran amincewa", overdue:"Ayyukan da suka wuce lokaci", create:"Gabatar da shawarar aiki",
    projectTitle:"Sunan aiki *", proposal:"Bayani / dalilin aikin *", objectives:"Manufofi *", outcomes:"Sakamakon da ake sa ran samu *", owner:"Mai alhakin aiki *", committee:"Kwamitin da ke da alhaki", noCommittee:"Ba a ware kwamiti ba", budget:"Adadin kuɗin da ake nema (NGN)", start:"Ranar farawa", due:"Ranar kammalawa", submit:"Aika domin amincewa", search:"Nemo ayyuka…", all:"Dukkan matsayi",
    planned:"An tsara", approved:"An amince", running:"Yana gudana", paused:"An dakatar na ɗan lokaci", completed:"An kammala", cancelled:"An soke", pending:"Ana jiran dubawa", rejected:"An ƙi",
    noProjects:"Babu aikin da aka yi rajista tukuna. Aika sahihiyar shawara domin farawa; ba a ƙirƙiri bayanan gwaji ba.",
    details:"Wurin gudanar da aiki", overview:"Taƙaitawa", team:"Tawaga", milestones:"Matakai", tasks:"Ayyuka ƙanana", progress:"Rahoton ci gaba", risks:"Haɗurra", documents:"Takardun tallafi",
    code:"Lambar aiki", ownerLabel:"Mai alhaki", budgetRequested:"Kuɗin da aka nema", budgetApproved:"Kuɗin da aka amince", approval:"Amincewar kasafi", status:"Matsayi", dates:"Lokaci",
    reviewBudget:"Duba buƙatar kasafi", approvedAmount:"Adadin da aka amince (NGN)", reviewNote:"Bayanin hukunci", approve:"Amince da kasafi", reject:"Ƙi shawarar", activate:"Fara aiki", pause:"Dakatar na ɗan lokaci", resume:"Ci gaba", cancel:"Soke aiki",
    addTeam:"Ƙara ɗan tawaga", member:"Memba mai aiki", role:"Matsayin tawaga", add:"Ƙara", remove:"Cire", ownerRole:"Mai alhaki", lead:"Jagoran tawaga", memberRole:"Ɗan tawaga", observer:"Mai sa ido",
    addMilestone:"Ƙara mataki", milestoneTitle:"Sunan mataki *", milestoneDue:"Ranar ƙarshe", milestoneDesc:"Bayani", milestoneStatus:"Matsayin mataki",
    addTask:"Ƙirƙiri ƙaramin aiki", taskTitle:"Sunan aiki *", taskDesc:"Bayanin aiki", assignTo:"Ba wa", noAssignee:"Ba a ware ba", priority:"Muhimmanci", taskDue:"Wa'adin aiki", taskStatus:"Matsayin aiki", progressPercent:"Ci gaba %",
    todo:"A jira", inProgress:"Ana yi", blocked:"Ya samu cikas", low:"Ƙarami", normal:"Matsakaici", high:"Babba", urgent:"Gaggawa",
    addReport:"Aika rahoton ci gaba", reportDate:"Ranar rahoto", reportPercent:"Yawan ci gaba %", reportBody:"Taƙaitaccen rahoto *", noReports:"Babu rahoton ci gaba.",
    addRisk:"Yi rajistar haɗari", riskTitle:"Sunan haɗari *", riskDesc:"Bayanin haɗari *", likelihood:"Yiwuwar faruwa", impact:"Tasiri", mitigation:"Hanyar rage haɗari", riskOwner:"Memba mai alhaki", riskStatus:"Matsayin haɗari", open:"Buɗe", mitigating:"Ana ragewa", accepted:"An amince da shi", closed:"An rufe",
    linkDocument:"Haɗa takardar hukuma", selectDocument:"Zaɓi takarda mai aiki", link:"Haɗa takarda", openDocument:"Buɗe", noDocuments:"Babu takardar tallafi da aka haɗa.", noAccessDocs:"Haɗa takardu na buƙatar izinin Documents & Reports.",
    completion:"Amincewar kammala aiki", finalReport:"Rahoton ƙarshe * (aƙalla haruffa 50)", requestCompletion:"Aika domin amincewa da kammalawa", reviewCompletion:"Duba kammalawa", approveCompletion:"Amince da kammalawa", rejectCompletion:"Mayar domin gyara",
    save:"Ajiye", saving:"Ana ajiyewa…", loading:"Ana lodawa…", noMembers:"Babu membobi masu aiki.", noTasks:"Babu ƙananan ayyuka.", noMilestones:"Babu matakai.", noRisks:"Babu haɗurra.", teamEmpty:"Babu tawaga tukuna.", selectProject:"Zaɓi aiki domin ganin bayanansa.",
    success:"An ajiye canje-canje.", error:"An kasa kammala aikin.", export:"Fitar da rajistar ayyuka", dueSoon:"Wa'adi", overdueLabel:"Ya wuce lokaci", noPermission:"Asusunka ba shi da izinin gudanar da wannan sashe.",
    budgetPending:"Ana jiran hukuncin kasafi.", budgetRejected:"An ƙi kasafin. Gyara shawarar sannan a sake aikawa.", completionPending:"Ana jiran tantance rahoton ƙarshe.", completionRejected:"An mayar da kammalawa domin gyara.",
  },
  ar: {
    kicker:"المشاريع · التنمية · المساءلة", title:"المشاريع والتطوير", intro:"تحويل المقترحات المعتمدة إلى خطط عمل ومهام محددة ونتائج قابلة للتحقق.",
    refresh:"تحديث", projects:"المشاريع", active:"نشطة", awaiting:"بانتظار الموافقة", overdue:"مهام متأخرة", create:"تقديم مقترح مشروع",
    projectTitle:"عنوان المشروع *", proposal:"المقترح / الخلفية *", objectives:"الأهداف *", outcomes:"النتائج المتوقعة *", owner:"مسؤول المشروع *", committee:"اللجنة المسؤولة", noCommittee:"لا توجد لجنة محددة", budget:"الميزانية المطلوبة (NGN)", start:"تاريخ البدء المخطط", due:"تاريخ الإنجاز المستهدف", submit:"إرسال للموافقة", search:"البحث عن المشاريع…", all:"كل الحالات",
    planned:"مخطط", approved:"معتمد", running:"نشط", paused:"متوقف مؤقتًا", completed:"مكتمل", cancelled:"ملغى", pending:"قيد المراجعة", rejected:"مرفوض",
    noProjects:"لا توجد مشاريع مسجلة بعد. قدم مقترحًا معتمدًا للبدء؛ لا توجد سجلات تجريبية.",
    details:"مساحة المشروع", overview:"نظرة عامة", team:"الفريق", milestones:"المراحل", tasks:"المهام", progress:"تقارير التقدم", risks:"المخاطر", documents:"المستندات الداعمة",
    code:"مرجع المشروع", ownerLabel:"المسؤول", budgetRequested:"الميزانية المطلوبة", budgetApproved:"الميزانية المعتمدة", approval:"اعتماد الميزانية", status:"الحالة", dates:"الجدول الزمني",
    reviewBudget:"مراجعة طلب الميزانية", approvedAmount:"المبلغ المعتمد (NGN)", reviewNote:"ملاحظة القرار", approve:"اعتماد الميزانية", reject:"رفض المقترح", activate:"بدء المشروع", pause:"إيقاف مؤقت", resume:"استئناف", cancel:"إلغاء المشروع",
    addTeam:"إضافة عضو للفريق", member:"عضو نشط", role:"دور المشروع", add:"إضافة", remove:"إزالة", ownerRole:"المسؤول", lead:"قائد الفريق", memberRole:"عضو الفريق", observer:"مراقب",
    addMilestone:"إضافة مرحلة", milestoneTitle:"عنوان المرحلة *", milestoneDue:"تاريخ الاستحقاق", milestoneDesc:"الوصف", milestoneStatus:"حالة المرحلة",
    addTask:"إنشاء مهمة", taskTitle:"عنوان المهمة *", taskDesc:"وصف المهمة", assignTo:"إسناد إلى", noAssignee:"غير مسندة", priority:"الأولوية", taskDue:"الموعد النهائي", taskStatus:"حالة المهمة", progressPercent:"نسبة الإنجاز %",
    todo:"قيد الانتظار", inProgress:"قيد التنفيذ", blocked:"متعطلة", low:"منخفض", normal:"عادي", high:"مرتفع", urgent:"عاجل",
    addReport:"إرسال تقرير تقدم", reportDate:"تاريخ التقرير", reportPercent:"نسبة التقدم الإجمالية %", reportBody:"ملخص التقدم *", noReports:"لا توجد تقارير تقدم.",
    addRisk:"تسجيل مخاطر المشروع", riskTitle:"عنوان الخطر *", riskDesc:"وصف الخطر *", likelihood:"احتمالية الحدوث", impact:"التأثير", mitigation:"خطة المعالجة", riskOwner:"العضو المسؤول", riskStatus:"حالة الخطر", open:"مفتوح", mitigating:"قيد المعالجة", accepted:"مقبول", closed:"مغلق",
    linkDocument:"ربط مستند رسمي موجود", selectDocument:"اختر مستندًا نشطًا", link:"ربط المستند", openDocument:"فتح", noDocuments:"لا توجد مستندات داعمة مرتبطة.", noAccessDocs:"يتطلب ربط المستندات صلاحية المستندات والتقارير.",
    completion:"اعتماد إكمال المشروع", finalReport:"التقرير النهائي * (50 حرفًا على الأقل)", requestCompletion:"إرسال لاعتماد الإكمال", reviewCompletion:"مراجعة الإكمال", approveCompletion:"اعتماد الإكمال", rejectCompletion:"إعادته للتصحيح",
    save:"حفظ", saving:"جارٍ الحفظ…", loading:"جارٍ التحميل…", noMembers:"لا يوجد أعضاء نشطون.", noTasks:"لا توجد مهام.", noMilestones:"لا توجد مراحل.", noRisks:"لا توجد مخاطر مسجلة.", teamEmpty:"لم يتم تعيين فريق بعد.", selectProject:"اختر مشروعًا لعرض مساحة العمل.",
    success:"تم حفظ التغييرات.", error:"تعذر إكمال العملية.", export:"تصدير سجل المشاريع", dueSoon:"الاستحقاق", overdueLabel:"متأخر", noPermission:"حسابك لا يملك صلاحية إدارة هذا القسم.",
    budgetPending:"قرار الميزانية قيد الانتظار.", budgetRejected:"تم رفض الميزانية. عدّل المقترح وأعد إرساله.", completionPending:"التقرير النهائي بانتظار مراجعة مستقلة.", completionRejected:"أُعيد طلب الإكمال للتصحيح.",
  }
} as const;

const money = (value: number | null | undefined) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 }).format(Number(value ?? 0));
const csv = (value: unknown) => '"' + String(value ?? "").replace(/"/g, '""') + '"';

export default function ProjectsModule({ userId, lang = "en", canManage, canApprove, canLinkDocs }: {
  userId: string; lang?: Language; canManage: boolean; canApprove: boolean; canLinkDocs: boolean;
}) {
  const t = copy[lang];
  const [projects,setProjects]=useState<Project[]>([]);
  const [members,setMembers]=useState<Member[]>([]);
  const [committees,setCommittees]=useState<Committee[]>([]);
  const [team,setTeam]=useState<TeamMember[]>([]);
  const [milestones,setMilestones]=useState<Milestone[]>([]);
  const [tasks,setTasks]=useState<Task[]>([]);
  const [reports,setReports]=useState<Progress[]>([]);
  const [risks,setRisks]=useState<Risk[]>([]);
  const [documents,setDocuments]=useState<Document[]>([]);
  const [projectDocuments,setProjectDocuments]=useState<ProjectDocument[]>([]);
  const [selectedId,setSelectedId]=useState("");
  const [query,setQuery]=useState("");
  const [statusFilter,setStatusFilter]=useState("all");
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [tab,setTab]=useState<"overview"|"team"|"milestones"|"tasks"|"progress"|"risks"|"documents">("overview");

  const [title,setTitle]=useState(""); const [proposal,setProposal]=useState(""); const [objectives,setObjectives]=useState(""); const [outcomes,setOutcomes]=useState("");
  const [ownerId,setOwnerId]=useState(""); const [committeeId,setCommitteeId]=useState(""); const [budget,setBudget]=useState("0"); const [startDate,setStartDate]=useState(""); const [targetDate,setTargetDate]=useState("");
  const [teamMemberId,setTeamMemberId]=useState(""); const [teamRole,setTeamRole]=useState("team_member");
  const [milestoneTitle,setMilestoneTitle]=useState(""); const [milestoneDesc,setMilestoneDesc]=useState(""); const [milestoneDue,setMilestoneDue]=useState("");
  const [taskTitle,setTaskTitle]=useState(""); const [taskDesc,setTaskDesc]=useState(""); const [taskAssignee,setTaskAssignee]=useState(""); const [taskMilestone,setTaskMilestone]=useState(""); const [taskDue,setTaskDue]=useState(""); const [taskPriority,setTaskPriority]=useState("normal");
  const [reportDate,setReportDate]=useState(new Date().toISOString().slice(0,10)); const [reportPercent,setReportPercent]=useState("0"); const [reportBody,setReportBody]=useState("");
  const [riskTitle,setRiskTitle]=useState(""); const [riskDesc,setRiskDesc]=useState(""); const [riskLikelihood,setRiskLikelihood]=useState("medium"); const [riskImpact,setRiskImpact]=useState("medium"); const [riskMitigation,setRiskMitigation]=useState(""); const [riskOwner,setRiskOwner]=useState("");
  const [approvedBudget,setApprovedBudget]=useState(""); const [reviewNote,setReviewNote]=useState(""); const [finalReport,setFinalReport]=useState(""); const [completionNote,setCompletionNote]=useState("");
  const [documentId,setDocumentId]=useState("");

  const selected = projects.find(p=>p.id===selectedId) ?? null;
  const activeTasks = tasks.filter(x=>x.status!=="completed"&&x.status!=="cancelled");
  const overdueTasks = activeTasks.filter(x=>x.due_date && x.due_date < new Date().toISOString().slice(0,10));
  const filtered = useMemo(()=>projects.filter(p=>(statusFilter==="all"||p.status===statusFilter)&&[p.title,p.project_code,p.proposal].some(x=>x.toLowerCase().includes(query.toLowerCase()))),[projects,statusFilter,query]);
  const memberName = (id:string|null) => members.find(m=>m.id===id)?.full_name ?? "Member record";
  const docFor = (id:string) => documents.find(d=>d.id===id);

  async function loadDetail(id:string) {
    if (!id) { setTeam([]);setMilestones([]);setTasks([]);setReports([]);setRisks([]);setProjectDocuments([]);return; }
    const [tm,ms,ts,pr,rs,pd] = await Promise.all([
      supabase.from("aasa_project_members").select("project_id,member_id,project_role,assigned_at").eq("project_id",id).order("assigned_at"),
      supabase.from("aasa_project_milestones").select("id,project_id,title,description,due_date,status").eq("project_id",id).order("due_date"),
      supabase.from("aasa_project_tasks").select("id,project_id,milestone_id,title,description,assigned_to_member_id,due_date,priority,status,progress_percent,completion_note").eq("project_id",id).order("due_date"),
      supabase.from("aasa_project_progress_reports").select("id,project_id,reporting_period,progress_percent,report_body,submitted_by,created_at").eq("project_id",id).order("reporting_period",{ascending:false}),
      supabase.from("aasa_project_risks").select("id,project_id,title,description,likelihood,impact,mitigation_plan,status,owner_member_id").eq("project_id",id).order("created_at",{ascending:false}),
      supabase.from("aasa_project_documents").select("project_id,document_id,added_at").eq("project_id",id).order("added_at",{ascending:false})
    ]);
    for(const r of [tm,ms,ts,pr,rs,pd]) if(r.error) throw r.error;
    setTeam(tm.data??[]);setMilestones(ms.data??[]);setTasks(ts.data??[]);setReports(pr.data??[]);setRisks(rs.data??[]);setProjectDocuments(pd.data??[]);
  }

  async function load(preferredId = selectedId) {
    setLoading(true);
    try {
      const [p,c] = await Promise.all([
        supabase.from("aasa_projects").select("*").order("created_at",{ascending:false}).limit(500),
        supabase.from("aasa_committees").select("id,name").eq("status","active").order("name")
      ]);
      if(p.error) throw p.error;
      if(c.error && canManage) throw c.error;
      const rows=(p.data??[]) as Project[];
      setProjects(rows);setCommittees(c.data??[]);
      let memberRows:Member[]=[];
      if(canManage){
        const mr=await supabase.rpc("aasa_list_project_assignable_members");
        if(mr.error) throw mr.error;
        memberRows=(mr.data??[]) as Member[];
      }
      setMembers(memberRows);
      if(canLinkDocs){
        const dr=await supabase.from("aasa_documents").select("id,title,document_type,storage_path,visibility,archived_at").is("archived_at",null).order("created_at",{ascending:false}).limit(500);
        if(dr.error) throw dr.error;
        setDocuments(dr.data??[]);
      }
      const nextId=preferredId&&rows.some(x=>x.id===preferredId)?preferredId:rows[0]?.id??"";
      setSelectedId(nextId);
      await loadDetail(nextId);
      setError("");
    } finally { setLoading(false); }
  }

  useEffect(()=>{void load("").catch(e=>setError(e instanceof Error?e.message:t.error));},[]);
  useEffect(()=>{if(selectedId) setApprovedBudget(String(selected?.approved_budget??selected?.budget_request??""));},[selectedId,selected?.approved_budget,selected?.budget_request]);

  async function run(action:()=>Promise<void>,message=t.success) {
    setBusy(true);setError("");setNotice("");
    try { await action(); await load(selectedId); setNotice(message); }
    catch(e){setError(e instanceof Error?e.message:t.error);}
    finally{setBusy(false);}
  }

  async function createProject(e:FormEvent) {
    e.preventDefault();
    if(!canManage){setError(t.noPermission);return;}
    if(targetDate&&startDate&&targetDate<startDate){setError("Target date cannot be earlier than the start date.");return;}
    await run(async()=>{
      const {data,error}=await supabase.from("aasa_projects").insert({
        title:title.trim(),proposal:proposal.trim(),objectives:objectives.trim(),expected_outcomes:outcomes.trim(),
        project_owner_member_id:ownerId,assigned_committee_id:committeeId||null,budget_request:Number(budget||0),
        start_date:startDate||null,target_end_date:targetDate||null,created_by:userId
      }).select("id").single();
      if(error)throw error;
      setTitle("");setProposal("");setObjectives("");setOutcomes("");setOwnerId("");setCommitteeId("");setBudget("0");setStartDate("");setTargetDate("");
      if(data?.id)setSelectedId(data.id);
    },"Project proposal submitted and is awaiting budget review.");
  }
  async function addTeam(e:FormEvent) {
    e.preventDefault();if(!selected||!teamMemberId)return;
    await run(async()=>{const {error}=await supabase.from("aasa_project_members").insert({project_id:selected.id,member_id:teamMemberId,project_role:teamRole,assigned_by:userId});if(error)throw error;setTeamMemberId("");setTeamRole("team_member");});
  }
  async function removeTeam(row:TeamMember) {
    if(!selected||row.project_role==="owner")return;
    if(!window.confirm("Remove this member from the project team? Historical task records will remain."))return;
    await run(async()=>{const {error}=await supabase.from("aasa_project_members").delete().eq("project_id",selected.id).eq("member_id",row.member_id);if(error)throw error;});
  }
  async function addMilestone(e:FormEvent) {
    e.preventDefault();if(!selected)return;
    await run(async()=>{const {error}=await supabase.from("aasa_project_milestones").insert({project_id:selected.id,title:milestoneTitle.trim(),description:milestoneDesc.trim()||null,due_date:milestoneDue||null,created_by:userId});if(error)throw error;setMilestoneTitle("");setMilestoneDesc("");setMilestoneDue("");});
  }
  async function updateMilestone(row:Milestone,status:string) {
    await run(async()=>{const {error}=await supabase.from("aasa_project_milestones").update({status,completed_at:status==="completed"?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq("id",row.id);if(error)throw error;});
  }
  async function addTask(e:FormEvent) {
    e.preventDefault();if(!selected)return;
    await run(async()=>{const {error}=await supabase.from("aasa_project_tasks").insert({project_id:selected.id,milestone_id:taskMilestone||null,title:taskTitle.trim(),description:taskDesc.trim()||null,assigned_to_member_id:taskAssignee||null,due_date:taskDue||null,priority:taskPriority,created_by:userId});if(error)throw error;setTaskTitle("");setTaskDesc("");setTaskAssignee("");setTaskMilestone("");setTaskDue("");setTaskPriority("normal");});
  }
  async function updateTask(row:Task,status:string) {
    await run(async()=>{const {error}=await supabase.from("aasa_project_tasks").update({status,progress_percent:status==="completed"?100:row.progress_percent,updated_at:new Date().toISOString()}).eq("id",row.id);if(error)throw error;});
  }
  async function addProgress(e:FormEvent) {
    e.preventDefault();if(!selected)return;
    await run(async()=>{const {error}=await supabase.from("aasa_project_progress_reports").insert({project_id:selected.id,reporting_period:reportDate,progress_percent:Number(reportPercent),report_body:reportBody.trim(),submitted_by:userId});if(error)throw error;setReportBody("");setReportPercent("0");});
  }
  async function addRisk(e:FormEvent) {
    e.preventDefault();if(!selected)return;
    await run(async()=>{const {error}=await supabase.from("aasa_project_risks").insert({project_id:selected.id,title:riskTitle.trim(),description:riskDesc.trim(),likelihood:riskLikelihood,impact:riskImpact,mitigation_plan:riskMitigation.trim()||null,owner_member_id:riskOwner||null,created_by:userId});if(error)throw error;setRiskTitle("");setRiskDesc("");setRiskMitigation("");setRiskOwner("");setRiskLikelihood("medium");setRiskImpact("medium");});
  }
  async function updateRisk(row:Risk,status:string) {
    await run(async()=>{const {error}=await supabase.from("aasa_project_risks").update({status,updated_at:new Date().toISOString()}).eq("id",row.id);if(error)throw error;});
  }
  async function reviewBudget(decision:"approved"|"rejected") {
    if(!selected)return;
    await run(async()=>{const {error}=await supabase.rpc("aasa_review_project_budget",{p_project_id:selected.id,p_decision:decision,p_approved_budget:decision==="approved"?Number(approvedBudget):null,p_note:reviewNote.trim()||null});if(error)throw error;setReviewNote("");},"Budget decision recorded.");
  }
  async function changeStatus(status:string) {
    if(!selected)return;
    await run(async()=>{const {error}=await supabase.from("aasa_projects").update({status,updated_at:new Date().toISOString()}).eq("id",selected.id);if(error)throw error;});
  }
  async function requestCompletion(e:FormEvent) {
    e.preventDefault();if(!selected)return;
    await run(async()=>{const {error}=await supabase.rpc("aasa_request_project_completion",{p_project_id:selected.id,p_final_report:finalReport.trim()});if(error)throw error;setFinalReport("");},"Final report submitted for independent completion approval.");
  }
  async function reviewCompletion(decision:"approved"|"rejected") {
    if(!selected)return;
    await run(async()=>{const {error}=await supabase.rpc("aasa_review_project_completion",{p_project_id:selected.id,p_decision:decision,p_note:completionNote.trim()||null});if(error)throw error;setCompletionNote("");},"Project completion decision recorded.");
  }
  async function linkDocument(e:FormEvent) {
    e.preventDefault();if(!selected||!documentId)return;
    await run(async()=>{const {error}=await supabase.from("aasa_project_documents").insert({project_id:selected.id,document_id:documentId,added_by:userId});if(error)throw error;setDocumentId("");});
  }
  async function openDocument(id:string) {
    const doc=docFor(id);if(!doc)return;
    setError("");
    try{const {data,error}=await supabase.storage.from("aasa-documents").createSignedUrl(doc.storage_path,60);if(error)throw error;if(data?.signedUrl)window.open(data.signedUrl,"_blank","noopener,noreferrer");}
    catch(e){setError(e instanceof Error?e.message:t.error);}
  }
  async function exportRegister() {
    const rows=[["Project reference","Title","Owner","Status","Budget requested","Approved budget","Approval","Start date","Target end","Created"],...filtered.map(p=>[p.project_code,p.title,memberName(p.project_owner_member_id),p.status,p.budget_request,p.approved_budget??"",p.approval_status,p.start_date??"",p.target_end_date??"",p.created_at])];
    const blob=new Blob(["\uFEFF"+rows.map(r=>r.map(csv).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="AASA-project-register.csv";a.click();URL.revokeObjectURL(url);
  }

  const teamIds=new Set(team.map(x=>x.member_id));
  const availableMembers=members.filter(m=>!teamIds.has(m.id));
  const tabs: {id:typeof tab;label:string}[]=[{id:"overview",label:t.overview},{id:"team",label:t.team},{id:"milestones",label:t.milestones},{id:"tasks",label:t.tasks},{id:"progress",label:t.progress},{id:"risks",label:t.risks},{id:"documents",label:t.documents}];
  const statusLabel=(s:string)=>({planned:t.planned,approved:t.approved,active:t.running,paused:t.paused,completed:t.completed,cancelled:t.cancelled,pending:t.pending,rejected:t.rejected,todo:t.todo,in_progress:t.inProgress,blocked:t.blocked,low:t.low,normal:t.normal,high:t.high,urgent:t.urgent,open:t.open,mitigating:t.mitigating,accepted:t.accepted,closed:t.closed}[s]??s);

  return <div className="aasa-module-work aasa-projects">
    <div className="aasa-governance-hero"><div><p className="aasa-kicker">{t.kicker}</p><h3>{t.title}</h3><p>{t.intro}</p></div><button type="button" className="aasa-secondary" disabled={loading||busy} onClick={()=>void load(selectedId).catch(e=>setError(e.message))}>{loading?t.loading:t.refresh}</button></div>
    <div className="aasa-overview-cards">
      <article><small>{t.projects}</small><strong>{projects.length}</strong><p>{t.title}</p></article>
      <article><small>{t.active}</small><strong>{projects.filter(p=>p.status==="active").length}</strong><p>{t.running}</p></article>
      <article><small>{t.awaiting}</small><strong>{projects.filter(p=>p.approval_status==="pending").length}</strong><p>{t.pending}</p></article>
      <article><small>{t.overdue}</small><strong>{overdueTasks.length}</strong><p>{t.overdueLabel}</p></article>
    </div>
    {canManage&&<section className="aasa-panel">
      <p className="aasa-kicker">01 · PROJECT PROPOSAL</p><h3>{t.create}</h3>
      <form className="aasa-member-form" onSubmit={createProject}>
        <label>{t.projectTitle}<input required minLength={3} maxLength={180} value={title} onChange={e=>setTitle(e.target.value)}/></label>
        <label>{t.owner}<select required value={ownerId} onChange={e=>setOwnerId(e.target.value)}><option value="">—</option>{members.map(m=><option key={m.id} value={m.id}>{m.full_name} · {m.member_number}</option>)}</select></label>
        <label>{t.proposal}<textarea required minLength={10} maxLength={5000} rows={3} value={proposal} onChange={e=>setProposal(e.target.value)}/></label>
        <label>{t.objectives}<textarea required minLength={10} maxLength={5000} rows={3} value={objectives} onChange={e=>setObjectives(e.target.value)}/></label>
        <label>{t.outcomes}<textarea required minLength={5} maxLength={5000} rows={3} value={outcomes} onChange={e=>setOutcomes(e.target.value)}/></label>
        <label>{t.committee}<select value={committeeId} onChange={e=>setCommitteeId(e.target.value)}><option value="">{t.noCommittee}</option>{committees.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>{t.budget}<input type="number" min="0" step="0.01" value={budget} onChange={e=>setBudget(e.target.value)}/></label>
        <label>{t.start}<input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/></label>
        <label>{t.due}<input type="date" min={startDate||undefined} value={targetDate} onChange={e=>setTargetDate(e.target.value)}/></label>
        <button className="aasa-primary" disabled={busy||!members.length}>{busy?t.saving:t.submit}</button>
      </form>
      {!members.length&&<p className="aasa-muted">{loading?t.loading:t.noMembers}</p>}
    </section>}
    <section className="aasa-panel">
      <div className="aasa-section-heading"><div><p className="aasa-kicker">02 · OFFICIAL PROJECT REGISTER</p><h3>{t.projects}</h3><p>{filtered.length} · {t.projects}</p></div><button className="aasa-secondary" type="button" disabled={!filtered.length} onClick={()=>void exportRegister()}>{t.export}</button></div>
      <div className="aasa-register-filters"><input aria-label={t.search} placeholder={t.search} value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label={t.all} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">{t.all}</option>{["planned","approved","active","paused","completed","cancelled"].map(s=><option key={s} value={s}>{statusLabel(s)}</option>)}</select></div>
      {filtered.length?<div className="aasa-table-wrap"><table className="aasa-table"><thead><tr><th>{t.code}</th><th>{t.projectTitle}</th><th>{t.ownerLabel}</th><th>{t.status}</th><th>{t.budgetRequested}</th><th>{t.approval}</th><th>{t.due}</th><th></th></tr></thead><tbody>{filtered.map(p=><tr key={p.id}><td><strong>{p.project_code}</strong></td><td>{p.title}</td><td>{memberName(p.project_owner_member_id)}</td><td><span className="aasa-pill">{statusLabel(p.status)}</span></td><td>{money(p.budget_request)}</td><td><span className="aasa-pill">{statusLabel(p.approval_status)}</span></td><td>{p.target_end_date||"—"}</td><td><button className="aasa-secondary" type="button" onClick={()=>{setSelectedId(p.id);setTab("overview");void loadDetail(p.id).catch(e=>setError(e.message));}}>{t.details}</button></td></tr>)}</tbody></table></div>:<p className="aasa-muted">{loading?t.loading:t.noProjects}</p>}
    </section>
    {selected&&<section className="aasa-panel aasa-project-workspace">
      <div className="aasa-section-heading"><div><p className="aasa-kicker">{selected.project_code} · {t.details.toUpperCase()}</p><h3>{selected.title}</h3><p>{t.ownerLabel}: {memberName(selected.project_owner_member_id)} · {statusLabel(selected.status)}</p></div><span className="aasa-pill">{statusLabel(selected.approval_status)}</span></div>
      <nav className="aasa-project-tabs" aria-label="Project sections">{tabs.map(x=><button type="button" key={x.id} className={tab===x.id?"selected":""} onClick={()=>setTab(x.id)}>{x.label}</button>)}</nav>
      {tab==="overview"&&<div className="aasa-project-detail">
        <div className="aasa-project-summary"><article><small>{t.budgetRequested}</small><strong>{money(selected.budget_request)}</strong></article><article><small>{t.budgetApproved}</small><strong>{selected.approved_budget===null?"—":money(selected.approved_budget)}</strong></article><article><small>{t.status}</small><strong>{statusLabel(selected.status)}</strong></article><article><small>{t.dates}</small><strong>{selected.start_date||"—"} → {selected.target_end_date||"—"}</strong></article></div>
        <div className="aasa-project-copy"><h4>{t.proposal}</h4><p>{selected.proposal}</p><h4>{t.objectives}</h4><p>{selected.objectives}</p><h4>{t.outcomes}</h4><p>{selected.expected_outcomes}</p></div>
        {selected.approval_status==="pending"&&canApprove&&<form className="aasa-project-review" onSubmit={e=>{e.preventDefault();void reviewBudget("approved");}}><h4>{t.reviewBudget}</h4><label>{t.approvedAmount}<input required type="number" min="0" step="0.01" value={approvedBudget} onChange={e=>setApprovedBudget(e.target.value)}/></label><label>{t.reviewNote}<textarea rows={2} maxLength={2000} value={reviewNote} onChange={e=>setReviewNote(e.target.value)}/></label><div className="aasa-project-actions"><button className="aasa-primary" disabled={busy}>{t.approve}</button><button className="aasa-secondary" type="button" disabled={busy} onClick={()=>void reviewBudget("rejected")}>{t.reject}</button></div></form>}
        {selected.approval_status==="rejected"&&<p className="aasa-error">{t.budgetRejected} {selected.approval_note||""}</p>}
        {selected.approval_status==="pending"&&!canApprove&&<p className="aasa-muted">{t.budgetPending}</p>}
        {canManage&&<div className="aasa-project-actions">
          {selected.status==="approved"&&<button className="aasa-primary" type="button" disabled={busy} onClick={()=>void changeStatus("active")}>{t.activate}</button>}
          {selected.status==="active"&&<button className="aasa-secondary" type="button" disabled={busy} onClick={()=>void changeStatus("paused")}>{t.pause}</button>}
          {selected.status==="paused"&&<button className="aasa-primary" type="button" disabled={busy} onClick={()=>void changeStatus("active")}>{t.resume}</button>}
          {!["completed","cancelled"].includes(selected.status)&&<button className="aasa-link" type="button" disabled={busy} onClick={()=>{if(window.confirm("Cancel this project? Its records will be retained."))void changeStatus("cancelled");}}>{t.cancel}</button>}
        </div>}
        {canManage&&["active","paused"].includes(selected.status)&&<form className="aasa-project-review" onSubmit={requestCompletion}><h4>{t.completion}</h4><label>{t.finalReport}<textarea required minLength={50} maxLength={12000} rows={4} value={finalReport} onChange={e=>setFinalReport(e.target.value)}/></label><button className="aasa-primary" disabled={busy||selected.completion_status==="pending"}>{t.requestCompletion}</button></form>}
        {selected.completion_status==="pending"&&<div className="aasa-project-review"><h4>{t.reviewCompletion}</h4><p>{selected.completion_report}</p>{canApprove?<><label>{t.reviewNote}<textarea rows={2} maxLength={2000} value={completionNote} onChange={e=>setCompletionNote(e.target.value)}/></label><div className="aasa-project-actions"><button className="aasa-primary" type="button" disabled={busy} onClick={()=>void reviewCompletion("approved")}>{t.approveCompletion}</button><button className="aasa-secondary" type="button" disabled={busy} onClick={()=>void reviewCompletion("rejected")}>{t.rejectCompletion}</button></div></>:<p className="aasa-muted">{t.completionPending}</p>}</div>}
        {selected.completion_status==="rejected"&&<p className="aasa-error">{t.completionRejected} {selected.completion_review_note||""}</p>}
      </div>}
      {tab==="team"&&<><h4>{t.team}</h4>{canManage&&<form className="aasa-inline-form" onSubmit={addTeam}><label>{t.member}<select required value={teamMemberId} onChange={e=>setTeamMemberId(e.target.value)}><option value="">—</option>{availableMembers.map(m=><option key={m.id} value={m.id}>{m.full_name} · {m.member_number}{m.has_login?"":" · no login"}</option>)}</select></label><label>{t.role}<select value={teamRole} onChange={e=>setTeamRole(e.target.value)}><option value="team_member">{t.memberRole}</option><option value="team_lead">{t.lead}</option><option value="observer">{t.observer}</option></select></label><button className="aasa-primary" disabled={busy||!availableMembers.length}>{t.add}</button></form>}{team.length?<div className="aasa-table-wrap"><table className="aasa-table"><thead><tr><th>{t.member}</th><th>{t.role}</th><th>{t.dates}</th><th></th></tr></thead><tbody>{team.map(x=><tr key={x.member_id}><td>{memberName(x.member_id)}</td><td>{x.project_role==="owner"?t.ownerRole:x.project_role==="team_lead"?t.lead:x.project_role==="observer"?t.observer:t.memberRole}</td><td>{new Date(x.assigned_at).toLocaleDateString()}</td><td>{canManage&&x.project_role!=="owner"&&<button className="aasa-link" type="button" disabled={busy} onClick={()=>void removeTeam(x)}>{t.remove}</button>}</td></tr>)}</tbody></table></div>:<p className="aasa-muted">{t.teamEmpty}</p>}</>}
      {tab==="milestones"&&<>{canManage&&<form className="aasa-inline-form" onSubmit={addMilestone}><label>{t.milestoneTitle}<input required minLength={2} maxLength={180} value={milestoneTitle} onChange={e=>setMilestoneTitle(e.target.value)}/></label><label>{t.milestoneDue}<input type="date" value={milestoneDue} onChange={e=>setMilestoneDue(e.target.value)}/></label><label>{t.milestoneDesc}<input maxLength={3000} value={milestoneDesc} onChange={e=>setMilestoneDesc(e.target.value)}/></label><button className="aasa-primary" disabled={busy}>{t.addMilestone}</button></form>}{milestones.length?<div className="aasa-table-wrap"><table className="aasa-table"><thead><tr><th>{t.milestoneTitle}</th><th>{t.milestoneDue}</th><th>{t.milestoneStatus}</th></tr></thead><tbody>{milestones.map(m=><tr key={m.id}><td><strong>{m.title}</strong><br/><small>{m.description||""}</small></td><td>{m.due_date||"—"}</td><td>{canManage?<select value={m.status} disabled={busy} onChange={e=>void updateMilestone(m,e.target.value)}><option value="planned">{t.planned}</option><option value="in_progress">{t.inProgress}</option><option value="blocked">{t.blocked}</option><option value="completed">{t.completed}</option></select>:statusLabel(m.status)}</td></tr>)}</tbody></table></div>:<p className="aasa-muted">{t.noMilestones}</p>}</>}
      {tab==="tasks"&&<>{canManage&&<form className="aasa-inline-form" onSubmit={addTask}><label>{t.taskTitle}<input required minLength={2} maxLength={180} value={taskTitle} onChange={e=>setTaskTitle(e.target.value)}/></label><label>{t.assignTo}<select value={taskAssignee} onChange={e=>setTaskAssignee(e.target.value)}><option value="">{t.noAssignee}</option>{team.map(x=><option key={x.member_id} value={x.member_id}>{memberName(x.member_id)}</option>)}</select></label><label>{t.milestones}<select value={taskMilestone} onChange={e=>setTaskMilestone(e.target.value)}><option value="">—</option>{milestones.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label><label>{t.taskDue}<input type="date" value={taskDue} onChange={e=>setTaskDue(e.target.value)}/></label><label>{t.priority}<select value={taskPriority} onChange={e=>setTaskPriority(e.target.value)}><option value="low">{t.low}</option><option value="normal">{t.normal}</option><option value="high">{t.high}</option><option value="urgent">{t.urgent}</option></select></label><label>{t.taskDesc}<input maxLength={3000} value={taskDesc} onChange={e=>setTaskDesc(e.target.value)}/></label><button className="aasa-primary" disabled={busy}>{t.addTask}</button></form>}{tasks.length?<div className="aasa-table-wrap"><table className="aasa-table"><thead><tr><th>{t.taskTitle}</th><th>{t.assignTo}</th><th>{t.taskDue}</th><th>{t.priority}</th><th>{t.progressPercent}</th><th>{t.taskStatus}</th></tr></thead><tbody>{tasks.map(x=><tr key={x.id}><td><strong>{x.title}</strong><br/><small>{x.description||""}</small></td><td>{x.assigned_to_member_id?memberName(x.assigned_to_member_id):t.noAssignee}</td><td>{x.due_date||"—"}</td><td>{statusLabel(x.priority)}</td><td>{x.progress_percent}%</td><td>{canManage?<select value={x.status} disabled={busy} onChange={e=>void updateTask(x,e.target.value)}><option value="todo">{t.todo}</option><option value="in_progress">{t.inProgress}</option><option value="blocked">{t.blocked}</option><option value="completed">{t.completed}</option><option value="cancelled">{t.cancelled}</option></select>:statusLabel(x.status)}</td></tr>)}</tbody></table></div>:<p className="aasa-muted">{t.noTasks}</p>}</>}
      {tab==="progress"&&<>{canManage&&<form className="aasa-inline-form" onSubmit={addProgress}><label>{t.reportDate}<input required type="date" value={reportDate} onChange={e=>setReportDate(e.target.value)}/></label><label>{t.reportPercent}<input required type="number" min="0" max="100" value={reportPercent} onChange={e=>setReportPercent(e.target.value)}/></label><label>{t.reportBody}<textarea required minLength={10} maxLength={6000} rows={3} value={reportBody} onChange={e=>setReportBody(e.target.value)}/></label><button className="aasa-primary" disabled={busy}>{t.addReport}</button></form>}{reports.length?<div className="aasa-project-report-list">{reports.map(r=><article key={r.id}><div><strong>{r.reporting_period}</strong><span>{r.progress_percent}%</span></div><p>{r.report_body}</p></article>)}</div>:<p className="aasa-muted">{t.noReports}</p>}</>}
      {tab==="risks"&&<>{canManage&&<form className="aasa-inline-form" onSubmit={addRisk}><label>{t.riskTitle}<input required minLength={3} maxLength={180} value={riskTitle} onChange={e=>setRiskTitle(e.target.value)}/></label><label>{t.riskDesc}<textarea required minLength={10} maxLength={3000} rows={2} value={riskDesc} onChange={e=>setRiskDesc(e.target.value)}/></label><label>{t.likelihood}<select value={riskLikelihood} onChange={e=>setRiskLikelihood(e.target.value)}><option value="low">{t.low}</option><option value="medium">{t.normal}</option><option value="high">{t.high}</option></select></label><label>{t.impact}<select value={riskImpact} onChange={e=>setRiskImpact(e.target.value)}><option value="low">{t.low}</option><option value="medium">{t.normal}</option><option value="high">{t.high}</option></select></label><label>{t.mitigation}<input maxLength={3000} value={riskMitigation} onChange={e=>setRiskMitigation(e.target.value)}/></label><label>{t.riskOwner}<select value={riskOwner} onChange={e=>setRiskOwner(e.target.value)}><option value="">—</option>{team.map(x=><option key={x.member_id} value={x.member_id}>{memberName(x.member_id)}</option>)}</select></label><button className="aasa-primary" disabled={busy}>{t.addRisk}</button></form>}{risks.length?<div className="aasa-table-wrap"><table className="aasa-table"><thead><tr><th>{t.riskTitle}</th><th>{t.likelihood}</th><th>{t.impact}</th><th>{t.mitigation}</th><th>{t.riskStatus}</th></tr></thead><tbody>{risks.map(r=><tr key={r.id}><td><strong>{r.title}</strong><br/><small>{r.description}</small></td><td>{statusLabel(r.likelihood)}</td><td>{statusLabel(r.impact)}</td><td>{r.mitigation_plan||"—"}</td><td>{canManage?<select value={r.status} disabled={busy} onChange={e=>void updateRisk(r,e.target.value)}><option value="open">{t.open}</option><option value="mitigating">{t.mitigating}</option><option value="accepted">{t.accepted}</option><option value="closed">{t.closed}</option></select>:statusLabel(r.status)}</td></tr>)}</tbody></table></div>:<p className="aasa-muted">{t.noRisks}</p>}</>}
      {tab==="documents"&&<>{canLinkDocs&&<form className="aasa-inline-form" onSubmit={linkDocument}><label>{t.selectDocument}<select required value={documentId} onChange={e=>setDocumentId(e.target.value)}><option value="">—</option>{documents.filter(d=>!projectDocuments.some(x=>x.document_id===d.id)).map(d=><option key={d.id} value={d.id}>{d.title} · {d.document_type}</option>)}</select></label><button className="aasa-primary" disabled={busy||!documents.length}>{t.linkDocument}</button></form>}{!canLinkDocs&&<p className="aasa-muted">{t.noAccessDocs}</p>}{projectDocuments.length?<div className="aasa-table-wrap"><table className="aasa-table"><thead><tr><th>{t.documents}</th><th>{t.dates}</th><th></th></tr></thead><tbody>{projectDocuments.map(d=><tr key={d.document_id}><td>{docFor(d.document_id)?.title??d.document_id}</td><td>{new Date(d.added_at).toLocaleDateString()}</td><td>{canLinkDocs&&docFor(d.document_id)&&<button className="aasa-secondary" type="button" onClick={()=>void openDocument(d.document_id)}>{t.openDocument}</button>}</td></tr>)}</tbody></table></div>:<p className="aasa-muted">{t.noDocuments}</p>}</>}
    </section>}
    {!selected&&projects.length>0&&<p className="aasa-muted">{t.selectProject}</p>}
    {notice&&<p className="aasa-notice" role="status">{notice}</p>}{error&&<p className="aasa-error" role="alert">{error}</p>}
  </div>;
}
