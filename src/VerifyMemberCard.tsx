import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

type Member = {
  member_number: string; full_name: string; membership_type: string;
  nationality: string | null; country_of_residence: string | null;
  state_of_residence: string | null; local_government_area: string | null;
  ward: string | null; occupation: string | null; phone: string | null;
  address: string | null; photo_url: string | null;
};
type Verification = { valid: boolean; consent_shared: boolean; card_number: string; issued_at: string; member: Member };
const capitals: Record<string,string> = {Abia:"Umuahia",Adamawa:"Yola","Akwa Ibom":"Uyo",Anambra:"Awka",Bauchi:"Bauchi",Bayelsa:"Yenagoa",Benue:"Makurdi",Borno:"Maiduguri","Cross River":"Calabar",Delta:"Asaba",Ebonyi:"Abakaliki",Edo:"Benin City",Ekiti:"Ado-Ekiti",Enugu:"Enugu","Federal Capital Territory (FCT)":"Abuja",Gombe:"Gombe",Imo:"Owerri",Jigawa:"Dutse",Kaduna:"Kaduna",Kano:"Kano",Katsina:"Katsina",Kebbi:"Birnin Kebbi",Kogi:"Lokoja",Kwara:"Ilorin",Lagos:"Ikeja",Nasarawa:"Lafia",Niger:"Minna",Ogun:"Abeokuta",Ondo:"Akure",Osun:"Osogbo",Oyo:"Ibadan",Plateau:"Jos",Rivers:"Port Harcourt",Sokoto:"Sokoto",Taraba:"Jalingo",Yobe:"Damaturu",Zamfara:"Gusau"};
export default function VerifyMemberCard({ token }: { token: string }) {
  const [record,setRecord] = useState<Verification|null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  useEffect(() => {
    let alive = true;
    async function check() {
      setLoading(true); setError(""); setRecord(null);
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) { setError("This QR code or verification link is invalid."); setLoading(false); return; }
      const { data, error: callError } = await supabase.functions.invoke("aasa-public-card-verification", { body: { token } });
      if (!alive) return;
      if (callError) setError("Verification is temporarily unavailable. Please contact AASA administration.");
      else if (!data?.valid || !data?.member) setError("This membership card is not valid or is no longer active.");
      else setRecord(data as Verification);
      setLoading(false);
    }
    void check(); return () => { alive = false; };
  }, [token]);
  const m = record?.member;
  const fields: [string,string|null|undefined][] = m ? [
    ["Nationality",m.nationality],["Country of residence",m.country_of_residence],
    ["State",m.state_of_residence],["State capital",m.country_of_residence === "Nigeria" ? capitals[m.state_of_residence || ""] : null],
    ["Local Government Area",m.local_government_area],["Ward",m.ward],
    ["Occupation",m.occupation],["Phone",m.phone],["Address",m.address]
  ].filter((x): x is [string,string] => Boolean(x[1]?.trim())) : [];
  return <main className="aasa-admin aasa-verify-page">
    <header><div className="aasa-brand"><img className="aasa-verify-crest" src={import.meta.env.BASE_URL+"aasa-school-logo.jpg"} alt="AASA crest"/><div><b>AASA</b><small>ABU-AIMAN STUDENTS’ ASSOCIATION</small></div></div><span>Card verification</span></header>
    <div className="aasa-content"><section className="aasa-panel aasa-verify-card">
      <p className="aasa-kicker">OFFICIAL MEMBERSHIP CHECK</p><h1>Membership card verification</h1>
      {loading ? <p>Checking the card against the live membership register…</p> : record && m ? <>
        <div className="aasa-verify-status"><span>✓</span><div><strong>Valid active membership</strong><small>Verified directly against the AASA register</small></div></div>
        <div className="aasa-verify-profile">{record.consent_shared && m.photo_url ? <img src={m.photo_url} alt={m.full_name+" member photograph"}/> : <div className="aasa-verify-no-photo">No member photo available</div>}<div><small>Member name</small><h2>{m.full_name}</h2><small>ID Number</small><p>{m.member_number}</p></div></div>
        <div className="aasa-verify-summary"><div><small>Membership type</small><strong>{m.membership_type}</strong></div><div><small>Card number</small><strong>{record.card_number}</strong></div><div><small>Card issued</small><strong>{new Date(record.issued_at).toLocaleDateString()}</strong></div></div>
        {record.consent_shared ? <section className="aasa-verify-details"><h2>MEMBER DETAILS</h2><dl>{fields.map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section> : <p className="aasa-verify-consent">This member has not authorised public display of their photo and extended personal details. The card status is verified, but those details are withheld.</p>}
        <p className="aasa-muted">This confirms the status of the membership card only. It is not a government-issued identity document.</p>
      </> : <div className="aasa-error" role="alert">{error || "This membership card could not be verified."}</div>}
      <p className="aasa-muted">Abu-Aiman Students’ Association · العلم نور</p>
    </section></div>
  </main>;
}