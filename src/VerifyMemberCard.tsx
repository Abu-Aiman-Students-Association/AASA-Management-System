import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

type Verification = { valid: boolean; member_number: string; full_name: string; membership_type: string; issued_at: string };
export default function VerifyMemberCard({ token }: { token: string }) {
  const [record, setRecord] = useState<Verification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    async function check() {
      setLoading(true); setError(""); setRecord(null);
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
        setError("This QR code or verification link is invalid."); setLoading(false); return;
      }
      const { data, error } = await supabase.rpc("aasa_verify_member_card", { p_qr_token: token });
      if (!alive) return;
      if (error) setError("Verification is temporarily unavailable. Please contact AASA administration.");
      else if (!data || data.length === 0 || !data[0]?.valid) setError("This membership card is not valid or is no longer active.");
      else setRecord(data[0] as Verification);
      setLoading(false);
    }
    void check();
    return () => { alive = false; };
  }, [token]);
  return <main className="aasa-admin aasa-verify-page">
    <header><div className="aasa-brand"><div className="aasa-brand-mark">A</div><div><b>AASA</b><small>ABU-AIMAN STUDENTS’ ASSOCIATION</small></div></div><span>Card verification</span></header>
    <div className="aasa-content">
      <section className="aasa-panel aasa-verify-card">
        <p className="aasa-kicker">OFFICIAL MEMBERSHIP CHECK</p>
        <h1>Membership card verification</h1>
        {loading ? <p>Checking the card against the live membership register…</p> : record ? <>
          <div className="aasa-verify-status"><span>✓</span><div><strong>Valid active membership</strong><small>Verified directly against the AASA register</small></div></div>
          <dl><dt>Member name</dt><dd>{record.full_name}</dd><dt>Member number</dt><dd>{record.member_number}</dd><dt>Membership type</dt><dd>{record.membership_type}</dd><dt>Card issued</dt><dd>{new Date(record.issued_at).toLocaleDateString()}</dd></dl>
          <p className="aasa-muted">This confirms the status of the membership card only. It is not a government-issued identity document.</p>
        </> : <div className="aasa-error" role="alert">{error || "This membership card could not be verified."}</div>}
        <p className="aasa-muted">Abu-Aiman Students’ Association · العلم نور</p>
      </section>
    </div>
  </main>;
}
