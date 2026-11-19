import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "./lib/supabase";

type Lang = "en" | "ha" | "ar";
type Tab = "history" | "events" | "chapters" | "mentorship" | "engagement" | "communications" | "audit";
type Alumni = { id: string; member_id: string | null; graduation_verification_status: string };
type Member = { id: string; full_name: string; member_number: string; status: string };
type Education = { id: string; alumni_id: string; institution: string; qualification: string; field_of_study: string | null; start_year: number | null; end_year: number | null; evidence_reference: string | null; verification_status: string };
type Employment = { id: string; alumni_id: string; employer: string; job_title: string; industry: string | null; location: string | null; start_date: string | null; end_date: string | null; is_current: boolean };
type AlumniEvent = { id: string; title: string; description: string | null; starts_at: string; ends_at: string | null; venue: string | null; capacity: number | null; status: string };
type EventRegistration = { id: string; event_id: string; alumni_id: string; registration_status: string; note: string | null };
type Chapter = { id: string; name: string; region: string | null; location: string | null; description: string | null; status: string };
type ChapterMember = { id: string; chapter_id: string; alumni_id: string; chapter_role: string; joined_at: string; left_at: string | null };
type Mentorship = { id: string; mentor_alumni_id: string; mentee_member_id: string; topic: string; goals: string | null; status: string; starts_on: string | null; ends_on: string | null; notes: string | null };
type Engagement = { id: string; alumni_id: string; activity_type: string; title: string; description: string | null; occurred_on: string; hours: number | null };
type Audit = { id: string; actor_user_id: string | null; action_key: string; entity_type: string; entity_id: string | null; created_at: string };\ntype AlumniAnnouncement = { id: string; title: string; body: string; audience_type: string; audience_location: string | null; audience_graduation_year: number | null; published_at: string; status: string };

