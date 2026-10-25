import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  appwriteConfigReady,
  checkAppwriteConnection,
  getCurrentAccount,
  getCurrentPermissionKeys,
  requestPasswordRecovery,
  signInWithEmail,
  signOut,
} from "./lib/appwrite";
import MembersPanel from "./MembersPanel";

type ConnectionState = "idle" | "checking" | "connected" | "error";
type View = "login" | "recovery";
type Language = "en" | "ha" | "ar";
type AccessState = "checking" | "ready" | "denied";

const modulePermission: Record<string, string> = {
  members: "members.read", leadership: "roles.read", committees: "meetings.manage", meetings: "meetings.manage",
  attendance: "attendance.record", elections: "elections.manage", finance: "finance.read", welfare: "welfare.restricted_read",
  complaints: "complaints.review", projects: "documents.manage", documents: "documents.manage", notifications: "notifications.send",
  security: "roles.read", settings: "settings.manage",
};

const modules = [
  { id: "overview", icon: "◫", en: "Overview", ha: "Taƙaitaccen bayani", ar: "نظرة عامة", description: "Association-wide status and recent activity." },
  { id: "members", icon: "♙", en: "Members & Profiles", ha: "Mambobi da bayanansu", ar: "الأعضاء والملفات", description: "Member records, profiles, status and ID cards." },
  { id: "leadership", icon: "♜", en: "Leadership", ha: "Shugabanci", ar: "القيادة", description: "Executive officers, appointments and tenure." },
  { id: "committees", icon: "☷", en: "Committees", ha: "Kwamitoci", ar: "اللجان", description: "Committee membership, responsibilities and reports." },
  { id: "meetings", icon: "▦", en: "Meetings", ha: "Taro", ar: "الاجتماعات", description: "Agendas, minutes, decisions and follow-ups." },
  { id: "attendance", icon: "✓", en: "Attendance", ha: "Halartar taro", ar: "الحضور", description: "Meeting attendance and participation history." },
  { id: "elections", icon: "⚖", en: "Elections", ha: "Zaɓe", ar: "الانتخابات", description: "Election setup, eligibility and voting workflows." },
  { id: "finance", icon: "₦", en: "Finance", ha: "Kuɗaɗe", ar: "المالية", description: "Dues, receipts, approvals and financial reports." },
  { id: "welfare", icon: "♡", en: "Welfare", ha: "Jindadin mambobi", ar: "رعاية الأعضاء", description: "Restricted welfare cases and assistance decisions." },
  { id: "complaints", icon: "⚑", en: "Complaints", ha: "Korafe-korafe", ar: "الشكاوى", description: "Confidential reports, review and resolution." },
  { id: "projects", icon: "⌁", en: "Projects & Tasks", ha: "Ayyuka da tsare-tsare", ar: "المشاريع والمهام", description: "Projects, task ownership, milestones and progress." },
  { id: "documents", icon: "▤", en: "Documents", ha: "Takardu", ar: "المستندات", description: "Governance documents and controlled files." },
  { id: "notifications", icon: "♧", en: "Notifications", ha: "Sanarwa", ar: "الإشعارات", description: "Official announcements and delivery status." },
  { id: "security", icon: "⌑", en: "Roles & Audit", ha: "Izini da binciken aiki", ar: "الأدوار وسجل التدقيق", description: "Role-based access, security events and audit trail." },
  { id: "settings", icon: "⚙", en: "System Settings", ha: "Saitunan tsarin", ar: "إعدادات النظام", description: "Association profile, language and system preferences." },
] as const;

