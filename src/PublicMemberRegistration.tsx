import { useState, type FormEvent } from "react";
import { supabase } from "./lib/supabase";
import "./public-registration.css";

export default function PublicMemberRegistration() {
  const [form,setForm]=useState({full_name:"",email:"",phone:"",date_of_birth:"",gender:"",country_of_residence:"Nigeria",state_of_residence:"",local_government_area:"",city_of_residence:"",ward:"",nationality:"Nigerian",address:"",membership_consent:false});
  const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const [receipt,setReceipt]=useState("");
  const update=(key:string,value:string|boolean)=>setForm(old=>({...old,[key]:value}));
  async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError("");setReceipt("");
    try{const {data,error}=await supabase.rpc("aasa_submit_member_application",{p_application:form});if(error)throw error;
      const result=Array.isArray(data)?data[0]:data;if(!result?.member_number)throw new Error("The application could not be confirmed. Please try again.");
      setReceipt(result.member_number);
    }catch(e){setError(e instanceof Error?e.message:"Unable to submit the application.");}finally{setBusy(false);}
  }
  return <main className="aasa-public-reg">
    <header><div className="aasa-public-mark">AASA</div><div><strong>ABU-AIMAN STUDENTS’ ASSOCIATION</strong><small>رابطة طلاب مدرسة أبوأيمن لتحفيظ القرآن الكريم والدراسات الإسلامية</small><small>العلم نور</small></div></header>
    <section className="aasa-public-intro"><span>MEMBERSHIP · APPLICATION</span><h1>Member Registration</h1><p>Apply to join the Abu-Aiman Students’ Association. Your application will be reviewed by an authorised association officer.</p></section>
    {receipt?<section className="aasa-public-success" role="status"><div>✓</div><h2>Application submitted</h2><p>Your application has been received and is awaiting review. It is not an active membership yet.</p><strong>Application reference</strong><code>{receipt}</code><p>Keep this reference and contact the association office if you need assistance.</p><button onClick={()=>window.location.assign(window.location.pathname)}>Finish</button></section>:
    <form onSubmit={submit} className="aasa-public-form">
      <h2>Personal information</h2>
      <label>Full name *<input required minLength={2} maxLength={160} autoComplete="name" value={form.full_name} onChange={e=>update("full_name",e.target.value)}/></label>
      <div className="aasa-public-two"><label>Email address<input type="email" maxLength={254} autoComplete="email" value={form.email} onChange={e=>update("email",e.target.value)}/></label><label>Phone number<input type="tel" maxLength={40} autoComplete="tel" value={form.phone} onChange={e=>update("phone",e.target.value)}/></label></div>
      <p className="aasa-public-help">Provide at least one contact method: email or phone.</p>
      <div className="aasa-public-two"><label>Date of birth<input type="date" max={new Date().toISOString().slice(0,10)} value={form.date_of_birth} onChange={e=>update("date_of_birth",e.target.value)}/></label><label>Gender *<select required value={form.gender} onChange={e=>update("gender",e.target.value)}><option value="">Select gender</option><option value="male">Male</option><option value="female">Female</option><option value="prefer_not_to_say">Prefer not to say</option></select></label></div>
      <h2>Residential address</h2>
      <div className="aasa-public-two"><label>Country<input value={form.country_of_residence} maxLength={100} onChange={e=>update("country_of_residence",e.target.value)}/></label><label>State<input value={form.state_of_residence} maxLength={120} onChange={e=>update("state_of_residence",e.target.value)}/></label></div>
      <div className="aasa-public-two"><label>Local Government Area<input value={form.local_government_area} maxLength={120} onChange={e=>update("local_government_area",e.target.value)}/></label><label>City / Town<input value={form.city_of_residence} maxLength={120} onChange={e=>update("city_of_residence",e.target.value)}/></label></div>
      <div className="aasa-public-two"><label>Ward<input value={form.ward} maxLength={120} onChange={e=>update("ward",e.target.value)}/></label><label>Nationality<input value={form.nationality} maxLength={100} onChange={e=>update("nationality",e.target.value)}/></label></div>
      <label>Residential address<textarea rows={3} maxLength={500} value={form.address} onChange={e=>update("address",e.target.value)}/></label>
      <label className="aasa-public-consent"><input type="checkbox" required checked={form.membership_consent} onChange={e=>update("membership_consent",e.target.checked)}/><span>I confirm that the information provided is accurate and consent to its use for membership administration and association communications.</span></label>
      {error&&<p className="aasa-public-error" role="alert">{error}</p>}
      <button disabled={busy}>{busy?"Submitting…":"Submit membership application"}</button>
      <p className="aasa-public-help">Submitting this form does not grant membership, voting rights, a membership card, or administrator access. Approval is required.</p>
    </form>}
    <footer>العلم نور · AASA · Secure · Accountable</footer>
  </main>;
}
