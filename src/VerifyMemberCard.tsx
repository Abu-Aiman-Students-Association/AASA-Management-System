import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

type Member = {
  member_number: string;
  full_name: string;
  membership_type: string;
};
type Verification = {
  valid: boolean;
  card_number: string;
  issued_at: string;
  member: Member;
};

export default function VerifyMemberCard({ token }: { token: string }) {
  const [record,setRecord] = useState<Verification|null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function check() {
      setLoading(true);
      setError("");
      setRecord(null);
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
        setError("This QR code or verification link is invalid.");
        setLoading(false);
        return;
      }
      const { data, error: callError } = await supabase.functions.invoke("aasa-public-card-verification", { body: { token } });
      if (!alive) return;
      if (callError) setError("Verification is temporarily unavailable. Please contact AASA administration.");
      else if (!data?.valid || !data?.member) setError("This membership card is not valid or is no longer active.");
      else setRecord(data as Verification);
      setLoading(false);
    }
    void check();
    return () => { alive = false; };
  }, [token]);

  const m = record?.member;
  return <main className="aasa-admin aasa-verify-page">
    <header><div className="aasa-brand"><img className="aasa-verify-crest" src={import.meta.env.BASE_URL+"aasa-school-logo.jpg"} alt="AASA crest"/><div><b>AASA</b><small>ABU-AIMAN STUDENTS’ ASSOCIATION</small></div></div><span>Card verification</span></header>
    <div className="aasa-content"><section className="aasa-panel aasa-verify-card">
      <p className="aasa-kicker">OFFICIAL MEMBERSHIP CHECK</p><h1>Membership card verification</h1>
      {loading ? <p>Checking the card against the live membership register…</p> : record && m ? <>
        <div className="aasa-verify-status"><span>✓</span><div><strong>Valid active membership</strong><small>Verified directly against the AASA register</small></div></div>
        <div className="aasa-verify-profile"><div className="aasa-verify-no-photo">AASA<br/>VERIFIED</div><div><small>Member name</small><h2>{m.full_name}</h2><small>ID Number</small><p>{m.member_number}</p></div></div>
        <div className="aasa-verify-summary"><div><small>Membership type</small><strong>{m.membership_type}</strong></div><div><small>Card number</small><strong>{record.card_number}</strong></div><div><small>Card issued</small><strong>{new Date(record.issued_at).toLocaleDateString()}</strong></div></div>
        <p className="aasa-verify-consent">For privacy, this public verification page does not display the member’s photograph, phone number, email, date of birth, address, location or emergency contact details. These records are available only to authorised AASA officers.</p>
        <p className="aasa-muted">This confirms the status of the membership card only. It is not a government-issued identity document.</p>
      </> : <div className="aasa-error" role="alert">{error || "This membership card could not be verified."}</div>}
      <p className="aasa-muted">Abu-Aiman Students’ Association · العلم نور</p>
    </section></div>
  </main>;
}