const copy = {
  en: {
    subtitle: "ASSOCIATION ADMINISTRATION", welcome: "A stronger foundation for AASA.",
    intro: "A modern workspace for membership, governance, finance and association services—with accountable access and verified records.",
    workspace: "Workspace", modules: "Workspace modules", modulesSub: "A complete roadmap, built module by module. Unreleased areas are clearly marked.",
    planned: "In development", secure: "Security first", secureSub: "Role-based access is being configured", records: "Real records only", recordsSub: "No sample figures presented as real", backend: "Backend connection", check: "Test connection",
    signedOut: "Sign in", signInHint: "Use an account created by an authorized AASA administrator.", email: "Email address", password: "Password", forgot: "Forgot password?", sendRecovery: "Send recovery link", back: "Back to sign in", signingIn: "Signing in…", signOut: "Sign out",
    connected: "Endpoint reachable", notTested: "Not tested", checking: "Checking…", failed: "Connection issue", foundation: "Foundation stage", noAccess: "Your identity is signed in, but module access is not enabled until roles and database permissions are verified.",
    selectModule: "Module selected", coming: "This module is not live yet. Its data and permissions will be connected before it is released.",
    footer: "ABU-AIMAN STUDENTS' ASSOCIATION · SECURE · ACCOUNTABLE · MULTILINGUAL",
  },
  ha: {
    subtitle: "GUDANAR DA ƘUNGIYA", welcome: "Ingantaccen tushe ga AASA.",
    intro: "Tsarin zamani na kula da mambobi, shugabanci, kuɗaɗe da ayyukan ƙungiya—tare da ingantaccen izini da bayanan da aka tabbatar.",
    workspace: "Wurin aiki", modules: "Sassan tsarin", modulesSub: "Tsarin duka za a gina shi a matakai. Za a bayyana sassan da ba su kammala ba.",
    planned: "Ana ginawa", secure: "Tsaro da farko", secureSub: "Ana tsara izini bisa matsayi", records: "Bayanan gaskiya kawai", recordsSub: "Ba za a nuna ƙididdigar ƙarya ba", backend: "Haɗin backend", check: "Gwada haɗi",
    signedOut: "Shiga", signInHint: "Yi amfani da asusun da mai izini na AASA ya ƙirƙira.", email: "Adireshin imel", password: "Kalmar sirri", forgot: "Ka manta kalmar sirri?", sendRecovery: "Aika hanyar dawo da kalmar sirri", back: "Koma shiga", signingIn: "Ana shiga…", signOut: "Fita",
    connected: "An iya isa backend", notTested: "Ba a gwada ba", checking: "Ana dubawa…", failed: "Matsalar haɗi", foundation: "Matakin tushe", noAccess: "An tabbatar da shiga asusunka, amma ba a buɗe damar sassan tsarin ba sai an tabbatar da matsayi da izinin database.",
    selectModule: "An zaɓi sashe", coming: "Wannan sashe bai fara aiki ba tukuna. Za a haɗa bayanansa da izini kafin a fitar da shi.",
    footer: "ƘUNGIYAR ƊALIBAN ABU-AIMAN · TSARO · RIƘON AMANA · HARSUNA DA YAWA",
  },
  ar: {
    subtitle: "إدارة الجمعية", welcome: "أساس أقوى لجمعية AASA.",
    intro: "مساحة عمل حديثة لإدارة العضوية والحوكمة والمالية وخدمات الجمعية، مع صلاحيات مسؤولة وسجلات موثوقة.",
    workspace: "مساحة العمل", modules: "وحدات النظام", modulesSub: "سيتم بناء النظام الكامل على مراحل، مع توضيح الوحدات التي لم تُطلق بعد.",
    planned: "قيد التطوير", secure: "الأمان أولاً", secureSub: "يجري إعداد الصلاحيات حسب الدور", records: "سجلات حقيقية فقط", recordsSub: "لن تُعرض أرقام تجريبية على أنها حقيقية", backend: "اتصال الخادم", check: "اختبار الاتصال",
    signedOut: "تسجيل الدخول", signInHint: "استخدم حساباً أنشأه مسؤول مخوّل في الجمعية.", email: "البريد الإلكتروني", password: "كلمة المرور", forgot: "نسيت كلمة المرور؟", sendRecovery: "إرسال رابط الاستعادة", back: "العودة لتسجيل الدخول", signingIn: "جارٍ تسجيل الدخول…", signOut: "تسجيل الخروج",
    connected: "الخادم متاح", notTested: "لم يُختبر", checking: "جارٍ الفحص…", failed: "مشكلة في الاتصال", foundation: "مرحلة التأسيس", noAccess: "تم تسجيل الدخول، لكن لن تُتاح الوحدات حتى يتم التحقق من الأدوار وصلاحيات قاعدة البيانات.",
    selectModule: "الوحدة المحددة", coming: "هذه الوحدة غير متاحة بعد. سيتم ربط البيانات والصلاحيات قبل إطلاقها.",
    footer: "جمعية طلاب أبو أيمن · آمن · مسؤول · متعدد اللغات",
  },
} as const;