const words = {
 en: {
  title:"Alumni operations", intro:"Career history, alumni reunions, regional chapters, mentoring and non-financial service.",
  history:"Education & career", events:"Reunions & events", chapters:"Chapters", mentorship:"Mentorship", engagement:"Engagement", communications:"Alumni communications", audit:"Activity & audit",
  verified:"Verified alumni", upcoming:"Upcoming events", chaptersCount:"Active chapters", mentorshipCount:"Active mentorships", activityCount:"Activities recorded",
  education:"Education history", employment:"Employment history", institution:"Institution", qualification:"Qualification", field:"Field of study", startYear:"Start year", endYear:"End year", evidence:"Evidence reference", addEducation:"Add education", employer:"Employer", job:"Job title", industry:"Industry", location:"Location", startDate:"Start date", endDate:"End date", current:"Current role", addEmployment:"Add employment",
  eventTitle:"Event title", description:"Description", starts:"Starts at", ends:"Ends at", venue:"Venue", capacity:"Capacity", addEvent:"Create alumni event", register:"Invite / register alumni", event:"Event", alumni:"Verified alumni", status:"Status", save:"Save", refresh:"Refresh", noRows:"No records yet. Only genuine records are shown.", eventStatus:"Event status", registrationStatus:"Registration status",
  chapterName:"Chapter name", region:"Region / state", addChapter:"Create chapter", assignChapter:"Add verified alumni to chapter", chapterRole:"Chapter role", member:"Member", coordinator:"Coordinator", secretary:"Secretary", chairperson:"Chairperson",
  mentee:"AASA mentee", mentor:"Alumni mentor", topic:"Mentoring topic", goals:"Goals", startsOn:"Start date", endsOn:"End date", addMentorship:"Create mentorship", proposed:"Proposed", active:"Active", completed:"Completed", declined:"Declined", cancelled:"Cancelled",
  activityType:"Activity type", activityTitle:"Activity title", occurred:"Activity date", hours:"Hours contributed", addActivity:"Record activity", volunteering:"Volunteering", project:"Project support", mentorshipActivity:"Mentorship", reunion:"Reunion", talk:"Professional talk", other:"Other",
  action:"Action", entity:"Record type", recordId:"Record ID", actor:"Actor", date:"Date", historyNote:"Graduation verification evidence is managed in the Verification Queue. These entries extend the verified alumni profile.", financeNote:"This register records non-financial service only. Dues, donations and money remain in AASA Finance and Payments.", audience:"Audience", allVerified:"All verified alumni", byChapter:"Selected chapter", byLocation:"Location", byYear:"Graduation year", announcementTitle:"Announcement title", announcementBody:"Message", publish:"Publish in-app announcement", published:"Published", recipients:"Recipients notified", channelNote:"Delivery is in-app only. Email, SMS and WhatsApp are not enabled by this module.", export:"Export CSV", selectAlumni:"Select verified alumnus", selectMember:"Select active AASA member", selectEvent:"Select event", selectChapter:"Select chapter", noVerified:"No verified alumni are available yet. Verify a graduation record first.", error:"Could not complete the action."
 },
 ha: {
  title:"Ayyukan tsofaffin membobi", intro:"Tarihin karatu da aiki, tarukan alumni, rassa, jagoranci da ayyukan hidimar sa-kai.",
  history:"Karatu da aiki", events:"Taruka da haɗuwa", chapters:"Rassa", mentorship:"Jagoranci", engagement:"Gudummawar aiki", communications:"Saƙonnin alumni", audit:"Tarihi da binciken aiki",
  verified:"Tsofaffin membobi da aka tantance", upcoming:"Tarukan da ke tafe", chaptersCount:"Rassa masu aiki", mentorshipCount:"Shirye-shiryen jagoranci", activityCount:"Ayyukan da aka rubuta",
  education:"Tarihin karatu", employment:"Tarihin aiki", institution:"Makaranta", qualification:"Takardar karatu", field:"Fannin karatu", startYear:"Shekarar farawa", endYear:"Shekarar kammalawa", evidence:"Lambar shaida", addEducation:"Ƙara karatu", employer:"Ma'aikaci", job:"Matsayin aiki", industry:"Sana'a", location:"Wuri", startDate:"Ranar farawa", endDate:"Ranar ƙarewa", current:"Aikin yanzu", addEmployment:"Ƙara aikin yi",
  eventTitle:"Sunan taro", description:"Bayani", starts:"Lokacin farawa", ends:"Lokacin ƙarewa", venue:"Wurin taro", capacity:"Yawan mahalarta", addEvent:"Ƙirƙiri taron alumni", register:"Gayyata / rajistar alumni", event:"Taro", alumni:"Tsohon memba da aka tantance", status:"Matsayi", save:"Ajiye", refresh:"Sabunta", noRows:"Babu bayanai tukuna. Ana nuna bayanan gaskiya kawai.", eventStatus:"Matsayin taro", registrationStatus:"Matsayin rajista",
  chapterName:"Sunan reshe", region:"Jiha / yanki", addChapter:"Ƙirƙiri reshe", assignChapter:"Haɗa tsohon memba da reshe", chapterRole:"Matsayin reshe", member:"Memba", coordinator:"Mai kula", secretary:"Sakatare", chairperson:"Shugaba",
  mentee:"Memba mai karɓar jagoranci", mentor:"Tsohon memba mai jagoranci", topic:"Batun jagoranci", goals:"Manufofi", startsOn:"Ranar farawa", endsOn:"Ranar ƙarewa", addMentorship:"Ƙirƙiri shirin jagoranci", proposed:"An gabatar", active:"Yana gudana", completed:"An kammala", declined:"An ƙi", cancelled:"An soke",
  activityType:"Nau'in aiki", activityTitle:"Sunan aiki", occurred:"Ranar aiki", hours:"Awannin hidima", addActivity:"Rubuta aiki", volunteering:"Sa-kai", project:"Taimakon aiki", mentorshipActivity:"Jagoranci", reunion:"Haɗuwar alumni", talk:"Jawabin ƙwarewa", other:"Wani aiki",
  action:"Aiki", entity:"Nau'in rubutu", recordId:"Lambar rubutu", actor:"Mai aiwatarwa", date:"Rana", historyNote:"Ana tantance shaidar kammala karatu a Verification Queue. Waɗannan bayanai suna ƙara wa bayanin tsohon memba.", financeNote:"Wannan sashe na rubuta hidimar da ba ta kuɗi ba. Kuɗin ƙungiya da gudummawa suna nan a Finance da Payments na AASA.", audience:"Waɗanda za su karɓa", allVerified:"Dukkan alumni da aka tantance", byChapter:"Reshen da aka zaɓa", byLocation:"Wuri", byYear:"Shekarar kammala karatu", announcementTitle:"Taken sanarwa", announcementBody:"Saƙo", publish:"Aika sanarwa cikin manhaja", published:"An wallafa", recipients:"Adadin waɗanda aka sanar", channelNote:"Ana aika saƙo cikin manhaja kawai. Ba a kunna imel, SMS ko WhatsApp a wannan sashe ba.", export:"Fitar da CSV", selectAlumni:"Zaɓi tsohon memba da aka tantance", selectMember:"Zaɓi memba mai aiki na AASA", selectEvent:"Zaɓi taro", selectChapter:"Zaɓi reshe", noVerified:"Babu tsohon memba da aka tantance tukuna. A fara tantance shaidar kammala karatu.", error:"An kasa kammala aikin."
 },
 ar: {
  title:"عمليات الخريجين", intro:"السجل التعليمي والمهني والملتقيات والفروع والإرشاد والخدمة التطوعية غير المالية.",
  history:"التعليم والعمل", events:"الملتقيات والفعاليات", chapters:"الفروع", mentorship:"الإرشاد", engagement:"المشاركة", communications:"تواصل الخريجين", audit:"النشاط والتدقيق",
  verified:"خريجون موثقون", upcoming:"فعاليات قادمة", chaptersCount:"فروع نشطة", mentorshipCount:"برامج إرشاد نشطة", activityCount:"أنشطة مسجلة",
  education:"السجل التعليمي", employment:"السجل الوظيفي", institution:"المؤسسة التعليمية", qualification:"المؤهل", field:"مجال الدراسة", startYear:"سنة البداية", endYear:"سنة التخرج", evidence:"مرجع الإثبات", addEducation:"إضافة تعليم", employer:"جهة العمل", job:"المسمى الوظيفي", industry:"القطاع", location:"الموقع", startDate:"تاريخ البداية", endDate:"تاريخ النهاية", current:"الوظيفة الحالية", addEmployment:"إضافة وظيفة",
  eventTitle:"عنوان الفعالية", description:"الوصف", starts:"وقت البداية", ends:"وقت النهاية", venue:"المكان", capacity:"السعة", addEvent:"إنشاء فعالية للخريجين", register:"دعوة / تسجيل خريج", event:"الفعالية", alumni:"خريج موثق", status:"الحالة", save:"حفظ", refresh:"تحديث", noRows:"لا توجد سجلات بعد. يتم عرض السجلات الحقيقية فقط.", eventStatus:"حالة الفعالية", registrationStatus:"حالة التسجيل",
  chapterName:"اسم الفرع", region:"المنطقة / الولاية", addChapter:"إنشاء فرع", assignChapter:"إضافة خريج موثق إلى الفرع", chapterRole:"دور الفرع", member:"عضو", coordinator:"منسق", secretary:"أمين السر", chairperson:"رئيس",
  mentee:"عضو مستفيد", mentor:"مرشد من الخريجين", topic:"موضوع الإرشاد", goals:"الأهداف", startsOn:"تاريخ البداية", endsOn:"تاريخ النهاية", addMentorship:"إنشاء برنامج إرشاد", proposed:"مقترح", active:"نشط", completed:"مكتمل", declined:"مرفوض", cancelled:"ملغى",
  activityType:"نوع النشاط", activityTitle:"عنوان النشاط", occurred:"تاريخ النشاط", hours:"ساعات التطوع", addActivity:"تسجيل نشاط", volunteering:"تطوع", project:"دعم مشروع", mentorshipActivity:"إرشاد", reunion:"ملتقى خريجين", talk:"محاضرة مهنية", other:"أخرى",
  action:"الإجراء", entity:"نوع السجل", recordId:"معرّف السجل", actor:"المنفذ", date:"التاريخ", historyNote:"يتم اعتماد إثبات التخرج من قائمة التحقق. هذه السجلات توسع ملف الخريج المعتمد.", financeNote:"يسجل هذا القسم الخدمة غير المالية فقط. تبقى الاشتراكات والتبرعات والأموال ضمن المالية والمدفوعات في AASA.", audience:"المستلمون", allVerified:"جميع الخريجين الموثقين", byChapter:"فرع محدد", byLocation:"الموقع", byYear:"سنة التخرج", announcementTitle:"عنوان الإعلان", announcementBody:"الرسالة", publish:"نشر إشعار داخل التطبيق", published:"تم النشر", recipients:"عدد المستلمين", channelNote:"الإرسال داخل التطبيق فقط. البريد والرسائل النصية وواتساب غير مفعلة في هذا القسم.", export:"تصدير CSV", selectAlumni:"اختر خريجاً موثقاً", selectMember:"اختر عضواً نشطاً في AASA", selectEvent:"اختر فعالية", selectChapter:"اختر فرعاً", noVerified:"لا يوجد خريجون موثقون بعد. يرجى اعتماد سجل التخرج أولاً.", error:"تعذر إكمال العملية."
 }
} as const;

