import { useState } from "react";

type Language = "en" | "ha" | "ar";

const translations = {
  en: {
    kicker: "العلم نور · SECURE ADMINISTRATION",
    title: "Choose your AASA administrator portal",
    intro: "Select the secure sign-in area assigned to your role.",
    superLabel: "PLATFORM-LEVEL ACCESS",
    superTitle: "Super Admin",
    superText: "Platform oversight, administrator accounts, roles, permissions and security controls.",
    superAction: "Continue to Super Admin",
    associationLabel: "ASSOCIATION OPERATIONS",
    associationTitle: "Association Admin",
    associationText: "Manage authorised AASA operations, membership, alumni, governance and association services.",
    associationAction: "Continue to Association Admin",
    memberPrompt: "Already a registered member?", memberAction: "Member sign in",
    footer: "AASA · Secure · Accountable · Multilingual"
  },
  ha: {
    kicker: "العلم نور · TSARON GUDANARWA",
    title: "Zaɓi ƙofar shiga ta mai gudanarwa ta AASA",
    intro: "Zaɓi shafin shiga da ya dace da matsayin izinin asusunka.",
    superLabel: "IZININ DANDALI",
    superTitle: "Super Admin",
    superText: "Kulawa da dandali, asusun masu gudanarwa, matsayi, izini da tsaro.",
    superAction: "Ci gaba zuwa Super Admin",
    associationLabel: "AYUKAN ƘUNGIYA",
    associationTitle: "Association Admin",
    associationText: "Gudanar da ayyukan AASA da aka ba da izini, membobinta, tsofaffin mambobi da hidimomin ƙungiya.",
    associationAction: "Ci gaba zuwa Association Admin",
    memberPrompt: "Kana da membobinta ta AASA?", memberAction: "Shiga a matsayin memba",
    footer: "AASA · Amintacce · Riƙon Amana · Harsuna Uku"
  },
  ar: {
    kicker: "العلم نور · الإدارة الآمنة",
    title: "اختر بوابة مسؤول AASA",
    intro: "اختر صفحة تسجيل الدخول المطابقة للصلاحيات الممنوحة لحسابك.",
    superLabel: "صلاحيات على مستوى المنصة",
    superTitle: "المشرف الأعلى",
    superText: "الإشراف على المنصة وحسابات المسؤولين والأدوار والصلاحيات وضوابط الأمان.",
    superAction: "المتابعة إلى المشرف الأعلى",
    associationLabel: "عمليات الجمعية",
    associationTitle: "مسؤول الجمعية",
    associationText: "إدارة عمليات AASA المصرح بها والعضوية والخريجين والحوكمة وخدمات الجمعية.",
    associationAction: "المتابعة إلى مسؤول الجمعية",
    memberPrompt: "هل أنت عضو مسجل؟", memberAction: "دخول العضو",
    footer: "AASA · آمن · مسؤول · متعدد اللغات"
  }
};

export default function AdminPortalSelection() {
  const [lang, setLang] = useState<Language>("en");
  const copy = translations[lang];
  const rtl = lang === "ar";

  return <main className="aasa-admin aasa-portal-select" dir={rtl ? "rtl" : "ltr"}>
    <header>
      <div className="aasa-brand">
        <img className="aasa-brand-logo" src={import.meta.env.BASE_URL + "aasa-logo.svg"} alt="AASA crest" />
        <div><b>AASA</b><small>ABU-AIMAN STUDENTS' ASSOCIATION</small></div>
      </div>
      <div className="aasa-actions"><nav aria-label="Choose language">
        {(["en", "ha", "ar"] as const).map(value => <button type="button" key={value} className={lang === value ? "on" : ""} onClick={() => setLang(value)}>{value === "ar" ? "عربي" : value.toUpperCase()}</button>)}
      </nav></div>
    </header>
    <section className="aasa-content">
      <p className="aasa-kicker">{copy.kicker}</p>
      <h1>{copy.title}</h1>
      <p className="aasa-intro">{copy.intro}</p>
      <div className="aasa-portal-grid">
        <a className="aasa-portal-card aasa-portal-super" href="?portal=super-admin">
          <span className="aasa-portal-icon" aria-hidden="true">♙</span>
          <small>{copy.superLabel}</small>
          <h2>{copy.superTitle}</h2>
          <p>{copy.superText}</p>
          <strong>{copy.superAction} <span aria-hidden="true">→</span></strong>
        </a>
        <a className="aasa-portal-card aasa-portal-association" href="?portal=association-admin">
          <span className="aasa-portal-icon" aria-hidden="true">♜</span>
          <small>{copy.associationLabel}</small>
          <h2>{copy.associationTitle}</h2>
          <p>{copy.associationText}</p>
          <strong>{copy.associationAction} <span aria-hidden="true">→</span></strong>
        </a>
      </div>
      <p className="aasa-portal-member">{copy.memberPrompt} <a href="?portal=member">{copy.memberAction}</a></p>
      <footer>{copy.footer}</footer>
    </section>
  </main>;
}
