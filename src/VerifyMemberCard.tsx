import { useCallback, useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

type Member = { member_number: string; full_name: string; membership_type: string };
type Verification = { valid: boolean; card_number: string; issued_at: string; member: Member };
type Language = "en" | "ha" | "ar";

const messages = {
  en: {
    portal: "OFFICIAL VERIFICATION PORTAL", secure: "SECURE VALIDATION", eyebrow: "AASA DIGITAL CREDENTIALS",
    title: "Membership verification", intro: "A trusted way to confirm that an AASA membership credential is genuine and currently active.",
    live: "LIVE REGISTER", qr: "QR AUTHENTICATION", stateChecking: "SECURE RECORD CHECK", checkingTitle: "Authenticating this credential", checkingBody: "A secure request is being made to the official AASA membership register.",
    active: "AUTHENTIC · ACTIVE", successTitle: "Membership successfully verified", successBody: "The card reference below matches an active membership record held by Abu-Aiman Students’ Association.",
    identity: "VERIFIED MEMBER IDENTITY", record: "OFFICIAL REGISTER RECORD", name: "Full name", memberNo: "Membership number", category: "Membership category", cardNo: "Card reference", issued: "Date issued", source: "Verification authority", sourceValue: "AASA official live membership register",
    actions: "VERIFICATION ACTIONS", print: "Print verification record", retry: "Run verification again",
    checked: "Verification completed", privacy: "Privacy by design", privacyText: "This public verification page reveals only the information required to confirm the credential. Personal contact information, date of birth, residential address, photographs and emergency contacts remain private.",
    securityTitle: "Security controls", encrypted: "Encrypted connection", liveLookup: "Live register lookup", minimum: "Minimum public information", qrBound: "QR token-bound verification",
    noticeTitle: "Important information", notice: "This result confirms membership status in AASA records only. It is not a government-issued identity document and does not replace identification required by law.",
    noDisclosure: "No membership information is disclosed unless the official live register confirms an active card.",
    footer: "Abu-Aiman Students’ Association", help: "For assistance, contact AASA administration.", invalid: "NOT VERIFIED", invalidTitle: "Credential not confirmed", invalidBody: "This card could not be matched to an active membership record. It may be invalid, revoked or inactive. Contact AASA administration before accepting it.",
    unavailable: "VERIFICATION SERVICE UNAVAILABLE", unavailableTitle: "Unable to complete the live check", unavailableBody: "The verification service could not be reached. This does not mean the card is invalid. Please try again shortly.",
    badLink: "INVALID QR LINK", badLinkTitle: "This verification link is incomplete", badLinkBody: "Please scan the QR code printed on the original AASA membership card.",
    statusOnly: "Membership status only", publicPortal: "PUBLIC CREDENTIAL CHECK", verifiedAt: "Checked at"
  },
  ha: {
    portal: "SHAFIN TANTANCEWA NA HUKUMA", secure: "TANTANCEWA CIKIN TSARO", eyebrow: "TAKARDAR SHAIDAR AASA TA ZAMANI",
    title: "Tabbatar da zama memba", intro: "Hanya amintacciya don tabbatar da sahihanci da matsayin katin memba na AASA a halin yanzu.",
    live: "RAJISTAR KAI TSAYE", qr: "TANTANCEWAR QR", stateChecking: "BINCIKEN BAYANAI CIKIN TSARO", checkingTitle: "Ana tantance wannan kati", checkingBody: "Ana aika buƙata cikin tsaro zuwa rajistar membobin AASA ta hukuma.",
    active: "SAHIHI · ACTIVE", successTitle: "An tabbatar da zama memba", successBody: "Lambar katin da ke ƙasa ta dace da sahihin bayanin memba mai aiki a ƙungiyar Abu-Aiman.",
    identity: "BAYANAN MEMBA DA AKA TANTANCE", record: "BAYANAN RAJISTAR HUKUMA", name: "Cikakken suna", category: "Nau’in zama memba", cardNo: "Lambar kati", issued: "Ranar bayarwa", source: "Hukumar tantancewa", sourceValue: "Rajistar membobin AASA ta hukuma kai tsaye",
    actions: "MATAN TANTANCEWA", print: "Buga bayanan tantancewa", retry: "Sake tantancewa",
    checked: "An kammala tantancewa", privacy: "Kare sirri tun daga tushe", privacyText: "Wannan shafi yana nuna bayanan da ake buƙata kawai domin tabbatar da kati. Bayanan tuntuɓa, ranar haihuwa, adireshin gida, hoto da bayanan gaggawa suna nan a ɓoye.",
    encrypted: "Haɗin yanar gizo mai tsaro", liveLookup: "Duba rajista kai tsaye", minimum: "Ƙarancin bayanan jama'a", qrBound: "Tantancewa da lambar QR",
    noticeTitle: "Muhimmin bayani", notice: "Wannan sakamako yana tabbatar da matsayin memba a rajistar AASA ne kawai. Ba takardar shaidar gwamnati ba ce kuma ba ta maye gurbin takardar shaida da doka ta tanada.",
    noDisclosure: "Ba a bayyana bayanan memba sai rajistar AASA ta hukuma ta tabbatar da kati mai aiki.",
    footer: "Ƙungiyar Ɗaliban Abu-Aiman", help: "Don taimako, tuntuɓi shugabancin AASA.", invalid: "BA A TANTANCE BA", invalidTitle: "Ba a tabbatar da katin ba", invalidBody: "Ba a samu wannan kati a cikin sahihin bayanan memba mai aiki ba. Mai yiwuwa an soke shi ko ba ya aiki. Tuntuɓi shugabancin AASA kafin karɓarsa.",
    unavailable: "HIDIMAR TANTANCEWA BA TA SAMU BA", unavailableTitle: "An kasa kammala binciken kai tsaye", unavailableBody: "Ba a iya haɗuwa da tsarin tantancewa ba. Wannan ba yana nufin katin ba shi da inganci ba. Ka sake gwadawa nan gaba kaɗan.",
    badLink: "MAHADIN QR BA DAIDAI BA NE", badLinkTitle: "Mahadin tantancewa bai cika ba", badLinkBody: "Da fatan za a yi scan na QR ɗin da ke jikin ainihin katin memba na AASA.",
    statusOnly: "Matsayin memba kawai", publicPortal: "TANTANCE KATIN GA JAMA'A"
  },
  ar: {
    portal: "بوابة التحقق الرسمية", secure: "تحقق آمن", eyebrow: "الاعتمادات الرقمية لجمعية أبو أيمن",
    title: "التحقق من العضوية", intro: "طريقة موثوقة للتأكد من صحة بطاقة عضوية جمعية أبو أيمن وحالتها الحالية.",
    live: "السجل المباشر", qr: "مصادقة رمز QR", stateChecking: "فحص السجل الآمن", checkingTitle: "جارٍ التحقق من البطاقة", checkingBody: "يتم إرسال طلب آمن إلى سجل أعضاء الجمعية الرسمي.",
    active: "صحيحة · نشطة", successTitle: "تم التحقق من العضوية بنجاح", successBody: "يتطابق مرجع البطاقة أدناه مع سجل عضوية نشط لدى جمعية طلاب أبو أيمن.",
    identity: "هوية العضو التي تم التحقق منها", record: "سجل رسمي", name: "الاسم الكامل", category: "فئة العضوية", cardNo: "مرجع البطاقة", issued: "تاريخ الإصدار", source: "جهة التحقق", sourceValue: "سجل أعضاء الجمعية الرسمي المباشر",
    actions: "إجراءات التحقق", print: "طباعة سجل التحقق", retry: "إعادة التحقق",
    checked: "اكتمل التحقق", privacy: "الخصوصية منذ التصميم", privacyText: "تعرض هذه الصفحة الحد الأدنى من المعلومات اللازمة لتأكيد البطاقة فقط. وتظل بيانات الاتصال وتاريخ الميلاد وعنوان السكن والصور وجهات اتصال الطوارئ خاصة.",
    encrypted: "اتصال مشفر", liveLookup: "فحص مباشر للسجل", minimum: "الحد الأدنى من البيانات العامة", qrBound: "تحقق مرتبط برمز QR",
    noticeTitle: "معلومات مهمة", notice: "تؤكد هذه النتيجة حالة العضوية في سجلات الجمعية فقط. وليست وثيقة هوية حكومية ولا تحل محل وثائق التعريف المطلوبة قانوناً.",
    noDisclosure: "لا يتم عرض بيانات العضوية إلا بعد تأكيد البطاقة النشطة من السجل الرسمي المباشر.",
    footer: "جمعية طلاب أبو أيمن", help: "للمساعدة، يرجى التواصل مع إدارة الجمعية.", invalid: "لم يتم التحقق", invalidTitle: "تعذر تأكيد البطاقة", invalidBody: "لم يتم العثور على البطاقة ضمن سجلات العضوية النشطة. قد تكون غير صالحة أو ملغاة أو غير نشطة. يرجى التواصل مع الإدارة قبل قبولها.",
    unavailable: "خدمة التحقق غير متاحة", unavailableTitle: "تعذر إكمال الفحص المباشر", unavailableBody: "تعذر الاتصال بخدمة التحقق. لا يعني ذلك أن البطاقة غير صالحة. يرجى المحاولة بعد قليل.",
    badLink: "رابط QR غير صالح", badLinkTitle: "رابط التحقق غير مكتمل", badLinkBody: "يرجى مسح رمز QR الموجود على بطاقة عضوية AASA الأصلية.",
    statusOnly: "حالة العضوية فقط", publicPortal: "فحص البطاقة العام"
  }
};

function formatDate(value: string, language: Language) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const locale = language === "ar" ? "ar" : language === "ha" ? "en-NG" : "en-GB";
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

function categoryLabel(value: string, language: Language) {
  const normalized = (value || "").trim().toLowerCase().replace(/[_-]+/g, " ");
  if (language === "ha" && normalized === "honorary") return "Memba na girmamawa";
  if (language === "ar" && normalized === "honorary") return "عضوية فخرية";
  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase()) || "—";
}

