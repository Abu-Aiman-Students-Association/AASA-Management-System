import { useState } from "react";

type Language = "en" | "ha" | "ar";

const translations = {
  en: {
    kicker: "THE LIGHT OF KNOWLEDGE · SECURE ACCESS",
    title: "Welcome to AASA",
    intro: "A trusted digital gateway for the Abu-Aiman Students' Association.",
    choose: "Choose your secure workspace",
    superLabel: "PLATFORM SECURITY",
    superTitle: "Super Admin",
    superText: "Platform oversight, administrator accounts, roles, permissions and security controls.",
    superAction: "Enter Super Admin",
    associationLabel: "ASSOCIATION OPERATIONS",
    associationTitle: "Association Admin",
    associationText: "Membership, alumni, leadership, elections and association services.",
    associationAction: "Enter Association Admin",
    memberPrompt: "Are you an association member?",
    memberAction: "Member sign in",
    secure: "Protected administrator access",
    footer: "AASA · Secure · Accountable · Multilingual"
  },
  ha: {
    kicker: "ILIMIN ILIMI · AMINTACCEN SHIGA",
    title: "Barka da zuwa AASA",
    intro: "Ƙofar dijital mai aminci ta Ƙungiyar Tsofaffin Ɗaliban Abu-Aiman.",
    choose: "Zaɓi wurin gudanar da aikinka",
    superLabel: "TSARON DANDALI",
    superTitle: "Super Admin",
    superText: "Kulawa da dandali, asusun masu gudanarwa, matsayi, izini da tsaro.",
    superAction: "Shiga Super Admin",
    associationLabel: "AYUKAN ƘUNGIYA",
    associationTitle: "Association Admin",
    associationText: "Membobinta, tsofaffin ɗalibai, shugabanci, zaɓe da hidimomin ƙungiya.",
    associationAction: "Shiga Association Admin",
    memberPrompt: "Kana cikin membobin ƙungiyar?",
    memberAction: "Shiga a matsayin memba",
    secure: "An kare ƙofar shiga ta masu gudanarwa",
    footer: "AASA · Amintacce · Riƙon Amana · Harsuna Uku"
  },
  ar: {
    kicker: "نور العلم · دخول آمن",
    title: "مرحبًا بكم في AASA",
    intro: "بوابة رقمية موثوقة لجمعية طلاب أبو أيمن.",
    choose: "اختر مساحة العمل الآمنة",
    superLabel: "أمن المنصة",
    superTitle: "المشرف الأعلى",
    superText: "الإشراف على المنصة وحسابات المسؤولين والأدوار والصلاحيات وضوابط الأمان.",
    superAction: "دخول المشرف الأعلى",
    associationLabel: "عمليات الجمعية",
    associationTitle: "مسؤول الجمعية",
    associationText: "العضوية والخريجون والقيادة والانتخابات وخدمات الجمعية.",
    associationAction: "دخول مسؤول الجمعية",
    memberPrompt: "هل أنت عضو في الجمعية؟",
    memberAction: "دخول العضو",
    secure: "بوابة دخول المسؤولين محمية",
    footer: "AASA · آمن · مسؤول · متعدد اللغات"
  }
};

export default function AdminPortalSelection() {
  const [lang, setLang] = useState<Language>("ha");
  const copy = translations[lang];
  const rtl = lang === "ar";

  return <main className="aasa-admin aasa-portal-select aasa-login-home" dir={rtl ? "rtl" : "ltr"}>
    <header>
      <div className="aasa-brand">
        <img className="aasa-brand-logo" src={import.meta.env.BASE_URL + "aasa-logo.svg"} alt="AASA crest" />
        <div><b>AASA</b><small>ABU-AIMAN STUDENTS' ASSOCIATION</small></div>
      </div>
      <div className="aasa-actions"><nav aria-label="Choose language">
        {(["ha", "en", "ar"] as const).map(value => <button type="button" key={value} className={lang === value ? "on" : ""} onClick={() => setLang(value)}>{value === "ar" ? "عربي" : value.toUpperCase()}</button>)}
      </nav></div>
    </header>
    <section className="aasa-content aasa-login-home-content">
      <div className="aasa-login-welcome">
        <span className="aasa-login-orbit aasa-login-orbit-one" />
        <span className="aasa-login-orbit aasa-login-orbit-two" />
        <img src={import.meta.env.BASE_URL + "aasa-logo.svg"} alt="AASA official crest" />
        <p className="aasa-kicker">{copy.kicker}</p>
        <h1>{copy.title}</h1>
        <p className="aasa-intro">{copy.intro}</p>
        <div className="aasa-login-secure"><span>✓</span>{copy.secure}</div>
      </div>
      <div className="aasa-login-choice">
        <p className="aasa-login-section-label">{copy.choose}</p>
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
      </div>
      <footer>{copy.footer}</footer>
    </section>
  </main>;
}
