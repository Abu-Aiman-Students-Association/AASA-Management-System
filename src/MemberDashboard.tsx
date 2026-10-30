import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "./lib/supabase";
import "./member.css";

type Member = {
  id: string;
  member_number: string;
  full_name: string;
  email: string | null;
  membership_type: string;
  status: string;
  joined_on: string;
};
type Card = { card_number: string; qr_token: string; status: string; issued_at: string };

export default function MemberDashboard() {
  const [member, setMember] = useState<Member | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [qr, setQr] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lang, setLang] = useState<"en" | "ha" | "ar">("ha");
  const t = {
    en: { title: "My Membership", intro: "Your verified AASA member workspace", member: "Member details", number: "Membership number", name: "Full name", email: "Email", type: "Membership type", status: "Membership status", joined: "Joined on", active: "Active", card: "Membership card", noCard: "Your membership card has not been issued yet. Please contact the association office.", cardNo: "Card number", issued: "Issued on", logout: "Sign out", loading: "Loading your membership…", error: "We could not load your membership. Please sign out and sign in again." },
    ha: { title: "Dashboard na Memba", intro: "Wurin bayanan membobinka na AASA", member: "Bayanan memba", number: "Lambar membobinta", name: "Cikakken suna", email: "Imel", type: "Nau'in membobinta", status: "Matsayin membobinta", joined: "Ranar shiga", active: "Mai aiki", card: "Katin membobinta", noCard: "Har yanzu ba a fitar da katin membobintaka ba. Tuntuɓi ofishin ƙungiyar.", cardNo: "Lambar kati", issued: "Ranar fitarwa", logout: "Fita", loading: "Ana buɗe bayanan membobinka…", error: "An kasa buɗe bayanan membobinka. Ka fita sannan ka sake shiga." },
    ar: { title: "لوحة العضو", intro: "مساحة عضويتك الموثقة في AASA", member: "بيانات العضوية", number: "رقم العضوية", name: "الاسم الكامل", email: "البريد الإلكتروني", type: "نوع العضوية", status: "حالة العضوية", joined: "تاريخ الانضمام", active: "نشط", card: "بطاقة العضوية", noCard: "لم تصدر بطاقة العضوية بعد. يرجى التواصل مع مكتب الجمعية.", cardNo: "رقم البطاقة", issued: "تاريخ الإصدار", logout: "تسجيل الخروج", loading: "جارٍ تحميل بيانات العضوية…", error: "تعذر تحميل بيانات العضوية. يرجى تسجيل الخروج ثم الدخول مجددًا." }
  }[lang];

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true); setError("");
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!auth.user) throw new Error("No authenticated account");
        const { data, error: memberError } = await supabase.from("aasa_members")
          .select("id,member_number,full_name,email,membership_type,status,joined_on")
          .eq("auth_user_id", auth.user.id).eq("status", "active").maybeSingle();
        if (memberError) throw memberError;
        if (!data) throw new Error("No active linked membership");
        const { data: cards, error: cardError } = await supabase.from("aasa_member_cards")
          .select("card_number,qr_token,status,issued_at").eq("member_id", data.id)
          .eq("status", "active").order("issued_at", { ascending: false }).limit(1);
        if (cardError) throw cardError;
        if (!alive) return;
        setMember(data as Member);
        const activeCard = (cards?.[0] ?? null) as Card | null;
        setCard(activeCard);
        if (activeCard?.qr_token) setQr(await QRCode.toDataURL(activeCard.qr_token, { width: 220, margin: 1 }));
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : t.error);
      } finally { if (alive) setLoading(false); }
    }
    void load();
    return () => { alive = false; };
  }, []);

  async function logout() { await supabase.auth.signOut(); window.location.assign(window.location.pathname); }
  const rtl = lang === "ar";
  return <main className="aasa-member" dir={rtl ? "rtl" : "ltr"}>
    <header className="aasa-member-header">
      <div className="aasa-member-brand"><img src={import.meta.env.BASE_URL + "aasa-school-logo.jpg"} alt="AASA crest" /><div><b>AASA</b><small>ABU-AIMAN STUDENTS' ASSOCIATION</small></div></div>
      <div className="aasa-member-actions"><nav>{(["en","ha","ar"] as const).map(x => <button key={x} className={lang===x?"selected":""} onClick={() => setLang(x)}>{x==="ar"?"عربي":x.toUpperCase()}</button>)}</nav><button onClick={() => void logout()}>{t.logout}</button></div>
    </header>
    <section className="aasa-member-content">
      <p className="aasa-member-kicker">العلم نور · VERIFIED MEMBERSHIP</p>
      <h1>{t.title}</h1><p className="aasa-member-intro">{t.intro}</p>
      {loading && <section className="aasa-member-panel">{t.loading}</section>}
      {error && <section className="aasa-member-error" role="alert">{t.error}</section>}
      {member && <div className="aasa-member-grid">
        <section className="aasa-member-panel">
          <p className="aasa-member-kicker">AASA · MEMBER PROFILE</p><h2>{t.member}</h2>
          <div className="aasa-member-detail"><span>{t.number}</span><strong>{member.member_number}</strong></div>
          <div className="aasa-member-detail"><span>{t.name}</span><strong>{member.full_name}</strong></div>
          <div className="aasa-member-detail"><span>{t.email}</span><strong>{member.email || "—"}</strong></div>
          <div className="aasa-member-detail"><span>{t.type}</span><strong>{member.membership_type.replace(/_/g," ")}</strong></div>
          <div className="aasa-member-detail"><span>{t.status}</span><strong className="aasa-member-active">{t.active}</strong></div>
          <div className="aasa-member-detail"><span>{t.joined}</span><strong>{member.joined_on ? new Date(member.joined_on).toLocaleDateString() : "—"}</strong></div>
        </section>
        <section className="aasa-member-panel">
          <p className="aasa-member-kicker">AASA · IDENTITY</p><h2>{t.card}</h2>
          {card ? <div className="aasa-member-card"><div><strong>{member.full_name}</strong><span>{member.member_number}</span><span>{t.cardNo}: {card.card_number}</span><span>{t.issued}: {new Date(card.issued_at).toLocaleDateString()}</span></div>{qr && <img src={qr} alt="Membership verification QR code" />}</div> : <p>{t.noCard}</p>}
        </section>
      </div>}
      <footer>العلم نور · AASA · Secure · Accountable · Multilingual</footer>
    </section>
  </main>;
}