export default function VerifyMemberCard({ token }: { token: string }) {
  const [record, setRecord] = useState<Verification | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorKind, setErrorKind] = useState<"invalid" | "unavailable" | "link" | "">("");
  const [language, setLanguage] = useState<Language>("en");
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [attempt, setAttempt] = useState(0);
  const t = messages[language];
  const rtl = language === "ar";

  const check = useCallback(async () => {
    setLoading(true);
    setErrorKind("");
    setRecord(null);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
      setErrorKind("link");
      setLoading(false);
      setCheckedAt(new Date());
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("aasa-public-card-verification", { body: { token } });
      if (error) setErrorKind("unavailable");
      else if (!data?.valid || !data?.member) setErrorKind("invalid");
      else setRecord(data as Verification);
    } catch {
      setErrorKind("unavailable");
    } finally {
      setLoading(false);
      setCheckedAt(new Date());
    }
  }, [token]);

  useEffect(() => { void check(); }, [check, attempt]);

  const errorLabel = errorKind === "link" ? t.badLink : errorKind === "invalid" ? t.invalid : t.unavailable;
  const errorTitle = errorKind === "link" ? t.badLinkTitle : errorKind === "invalid" ? t.invalidTitle : t.unavailableTitle;
  const errorBody = errorKind === "link" ? t.badLinkBody : errorKind === "invalid" ? t.invalidBody : t.unavailableBody;

  return <main className={"aasa-v2-portal " + (rtl ? "aasa-v2-rtl" : "")} dir={rtl ? "rtl" : "ltr"}>
    <div className="aasa-v2-topbar"><div className="aasa-v2-top-inner"><span><i className="aasa-v2-top-dot"/> {t.portal}</span><span>{t.secure} <b>•</b> {t.publicPortal}</span></div></div>
    <header className="aasa-v2-header">
      <a className="aasa-v2-brand" href="/" aria-label="AASA home"><img src={import.meta.env.BASE_URL + "aasa-logo.svg"} alt="Abu-Aiman Students’ Association crest"/><span className="aasa-v2-brand-copy"><strong>AASA</strong><b>ABU-AIMAN STUDENTS’ ASSOCIATION</b><small>{t.eyebrow}</small></span></a>
      <nav className="aasa-v2-languages" aria-label="Select language">
        <button type="button" aria-pressed={language === "en"} className={language === "en" ? "selected" : ""} onClick={() => setLanguage("en")}>EN</button>
        <button type="button" aria-pressed={language === "ha"} className={language === "ha" ? "selected" : ""} onClick={() => setLanguage("ha")}>HA</button>
        <button type="button" aria-pressed={language === "ar"} className={language === "ar" ? "selected" : ""} onClick={() => setLanguage("ar")}>عربي</button>
      </nav>
    </header>
    <section className="aasa-v2-hero"><div className="aasa-v2-hero-pattern"/><div className="aasa-v2-hero-content"><span className="aasa-v2-kicker"><i/> {t.eyebrow}</span><h1>{t.title}</h1><p>{t.intro}</p><div className="aasa-v2-trust-pills"><span><i/> {t.live}</span><span>◇ {t.qr}</span><span>✓ {t.statusOnly}</span></div></div><div className="aasa-v2-hero-watermark">AASA</div></section>

    <div className="aasa-v2-content" aria-live="polite">
      <section className="aasa-v2-primary-card">
        {loading ? <div className="aasa-v2-loading-state"><div className="aasa-v2-loader"><span/></div><small className="aasa-v2-overline">{t.stateChecking}</small><h2>{t.checkingTitle}</h2><p>{t.checkingBody}</p><div className="aasa-v2-loading-track"><span/></div></div> : record ? <>
          <div className="aasa-v2-status-banner"><div className="aasa-v2-status-symbol">✓</div><div className="aasa-v2-status-copy"><span>{t.active}</span><h2>{t.successTitle}</h2><p>{t.successBody}</p></div><div className="aasa-v2-auth-seal"><img src={import.meta.env.BASE_URL + "aasa-logo.svg"} alt=""/><b>AUTHENTIC</b></div></div>
          <div className="aasa-v2-section-heading"><div><small>01 / {t.record}</small><h3>{t.identity}</h3></div><span className="aasa-v2-official-tag">✓ OFFICIAL</span></div>
          <div className="aasa-v2-member-panel"><div className="aasa-v2-member-monogram" aria-hidden="true">{record.member.full_name?.trim()?.charAt(0)?.toUpperCase() || "A"}</div><div className="aasa-v2-member-details"><small>{t.name}</small><h2>{record.member.full_name}</h2><span>{record.member.member_number}</span></div><div className="aasa-v2-member-state"><i/> ACTIVE</div></div>
          <div className="aasa-v2-data-grid">
            <div className="aasa-v2-data-item"><small>{t.category}</small><strong>{categoryLabel(record.member.membership_type, language)}</strong></div>
            <div className="aasa-v2-data-item"><small>{t.cardNo}</small><strong className="aasa-v2-mono">{record.card_number || "—"}</strong></div>
            <div className="aasa-v2-data-item"><small>{t.issued}</small><strong>{formatDate(record.issued_at, language)}</strong></div>
            <div className="aasa-v2-data-item aasa-v2-data-wide"><small>{t.source}</small><strong>{t.sourceValue}</strong></div>
          </div>
          <div className="aasa-v2-actions"><div><small>{t.actions}</small><span>{t.checked}: {checkedAt ? checkedAt.toLocaleString(language === "ar" ? "ar" : language === "ha" ? "en-NG" : "en-GB") : "—"}</span></div><div className="aasa-v2-action-buttons"><button type="button" className="aasa-v2-print" onClick={() => window.print()}>▤ {t.print}</button><button type="button" className="aasa-v2-retry" onClick={() => setAttempt((value) => value + 1)}>↻ {t.retry}</button></div></div>
        </> : <div className="aasa-v2-error-state"><div className={"aasa-v2-error-icon " + (errorKind === "invalid" || errorKind === "link" ? "warning" : "")}>{errorKind === "unavailable" ? "!" : "×"}</div><small className="aasa-v2-overline">{errorLabel}</small><h2>{errorTitle}</h2><p>{errorBody}</p><button type="button" className="aasa-v2-print" onClick={() => setAttempt((value) => value + 1)}>↻ {t.retry}</button></div>}
      </section>

      <aside className="aasa-v2-sidebar">
        <section className="aasa-v2-side-card aasa-v2-privacy-card"><div className="aasa-v2-side-icon">⌑</div><small>02 / AASA TRUST FRAMEWORK</small><h3>{t.privacy}</h3><p>{t.privacyText}</p><div className="aasa-v2-security-list"><b><i>✓</i>{t.encrypted}</b><b><i>✓</i>{t.liveLookup}</b><b><i>✓</i>{t.minimum}</b><b><i>✓</i>{t.qrBound}</b></div></section>
        <section className="aasa-v2-side-card aasa-v2-notice-card"><small>03 / NOTICE</small><h3>{t.noticeTitle}</h3><p>{t.notice}</p></section>
        <div className="aasa-v2-assurance"><span>◈</span><p>{t.noDisclosure}</p></div>
      </aside>
    </div>
    <footer className="aasa-v2-footer"><div className="aasa-v2-footer-brand"><img src={import.meta.env.BASE_URL + "aasa-logo.svg"} alt=""/><div><b>{t.footer}</b><span>العلم نور · KNOWLEDGE IS LIGHT</span></div></div><p>{t.help}</p><small>© {new Date().getFullYear()} AASA · {t.portal}</small></footer>
  </main>;
}
