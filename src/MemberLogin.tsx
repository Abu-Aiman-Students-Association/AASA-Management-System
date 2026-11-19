import { useState, type FormEvent } from "react";
import { supabase } from "./lib/supabase";

type Language = "en" | "ha" | "ar";

const translations = {
  en: {
    title: "AASA Member Sign In", intro: "Secure access for existing, verified association members.",
    email: "Email address", send: "Send verification code", code: "8-digit verification code",
    verify: "Verify and continue", sent: "Enter the 8-digit code sent to your email.",
    back: "Back to portal selection", wait: "Please wait…",
    noMember: "This email is not linked to an active AASA membership. Contact the association office.",
    success: "Membership verified. Opening your dashboard…"
  },
  ha: {
    title: "Shiga na Memba AASA", intro: "Amintaccen shiga ga sahihan membobin ƙungiyar da aka riga aka tantance.",
    email: "Adireshin imel", send: "Aika lambar tabbatarwa", code: "Lambar tabbatarwa mai lambobi 8",
    verify: "Tabbatar da ci gaba", sent: "Shigar da lamba mai lambobi 8 da aka aika zuwa imel ɗinka.",
    back: "Komawa zaɓin ƙofar shiga", wait: "A jira…",
    noMember: "Ba a haɗa wannan imel da membobinta mai aiki ta AASA ba. Tuntuɓi ofishin ƙungiyar.",
    success: "An tabbatar da membobintaka. Ana buɗe dashboard ɗinka…"
  },
  ar: {
    title: "تسجيل دخول عضو AASA", intro: "دخول آمن للأعضاء الحاليين الذين تم التحقق من عضويتهم.",
    email: "البريد الإلكتروني", send: "إرسال رمز التحقق", code: "رمز التحقق المكوّن من 8 أرقام",
    verify: "تحقق والمتابعة", sent: "أدخل الرمز المكوّن من 8 أرقام المرسل إلى بريدك.",
    back: "العودة إلى اختيار البوابة", wait: "يرجى الانتظار…",
    noMember: "هذا البريد غير مرتبط بعضوية AASA نشطة. يرجى التواصل مع مكتب الجمعية.",
    success: "تم التحقق من العضوية. جارٍ فتح لوحة التحكم…"
  }
};

export default function MemberLogin() {
  const [lang, setLang] = useState<Language>("ha");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const t = translations[lang];
  const rtl = lang === "ar";

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const { error: sendError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: false }
      });
      if (sendError) throw sendError;
      setSent(true); setOtp(""); setNotice(t.sent);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send the verification code.");
    } finally { setBusy(false); }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const code = otp.replace(/\D/g, "");
      if (!/^\d{8}$/.test(code)) throw new Error("Enter the complete 8-digit verification code.");
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(), token: code, type: "email"
      });
      if (verifyError) throw verifyError;
      const { error: linkError } = await supabase.rpc("aasa_link_own_member_account");
      if (linkError) throw linkError;
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw authError ?? new Error("No authenticated account.");
      const { data: member, error: memberError } = await supabase.from("aasa_members")
        .select("id").eq("auth_user_id", auth.user.id).eq("status", "active").maybeSingle();
      if (memberError) throw memberError;
      if (!member) {
        await supabase.auth.signOut();
        throw new Error(t.noMember);
      }
      setNotice(t.success);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not verify this member account.");
    } finally { setBusy(false); }
  }

  return <main className="aasa-admin" dir={rtl ? "rtl" : "ltr"}>
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
      <p className="aasa-kicker">العلم نور · VERIFIED MEMBERSHIP</p>
      <h1>{t.title}</h1><p className="aasa-intro">{t.intro}</p>
      <form className="aasa-panel aasa-login" onSubmit={sent ? verifyCode : sendCode}>
        <img className="aasa-login-logo" src={import.meta.env.BASE_URL + "aasa-logo.svg"} alt="AASA association crest" />
        <h2>{t.title}</h2>
        <label htmlFor="aasa-member-email">{t.email}</label>
        <input id="aasa-member-email" type="email" autoComplete="email" required value={email} disabled={sent || busy} onChange={event => setEmail(event.target.value)} />
        {sent && <>
          <p className="aasa-notice" role="status">{t.sent}</p>
          <label htmlFor="aasa-member-otp">{t.code}</label>
          <input id="aasa-member-otp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" maxLength={8} minLength={8} required value={otp} disabled={busy} onChange={event => setOtp(event.target.value.replace(/\D/g, "").slice(0, 8))} />
        </>}
        <button className="aasa-primary" disabled={busy || (sent && otp.length !== 8)}>{busy ? t.wait : sent ? t.verify : t.send}</button>
        {sent && <button className="aasa-link" type="button" onClick={() => { setSent(false); setOtp(""); setNotice(""); setError(""); }}>{t.email}</button>}
        <a className="aasa-link" href="./">{t.back}</a>
        {notice && <p className="aasa-notice" role="status">{notice}</p>}
        {error && <p className="aasa-error" role="alert">{error}</p>}
      </form>
      <footer>العلم نور · AASA · Secure · Accountable · Multilingual</footer>
    </section>
  </main>;
}