export default function App() {
  const [connection, setConnection] = useState<ConnectionState>("idle");
  const [message, setMessage] = useState("Connection has not been tested yet.");
  const [user, setUser] = useState<{ $id: string; name: string; email: string } | null>(null);
  const [permissionKeys, setPermissionKeys] = useState<string[]>([]);
  const [accessState, setAccessState] = useState<AccessState>("checking");
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState(false);
  const [language, setLanguage] = useState<Language>("en");
  const [selectedModule, setSelectedModule] = useState("overview");
  const t = copy[language];
  const visibleModules = useMemo(() => modules.filter((item) => item.id === "overview" || permissionKeys.includes(modulePermission[item.id] ?? "__no_permission__")), [permissionKeys]);
  const activeModule = useMemo(() => visibleModules.find((item) => item.id === selectedModule) ?? modules[0], [selectedModule, visibleModules]);
  const isArabic = language === "ar";

  useEffect(() => {
    let active = true;
    if (appwriteConfigReady) {
      getCurrentAccount().then(async (current) => {
        if (!active) return;
        setUser({ $id: current.$id, name: current.name, email: current.email });
        try {
          const keys = await getCurrentPermissionKeys();
          if (active) { setPermissionKeys(keys); setAccessState(keys.length ? "ready" : "denied"); }
        } catch {
          if (active) { setPermissionKeys([]); setAccessState("denied"); }
        }
      }).catch(() => { if (active) setAccessState("denied"); });
    }
    return () => { active = false; };
  }, []);

  async function testConnection() {
    setConnection("checking");
    setMessage(t.checking);
    try {
      await checkAppwriteConnection();
      setConnection("connected");
      setMessage(t.connected);
    } catch (error) {
      setConnection("error");
      setMessage(error instanceof Error ? error.message : "Connection check failed.");
    }
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setAuthError(false); setAuthMessage("");
    try {
      const current = await signInWithEmail(email, password);
      setUser({ $id: current.$id, name: current.name, email: current.email });
      setPassword("");
      try {
        const keys = await getCurrentPermissionKeys();
        setPermissionKeys(keys); setAccessState(keys.length ? "ready" : "denied");
        setSelectedModule("overview");
        setAuthMessage(keys.length ? "Access permissions loaded. Only authorized modules are shown." : "Your account is signed in, but no active AASA role permissions were found. Ask an authorized administrator to assign your role.");
      } catch {
        setPermissionKeys([]); setAccessState("denied"); setSelectedModule("overview");
        setAuthError(true); setAuthMessage("Signed in, but role permissions could not be verified. Access is blocked until the role tables are available to your account.");
      }
    } catch (error) {
      setAuthError(true);
      setAuthMessage(error instanceof Error ? error.message : "Sign-in failed. Check your details and try again.");
    } finally { setBusy(false); }
  }

  async function handleRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setAuthError(false); setAuthMessage("");
    try {
      await requestPasswordRecovery(email);
      setAuthMessage("If the account exists and email delivery is configured, a recovery link will be sent.");
    } catch (error) {
      setAuthError(true);
      setAuthMessage(error instanceof Error ? error.message : "Could not request password recovery.");
    } finally { setBusy(false); }
  }

  async function handleSignOut() {
    setBusy(true);
    try { await signOut(); setUser(null); setPermissionKeys([]); setAccessState("denied"); setSelectedModule("overview"); setAuthMessage("You have signed out."); setAuthError(false); }
    catch (error) { setAuthMessage(error instanceof Error ? error.message : "Sign-out failed."); setAuthError(true); }
    finally { setBusy(false); }
  }

  return (
    <main className={`app-shell ${isArabic ? "rtl" : ""}`} dir={isArabic ? "rtl" : "ltr"}>
      <aside className="sidebar">
        <a className="brand" href="#home" aria-label="AASA home">
          <span className="brand-symbol">A</span>
          <span className="brand-copy"><strong>AASA</strong><small>Management System</small></span>
        </a>
        <div className="side-label">{t.workspace}</div>
        <nav className="side-nav" aria-label="Main navigation">
          {visibleModules.map((item) => (
            <button key={item.id} type="button" className={`nav-item ${selectedModule === item.id ? "active" : ""}`} onClick={() => setSelectedModule(item.id)}>
              <span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item[language]}</span>
              {item.id !== "overview" && <span className="nav-dot" aria-label={t.planned} />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="security-mini"><span className="security-icon">◇</span><div><strong>{t.secure}</strong><small>{t.secureSub}</small></div></div>
          <div className="sidebar-foot">AASA · {new Date().getFullYear()}</div>
        </div>
      </aside>

      <section className="main-area" id="home">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-symbol">A</span><strong>AASA</strong></div>
          <div className="breadcrumb"><span>{t.workspace}</span><span className="crumb-slash">/</span><strong>{activeModule[language]}</strong></div>
          <div className="top-actions">
            <div className="language-switch" aria-label="Choose language">
              {(["en", "ha", "ar"] as const).map((lang) => <button key={lang} type="button" className={language === lang ? "selected" : ""} onClick={() => setLanguage(lang)}>{lang === "en" ? "EN" : lang === "ha" ? "HA" : "عربي"}</button>)}
            </div>
            <span className={`connection-dot ${connection}`} title={message} />
            {user ? <button type="button" className="profile-chip" onClick={handleSignOut} disabled={busy}><span className="avatar">{(user.name || user.email).slice(0, 1).toUpperCase()}</span><span className="profile-text"><strong>{user.name || "AASA account"}</strong><small>{t.signOut}</small></span></button> : <button type="button" className="top-signin" onClick={() => document.getElementById("sign-in-panel")?.scrollIntoView({ behavior: "smooth", block: "center" })}>{t.signedOut}</button>}
          </div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div><p className="eyebrow">{t.subtitle}</p><h1>{selectedModule === "overview" ? t.welcome : activeModule[language]}</h1><p className="page-subtitle">{selectedModule === "overview" ? t.intro : activeModule.description}</p></div>
            <span className="stage-badge"><span className="badge-dot" />{t.foundation}</span>
          </div>

          <section className="hero-panel">
            <div className="hero-content"><span className="hero-kicker">ABU-AIMAN STUDENTS' ASSOCIATION</span><h2>{t.welcome}</h2><p>{t.intro}</p><button type="button" className="hero-button" onClick={() => document.getElementById("modules")?.scrollIntoView({ behavior: "smooth" })}>{t.modules}<span aria-hidden="true">↗</span></button></div>
            <div className="hero-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="art-core"><span>A</span><small>AASA</small></div><span className="art-star star-one">✦</span><span className="art-star star-two">✧</span></div>
          </section>

          <section className="summary-grid" aria-label="System status">
            <article className="summary-card"><span className="summary-icon green">◇</span><div><small>{t.secure}</small><strong>{t.planned}</strong><p>{t.secureSub}</p></div></article>
            <article className="summary-card"><span className="summary-icon gold">▤</span><div><small>{t.records}</small><strong>{t.planned}</strong><p>{t.recordsSub}</p></div></article>
            <article className="summary-card"><span className="summary-icon blue">⌁</span><div><small>{t.backend}</small><strong>{connection === "connected" ? t.connected : connection === "checking" ? t.checking : connection === "error" ? t.failed : t.notTested}</strong><p>{message}</p></div></article>
          </section>

          {selectedModule === "members" && user && permissionKeys.includes("members.read") && <MembersPanel />}
          {user && accessState === "denied" && <div className="auth-notice" role="status">Your identity is signed in, but no active AASA role permissions are verified. Management modules are hidden until an authorized administrator assigns access. Database permissions remain the security boundary.</div>}
          {user && accessState === "checking" && <div className="auth-notice" role="status">Checking your AASA role permissions…</div>}

          <div className="section-heading" id="modules"><div><h2>{t.modules}</h2><p>{t.modulesSub}</p></div><span className="module-count">15 {language === "ar" ? "وحدة" : language === "ha" ? "sassa" : "modules"}</span></div>
          <section className="module-grid" aria-label={t.modules}>
            {visibleModules.filter((item) => item.id !== "overview").map((item) => (
              <button type="button" key={item.id} className={`module-card ${selectedModule === item.id ? "chosen" : ""}`} onClick={() => { setSelectedModule(item.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                <span className="module-card-top"><span className="module-icon">{item.icon}</span><span className="module-arrow">↗</span></span>
                <span className="module-title">{item[language]}</span><span className="module-description">{item.description}</span>
                <span className="module-card-bottom"><span className="planned-dot" />{t.planned}</span>
              </button>
            ))}
          </section>

          <section className="lower-grid">
            <article className="connection-panel"><div className="panel-title"><div><p className="eyebrow">APPWRITE</p><h3>{t.backend}</h3></div><span className={`status-pill ${connection}`}>{connection === "connected" ? t.connected : connection === "checking" ? t.checking : connection === "error" ? t.failed : t.notTested}</span></div><p className="panel-copy">{message}. This verifies endpoint connectivity only; database permissions and role enforcement require separate verification.</p><button type="button" className="outline-button" onClick={testConnection} disabled={connection === "checking" || !appwriteConfigReady}>{connection === "checking" ? t.checking : t.check}</button>{!appwriteConfigReady && <p className="error-note">Appwrite settings are missing. Configure the public endpoint and project ID.</p>}</article>

            <article className="auth-panel" id="sign-in-panel"><div className="panel-title"><div><p className="eyebrow">ACCOUNT SECURITY</p><h3>{user ? (user.name || user.email) : view === "recovery" ? "Password recovery" : t.signedOut}</h3></div><span className={`status-pill ${user ? "connected" : "idle"}`}>{user ? "Verified identity" : "Secure access"}</span></div>
              {user ? <><p className="panel-copy">{user.email}</p><p className="auth-notice">{t.noAccess}</p><button type="button" className="outline-button" onClick={handleSignOut} disabled={busy}>{busy ? "Please wait…" : t.signOut}</button></> : view === "recovery" ? <form className="auth-form" onSubmit={handleRecovery}><p className="panel-copy">Enter the email address linked to your account.</p><label htmlFor="recovery-email">{t.email}</label><input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /><button type="submit" disabled={busy || !appwriteConfigReady}>{busy ? "Sending…" : t.sendRecovery}</button><button type="button" className="link-button" onClick={() => { setView("login"); setAuthMessage(""); }}>{t.back}</button></form> : <form className="auth-form" onSubmit={handleSignIn}><p className="panel-copy">{t.signInHint}</p><label htmlFor="login-email">{t.email}</label><input id="login-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /><label htmlFor="login-password">{t.password}</label><input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /><button type="submit" disabled={busy || !appwriteConfigReady}>{busy ? t.signingIn : t.signedOut}</button><button type="button" className="link-button" onClick={() => { setView("recovery"); setAuthMessage(""); }}>{t.forgot}</button></form>}
              {authMessage && <p className={`auth-feedback ${authError ? "error-note" : ""}`} role="status">{authMessage}</p>}
            </article>
          </section>
          <footer className="page-footer"><span>{t.footer}</span><span>React · TypeScript · Appwrite</span></footer>
        </div>
      </section>
    </main>
  );
}
