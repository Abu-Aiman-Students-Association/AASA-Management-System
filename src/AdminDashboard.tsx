import { useEffect, useState, type FormEvent } from "react";
import { supabase, SUPER_ADMIN_EMAIL } from "./lib/supabase";
import AdminAccountsPanel from "./AdminAccountsPanel";
import MembershipModule from "./MembershipModule";
import GovernanceModule from "./GovernanceModule";
import MeetingsModule from "./MeetingsModule";
import FinanceModule from "./FinanceModule";
import WelfareModule from "./WelfareModule";
import DocumentsModule from "./DocumentsModule";
import ElectionsModule from "./ElectionsModule";

type Role = string;
type Account = { id: string; email: string; roles: Role[]; permissions: string[]; status: string };
type Section = "overview" | "membership" | "governance" | "elections" | "meetings" | "finance" | "welfare" | "documents" | "administration";
const moduleSections: { id: Section; icon: string; en: string; ha: string; ar: string; state: "available" | "planned" }[] = [
  { id: "overview", icon: "▦", en: "Overview", ha: "Shafin Farko", ar: "نظرة عامة", state: "available" },
  { id: "membership", icon: "♙", en: "Membership", ha: "Membobinta", ar: "العضوية", state: "available" },
  { id: "governance", icon: "♜", en: "Leadership & Committees", ha: "Shugabanci da Kwamitoci", ar: "القيادة واللجان", state: "available" },
  { id: "elections", icon: "☑", en: "Elections", ha: "Zaɓe", ar: "الانتخابات", state: "available" },
  { id: "meetings", icon: "▤", en: "Meetings & Events", ha: "Taro da Ayyuka", ar: "الاجتماعات والفعاليات", state: "available" },
  { id: "finance", icon: "₦", en: "Finance", ha: "Kuɗaɗe", ar: "المالية", state: "available" },
  { id: "welfare", icon: "♡", en: "Welfare & Cases", ha: "Jindadi da Ƙorafe-ƙorafe", ar: "الرعاية والشكاوى", state: "available" },
  { id: "documents", icon: "▧", en: "Documents & Reports", ha: "Takardu da Rahotanni", ar: "الوثائق والتقارير", state: "available" },
  { id: "administration", icon: "⚙", en: "Administration & Security", ha: "Gudanarwa da Tsaro", ar: "الإدارة والأمان", state: "available" }
];
export default function AdminDashboard() {
  const [account, setAccount] = useState<Account | null>(null);
  const [email, setEmail] = useState(SUPER_ADMIN_EMAIL);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [view, setView] = useState<"login" | "dashboard">("login");
  const [section, setSection] = useState<Section>("overview");
  const [lang, setLang] = useState<"en" | "ha" | "ar">("en");
  const copy = {
    en: { title: "AASA Administration", intro: "Association operations, governance and accountability", email: "Email address", send: "Send sign-in link", linkSent: "Open the email from Supabase and click the sign-in link. You will return here automatically.", back: "Use another email", logout: "Sign out", super: "Super Admin", platform: "Platform Administrator", noRole: "No administrator role assigned", claim: "Claim initial Super Admin access", claimHint: "One-time activation for the designated, email-confirmed account only.", status: "Account status", access: "Administrator access", locked: "Administration remains locked until your role is confirmed by the database.", wait: "Please wait…", welcome: "Welcome back", overview: "Dashboard overview", overviewText: "A central workspace for AASA association administration.", available: "Available", planned: "Planned", liveModules: "Connected admin areas", plannedModules: "Modules awaiting implementation", moduleStatus: "Module status", next: "Modules will appear here when their secure workflows and data connections are implemented.", administration: "Administration & Security", accountManagement: "Administrator accounts", platformState: "Platform readiness", foundation: "Security foundation", foundationText: "Sign-in and administrator role checks are active in this interface. Backend checks remain authoritative.", coming: "Not implemented yet", comingText: "This section is part of the approved AASA scope, but its operational workflow is not connected yet. No sample records are shown." },
    ha: { title: "Gudanarwar AASA", intro: "Ayyukan ƙungiya, shugabanci da riƙon amana", email: "Adireshin imel", send: "Aika link ɗin shiga", linkSent: "Buɗe imel ɗin Supabase ka danna link ɗin shiga. Za ka dawo wannan shafin kai tsaye.", back: "Yi amfani da wani imel", logout: "Fita", super: "Babban Mai Gudanarwa", platform: "Mai Gudanar da Dandali", noRole: "Ba a ba da matsayin gudanarwa ba", claim: "Kunna Super Admin na farko", claimHint: "Sau ɗaya kawai ga asusun da aka ware kuma aka tabbatar da imel ɗinsa.", status: "Matsayin asusu", access: "Izinin gudanarwa", locked: "Gudanarwa yana kulle har database ya tabbatar da matsayinka.", wait: "A jira…", welcome: "Barka da dawowa", overview: "Takaitaccen dashboard", overviewText: "Wurin gudanar da ayyukan ƙungiyar AASA.", available: "Akwai", planned: "An tsara", liveModules: "Sassan gudanarwa masu aiki", plannedModules: "Sassan da ake jiran ginawa", moduleStatus: "Matsayin sashe", next: "Za a nuna sassa bayan an gina amintattun hanyoyinsu da haɗin bayanai.", administration: "Gudanarwa da Tsaro", accountManagement: "Asusun masu gudanarwa", platformState: "Shirye-shiryen dandali", foundation: "Tushen tsaro", foundationText: "Shiga da tantance matsayin mai gudanarwa suna aiki a wannan shafi. Database ne ke da ikon tabbatar da izini.", coming: "Ba a kammala ginawa ba", comingText: "Wannan sashe yana cikin tsarin AASA da aka amince da shi, amma ba a haɗa aikin sa ba tukuna. Ba a nuna bayanan gwaji ba." },
    ar: { title: "إدارة AASA", intro: "عمليات الجمعية والحوكمة والمساءلة", email: "البريد الإلكتروني", send: "إرسال رابط الدخول", linkSent: "افتح رسالة Supabase واضغط رابط الدخول. ستعود إلى هذه الصفحة تلقائيًا.", back: "استخدام بريد آخر", logout: "تسجيل الخروج", super: "المشرف الأعلى", platform: "مدير المنصة", noRole: "لم يتم تعيين دور إداري", claim: "تفعيل المشرف الأعلى الأول", claimHint: "مرة واحدة فقط للحساب المحدد بعد تأكيد البريد.", status: "حالة الحساب", access: "صلاحيات الإدارة", locked: "تبقى الإدارة مقفلة حتى تؤكد قاعدة البيانات دورك.", wait: "يرجى الانتظار…", welcome: "مرحبًا بعودتك", overview: "نظرة عامة", overviewText: "مساحة مركزية لإدارة جمعية AASA.", available: "متاح", planned: "مخطط", liveModules: "أقسام الإدارة المتصلة", plannedModules: "وحدات بانتظار التنفيذ", moduleStatus: "حالة الوحدات", next: "ستظهر الوحدات عند تنفيذ مسارات العمل الآمنة وربط البيانات.", administration: "الإدارة والأمان", accountManagement: "حسابات المسؤولين", platformState: "جاهزية المنصة", foundation: "أساس الأمان", foundationText: "تسجيل الدخول والتحقق من دور المسؤول موجودان في هذه الواجهة. تظل فحوصات الخادم هي المرجع النهائي.", coming: "لم يتم التنفيذ بعد", comingText: "هذا القسم جزء من نطاق AASA المعتمد، لكن سير العمل التشغيلي غير متصل بعد. لن تُعرض سجلات تجريبية." }
  }[lang];
  async function refresh(user: { id: string; email?: string }) {
    const p = await supabase.from("profiles").select("account_status").eq("user_id", user.id).maybeSingle();
    const r = await supabase.from("user_roles").select("role_id,roles(role_key),expires_at").eq("user_id", user.id).is("revoked_at", null);
    if (p.error) throw p.error;
    if (r.error) throw r.error;
    const status = p.data?.account_status ?? "pending";
    const now = Date.now();
    const activeRoleRows = status === "active" ? (r.data ?? []).filter((x: any) => !x.expires_at || Date.parse(x.expires_at) > now) : [];
    const roles = activeRoleRows.map((x: any) => x.roles?.role_key).filter((x: unknown): x is string => typeof x === "string");
    const roleIds = activeRoleRows.map((x: any) => x.role_id).filter(Boolean);
    let permissions: string[] = [];
    if (roleIds.length) {
      const pr = await supabase.from("role_permissions").select("role_id,permissions(permission_key)").in("role_id", roleIds);
      if (pr.error) throw pr.error;
      permissions = (pr.data ?? []).map((x: any) => x.permissions?.permission_key).filter((x: unknown): x is string => typeof x === "string");
    }
    setAccount({ id: user.id, email: user.email ?? "", roles, permissions: [...new Set(permissions)], status });
    setView("dashboard");
  }
  useEffect(() => {
    let live = true;
    supabase.auth.getSession().then(({ data, error: e }) => {
      if (!live) return;
      if (e) setError(e.message);
      else if (data.session?.user) void refresh({ id: data.session.user.id, email: data.session.user.email }).catch(e => setError(e.message));
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!live) return;
      window.setTimeout(() => {
        if (!live) return;
        if (session?.user) void refresh({ id: session.user.id, email: session.user.email }).catch(e => setError(e.message));
        else { setAccount(null); setView("login"); }
      }, 0);
    });
    return () => { live = false; subscription.unsubscribe(); };
  }, []);
  async function sendCode(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const { error: e } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: false, emailRedirectTo: "https://abu-aiman-students-association.github.io/AASA-Management-System/" } });
      if (e) throw e;
      setSent(true); setNotice(copy.linkSent);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not send code."); }
    finally { setBusy(false); }
  }
  async function claim() {
    setBusy(true); setError(""); setNotice("");
    try {
      const { error: e } = await supabase.rpc("claim_initial_super_admin");
      if (e) throw e;
      const { data, error: ue } = await supabase.auth.getUser();
      if (ue || !data.user) throw ue ?? new Error("No authenticated account.");
      await refresh({ id: data.user.id, email: data.user.email });
      setNotice("Claim request completed. Role assignment was re-read from the database.");
    } catch (e) { setError(e instanceof Error ? e.message : "The one-time claim was not completed."); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true);
    const { error: e } = await supabase.auth.signOut();
    if (e) setError(e.message);
    else { setAccount(null); setView("login"); setSent(false); setSection("overview"); }
    setBusy(false);
  }
  const role = account?.roles.includes("super_admin") ? "super_admin" : account?.roles.includes("platform_admin") ? "platform_admin" : account?.roles[0] ?? "";
  const rtl = lang === "ar";
  const canAccessSection = (id: Section) => {
    if (role === "super_admin") return true;
    if (id === "overview") return Boolean(role);
    if (id === "administration") return account?.permissions.some(p => ["platform.admins.manage","system.users.manage","system.roles.manage"].includes(p)) ?? false;
    const required: Record<Exclude<Section,"overview"|"administration">, string[]> = {
      membership: ["membership.read"], governance: ["executives.manage","committees.manage"], elections: ["elections.manage","elections.results.review","elections.vote"], meetings: ["meetings.manage"], finance: ["finance.records.read","finance.records.create","finance.transactions.approve"], welfare: ["welfare.cases.read","welfare.cases.manage"], documents: ["documents.manage"]
    };
    return account?.permissions.some(p => required[id as Exclude<Section,"overview"|"administration">]?.includes(p)) ?? false;
  };
  const visibleSections = moduleSections.filter(item => canAccessSection(item.id));
  const roleLabel = role === "super_admin" ? copy.super : role === "platform_admin" ? copy.platform : role.replace(/_/g, " ");
  const label = (item: typeof moduleSections[number]) => lang === "ha" ? item.ha : lang === "ar" ? item.ar : item.en;
  return <main className={`aasa-admin ${rtl ? "rtl" : ""}`} dir={rtl ? "rtl" : "ltr"}>
    <header><div className="aasa-brand"><img className="aasa-brand-logo" src={import.meta.env.BASE_URL + "aasa-school-logo.jpg"} alt="AASA crest" /><div><b>AASA</b><small>ABU-AIMAN STUDENTS' ASSOCIATION</small></div></div><div className="aasa-actions"><nav>{(["en", "ha", "ar"] as const).map(x => <button type="button" key={x} className={lang === x ? "on" : ""} onClick={() => setLang(x)}>{x === "ar" ? "عربي" : x.toUpperCase()}</button>)}</nav>{account && <button type="button" onClick={() => void logout()}>{copy.logout}</button>}</div></header>
    <section className="aasa-content"><p className="aasa-kicker">العلم نور · SECURE ADMINISTRATION</p><h1>{copy.title}</h1><p className="aasa-intro">{copy.intro}</p>
      {view === "login" && !account ? <form className="aasa-panel aasa-login" onSubmit={sendCode}><img className="aasa-login-logo" src={import.meta.env.BASE_URL + "aasa-school-logo.jpg"} alt="AASA association crest" /><h2>{copy.title}</h2><p>Use an existing, verified AASA account. Public registration is disabled.</p><label htmlFor="aasa-email">{copy.email}</label><input id="aasa-email" type="email" autoComplete="email" required value={email} disabled={sent || busy} onChange={e => setEmail(e.target.value)} />{sent && <p className="aasa-notice" role="status">{copy.linkSent}</p>}{!sent && <button className="aasa-primary" disabled={busy}>{busy ? copy.wait : copy.send}</button>}{sent && <button className="aasa-link" type="button" onClick={() => { setSent(false); setNotice(""); setError(""); }}>{copy.back}</button>}</form> : account ? <>{!role ? <><section className="aasa-welcome"><div><p className="aasa-kicker">AUTHENTICATED ACCOUNT</p><h2>{copy.access}</h2><p>{account.email}</p></div><span className="aasa-pill">{copy.noRole}</span></section><section className="aasa-panel"><h3>{copy.noRole}</h3><p>{copy.locked}</p><p>{copy.status}: <strong>{account.status}</strong></p>{account.email.toLowerCase() === SUPER_ADMIN_EMAIL && <><p>{copy.claimHint}</p><button className="aasa-primary" disabled={busy || account.status === "suspended" || account.status === "disabled"} onClick={() => void claim()}>{busy ? copy.wait : copy.claim}</button></>}</section></> : <div className="aasa-workspace">
        <aside className="aasa-sidebar"><div className="aasa-sidebar-account"><span className="aasa-avatar">A</span><div><strong>{account.email}</strong><small>{roleLabel}</small></div></div><p className="aasa-nav-label">WORKSPACE</p><nav aria-label="AASA administration sections">{visibleSections.map(item => <button key={item.id} type="button" className={section === item.id ? "selected" : ""} onClick={() => setSection(item.id)}><span className="aasa-nav-icon">{item.icon}</span><span>{label(item)}</span>{item.state === "planned" && <i>•</i>}</button>)}</nav><div className="aasa-sidebar-foot"><span className="aasa-live-dot" /> {copy.status}: {account.status}</div></aside>
        <div className="aasa-workspace-main">
          {section === "overview" && <><div className="aasa-page-heading"><div><p className="aasa-kicker">AASA · ADMIN WORKSPACE</p><h2>{copy.welcome}</h2><p>{copy.overviewText}</p></div><span className="aasa-pill active">{role === "super_admin" ? copy.super : copy.platform}</span></div><div className="aasa-overview-cards"><article><span className="aasa-card-icon">▦</span><small>{copy.liveModules}</small><strong>{visibleSections.filter(m => m.state === "available" && m.id !== "overview" && m.id !== "administration").length}</strong><p>Overview · Membership · Governance · Elections setup · Meetings · Finance · Welfare · Documents · Access control</p></article><article><span className="aasa-card-icon">◷</span><small>{copy.plannedModules}</small><strong>{visibleSections.filter(m => m.state === "planned").length}</strong><p>{copy.next}</p></article><article><span className="aasa-card-icon">♙</span><small>{copy.status}</small><strong>{account.status}</strong><p>{account.email}</p></article></div><section className="aasa-panel aasa-module-panel"><div className="aasa-section-heading"><div><p className="aasa-kicker">WORKSPACE MAP</p><h3>{copy.moduleStatus}</h3></div></div><div className="aasa-module-list">{visibleSections.filter(m => m.id !== "overview").map(item => <button type="button" key={item.id} onClick={() => setSection(item.id)}><span className="aasa-module-icon">{item.icon}</span><span className="aasa-module-copy"><strong>{label(item)}</strong><small>{item.state === "available" ? copy.available : copy.coming}</small></span><span className={item.state === "available" ? "aasa-status-available" : "aasa-status-planned"}>{item.state === "available" ? copy.available : copy.planned}</span><span aria-hidden="true">›</span></button>)}</div></section><section className="aasa-panel"><p className="aasa-kicker">{copy.foundation}</p><h3>{copy.platformState}</h3><p>{copy.foundationText}</p></section></>}
          {section === "elections" && <><div className="aasa-page-heading"><div><p className="aasa-kicker">ELECTIONS · NOMINATIONS</p><h2>{label(moduleSections.find(m => m.id === section)!)}</h2><p>Set election phases and manage nominations. Secret voting stays protected until voter verification is connected.</p></div><span className="aasa-pill active">Election setup</span></div><ElectionsModule userId={account.id} /></>}
          {section === "welfare" && <><div className="aasa-page-heading"><div><p className="aasa-kicker">WELFARE · RESTRICTED CASES</p><h2>{label(moduleSections.find(m => m.id === section)!)}</h2><p>Record and manage confidential welfare requests and cases.</p></div><span className="aasa-pill active">Connected</span></div><WelfareModule userId={account.id} /></>}
          {section === "documents" && <><div className="aasa-page-heading"><div><p className="aasa-kicker">DOCUMENTS · PRIVATE STORAGE</p><h2>{label(moduleSections.find(m => m.id === section)!)}</h2><p>Upload, securely open and archive official AASA documents.</p></div><span className="aasa-pill active">Connected</span></div><DocumentsModule userId={account.id} /></>}
          {section === "meetings" && <><div className="aasa-page-heading"><div><p className="aasa-kicker">MEETINGS · EVENTS</p><h2>{label(moduleSections.find(m => m.id === section)!)}</h2><p>Schedule, track and close official association meetings and events.</p></div><span className="aasa-pill active">Connected</span></div><MeetingsModule userId={account.id} /></>}
          {section === "finance" && <><div className="aasa-page-heading"><div><p className="aasa-kicker">FINANCE · SEPARATION OF DUTIES</p><h2>{label(moduleSections.find(m => m.id === section)!)}</h2><p>Record financial activity and require independent review.</p></div><span className="aasa-pill active">Connected</span></div><FinanceModule userId={account.id} /></>}
          {section === "governance" && <><div className="aasa-page-heading"><div><p className="aasa-kicker">GOVERNANCE · ACCOUNTABILITY</p><h2>{label(moduleSections.find(m => m.id === section)!)}</h2><p>Manage positions and committees without fabricated records.</p></div><span className="aasa-pill active">Connected</span></div><GovernanceModule userId={account.id} /></>}
          {section === "membership" && <><div className="aasa-page-heading"><div><p className="aasa-kicker">MEMBERSHIP · VERIFIED RECORDS</p><h2>{label(moduleSections.find(m => m.id === section)!)}</h2><p>Member register, review status and accountable record updates.</p></div><span className="aasa-pill active">Connected</span></div><MembershipModule userId={account.id} /></>}
          {section === "administration" && <><div className="aasa-page-heading"><div><p className="aasa-kicker">ACCESS CONTROL</p><h2>{copy.administration}</h2><p>Account controls are validated by database policies and trusted functions.</p></div></div><AdminAccountsPanel currentUserId={account.id} /></>}
          {section !== "overview" && section !== "administration" && <><div className="aasa-page-heading"><div><p className="aasa-kicker">AASA MODULE</p><h2>{label(moduleSections.find(m => m.id === section)!)}</h2><p>{copy.comingText}</p></div><span className="aasa-status-planned">{copy.planned}</span></div><section className="aasa-panel aasa-coming-panel"><span className="aasa-coming-icon">{moduleSections.find(m => m.id === section)?.icon}</span><h3>{copy.coming}</h3><p>{copy.comingText}</p><button className="aasa-secondary" type="button" onClick={() => setSection("overview")}>← {copy.overview}</button></section></>}
        </div>
      </div>}</> : null}
      {notice && <p className="aasa-notice" role="status">{notice}</p>}{error && <p className="aasa-error" role="alert">{error}</p>}<footer>العلم نور · AASA · Secure · Accountable · Multilingual</footer>
    </section>
  </main>;
}
