import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

type Lang = "en" | "ha" | "ar";
type Notification = { id:string; title:string; message:string; delivery_status:string; created_at:string; read_at:string|null };

const copy = {
  en:{title:"Notifications",intro:"Official association messages and account notices.",empty:"You have no notifications yet.",loading:"Loading notifications…",mark:"Mark as read",read:"Read",unread:"Unread",refresh:"Refresh",error:"Unable to load notifications."},
  ha:{title:"Sanarwa",intro:"Saƙonnin ƙungiya na hukuma da sanarwar asusu.",empty:"Babu sanarwa a yanzu.",loading:"Ana loda sanarwa…",mark:"Alama a matsayin an karanta",read:"An karanta",unread:"Ba a karanta ba",refresh:"Sabunta",error:"An kasa loda sanarwa."},
  ar:{title:"الإشعارات",intro:"رسائل الجمعية الرسمية وتنبيهات الحساب.",empty:"لا توجد إشعارات حاليًا.",loading:"جارٍ تحميل الإشعارات…",mark:"تحديد كمقروء",read:"مقروء",unread:"غير مقروء",refresh:"تحديث",error:"تعذر تحميل الإشعارات."}
};

export default function NotificationsInbox({lang}:{lang:Lang}) {
  const t=copy[lang];
  const [rows,setRows]=useState<Notification[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [busyId,setBusyId]=useState("");

  async function load(){
    setLoading(true);setError("");
    const {data,error:e}=await supabase.from("aasa_notifications")
      .select("id,title,message,delivery_status,created_at,read_at")
      .order("created_at",{ascending:false}).limit(100);
    if(e)setError(e.message||t.error);else setRows((data??[]) as Notification[]);
    setLoading(false);
  }
  useEffect(()=>{void load();},[]);

  async function markRead(id:string){
    setBusyId(id);setError("");
    const {error:e}=await supabase.rpc("aasa_mark_notification_read",{p_notification_id:id});
    if(e)setError(e.message);else setRows(prev=>prev.map(row=>row.id===id?{...row,read_at:row.read_at??new Date().toISOString(),delivery_status:"READ"}:row));
    setBusyId("");
  }
  const unread=rows.filter(row=>!row.read_at).length;
  return <section className="aasa-member-panel aasa-notifications-panel">
    <div className="aasa-notifications-heading"><div><p className="aasa-member-kicker">AASA · IN-APP MESSAGES</p><h2>{t.title}</h2><p>{t.intro}</p></div><button type="button" onClick={()=>void load()} disabled={loading}>{t.refresh}</button></div>
    <p className="aasa-notifications-count">{unread} {t.unread}</p>
    {loading?<p>{t.loading}</p>:rows.length===0?<p>{t.empty}</p>:<div className="aasa-notifications-list">{rows.map(row=><article key={row.id} className={row.read_at?"is-read":"is-unread"}><div className="aasa-notification-copy"><strong>{row.title}</strong><p>{row.message}</p><small>{new Date(row.created_at).toLocaleString()} · {row.read_at?t.read:t.unread}</small></div>{!row.read_at&&<button type="button" disabled={busyId===row.id} onClick={()=>void markRead(row.id)}>{busyId===row.id?"…":t.mark}</button>}</article>)}</div>}
    {error&&<p className="aasa-member-error" role="alert">{error}</p>}
  </section>;
}
