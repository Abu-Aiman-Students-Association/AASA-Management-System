import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "./lib/supabase";

type Lang = "en" | "ha" | "ar";
type Announcement = { id: string; title: string; body: string; audience_type: string; published_at: string };
type Committee = { id: string; name: string };

const words = {
  en: { title:"Official announcements", intro:"Publish verified association messages to active members, executive officers or a selected committee.", compose:"New announcement", headline:"Title", message:"Message", audience:"Recipients", all:"All active members", executives:"Executive officers", committee:"Selected committee", choose:"Choose a committee", publish:"Publish announcement", publishing:"Publishing…", history:"Published announcements", empty:"No announcements have been published.", loading:"Loading communications…", success:"Announcement published and in-app notifications created.", error:"Unable to complete this action.", note:"Delivery channel: in-app only. Email, SMS and WhatsApp are not enabled until an approved provider is configured and tested.", count:"Recipients notified", active:"Published" },
  ha: { title:"Sanarwar ƙungiya", intro:"Aika sahihiyar sanarwa ga membobi masu aiki, shugabanni ko wani kwamitin da aka zaɓa.", compose:"Sabuwar sanarwa", headline:"Take", message:"Saƙo", audience:"Waɗanda za su karɓa", all:"Dukkan membobi masu aiki", executives:"Shugabannin zartarwa", committee:"Wani kwamitin da aka zaɓa", choose:"Zaɓi kwamiti", publish:"Wallafa sanarwa", publishing:"Ana wallafawa…", history:"Sanarwar da aka wallafa", empty:"Babu sanarwar da aka wallafa tukuna.", loading:"Ana loda sanarwa…", success:"An wallafa sanarwa kuma an ƙirƙiri sanarwar cikin manhaja.", error:"An kasa kammala wannan aiki.", note:"Hanyar isarwa: cikin manhaja kawai. Ba a kunna imel, SMS ko WhatsApp ba sai an haɗa kuma an gwada mai bayar da sabis.", count:"Adadin waɗanda aka sanar", active:"An wallafa" },
  ar: { title:"الإعلانات الرسمية", intro:"انشر رسائل الجمعية المعتمدة للأعضاء النشطين أو المسؤولين التنفيذيين أو لجنة محددة.", compose:"إعلان جديد", headline:"العنوان", message:"الرسالة", audience:"المستلمون", all:"جميع الأعضاء النشطين", executives:"المسؤولون التنفيذيون", committee:"لجنة محددة", choose:"اختر لجنة", publish:"نشر الإعلان", publishing:"جارٍ النشر…", history:"الإعلانات المنشورة", empty:"لا توجد إعلانات منشورة.", loading:"جارٍ تحميل الإعلانات…", success:"تم نشر الإعلان وإنشاء إشعارات داخل التطبيق.", error:"تعذر إكمال هذه العملية.", note:"قناة الإرسال: داخل التطبيق فقط. البريد والرسائل النصية وواتساب غير مفعلة حتى إعداد مزود معتمد واختباره.", count:"عدد المستلمين", active:"منشور" }
};

export default function CommunicationsModule({ userId, lang }: { userId: string; lang: Lang }) {
  const t = words[lang];
  const [title,setTitle] = useState("");
  const [body,setBody] = useState("");
  const [audience,setAudience] = useState("all_members");
  const [committeeId,setCommitteeId] = useState("");
  const [committees,setCommittees] = useState<Committee[]>([]);
  const [rows,setRows] = useState<Announcement[]>([]);
  const [busy,setBusy] = useState(false);
  const [loading,setLoading] = useState(true);
  const [notice,setNotice] = useState("");
  const [error,setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    const [ann,com] = await Promise.all([
      supabase.from("aasa_announcements").select("id,title,body,audience_type,published_at").order("published_at",{ascending:false}).limit(50),
      supabase.rpc("aasa_list_announcement_committees")
    ]);
    if (ann.error) setError(ann.error.message);
    else setRows((ann.data ?? []) as Announcement[]);
    if (!com.error) setCommittees((com.data ?? []) as Committee[]);
    else if (audience === "committee") setError(com.error.message);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function publish(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const { data, error: rpcError } = await supabase.rpc("aasa_publish_announcement", {
        p_title:title.trim(), p_body:body.trim(), p_audience_type:audience,
        p_committee_id:audience === "committee" ? committeeId : null
      });
      if (rpcError) throw rpcError;
      const result = data as { recipient_count?: number };
      setTitle(""); setBody(""); setCommitteeId("");
      setNotice(lang === "ha" ? `An aika sanarwar ga mutane ${result.recipient_count ?? 0}.` : lang === "ar" ? `تم إرسال الإعلان إلى ${result.recipient_count ?? 0} مستلمًا.` : `${result.recipient_count ?? 0} recipients were notified.`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : t.error); }
    finally { setBusy(false); }
  }

  const audienceLabel = (value:string) => value === "all_members" ? t.all : value === "executives" ? t.executives : t.committee;
  return <div className="aasa-module-work" data-actor-user-id={userId}>
    <div className="aasa-governance-hero"><div><p className="aasa-kicker">AASA · COMMUNICATIONS</p><h3>{t.title}</h3><p>{t.intro}</p></div><button className="aasa-secondary" type="button" disabled={loading||busy} onClick={()=>void load()}>{loading ? t.loading : "Refresh"}</button></div>
    <section className="aasa-panel"><p className="aasa-kicker">01 · {t.compose.toUpperCase()}</p><h3>{t.compose}</h3>
      <form className="aasa-member-form" onSubmit={publish}>
        <label>{t.headline}<input required minLength={3} maxLength={180} value={title} onChange={e=>setTitle(e.target.value)} /></label>
        <label>{t.audience}<select value={audience} onChange={e=>setAudience(e.target.value)}><option value="all_members">{t.all}</option><option value="executives">{t.executives}</option><option value="committee">{t.committee}</option></select></label>
        {audience === "committee" && <label>{t.choose}<select required value={committeeId} onChange={e=>setCommitteeId(e.target.value)}><option value="">{t.choose}</option>{committees.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
        <label className="aasa-full-span">{t.message}<textarea required minLength={3} maxLength={12000} rows={5} value={body} onChange={e=>setBody(e.target.value)} /></label>
        <button className="aasa-primary" disabled={busy || (audience==="committee" && !committeeId)}>{busy ? t.publishing : t.publish}</button>
      </form>
      <p className="aasa-muted">{t.note}</p>
      {notice && <p className="aasa-notice" role="status">{notice}</p>}
      {error && <p className="aasa-error" role="alert">{error}</p>}
    </section>
    <section className="aasa-panel"><div className="aasa-section-heading"><div><p className="aasa-kicker">02 · RECORD</p><h3>{t.history}</h3></div></div>
      {loading ? <p>{t.loading}</p> : rows.length === 0 ? <p className="aasa-muted">{t.empty}</p> : <div className="aasa-module-list">{rows.map(row=><article key={row.id} className="aasa-communication-item"><div><strong>{row.title}</strong><p>{row.body}</p><small>{audienceLabel(row.audience_type)} · {new Date(row.published_at).toLocaleString()}</small></div><span className="aasa-status-available">{t.active}</span></article>)}</div>}
    </section>
  </div>;
}