const csvCell = (v: unknown) => '"' + String(v ?? "").replace(/"/g, '""') + '"';

export default function AlumniOperationsModule({ userId, canManage, canLookupMembers, lang }: { userId: string; canManage: boolean; canLookupMembers: boolean; lang: Lang }) {
 const t = words[lang];
 const [tab,setTab] = useState<Tab>("history");
 const [alumni,setAlumni] = useState<Alumni[]>([]);
 const [members,setMembers] = useState<Member[]>([]);
 const [memberNames,setMemberNames] = useState<Map<string,Member>>(new Map());
 const [education,setEducation] = useState<Education[]>([]);
 const [employment,setEmployment] = useState<Employment[]>([]);
 const [events,setEvents] = useState<AlumniEvent[]>([]);
 const [registrations,setRegistrations] = useState<EventRegistration[]>([]);
 const [chapters,setChapters] = useState<Chapter[]>([]);
 const [chapterMembers,setChapterMembers] = useState<ChapterMember[]>([]);
 const [mentorships,setMentorships] = useState<Mentorship[]>([]);
 const [activities,setActivities] = useState<Engagement[]>([]);
 const [audit,setAudit] = useState<Audit[]>([]);
 const [busy,setBusy] = useState(false);
 const [loading,setLoading] = useState(true);
 const [error,setError] = useState("");
 const [notice,setNotice] = useState("");
 const [edu,setEdu] = useState({alumni_id:"",institution:"",qualification:"",field_of_study:"",start_year:"",end_year:"",evidence_reference:""});
 const [job,setJob] = useState({alumni_id:"",employer:"",job_title:"",industry:"",location:"",start_date:"",end_date:"",is_current:false});
 const [event,setEvent] = useState({title:"",description:"",starts_at:"",ends_at:"",venue:"",capacity:""});
 const [registration,setRegistration] = useState({event_id:"",alumni_id:""});
 const [chapter,setChapter] = useState({name:"",region:"",location:"",description:""});
 const [chapterLink,setChapterLink] = useState({chapter_id:"",alumni_id:"",chapter_role:"member"});
 const [mentorship,setMentorship] = useState({mentor_alumni_id:"",mentee_member_id:"",topic:"",goals:"",starts_on:"",ends_on:""});
 const [activity,setActivity] = useState({alumni_id:"",activity_type:"volunteering",title:"",description:"",occurred_on:new Date().toISOString().slice(0,10),hours:""});\n const [announcement,setAnnouncement]=useState({title:"",body:"",audience_type:"all_verified",chapter_id:"",location:"",graduation_year:""});

 const load = useCallback(async () => {
  setLoading(true); setError("");
  try {
   const [a,e,j,ev,er,ch,cm,me,ac,au,an] = await Promise.all([
    supabase.from("aasa_alumni_records").select("id,member_id,graduation_verification_status").order("created_at",{ascending:false}),
    supabase.from("aasa_alumni_education_history").select("id,alumni_id,institution,qualification,field_of_study,start_year,end_year,evidence_reference,verification_status").order("created_at",{ascending:false}),
    supabase.from("aasa_alumni_employment_history").select("id,alumni_id,employer,job_title,industry,location,start_date,end_date,is_current").order("start_date",{ascending:false,nullsFirst:false}),
    supabase.from("aasa_alumni_events").select("id,title,description,starts_at,ends_at,venue,capacity,status").order("starts_at",{ascending:false}),
    supabase.from("aasa_alumni_event_registrations").select("id,event_id,alumni_id,registration_status,note").order("created_at",{ascending:false}),
    supabase.from("aasa_alumni_chapters").select("id,name,region,location,description,status").order("name"),
    supabase.from("aasa_alumni_chapter_members").select("id,chapter_id,alumni_id,chapter_role,joined_at,left_at").order("joined_at",{ascending:false}),
    supabase.from("aasa_alumni_mentorships").select("id,mentor_alumni_id,mentee_member_id,topic,goals,status,starts_on,ends_on,notes").order("created_at",{ascending:false}),
    supabase.from("aasa_alumni_engagement_activities").select("id,alumni_id,activity_type,title,description,occurred_on,hours").order("occurred_on",{ascending:false}),
    supabase.from("aasa_alumni_activity_log").select("id,actor_user_id,action_key,entity_type,entity_id,created_at").order("created_at",{ascending:false}).limit(100)
   ]);
   const firstError=[a,e,j,ev,er,ch,cm,me,ac,au,an].find(x=>x.error)?.error;
   if(firstError) throw firstError;
   const nextAlumni=(a.data??[]) as Alumni[];
   setAlumni(nextAlumni); setEducation((e.data??[]) as Education[]); setEmployment((j.data??[]) as Employment[]);
   setEvents((ev.data??[]) as AlumniEvent[]); setRegistrations((er.data??[]) as EventRegistration[]);
   setChapters((ch.data??[]) as Chapter[]); setChapterMembers((cm.data??[]) as ChapterMember[]);
   setMentorships((me.data??[]) as Mentorship[]); setActivities((ac.data??[]) as Engagement[]); setAudit((au.data??[]) as Audit[]); setAnnouncements((an.data??[]) as AlumniAnnouncement[]);
   if(canLookupMembers) {
    const mr=await supabase.from("aasa_members").select("id,full_name,member_number,status").eq("is_test_record",false).order("full_name");
    if(mr.error) throw mr.error;
    const map=new Map<string,Member>((mr.data??[]).map((x:Member)=>[x.id,x] as const));
    setMemberNames(map); setMembers((mr.data??[]).filter((x:Member)=>x.status==="active") as Member[]);
   }
  } catch(e) { setError(e instanceof Error?e.message:t.error); }
  finally { setLoading(false); }
 },[canLookupMembers,t.error]);

 useEffect(()=>{void load()},[load]);
 const verifiedAlumni=useMemo(()=>alumni.filter(a=>a.graduation_verification_status==="verified"),[alumni]);
 const nameOf=(id:string)=>{const a=alumni.find(x=>x.id===id);if(!a)return id.slice(0,8);const m=a.member_id?memberNames.get(a.member_id):undefined;return m?m.full_name+" · "+m.member_number:"Verified alumni";}
 const memberOf=(id:string)=>{const m=memberNames.get(id);return m?m.full_name+" · "+m.member_number:"AASA member";}
 const run=async(action:()=>Promise<void>,message:string)=>{setBusy(true);setError("");setNotice("");try{await action();await load();setNotice(message)}catch(e){setError(e instanceof Error?e.message:t.error)}finally{setBusy(false)}};
 const insert=async(table:string,payload:Record<string,unknown>)=>{const {error}=await supabase.from(table).insert(payload);if(error)throw error};
 const update=async(table:string,id:string,payload:Record<string,unknown>)=>{const {error}=await supabase.from(table).update(payload).eq("id",id);if(error)throw error};
 const remove=async(table:string,id:string)=>{const {error}=await supabase.from(table).delete().eq("id",id);if(error)throw error};
 const addEducation=async(e:FormEvent)=>{e.preventDefault();if(!canManage)return;await run(async()=>{await insert("aasa_alumni_education_history",{...edu,alumni_id:edu.alumni_id,start_year:edu.start_year?Number(edu.start_year):null,end_year:edu.end_year?Number(edu.end_year):null,field_of_study:edu.field_of_study||null,evidence_reference:edu.evidence_reference||null,created_by:userId});setEdu({alumni_id:"",institution:"",qualification:"",field_of_study:"",start_year:"",end_year:"",evidence_reference:""})},"Education history saved.")};
 const addEmployment=async(e:FormEvent)=>{e.preventDefault();if(!canManage)return;await run(async()=>{await insert("aasa_alumni_employment_history",{...job,industry:job.industry||null,location:job.location||null,start_date:job.start_date||null,end_date:job.is_current?null:job.end_date||null,created_by:userId});setJob({alumni_id:"",employer:"",job_title:"",industry:"",location:"",start_date:"",end_date:"",is_current:false})},"Employment history saved.")};
 const addEvent=async(e:FormEvent)=>{e.preventDefault();if(!canManage)return;const start=new Date(event.starts_at),end=event.ends_at?new Date(event.ends_at):null;if(Number.isNaN(start.getTime())||(end&&end<start)){setError("Check the event start and end dates.");return}await run(async()=>{await insert("aasa_alumni_events",{title:event.title.trim(),description:event.description.trim()||null,starts_at:start.toISOString(),ends_at:end?.toISOString()??null,venue:event.venue.trim()||null,capacity:event.capacity?Number(event.capacity):null,created_by:userId});setEvent({title:"",description:"",starts_at:"",ends_at:"",venue:"",capacity:""})},"Alumni event created.")};
 const addRegistration=async(e:FormEvent)=>{e.preventDefault();if(!canManage)return;await run(async()=>{await insert("aasa_alumni_event_registrations",{...registration,registration_status:"invited",registered_by:userId});setRegistration({event_id:"",alumni_id:""})},"Alumni invitation recorded.")};
 const addChapter=async(e:FormEvent)=>{e.preventDefault();if(!canManage)return;await run(async()=>{await insert("aasa_alumni_chapters",{...chapter,region:chapter.region||null,location:chapter.location||null,description:chapter.description||null,created_by:userId});setChapter({name:"",region:"",location:"",description:""})},"Alumni chapter created.")};
 const addChapterMember=async(e:FormEvent)=>{e.preventDefault();if(!canManage)return;await run(async()=>{await insert("aasa_alumni_chapter_members",{...chapterLink,added_by:userId});setChapterLink({chapter_id:"",alumni_id:"",chapter_role:"member"})},"Verified alumnus added to chapter.")};
 const addMentorship=async(e:FormEvent)=>{e.preventDefault();if(!canManage)return;await run(async()=>{await insert("aasa_alumni_mentorships",{...mentorship,goals:mentorship.goals||null,starts_on:mentorship.starts_on||null,ends_on:mentorship.ends_on||null,created_by:userId});setMentorship({mentor_alumni_id:"",mentee_member_id:"",topic:"",goals:"",starts_on:"",ends_on:""})},"Mentorship programme created.")};
 const publishAnnouncement=async(e:FormEvent)=>{e.preventDefault();if(!canManage)return;const audience=announcement.audience_type;const payload={p_title:announcement.title.trim(),p_body:announcement.body.trim(),p_audience_type:audience,p_chapter_id:audience==="chapter"?announcement.chapter_id:null,p_location:audience==="location"?announcement.location.trim():null,p_graduation_year:audience==="graduation_year"?Number(announcement.graduation_year):null};await run(async()=>{const {data,error}=await supabase.rpc("aasa_publish_alumni_announcement",payload);if(error)throw error;const result=data as {recipient_count?:number};setAnnouncement({title:"",body:"",audience_type:"all_verified",chapter_id:"",location:"",graduation_year:""});setNotice((lang==="ha"?"An aika sanarwa ga mutane ":lang==="ar"?"تم إرسال الإعلان إلى ":"Announcement delivered to ")+(result.recipient_count??0)+(lang==="ha"?" alumni.":lang==="ar"?" من الخريجين.":" alumni.") );},"Alumni announcement published.")};\n const addActivity=async(e:FormEvent)=>{e.preventDefault();if(!canManage)return;await run(async()=>{await insert("aasa_alumni_engagement_activities",{...activity,hours:activity.hours?Number(activity.hours):null,description:activity.description||null,recorded_by:userId});setActivity({alumni_id:"",activity_type:"volunteering",title:"",description:"",occurred_on:new Date().toISOString().slice(0,10),hours:""})},"Alumni engagement recorded.")};
 const exportActivities=()=>{const data=[["Alumni","Activity type","Title","Date","Hours","Description"],...activities.map(a=>[nameOf(a.alumni_id),a.activity_type,a.title,a.occurred_on,a.hours??"",a.description??""])];const blob=new Blob(["\uFEFF"+data.map(r=>r.map(csvCell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="AASA-alumni-engagement.csv";a.click();URL.revokeObjectURL(url)};
 const activeMentorships=mentorships.filter(x=>x.status==="active").length;
 const upcomingEvents=events.filter(x=>x.status==="scheduled"&&new Date(x.starts_at).getTime()>=Date.now()).length;
 const tabs: [Tab,string][]=[["history",t.history],["events",t.events],["chapters",t.chapters],["mentorship",t.mentorship],["engagement",t.engagement],["communications",t.communications],["audit",t.audit]];
 return <div className="aasa-module-work aasa-alumni-operations">
  <div className="aasa-governance-hero"><div><p className="aasa-kicker">AASA · ALUMNI RELATIONS</p><h3>{t.title}</h3><p>{t.intro}</p></div><button className="aasa-secondary" type="button" disabled={loading||busy} onClick={()=>void load()}>{loading?t.refresh+"…":t.refresh}</button></div>
  <div className="aasa-overview-cards">
   <article><small>{t.verified}</small><strong>{verifiedAlumni.length}</strong></article>
   <article><small>{t.upcoming}</small><strong>{upcomingEvents}</strong></article>
   <article><small>{t.chaptersCount}</small><strong>{chapters.filter(x=>x.status==="active").length}</strong></article>
   <article><small>{t.mentorshipCount}</small><strong>{activeMentorships}</strong></article>
   <article><small>{t.activityCount}</small><strong>{activities.length}</strong></article>
  </div>
  <nav className="aasa-alumni-ops-tabs" aria-label={t.title}>{tabs.map(([id,label])=><button type="button" key={id} className={tab===id?"selected":""} onClick={()=>setTab(id)}>{label}</button>)}</nav>
  {error&&<p className="aasa-error" role="alert">{error}</p>}{notice&&<p className="aasa-notice" role="status">{notice}</p>}
  {loading?<section className="aasa-panel"><p className="aasa-muted">Loading Alumni operations…</p></section>:<>
   {tab==="history"&&<section className="aasa-panel">
    <p className="aasa-muted">{t.historyNote}</p>
    <h3>{t.education}</h3>
    {canManage&&<form className="aasa-member-form" onSubmit={addEducation}>
     <label>{t.alumni}<select required value={edu.alumni_id} onChange={e=>setEdu(p=>({...p,alumni_id:e.target.value}))}><option value="">{t.selectAlumni}</option>{verifiedAlumni.map(a=><option key={a.id} value={a.id}>{nameOf(a.id)}</option>)}</select></label>
     <label>{t.institution}<input required maxLength={200} value={edu.institution} onChange={e=>setEdu(p=>({...p,institution:e.target.value}))}/></label>
     <label>{t.qualification}<input required maxLength={160} value={edu.qualification} onChange={e=>setEdu(p=>({...p,qualification:e.target.value}))}/></label>
     <label>{t.field}<input maxLength={160} value={edu.field_of_study} onChange={e=>setEdu(p=>({...p,field_of_study:e.target.value}))}/></label>
     <label>{t.startYear}<input type="number" min="1900" max="2100" value={edu.start_year} onChange={e=>setEdu(p=>({...p,start_year:e.target.value}))}/></label>
     <label>{t.endYear}<input type="number" min="1900" max="2100" value={edu.end_year} onChange={e=>setEdu(p=>({...p,end_year:e.target.value}))}/></label>
     <label className="aasa-full-span">{t.evidence}<input maxLength={500} value={edu.evidence_reference} onChange={e=>setEdu(p=>({...p,evidence_reference:e.target.value}))}/></label>
     <button className="aasa-primary" disabled={busy||!verifiedAlumni.length}>{t.addEducation}</button>
    </form>}
    <div className="aasa-table-wrap"><table className="aasa-table"><thead><tr><th>{t.alumni}</th><th>{t.qualification}</th><th>{t.institution}</th><th>{t.field}</th><th>{t.status}</th>{canManage&&<th/>}</tr></thead><tbody>{education.map(x=><tr key={x.id}><td>{nameOf(x.alumni_id)}</td><td>{x.qualification}</td><td>{x.institution}</td><td>{x.field_of_study||"—"}</td><td>{x.verification_status}</td>{canManage&&<td><button type="button" className="aasa-link" disabled={busy} onClick={()=>void run(()=>remove("aasa_alumni_education_history",x.id),"Education record removed.")}>Remove</button></td>}</tr>)}</tbody></table></div>
    {!education.length&&<p className="aasa-muted">{t.noRows}</p>}
    <h3>{t.employment}</h3>
    {canManage&&<form className="aasa-member-form" onSubmit={addEmployment}>
     <label>{t.alumni}<select required value={job.alumni_id} onChange={e=>setJob(p=>({...p,alumni_id:e.target.value}))}><option value="">{t.selectAlumni}</option>{verifiedAlumni.map(a=><option key={a.id} value={a.id}>{nameOf(a.id)}</option>)}</select></label>
     <label>{t.employer}<input required maxLength={180} value={job.employer} onChange={e=>setJob(p=>({...p,employer:e.target.value}))}/></label>
     <label>{t.job}<input required maxLength={160} value={job.job_title} onChange={e=>setJob(p=>({...p,job_title:e.target.value}))}/></label>
     <label>{t.industry}<input maxLength={160} value={job.industry} onChange={e=>setJob(p=>({...p,industry:e.target.value}))}/></label>
     <label>{t.location}<input maxLength={180} value={job.location} onChange={e=>setJob(p=>({...p,location:e.target.value}))}/></label>
     <label>{t.startDate}<input type="date" value={job.start_date} onChange={e=>setJob(p=>({...p,start_date:e.target.value}))}/></label>
     <label>{t.endDate}<input type="date" disabled={job.is_current} value={job.end_date} onChange={e=>setJob(p=>({...p,end_date:e.target.value}))}/></label>
     <label className="aasa-checkbox-line"><input type="checkbox" checked={job.is_current} onChange={e=>setJob(p=>({...p,is_current:e.target.checked,end_date:e.target.checked?"":p.end_date}))}/>{t.current}</label>
     <button className="aasa-primary" disabled={busy||!verifiedAlumni.length}>{t.addEmployment}</button>
    </form>}
    <div className="aasa-table-wrap"><table className="aasa-table"><thead><tr><th>{t.alumni}</th><th>{t.job}</th><th>{t.employer}</th><th>{t.industry}</th><th>{t.current}</th>{canManage&&<th/>}</tr></thead><tbody>{employment.map(x=><tr key={x.id}><td>{nameOf(x.alumni_id)}</td><td>{x.job_title}</td><td>{x.employer}</td><td>{x.industry||"—"}</td><td>{x.is_current?"Yes":x.end_date||"—"}</td>{canManage&&<td><button type="button" className="aasa-link" disabled={busy} onClick={()=>void run(()=>remove("aasa_alumni_employment_history",x.id),"Employment record removed.")}>Remove</button></td>}</tr>)}</tbody></table></div>
    {!employment.length&&<p className="aasa-muted">{t.noRows}</p>}
   </section>}
   {tab==="events"&&<section className="aasa-panel">
    {canManage&&<><h3>{t.addEvent}</h3><form className="aasa-member-form" onSubmit={addEvent}>
     <label>{t.eventTitle}<input required minLength={3} maxLength={180} value={event.title} onChange={e=>setEvent(p=>({...p,title:e.target.value}))}/></label>
     <label>{t.venue}<input maxLength={300} value={event.venue} onChange={e=>setEvent(p=>({...p,venue:e.target.value}))}/></label>
     <label>{t.starts}<input required type="datetime-local" value={event.starts_at} onChange={e=>setEvent(p=>({...p,starts_at:e.target.value}))}/></label>
     <label>{t.ends}<input type="datetime-local" min={event.starts_at||undefined} value={event.ends_at} onChange={e=>setEvent(p=>({...p,ends_at:e.target.value}))}/></label>
     <label>{t.capacity}<input type="number" min="1" max="100000" value={event.capacity} onChange={e=>setEvent(p=>({...p,capacity:e.target.value}))}/></label>
     <label className="aasa-full-span">{t.description}<textarea rows={3} maxLength={8000} value={event.description} onChange={e=>setEvent(p=>({...p,description:e.target.value}))}/></label>
     <button className="aasa-primary" disabled={busy}>{t.addEvent}</button>
    </form></>}
    <h3>{t.events}</h3><div className="aasa-table-wrap"><table className="aasa-table"><thead><tr><th>{t.eventTitle}</th><th>{t.starts}</th><th>{t.venue}</th><th>{t.status}</th><th>Registrations</th>{canManage&&<th/>}</tr></thead><tbody>{events.map(x=><tr key={x.id}><td>{x.title}</td><td>{new Date(x.starts_at).toLocaleString()}</td><td>{x.venue||"—"}</td><td>{x.status}</td><td>{registrations.filter(r=>r.event_id===x.id&&r.registration_status!=="cancelled").length}</td>{canManage&&<td><select aria-label={t.eventStatus} disabled={busy} value={x.status} onChange={e=>void run(()=>update("aasa_alumni_events",x.id,{status:e.target.value}),"Event status updated.")}><option value="scheduled">scheduled</option><option value="completed">completed</option><option value="cancelled">cancelled</option></select></td>}</tr>)}</tbody></table></div>
    {canManage&&<><h3>{t.register}</h3><form className="aasa-member-form" onSubmit={addRegistration}>
     <label>{t.event}<select required value={registration.event_id} onChange={e=>setRegistration(p=>({...p,event_id:e.target.value}))}><option value="">{t.selectEvent}</option>{events.filter(x=>x.status==="scheduled").map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
     <label>{t.alumni}<select required value={registration.alumni_id} onChange={e=>setRegistration(p=>({...p,alumni_id:e.target.value}))}><option value="">{t.selectAlumni}</option>{verifiedAlumni.map(a=><option key={a.id} value={a.id}>{nameOf(a.id)}</option>)}</select></label>
     <button className="aasa-primary" disabled={busy||!verifiedAlumni.length}>{t.register}</button>
    </form></>}
    <div className="aasa-table-wrap"><table className="aasa-table"><thead><tr><th>{t.event}</th><th>{t.alumni}</th><th>{t.registrationStatus}</th></tr></thead><tbody>{registrations.map(r=><tr key={r.id}><td>{events.find(e=>e.id===r.event_id)?.title||"—"}</td><td>{nameOf(r.alumni_id)}</td><td>{canManage?<select disabled={busy} value={r.registration_status} onChange={e=>void run(()=>update("aasa_alumni_event_registrations",r.id,{registration_status:e.target.value}),"Registration updated.")}>{["invited","registered","attended","cancelled"].map(s=><option key={s}>{s}</option>)}</select>:r.registration_status}</td></tr>)}</tbody></table></div>
    {!events.length&&<p className="aasa-muted">{t.noRows}</p>}
   </section>}
   {tab==="chapters"&&<section className="aasa-panel">
    {canManage&&<><h3>{t.addChapter}</h3><form className="aasa-member-form" onSubmit={addChapter}>
     <label>{t.chapterName}<input required minLength={2} maxLength={140} value={chapter.name} onChange={e=>setChapter(p=>({...p,name:e.target.value}))}/></label>
     <label>{t.region}<input maxLength={120} value={chapter.region} onChange={e=>setChapter(p=>({...p,region:e.target.value}))}/></label>
     <label>{t.location}<input maxLength={180} value={chapter.location} onChange={e=>setChapter(p=>({...p,location:e.target.value}))}/></label>
     <label className="aasa-full-span">{t.description}<textarea rows={2} maxLength={3000} value={chapter.description} onChange={e=>setChapter(p=>({...p,description:e.target.value}))}/></label>
     <button className="aasa-primary" disabled={busy}>{t.addChapter}</button>
    </form><h3>{t.assignChapter}</h3><form className="aasa-member-form" onSubmit={addChapterMember}>
     <label>{t.selectChapter}<select required value={chapterLink.chapter_id} onChange={e=>setChapterLink(p=>({...p,chapter_id:e.target.value}))}><option value="">{t.selectChapter}</option>{chapters.filter(x=>x.status==="active").map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
     <label>{t.alumni}<select required value={chapterLink.alumni_id} onChange={e=>setChapterLink(p=>({...p,alumni_id:e.target.value}))}><option value="">{t.selectAlumni}</option>{verifiedAlumni.map(a=><option key={a.id} value={a.id}>{nameOf(a.id)}</option>)}</select></label>
     <label>{t.chapterRole}<select value={chapterLink.chapter_role} onChange={e=>setChapterLink(p=>({...p,chapter_role:e.target.value}))}>{["member","coordinator","secretary","chairperson"].map(x=><option key={x} value={x}>{t[x as keyof typeof t]||x}</option>)}</select></label>
     <button className="aasa-primary" disabled={busy||!verifiedAlumni.length||!chapters.length}>{t.assignChapter}</button>
    </form></>}
    <div className="aasa-table-wrap"><table className="aasa-table"><thead><tr><th>{t.chapterName}</th><th>{t.region}</th><th>{t.location}</th><th>{t.status}</th><th>Members</th>{canManage&&<th/>}</tr></thead><tbody>{chapters.map(x=><tr key={x.id}><td>{x.name}</td><td>{x.region||"—"}</td><td>{x.location||"—"}</td><td>{x.status}</td><td>{chapterMembers.filter(m=>m.chapter_id===x.id&&!m.left_at).length}</td>{canManage&&<td><select aria-label={t.status} value={x.status} disabled={busy} onChange={e=>void run(()=>update("aasa_alumni_chapters",x.id,{status:e.target.value}),"Chapter status updated.")}><option value="active">active</option><option value="inactive">inactive</option></select></td>}</tr>)}</tbody></table></div>
    <div className="aasa-table-wrap"><table className="aasa-table"><thead><tr><th>{t.chapterName}</th><th>{t.alumni}</th><th>{t.chapterRole}</th><th>{t.date}</th></tr></thead><tbody>{chapterMembers.filter(m=>!m.left_at).map(m=><tr key={m.id}><td>{chapters.find(c=>c.id===m.chapter_id)?.name||"—"}</td><td>{nameOf(m.alumni_id)}</td><td>{m.chapter_role}</td><td>{m.joined_at}</td></tr>)}</tbody></table></div>
    {!chapters.length&&<p className="aasa-muted">{t.noRows}</p>}
   </section>}
   {tab==="mentorship"&&<section className="aasa-panel">
    {canManage&&<form className="aasa-member-form" onSubmit={addMentorship}>
     <label>{t.mentor}<select required value={mentorship.mentor_alumni_id} onChange={e=>setMentorship(p=>({...p,mentor_alumni_id:e.target.value}))}><option value="">{t.selectAlumni}</option>{verifiedAlumni.map(a=><option key={a.id} value={a.id}>{nameOf(a.id)}</option>)}</select></label>
     <label>{t.mentee}<select required value={mentorship.mentee_member_id} onChange={e=>setMentorship(p=>({...p,mentee_member_id:e.target.value}))}><option value="">{t.selectMember}</option>{members.map(m=><option key={m.id} value={m.id}>{m.full_name} · {m.member_number}</option>)}</select></label>
     <label>{t.topic}<input required minLength={3} maxLength={180} value={mentorship.topic} onChange={e=>setMentorship(p=>({...p,topic:e.target.value}))}/></label>
     <label>{t.startsOn}<input type="date" value={mentorship.starts_on} onChange={e=>setMentorship(p=>({...p,starts_on:e.target.value}))}/></label>
     <label>{t.endsOn}<input type="date" min={mentorship.starts_on||undefined} value={mentorship.ends_on} onChange={e=>setMentorship(p=>({...p,ends_on:e.target.value}))}/></label>
     <label className="aasa-full-span">{t.goals}<textarea rows={3} maxLength={3000} value={mentorship.goals} onChange={e=>setMentorship(p=>({...p,goals:e.target.value}))}/></label>
     <button className="aasa-primary" disabled={busy||!verifiedAlumni.length||!members.length}>{t.addMentorship}</button>
    </form>}
    <div className="aasa-table-wrap"><table className="aasa-table"><thead><tr><th>{t.mentor}</th><th>{t.mentee}</th><th>{t.topic}</th><th>{t.status}</th>{canManage&&<th/>}</tr></thead><tbody>{mentorships.map(x=><tr key={x.id}><td>{nameOf(x.mentor_alumni_id)}</td><td>{memberOf(x.mentee_member_id)}</td><td>{x.topic}</td><td>{x.status}</td>{canManage&&<td><select aria-label={t.status} value={x.status} disabled={busy} onChange={e=>void run(()=>update("aasa_alumni_mentorships",x.id,{status:e.target.value}),"Mentorship status updated.")}>{["proposed","active","completed","declined","cancelled"].map(s=><option key={s}>{s}</option>)}</select></td>}</tr>)}</tbody></table></div>
    {!mentorships.length&&<p className="aasa-muted">{t.noRows}</p>}
   </section>}
   {tab==="engagement"&&<section className="aasa-panel">
    <p className="aasa-muted">{t.financeNote}</p>
    {canManage&&<form className="aasa-member-form" onSubmit={addActivity}>
     <label>{t.alumni}<select required value={activity.alumni_id} onChange={e=>setActivity(p=>({...p,alumni_id:e.target.value}))}><option value="">{t.selectAlumni}</option>{verifiedAlumni.map(a=><option key={a.id} value={a.id}>{nameOf(a.id)}</option>)}</select></label>
     <label>{t.activityType}<select value={activity.activity_type} onChange={e=>setActivity(p=>({...p,activity_type:e.target.value}))}><option value="volunteering">{t.volunteering}</option><option value="project">{t.project}</option><option value="mentorship">{t.mentorshipActivity}</option><option value="reunion">{t.reunion}</option><option value="professional_talk">{t.talk}</option><option value="other">{t.other}</option></select></label>
     <label>{t.activityTitle}<input required minLength={3} maxLength={180} value={activity.title} onChange={e=>setActivity(p=>({...p,title:e.target.value}))}/></label>
     <label>{t.occurred}<input required type="date" value={activity.occurred_on} onChange={e=>setActivity(p=>({...p,occurred_on:e.target.value}))}/></label>
     <label>{t.hours}<input type="number" min="0" step="0.25" value={activity.hours} onChange={e=>setActivity(p=>({...p,hours:e.target.value}))}/></label>
     <label className="aasa-full-span">{t.description}<textarea rows={3} maxLength={4000} value={activity.description} onChange={e=>setActivity(p=>({...p,description:e.target.value}))}/></label>
     <button className="aasa-primary" disabled={busy||!verifiedAlumni.length}>{t.addActivity}</button>
    </form>}
    <div className="aasa-section-heading"><h3>{t.engagement}</h3><button type="button" className="aasa-secondary" onClick={exportActivities} disabled={!activities.length}>{t.export}</button></div>
    <div className="aasa-table-wrap"><table className="aasa-table"><thead><tr><th>{t.alumni}</th><th>{t.activityType}</th><th>{t.activityTitle}</th><th>{t.occurred}</th><th>{t.hours}</th></tr></thead><tbody>{activities.map(x=><tr key={x.id}><td>{nameOf(x.alumni_id)}</td><td>{x.activity_type}</td><td>{x.title}</td><td>{x.occurred_on}</td><td>{x.hours??"—"}</td></tr>)}</tbody></table></div>
    {!activities.length&&<p className="aasa-muted">{t.noRows}</p>}
   </section>}
   {tab==="communications"&&<section className="aasa-panel">
    <p className="aasa-muted">{t.channelNote}</p>
    {canManage&&<form className="aasa-member-form" onSubmit={publishAnnouncement}>
     <label>{t.announcementTitle}<input required minLength={3} maxLength={180} value={announcement.title} onChange={e=>setAnnouncement(p=>({...p,title:e.target.value}))}/></label>
     <label>{t.audience}<select value={announcement.audience_type} onChange={e=>setAnnouncement(p=>({...p,audience_type:e.target.value}))}><option value="all_verified">{t.allVerified}</option><option value="chapter">{t.byChapter}</option><option value="location">{t.byLocation}</option><option value="graduation_year">{t.byYear}</option></select></label>
     {announcement.audience_type==="chapter"&&<label>{t.selectChapter}<select required value={announcement.chapter_id} onChange={e=>setAnnouncement(p=>({...p,chapter_id:e.target.value}))}><option value="">{t.selectChapter}</option>{chapters.filter(c=>c.status==="active").map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
     {announcement.audience_type==="location"&&<label>{t.location}<input required minLength={2} maxLength={180} value={announcement.location} onChange={e=>setAnnouncement(p=>({...p,location:e.target.value}))}/></label>}
     {announcement.audience_type==="graduation_year"&&<label>{t.endYear}<input required type="number" min="1900" max="2100" value={announcement.graduation_year} onChange={e=>setAnnouncement(p=>({...p,graduation_year:e.target.value}))}/></label>}
     <label className="aasa-full-span">{t.announcementBody}<textarea required minLength={3} maxLength={12000} rows={5} value={announcement.body} onChange={e=>setAnnouncement(p=>({...p,body:e.target.value}))}/></label>
     <button className="aasa-primary" disabled={busy|| (announcement.audience_type==="chapter"&&!announcement.chapter_id)}>{t.publish}</button>
    </form>}
    <h3>{t.communications}</h3>
    <div className="aasa-table-wrap"><table className="aasa-table"><thead><tr><th>{t.announcementTitle}</th><th>{t.audience}</th><th>{t.date}</th><th>{t.status}</th></tr></thead><tbody>{announcements.map(a=><tr key={a.id}><td><strong>{a.title}</strong><br/><small>{a.body}</small></td><td>{a.audience_type==="all_verified"?t.allVerified:a.audience_type==="chapter"?t.byChapter:a.audience_type==="location"?a.audience_location:a.audience_graduation_year}</td><td>{new Date(a.published_at).toLocaleString()}</td><td>{a.status}</td></tr>)}</tbody></table></div>
    {!announcements.length&&<p className="aasa-muted">{t.noRows}</p>}
   </section>}
   {tab==="audit"&&<section className="aasa-panel"><h3>{t.audit}</h3><p className="aasa-muted">Audit records show who changed Alumni Centre records and when. Personal contact details and free-text notes are not copied into this log.</p><div className="aasa-table-wrap"><table className="aasa-table"><thead><tr><th>{t.action}</th><th>{t.entity}</th><th>{t.recordId}</th><th>{t.actor}</th><th>{t.date}</th></tr></thead><tbody>{audit.map(x=><tr key={x.id}><td>{x.action_key}</td><td>{x.entity_type.replace("aasa_alumni_","").replaceAll("_"," ")}</td><td>{x.entity_id?.slice(0,8)||"—"}</td><td>{x.actor_user_id?.slice(0,8)||"System"}</td><td>{new Date(x.created_at).toLocaleString()}</td></tr>)}</tbody></table></div>{!audit.length&&<p className="aasa-muted">{t.noRows}</p>}</section>}
  </>}
 </div>;
}
