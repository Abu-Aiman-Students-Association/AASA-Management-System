import { useCallback, useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

type Member = { member_number: string; full_name: string; membership_type: string };
type Verification = { valid: boolean; card_number: string; issued_at: string; member: Member };
type Language = "en" | "ha" | "ar";

const copy = {
  en: {
    eyebrow: "OFFICIAL DIGITAL CREDENTIALS",
    title: "Membership verification",
    intro: "Confirm the authenticity and current standing of an AASA membership card.",
    checking: "SECURE REGISTER CHECK",
    checkingTitle: "Verifying membership credentials",
    checkingBody: "Connecting securely to the official AASA membership register. Please keep this page open.",
    valid: "VERIFIED · ACTIVE",
    validTitle: "Authentic membership confirmed",
    validBody: "This card matches an active record in the official AASA membership register.",
    identity: "MEMBER IDENTITY",
    member: "Member name",
    number: "Member number",
    type: "Membership category",
    card: "Card reference",
    issued: "Date issued",
    source: "Verification source",
    sourceValue: "Official AASA live membership register",
    refresh: "Verify again",
    print: "Print verification",
    invalid: "NOT VERIFIED",
    invalidTitle: "This card could not be validated",
    invalidBody: "The card may be invalid, expired, revoked, or no longer active. Contact AASA administration before accepting it.",
    unavailable: "SERVICE TEMPORARILY UNAVAILABLE",
    unavailableTitle: "We could not reach the verification service",
    unavailableBody: "Your card has not been declared invalid. Please try again shortly or contact AASA administration.",
    invalidLink: "INVALID VERIFICATION LINK",
    invalidLinkBody: "This QR link is incomplete or malformed. Scan the QR code on the original AASA membership card.",
    privacy: "Privacy and security",
    privacyBody: "This public portal displays only the minimum information needed to confirm membership. Private contact details, date of birth, home address and emergency contacts are never displayed here.",
    disclaimer: "This check confirms AASA membership status only. It is not a government-issued identity document and does not replace other legally required identification.",
    footer: "Abu-Aiman Students’ Association",
    slogan: "العلم نور",
    official: "OFFICIAL VERIFICATION PORTAL",
    help: "Need assistance? Contact AASA administration.",
    checked: "Checked at",
    noData: "No membership details are released unless the live register confirms an active card."
  },
  ha: {
    eyebrow: "TAKARDAR SHAIDAR ZAMANI TA HUKUMA",
    title: "Tabbatar da katin zama memba",
    intro: "Tabbatar da sahihanci da matsayin katin zama memba na AASA.",
    checking: "BINCIKEN RAJISTAR TSARO",
    checkingTitle: "Ana tantance bayanan memba",
    checkingBody: "Ana haɗawa da rajistar membobin AASA ta hukuma cikin tsaro. Ka jira kaɗan.",
    valid: "AN TABBATAR · ACTIVE",
    validTitle: "An tabbatar da sahihancin memba",
    validBody: "Wannan kati ya dace da bayanan memba mai ACTIVE a rajistar AASA ta hukuma.",
    identity: "BAYANAN MEMBA",
    member: "Cikakken suna",
    number: "Lambar memba",
    type: "Nau’in zama memba",
    card: "Lambar katin",
    issued: "Ranar bayarwa",
    source: "Tushen tantancewa",
    sourceValue: "Rajistar membobin AASA kai tsaye",
    refresh: "Sake tantancewa",
    print: "Buga shaidar tantancewa",
    invalid: "BA A TABBATAR BA",
    invalidTitle: "Ba a iya tabbatar da wannan kati ba",
    invalidBody: "Katin na iya zama mara inganci, wanda aka soke, ko wanda ba ya aiki. Tuntuɓi shugabancin AASA kafin karɓarsa.",
    unavailable: "HIDIMAR TANTANCEWA BA TA SAMU BA",
    unavailableTitle: "Ba a iya haɗuwa da tsarin tantancewa ba",
    unavailableBody: "Ba a ce katinka ba ya aiki ba. Ka sake gwadawa nan gaba kaɗan ko ka tuntuɓi shugabancin AASA.",
    invalidLink: "MAHADIN TANTANCEWA BA DAIDAI BA NE",
    invalidLinkBody: "Mahadin QR bai cika ko bai daidai ba. Ka sake scan QR ɗin da ke jikin katin AASA na asali.",
    privacy: "Sirri da tsaro",
    privacyBody: "Wannan shafi yana nuna ƙananan bayanan da ake buƙata kawai domin tabbatar da memba. Ba ya nuna bayanan tuntuɓa, ranar haihuwa, adireshin gida ko bayanan gaggawa.",
    disclaimer: "Wannan bincike yana tabbatar da matsayin memba na AASA ne kawai. Ba takardar shaidar gwamnati ba ce kuma ba ta maye gurbin wata takardar shaida ta doka.",
    footer: "Ƙungiyar Ɗaliban Abu-Aiman",
    slogan: "العلم نور",
    official: "SHAFIN TANTANCEWA NA HUKUMA",
    help: "Kana buƙatar taimako? Tuntuɓi shugabancin AASA.",
    checked: "Lokacin dubawa",
    noData: "Ba za a nuna bayanan memba ba sai rajistar kai tsaye ta tabbatar da katin ACTIVE."
  },
  ar: {
    eyebrow: "الاعتمادات الرقمية الرسمية",
    title: "التحقق من العضوية",
    intro: "تحقق من صحة بطاقة عضوية جمعية أبو أيمن وحالتها الحالية.",
    checking: "فحص السجل الآمن",
    checkingTitle: "جارٍ التحقق من بيانات العضوية",
    checkingBody: "يتم الاتصال بسجل أعضاء الجمعية الرسمي بشكل آمن. يرجى الانتظار.",
    valid: "تم التحقق · نشط",
    validTitle: "تم تأكيد العضوية الصحيحة",
    validBody: "تتطابق هذه البطاقة مع سجل نشط في سجل أعضاء الجمعية الرسمي.",
    identity: "بيانات العضو",
    member: "اسم العضو",
    number: "رقم العضوية",
    type: "فئة العضوية",
    card: "مرجع البطاقة",
    issued: "تاريخ الإصدار",
    source: "مصدر التحقق",
    sourceValue: "سجل أعضاء الجمعية الرسمي المباشر",
    refresh: "إعادة التحقق",
    print: "طباعة نتيجة التحقق",
    invalid: "لم يتم التحقق",
    invalidTitle: "تعذر اعتماد هذه البطاقة",
    invalidBody: "قد تكون البطاقة غير صالحة أو ملغاة أو غير نشطة. يرجى التواصل مع إدارة الجمعية قبل قبولها.",
    unavailable: "خدمة التحقق غير متاحة مؤقتاً",
    unavailableTitle: "تعذر الاتصال بخدمة التحقق",
    unavailableBody: "لم يتم إعلان أن البطاقة غير صالحة. يرجى المحاولة بعد قليل أو التواصل مع إدارة الجمعية.",
    invalidLink: "رابط التحقق غير صالح",
    invalidLinkBody: "رابط رمز QR غير مكتمل أو غير صحيح. يرجى مسح الرمز الموجود على بطاقة العضوية الأصلية.",
    privacy: "الخصوصية والأمان",
    privacyBody: "تعرض هذه البوابة العامة الحد الأدنى من المعلومات اللازمة لتأكيد العضوية فقط. ولا تعرض بيانات الاتصال الخاصة أو تاريخ الميلاد أو عنوان المنزل أو جهات اتصال الطوارئ.",
    disclaimer: "يؤكد هذا الفحص حالة عضوية الجمعية فقط. ولا يُعد وثيقة هوية حكومية ولا يحل محل أي وثائق تعريف مطلوبة قانوناً.",
    footer: "جمعية طلاب أبو أيمن",
    slogan: "العلم نور",
    official: "بوابة التحقق الرسمية",
    help: "هل تحتاج إلى مساعدة؟ تواصل مع إدارة الجمعية.",
    checked: "وقت الفحص",
    noData: "لن يتم عرض بيانات العضوية إلا بعد تأكيد البطاقة النشطة من السجل المباشر."
  }
};

export default function VerifyMemberCard({ token }: { token: string }) {
  const [record, setRecord] = useState<Verification | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorKind, setErrorKind] = useState<"invalid" | "unavailable" | "link" | "">("");
  const [language, setLanguage] = useState<Language>("en");
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [attempt, setAttempt] = useState(0);
  const t = copy[language];
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
      const { data, error: callError } = await supabase.functions.invoke("aasa-public-card-verification", { body: { token } });
      if (callError) setErrorKind("unavailable");
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

  const errorTitle = errorKind === "link" ? t.invalidLink : errorKind === "invalid" ? t.invalidTitle : t.unavailableTitle;
  const errorText = errorKind === "link" ? t.invalidLinkBody : errorKind === "invalid" ? t.invalidBody : t.unavailableBody;

  return <main className={`aasa-verify-portal ${rtl ? "is-rtl" : ""}`} dir={rtl ? "rtl" : "ltr"}>
    <div className="aasa-verify-topline"><span>◈ {t.official}</span><span className="aasa-verify-topline-right">SECURE · LIVE REGISTER</span></div>
    <header className="aasa-verify-header">
      <div className="aasa-verify-brand">
        <img src={import.meta.env.BASE_URL + "aasa-school-logo.jpg"} alt="AASA crest"/>
        <div><strong>AASA</strong><span>ABU-AIMAN STUDENTS’ ASSOCIATION</span><small>{t.eyebrow}</small></div>
      </div>
      <div className="aasa-verify-language" aria-label="Choose language">
        <button type="button" className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>EN</button>
        <button type="button" className={language === "ha" ? "active" : ""} onClick={() => setLanguage("ha")}>HA</button>
        <button type="button" className={language === "ar" ? "active" : ""} onClick={() => setLanguage("ar")}>عربي</button>
      </div>
    </header>

    <section className="aasa-verify-hero">
      <div className="aasa-verify-hero-mark">✓</div>
      <p className="aasa-verify-eyebrow">AASA · DIGITAL MEMBERSHIP CREDENTIALS</p>
      <h1>{t.title}</h1>
      <p>{t.intro}</p>
      <div className="aasa-verify-live"><i/> LIVE MEMBERSHIP REGISTER <span>·</span> SECURE QR VALIDATION</div>
    </section>

    <div className="aasa-verify-layout">
      <section className="aasa-verify-main-card" aria-live="polite">
        {loading ? <div className="aasa-verify-state aasa-verify-loading">
          <div className="aasa-verify-spinner"/>
          <p className="aasa-verify-state-label">{t.checking}</p>
          <h2>{t.checkingTitle}</h2>
          <p>{t.checkingBody}</p>
          <div className="aasa-verify-progress"><span/></div>
        </div> : record ? <>
          <div className="aasa-verify-result-head">
            <span className="aasa-verify-result-icon">✓</span>
            <div><small>{t.valid}</small><h2>{t.validTitle}</h2><p>{t.validBody}</p></div>
            <span className="aasa-verify-seal">AASA<br/><b>✓</b><small>AUTHENTIC</small></span>
          </div>
          <div className="aasa-verify-record-label"><span>{t.identity}</span><i>OFFICIAL RECORD</i></div>
          <div className="aasa-verify-member">
            <div className="aasa-verify-avatar">A</div>
            <div><small>{t.member}</small><h3>{record.member.full_name}</h3><span>{record.member.member_number}</span></div>
          </div>
          <div className="aasa-verify-facts">
            <div><small>{t.type}</small><strong>{record.member.membership_type}</strong></div>
            <div><small>{t.card}</small><strong>{record.card_number}</strong></div>
            <div><small>{t.issued}</small><strong>{record.issued_at ? new Date(record.issued_at).toLocaleDateString(language === "ar" ? "ar" : language === "ha" ? "en-NG" : "en-GB", {day:"2-digit",month:"short",year:"numeric"}) : "—"}</strong></div>
            <div><small>{t.source}</small><strong>{t.sourceValue}</strong></div>
          </div>
          <div className="aasa-verify-actions">
            <button type="button" className="aasa-verify-primary" onClick={() => window.print()}>▤ {t.print}</button>
            <button type="button" className="aasa-verify-secondary" onClick={() => setAttempt(v => v + 1)}>↻ {t.refresh}</button>
          </div>
        </> : <div className={`aasa-verify-state aasa-verify-failure ${errorKind === "invalid" || errorKind === "link" ? "is-invalid" : ""}`}>
          <div className="aasa-verify-failure-icon">{errorKind === "unavailable" ? "!" : "×"}</div>
          <p className="aasa-verify-state-label">{errorKind === "unavailable" ? t.unavailable : errorKind === "link" ? t.invalidLink : t.invalid}</p>
          <h2>{errorTitle}</h2>
          <p>{errorText}</p>
          <button type="button" className="aasa-verify-primary" onClick={() => setAttempt(v => v + 1)}>↻ {t.refresh}</button>
        </div>}
        <div className="aasa-verify-timestamp">{t.checked}: {checkedAt ? checkedAt.toLocaleString(language === "ar" ? "ar" : language === "ha" ? "en-NG" : "en-GB") : "—"}</div>
      </section>

      <aside className="aasa-verify-side">
        <section className="aasa-verify-security">
          <span className="aasa-verify-side-icon">⌑</span>
          <h3>{t.privacy}</h3>
          <p>{t.privacyBody}</p>
          <ul><li>✓ Encrypted connection</li><li>✓ Live status lookup</li><li>✓ Minimal public disclosure</li></ul>
        </section>
        <section className="aasa-verify-notice">
          <strong>IMPORTANT NOTICE</strong>
          <p>{t.disclaimer}</p>
        </section>
        <p className="aasa-verify-no-record">{t.noData}</p>
      </aside>
    </div>

    <footer className="aasa-verify-footer">
      <div><strong>{t.footer}</strong><span>{t.slogan}</span></div>
      <p>{t.help}</p>
      <small>© {new Date().getFullYear()} AASA · {t.official}</small>
    </footer>
  </main>;
}