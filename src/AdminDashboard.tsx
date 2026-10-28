import { useEffect, useState, type FormEvent } from "react";
import { supabase, SUPER_ADMIN_EMAIL } from "./lib/supabase";

type Role = "super_admin" | "platform_admin";
type Account = { id: string; email: string; roles: Role[]; status: string };
export default function AdminDashboard() {
  const [account, setAccount] = useState<Account | null>(null);
  const [email, setEmail] = useState(SUPER_ADMIN_EMAIL);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [view, setView] = useState<"login" | "dashboard">("login");
  const [lang, setLang] = useState<"en" | "ha" | "ar">("en");
  const t = {
    en: { title: "AASA Administration", intro: "Secure platform access · العلم نور", email: "Email address", send: "Send sign-in link", linkSent: "Open the email from Supabase and click the sign-in link. You will return here automatically.", back: "Use another email", logout: "Sign out", super: "Super Admin", platform: "Platform Administrator", noRole: "No administrator role assigned", claim: "Claim initial Super Admin access", claimHint: "One-time activation for the designated, email-confirmed account only.", status: "Account status", system: "Platform foundation", systemText: "Only verified role assignments unlock administration. Association modules are not enabled until implemented and authorized.", admin: "Administrator access", locked: "Access controls are locked until your role is confirmed by the database.", wait: "Please wait…" },
    ha: { title: "Gudanarwar AASA", intro: "Shiga cikin tsaro · العلم نور", email: "Adireshin imel", send: "Aika link ɗin shiga", linkSent: "Buɗe imel ɗin Supabase ka danna link ɗin shiga. Za ka dawo wannan shafin kai tsaye.", back: "Yi amfani da wani imel", logout: "Fita", super: "Super Admin", platform: "Mai Gudanar da Dandali", noRole: "Ba a ba da matsayin gudanarwa ba", claim: "Kunna Super Admin na farko", claimHint: "Sau ɗaya kawai ga asusun imel ɗin da aka ware kuma aka tabbatar.", status: "Matsayin asusu", system: "Tushen dandali", systemText: "Matsayin da database ya tabbatar ne kawai ke buɗe gudanarwa. Ba a buɗe sassan ƙungiya ba sai an gina su kuma an ba su izini.", admin: "Izinin gudanarwa", locked: "An kulle kayan gudanarwa har database ya tabbatar da matsayinka.", wait: "A jira…" },
    ar: { title: "إدارة AASA", intro: "دخول آمن · العلم نور", email: "البريد الإلكتروني", send: "إرسال رابط الدخول", linkSent: "افتح رسالة Supabase واضغط رابط الدخول. ستعود إلى هذه الصفحة تلقائيًا.", back: "استخدام بريد آخر", logout: "تسجيل الخروج", super: "المشرف الأعلى", platform: "مدير المنصة", noRole: "لم يتم تعيين دور إداري", claim: "تفعيل المشرف الأعلى الأول", claimHint: "مرة واحدة فقط للحساب المحدد بعد تأكيد البريد.", status: "حالة الحساب", system: "أساس المنصة", systemText: "لا تُفتح الإدارة إلا بعد التحقق من الدور في قاعدة البيانات. وحدات الجمعية غير مفعلة حتى تنفيذها وتفويضها.", admin: "صلاحيات الإدارة", locked: "الصلاحيات مقفلة حتى تؤكد قاعدة البيانات دورك.", wait: "يرجى الانتظار…" }
  }[lang];
  async function refresh(user: { id: string; email?: string }) {
    const p = await supabase.from("profiles").select("account_status").eq("user_id", user.id).maybeSingle();
    const r = await supabase.from("user_roles").select("roles(role_key),expires_at").eq("user_id", user.id).is("revoked_at", null);
    if (p.error) throw p.error;
    if (r.error) throw r.error;
    const status = p.data?.account_status ?? "pending";
    const now = Date.now();
    const roles = status === "active" ? (r.data ?? []).flatMap((x: any) => {
      const unexpired = !x.expires_at || Date.parse(x.expires_at) > now;
      return unexpired && (x.roles?.role_key === "super_admin" || x.roles?.role_key === "platform_admin")
        ? [x.roles.role_key as Role] : [];
    }) : [];
    setAccount({ id: user.id, email: user.email ?? "", roles, status });
    setView("dashboard");
  }
  useEffect(() => {
    let live = true;
    supabase.auth.getSession().then(({data,error:e}) => {
      if (!live) return;
      if (e) setError(e.message);
      else if (data.session?.user) void refresh({id:data.session.user.id,email:data.session.user.email}).catch(e => setError(e.message));
    });
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,session) => {
      if (!live) return;
      window.setTimeout(() => {
        if (!live) return;
        if (session?.user) void refresh({id:session.user.id,email:session.user.email}).catch(e => setError(e.message));
        else { setAccount(null); setView("login"); }
      },0);
    });
    return () => { live = false; subscription.unsubscribe(); };
  }, []);
  async function sendCode(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const {error:e} = await supabase.auth.signInWithOtp({email:email.trim().toLowerCase(),options:{shouldCreateUser:false,emailRedirectTo:"https://abu-aiman-students-association.github.io/AASA-Management-System/"}});
      if (e) throw e;
      setSent(true); setNotice(t.linkSent);
    } catch(e) { setError(e instanceof Error ? e.message : "Could not send code."); }
    finally { setBusy(false); }
  }
  async function claim() {
    setBusy(true); setError(""); setNotice("");
    try {
      const {error:e} = await supabase.rpc("claim_initial_super_admin");
      if (e) throw e;
      const {data,error:ue} = await supabase.auth.getUser();
      if (ue || !data.user) throw ue ?? new Error("No authenticated account.");
      await refresh({id:data.user.id,email:data.user.email});
      setNotice("Claim request completed. Role assignment was re-read from the database.");
    } catch(e) { setError(e instanceof Error ? e.message : "The one-time claim was not completed."); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true);
    const {error:e} = await supabase.auth.signOut();
    if (e) setError(e.message);
    else {setAccount(null);setView("login");setSent(false);}
    setBusy(false);
  }
  const role = account?.roles.includes("super_admin") ? "super_admin" : account?.roles.includes("platform_admin") ? "platform_admin" : "";
  const rtl = lang === "ar";
  return <main className={`aasa-admin ${rtl ? "rtl" : ""}`} dir={rtl ? "rtl" : "ltr"}>
    <header><div className="aasa-brand"><span>A</span><div><b>AASA</b><small>ABU-AIMAN STUDENTS' ASSOCIATION</small></div></div><div className="aasa-actions"><nav>{(["en","ha","ar"] as const).map(x=><button type="button" key={x} className={lang===x?"on":""} onClick={()=>setLang(x)}>{x==="ar"?"عربي":x.toUpperCase()}</button>)}</nav>{account&&<button type="button" onClick={()=>void logout()}>{t.logout}</button>}</div></header>
    <section className="aasa-content"><p className="aasa-kicker">العلم نور · SECURE ADMINISTRATION</p><h1>{t.title}</h1><p className="aasa-intro">{t.intro}</p>
      {view==="login" && !account ? <form className="aasa-panel aasa-login" onSubmit={sendCode}><div className="aasa-emblem">◇</div><h2>{t.title}</h2><p>Use an existing, verified AASA account. Public registration is disabled.</p><label htmlFor="aasa-email">{t.email}</label><input id="aasa-email" type="email" autoComplete="email" required value={email} disabled={sent||busy} onChange={e=>setEmail(e.target.value)}/>{sent&&<><label htmlFor="aasa-code">{t.code}</label><input id="aasa-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))}/></>}{!sent&&<button className="aasa-primary" disabled={busy}>{busy?t.wait:t.send}</button>}{sent&&<button className="aasa-link" type="button" onClick={()=>{setSent(false);setNotice("");setError("");}}>{t.back}</button>}</form> : account ? <><section className="aasa-welcome"><div><p className="aasa-kicker">AUTHENTICATED ACCOUNT</p><h2>{t.admin}</h2><p>{account.email}</p></div><span className={role?"aasa-pill active":"aasa-pill"}>{role==="super_admin"?t.super:role==="platform_admin"?t.platform:t.noRole}</span></section><section className="aasa-stats"><article className="aasa-panel"><small>{t.status}</small><strong>{account.status}</strong></article><article className="aasa-panel"><small>{t.admin}</small><strong>{role==="super_admin"?t.super:role==="platform_admin"?t.platform:"—"}</strong></article></section>{!role&&<section className="aasa-panel"><h3>{t.noRole}</h3><p>{t.locked}</p>{account.email.toLowerCase()===SUPER_ADMIN_EMAIL&&<><p>{t.claimHint}</p><button className="aasa-primary" disabled={busy||account.status==="suspended"||account.status==="disabled"} onClick={()=>void claim()}>{busy?t.wait:t.claim}</button></>}</section>}{role&&<section className="aasa-panel"><p className="aasa-kicker">{t.system}</p><h3>{t.admin}</h3><p>{t.systemText}</p><div className="aasa-tile-grid"><div><b>Security &amp; audit</b><small>Foundation configured</small></div><div><b>Administrator accounts</b><small>Next implementation step</small></div><div><b>Platform health</b><small>Foundation stage</small></div></div></section>}</> : null}
      {notice&&<p className="aasa-notice" role="status">{notice}</p>}{error&&<p className="aasa-error" role="alert">{error}</p>}<footer>العلم نور · AASA · Secure · Accountable · Multilingual</footer>
    </section>
  </main>;
}
