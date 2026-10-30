import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "./lib/supabase";
import QRCode from "qrcode";

type Member = {
  id: string; member_number: string; full_name: string; email: string | null;
  phone: string | null; membership_type: string; status: string; joined_on: string;
  date_of_birth: string | null; gender: string | null; address: string | null;
  notes: string | null; photo_path: string | null; auth_user_id: string | null;
  emergency_contact_name: string | null; emergency_contact_relationship: string | null;
  emergency_contact_phone: string | null; occupation: string | null;
  state_of_residence: string | null; local_government_area: string | null; ward: string | null;
  nationality: string | null; country_of_residence: string | null; city_of_residence: string | null; membership_consent: boolean;
};
type MemberCard = { id: string; member_id: string; card_number: string; qr_token: string; status: string; issued_at: string };
const STATE_CAPITALS: Record<string, string> = {
  "Abia":"Umuahia","Adamawa":"Yola","Akwa Ibom":"Uyo","Anambra":"Awka","Bauchi":"Bauchi",
  "Bayelsa":"Yenagoa","Benue":"Makurdi","Borno":"Maiduguri","Cross River":"Calabar","Delta":"Asaba",
  "Ebonyi":"Abakaliki","Edo":"Benin City","Ekiti":"Ado-Ekiti","Enugu":"Enugu",
  "Federal Capital Territory (FCT)":"Abuja","Gombe":"Gombe","Imo":"Owerri","Jigawa":"Dutse",
  "Kaduna":"Kaduna","Kano":"Kano","Katsina":"Katsina","Kebbi":"Birnin Kebbi","Kogi":"Lokoja",
  "Kwara":"Ilorin","Lagos":"Ikeja","Nasarawa":"Lafia","Niger":"Minna","Ogun":"Abeokuta",
  "Ondo":"Akure","Osun":"Osogbo","Oyo":"Ibadan","Plateau":"Jos","Rivers":"Port Harcourt",
  "Sokoto":"Sokoto","Taraba":"Jalingo","Yobe":"Damaturu","Zamfara":"Gusau"
};
export default function MembershipModule({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Member[]>([]);
  const [cards, setCards] = useState<MemberCard[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [cityOfResidence, setCityOfResidence] = useState("");
  const [otherCityOfResidence, setOtherCityOfResidence] = useState("");
  const [notes, setNotes] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyRelationship, setEmergencyRelationship] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [occupation, setOccupation] = useState("");
  const [otherOccupation, setOtherOccupation] = useState("");
  const [countryOfResidence, setCountryOfResidence] = useState("Nigeria");
  const [otherCountry, setOtherCountry] = useState("");
  const [stateOfResidence, setStateOfResidence] = useState("");
  const [lga, setLga] = useState("");
  type AdminOption = { id: string; name_en: string; parent_id?: string | null };
  const [adminStates, setAdminStates] = useState<AdminOption[]>([]);
  const [adminLgas, setAdminLgas] = useState<AdminOption[]>([]);
  const [adminWards, setAdminWards] = useState<AdminOption[]>([]);
  const [grid3Settlements, setGrid3Settlements] = useState<string[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");

  const [ward, setWard] = useState("");
  const [otherWardValue, setOtherWardValue] = useState("");
  const [nationality, setNationality] = useState("Nigerian");
  const [otherNationality, setOtherNationality] = useState("");
  const [membershipConsent, setMembershipConsent] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cardPreview, setCardPreview] = useState<{ member: Member; card: MemberCard; photoUrl: string; qrUrl: string } | null>(null);
  const [type, setType] = useState("ordinary");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function load() {
    const [members, cardRows] = await Promise.all([
      supabase.from("aasa_members").select("id,member_number,full_name,email,phone,membership_type,status,joined_on,date_of_birth,gender,address,notes,photo_path,auth_user_id,emergency_contact_name,emergency_contact_relationship,emergency_contact_phone,occupation,state_of_residence,local_government_area,ward,nationality,country_of_residence,city_of_residence,membership_consent").order("created_at", { ascending: false }).limit(250),
      supabase.from("aasa_member_cards").select("id,member_id,card_number,qr_token,status,issued_at").order("issued_at", { ascending: false }).limit(500)
    ]);
    if (members.error) throw members.error;
    if (cardRows.error) throw cardRows.error;
    setRows((members.data ?? []) as Member[]);
    setCards((cardRows.data ?? []) as MemberCard[]);
  }
  useEffect(() => { void load().catch(e => setError(e instanceof Error ? e.message : "Could not load membership records.")); }, []);
  const ADMIN_API = "https://api.openadmindata.org/api/v1/ng";
  const GRID3_QUERY = "https://services3.arcgis.com/BU6Aadhn6tbBEdyk/ArcGIS/rest/services/Settlements_in_Nigeria/FeatureServer/0/query";
  useEffect(() => {
    let cancelled = false;
    fetch(ADMIN_API + "/state.json").then(r => { if (!r.ok) throw new Error("State directory unavailable"); return r.json(); })
      .then(data => { if (!cancelled) setAdminStates(Array.isArray(data.entities) ? data.entities : []); })
      .catch(() => { if (!cancelled) setLocationError("Could not load the official Nigeria state list. Please refresh and try again."); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    let cancelled = false;
    setAdminLgas([]); setAdminWards([]); setGrid3Settlements([]);
    if (countryOfResidence !== "Nigeria" || !stateOfResidence) return;
    const stateName = stateOfResidence === "Federal Capital Territory (FCT)" ? "Federal Capital Territory" : stateOfResidence;
    const stateRecord = adminStates.find(x => x.name_en === stateName);
    if (!stateRecord) return;
    setLocationLoading(true); setLocationError("");
    fetch(ADMIN_API + "/lga.json").then(r => { if (!r.ok) throw new Error("LGA directory unavailable"); return r.json(); })
      .then(data => { if (!cancelled) setAdminLgas((data.entities || []).filter((x: AdminOption) => x.parent_id === stateRecord.id)); })
      .catch(() => { if (!cancelled) setLocationError("Could not load LGAs for the selected state."); })
      .finally(() => { if (!cancelled) setLocationLoading(false); });
    return () => { cancelled = true; };
  }, [countryOfResidence, stateOfResidence, adminStates]);
  useEffect(() => {
    let cancelled = false;
    setAdminWards([]); setGrid3Settlements([]);
    if (countryOfResidence !== "Nigeria" || !stateOfResidence || !lga) return;
    const stateName = stateOfResidence === "Federal Capital Territory (FCT)" ? "Federal Capital Territory" : stateOfResidence;
    const lgaRecord = adminLgas.find(x => x.name_en === lga);
    if (!lgaRecord) return;
    setLocationLoading(true); setLocationError("");
    Promise.all([
      fetch(ADMIN_API + "/ward.json").then(r => { if (!r.ok) throw new Error("Ward directory unavailable"); return r.json(); }),
      (() => {
        const esc = (v: string) => v.replace(/'/g, "''");
        const params = new URLSearchParams({ where: "statename='" + esc(stateName) + "' AND lganame='" + esc(lga) + "'", outFields: "set_name,set_altnam", returnDistinctValues: "true", returnGeometry: "false", orderByFields: "set_name ASC", f: "json" });
        return fetch(GRID3_QUERY + "?" + params.toString()).then(r => { if (!r.ok) throw new Error("Settlement directory unavailable"); return r.json(); });
      })()
    ]).then(([wardData, settlementData]) => {
      if (cancelled) return;
      setAdminWards((wardData.entities || []).filter((x: AdminOption) => x.parent_id === lgaRecord.id));
      const names: string[] = (settlementData.features || []).map((x: { attributes?: { set_name?: string; set_altnam?: string } }) => (x.attributes?.set_name || x.attributes?.set_altnam || "").trim()).filter((name: string) => name.length > 0);
      setGrid3Settlements(Array.from(new Set<string>(names)).sort((a: string, b: string) => a.localeCompare(b)));
    }).catch(() => { if (!cancelled) setLocationError("Could not load City / Town or Ward options for this LGA. You can retry by changing the LGA."); })
      .finally(() => { if (!cancelled) setLocationLoading(false); });
    return () => { cancelled = true; };
  }, [countryOfResidence, stateOfResidence, lga, adminLgas]);

  async function add(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      if (!email.trim() && !phone.trim()) throw new Error("Enter at least one contact method: email address or phone number.");
      if (!editingId && !membershipConsent) throw new Error("Please confirm the membership declaration before saving.");
      if (photoFile && (!["image/jpeg", "image/png"].includes(photoFile.type) || photoFile.size > 5 * 1024 * 1024)) {
        throw new Error("Member photo must be JPG or PNG and no larger than 5 MB.");
      }
      const memberFields = {
        full_name: name.trim(), email: email.trim() || null,
        phone: phone.trim() || null, date_of_birth: dob || null, gender: gender || null,
        address: address.trim() || null, notes: notes.trim() || null,
        emergency_contact_name: emergencyName.trim() || null,
        emergency_contact_relationship: emergencyRelationship.trim() || null,
        emergency_contact_phone: emergencyPhone.trim() || null,
        occupation: (occupation === "Other" ? otherOccupation.trim() : occupation).trim() || null,
        state_of_residence: stateOfResidence.trim() || null,
        local_government_area: lga.trim() || null,
        ward: (ward === "Other / not listed" ? otherWardValue.trim() : ward.trim()) || null,
        nationality: (nationality === "Other" ? otherNationality.trim() : nationality).trim() || null,
        country_of_residence: (countryOfResidence === "Other" ? otherCountry.trim() : countryOfResidence).trim() || null,
        city_of_residence: (cityOfResidence === "Other" ? otherCityOfResidence.trim() : cityOfResidence).trim() || null,
        membership_consent: membershipConsent,
        membership_type: type, updated_by: userId
      };
      if (editingId) {
        let newPhotoPath: string | null = null;
        if (photoFile) {
          const ext = photoFile.type === "image/png" ? "png" : "jpg";
          newPhotoPath = userId + "/member-photo-" + editingId + "-" + crypto.randomUUID() + "." + ext;
          const uploaded = await supabase.storage.from("aasa-documents").upload(newPhotoPath, photoFile, { contentType: photoFile.type, upsert: false });
          if (uploaded.error) throw uploaded.error;
        }
        const { error } = await supabase.from("aasa_members").update({ ...memberFields, ...(newPhotoPath ? { photo_path: newPhotoPath } : {}) }).eq("id", editingId);
        if (error) {
          if (newPhotoPath) await supabase.storage.from("aasa-documents").remove([newPhotoPath]);
          throw error;
        }
        setName(""); setEmail(""); setPhone(""); setDob(""); setGender(""); setAddress(""); setCityOfResidence(""); setOtherCityOfResidence(""); setNotes("");
        setEmergencyName(""); setEmergencyRelationship(""); setEmergencyPhone(""); setOccupation(""); setOtherOccupation(""); setCountryOfResidence("Nigeria"); setOtherCountry(""); setStateOfResidence(""); setLga(""); setWard(""); setOtherWardValue(""); setNationality("Nigerian"); setOtherNationality(""); setMembershipConsent(false);
        setType("ordinary"); setPhotoFile(null); setEditingId(null);
        await load(); setNotice("Member details updated. Membership status was not changed.");
      } else {
        const memberNo = "AASA-" + new Date().getFullYear() + "-" + crypto.randomUUID().slice(0, 8).toUpperCase();
        const { data: inserted, error } = await supabase.from("aasa_members").insert({
          member_number: memberNo, ...memberFields,
          status: "pending", created_by: userId
        }).select("id,member_number").single();
        if (error) throw error;
        let photoMessage = "";
        if (photoFile && inserted) {
          const ext = photoFile.type === "image/png" ? "png" : "jpg";
          const path = userId + "/member-photo-" + inserted.id + "-" + crypto.randomUUID() + "." + ext;
          const uploaded = await supabase.storage.from("aasa-documents").upload(path, photoFile, { contentType: photoFile.type, upsert: false });
          if (uploaded.error) photoMessage = " Member record saved, but photo upload failed: " + uploaded.error.message;
          else {
            const saved = await supabase.from("aasa_members").update({ photo_path: path, updated_by: userId }).eq("id", inserted.id);
            if (saved.error) photoMessage = " Member record saved, but photo path could not be saved: " + saved.error.message;
          }
        }
        setName(""); setEmail(""); setPhone(""); setDob(""); setGender(""); setAddress(""); setCityOfResidence(""); setNotes("");
        setEmergencyName(""); setEmergencyRelationship(""); setEmergencyPhone(""); setOccupation(""); setStateOfResidence(""); setLga(""); setWard(""); setOtherWardValue(""); setMembershipConsent(false);
        setType("ordinary"); setPhotoFile(null);
        await load(); setNotice("Member record saved as pending. Review identity and details before approval." + photoMessage);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save membership."); }
    finally { setBusy(false); }
  }
  async function setStatus(m: Member, status: string) {
    setBusy(true); setError(""); setNotice("");
    try {
      const { error } = await supabase.from("aasa_members").update({ status, updated_by: userId }).eq("id", m.id);
      if (error) throw error;
      await load(); setNotice("Membership status updated.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update status."); }
    finally { setBusy(false); }
  }
  async function linkAccount(m: Member) {
    setBusy(true); setError(""); setNotice("");
    try { const { error } = await supabase.rpc("aasa_link_member_account_by_email", { p_member_id: m.id }); if (error) throw error; await load(); setNotice("Member account linked after confirmed-email matching."); }
    catch (e) { const issue = e as { message?: string; details?: string; hint?: string; code?: string }; const message = [issue?.message, issue?.details, issue?.hint, issue?.code ? `Code: ${issue.code}` : ""].filter(Boolean).join(" — "); setError(message || (e instanceof Error ? e.message : "Could not link account. Check the account, verified email and membership.review permission.")); }
    finally { setBusy(false); }
  }
  async function issueCard(m: Member) {
    setBusy(true); setError(""); setNotice("");
    try { const { error } = await supabase.rpc("aasa_issue_member_card", { p_member_id: m.id }); if (error) throw error; await load(); setNotice("Membership card issued. Open View / print to render the member photo and QR verification code."); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not issue card."); }
    finally { setBusy(false); }
  }
  async function openCard(member: Member, card: MemberCard) {
    setBusy(true); setError(""); setNotice("");
    try {
      let photoUrl = "";
      if (member.photo_path) {
        const { data, error } = await supabase.storage.from("aasa-documents").createSignedUrl(member.photo_path, 300);
        if (error) throw error;
        photoUrl = data.signedUrl;
      }
      const verifyUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
      verifyUrl.searchParams.set("verify", card.qr_token);
      const qrUrl = await QRCode.toDataURL(verifyUrl.toString(), { width: 260, margin: 1, errorCorrectionLevel: "M" });
      setCardPreview({ member, card, photoUrl, qrUrl });
    } catch (e) { setError(e instanceof Error ? e.message : "Could not prepare the membership card."); }
    finally { setBusy(false); }
  }
  async function revokeCard(card: MemberCard) {
    setBusy(true); setError(""); setNotice("");
    try { const { error } = await supabase.rpc("aasa_revoke_member_card", { p_card_id: card.id }); if (error) throw error; await load(); setNotice("Membership card revoked."); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not revoke card."); }
    finally { setBusy(false); }
  }
  const filtered = rows.filter(m =>
    (statusFilter === "all" || m.status === statusFilter) &&
    [m.full_name,m.member_number,m.email ?? "",m.phone ?? "",m.status].some(v => v.toLowerCase().includes(query.toLowerCase()))
  );
  return <div className="aasa-module-work">
    <section className="aasa-panel">
      <div className="aasa-section-heading"><div><p className="aasa-kicker">MEMBERSHIP REGISTER</p><h3>Register a member</h3></div><span className="aasa-pill">{rows.length} records loaded</span></div>
      <form className="aasa-member-form" onSubmit={add}>
        {editingId && <p className="aasa-notice aasa-full-span">Editing {rows.find(m=>m.id===editingId)?.member_number}. Saving changes will not change membership status or existing card validity.</p>}
        <label>Full name *<input required minLength={2} maxLength={160} value={name} onChange={e=>setName(e.target.value)} autoComplete="name" /></label>
        <label>Email address<input type="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" /></label>
        <label>Phone number<input type="tel" maxLength={40} value={phone} onChange={e=>setPhone(e.target.value)} autoComplete="tel" /></label>
        <label>Date of birth<input type="date" value={dob} max={new Date().toISOString().slice(0,10)} onChange={e=>setDob(e.target.value)} /></label>
        <label>Gender<select value={gender} onChange={e=>setGender(e.target.value)}><option value="">Prefer not to say / Not provided</option><option value="male">Male</option><option value="female">Female</option><option value="prefer_not_to_say">Prefer not to say</option></select></label>
        <label>Membership type<select value={type} onChange={e=>setType(e.target.value)}><option value="ordinary">Ordinary</option><option value="associate">Associate</option><option value="honorary">Honorary</option><option value="life">Life</option></select></label>
        <label>Country of residence<select value={countryOfResidence} onChange={e=>{setCountryOfResidence(e.target.value);setStateOfResidence("");setLga("");setWard(""); setOtherWardValue("");setCityOfResidence("");setOtherCityOfResidence("");}} autoComplete="country-name"><option value="Nigeria">Nigeria</option><option value="Niger">Niger</option><option value="Cameroon">Cameroon</option><option value="Chad">Chad</option><option value="Ghana">Ghana</option><option value="Other">Other country</option></select></label>
        {countryOfResidence === "Other" && <label>Specify country<input required maxLength={100} value={otherCountry} onChange={e=>setOtherCountry(e.target.value)} /></label>}
        <label>State of residence<select value={stateOfResidence} onChange={e=>{setStateOfResidence(e.target.value);setLga("");setWard("");setOtherWardValue("");setCityOfResidence("");setOtherCityOfResidence("");}} autoComplete="address-level1"><option value="">Select state</option>{adminStates.map(s=><option key={s.id} value={s.name_en === "Federal Capital Territory" ? "Federal Capital Territory (FCT)" : s.name_en}>{s.name_en === "Federal Capital Territory" ? "Federal Capital Territory (FCT)" : s.name_en}</option>)}{stateOfResidence && !adminStates.some(s => s.name_en === stateOfResidence || (stateOfResidence === "Federal Capital Territory (FCT)" && s.name_en === "Federal Capital Territory")) && <option value={stateOfResidence}>{stateOfResidence}</option>}</select></label>
        <label>State Capital<input value={STATE_CAPITALS[stateOfResidence] ?? ""} readOnly placeholder="Automatically shown after selecting a state" aria-label="State capital" /></label>
        {countryOfResidence === "Nigeria" ? <label>Local Government Area (LGA)<select value={lga} disabled={!stateOfResidence || locationLoading} onChange={e=>{setLga(e.target.value);setCityOfResidence("");setOtherCityOfResidence("");setWard("");setOtherWardValue("");}}><option value="">{stateOfResidence ? "Select LGA" : "Select state first"}</option>{adminLgas.map(x=><option key={x.id} value={x.name_en}>{x.name_en}</option>)}{lga && !adminLgas.some(x=>x.name_en===lga) && <option value={lga}>{lga}</option>}</select></label> : <label>Local Government Area (LGA)<input maxLength={120} value={lga} onChange={e=>setLga(e.target.value)} placeholder="Enter LGA" /></label>}
        {countryOfResidence === "Nigeria" ? <label>City / Town<select value={cityOfResidence} disabled={!lga || locationLoading} onChange={e=>{setCityOfResidence(e.target.value);setOtherCityOfResidence("");}} autoComplete="address-level2"><option value="">{lga ? (locationLoading ? "Loading settlements…" : "Select city or town") : "Select LGA first"}</option>{grid3Settlements.map(city=><option key={city} value={city}>{city}</option>)}{cityOfResidence && cityOfResidence !== "Other" && !grid3Settlements.includes(cityOfResidence) && <option value={cityOfResidence}>{cityOfResidence}</option>}<option value="Other">Other / not listed</option></select></label> : <label>City / Town<input maxLength={120} value={cityOfResidence} onChange={e=>setCityOfResidence(e.target.value)} autoComplete="address-level2" placeholder="Enter city or town" /></label>}{cityOfResidence === "Other" && <label>Enter city / town<input required maxLength={120} value={otherCityOfResidence} onChange={e=>setOtherCityOfResidence(e.target.value)} placeholder="Enter city or town" /></label>}
        <label>Ward<select value={ward} disabled={countryOfResidence === "Nigeria" && (!lga || locationLoading)} onChange={e=>{setWard(e.target.value);setOtherWardValue("");}}><option value="">{countryOfResidence === "Nigeria" ? (lga ? (locationLoading ? "Loading wards…" : "Select ward") : "Select LGA first") : "Select ward"}</option>{(countryOfResidence === "Nigeria" ? adminWards.map(x=>x.name_en) : []).map(w=><option key={w} value={w}>{w}</option>)}{ward && ward !== "Other / not listed" && !adminWards.some(x=>x.name_en===ward) && <option value={ward}>{ward}</option>}<option value="Other / not listed">Other / not listed</option></select></label>{ward === "Other / not listed" && <label>Specify ward<input required maxLength={120} value={otherWardValue} onChange={e=>setOtherWardValue(e.target.value)} placeholder="Enter ward name" /></label>}
        {locationError && <p className="aasa-error aasa-full-span" role="alert">{locationError}</p>}
        <label>Residential address<textarea rows={2} maxLength={500} value={address} onChange={e=>setAddress(e.target.value)} autoComplete="street-address" /></label>
        <label>Nationality<select value={nationality} onChange={e=>setNationality(e.target.value)}><option value="Nigerian">Nigerian</option><option value="Nigerien">Nigerien</option><option value="Cameroonian">Cameroonian</option><option value="Chadian">Chadian</option><option value="Ghanaian">Ghanaian</option><option value="Other">Other nationality</option></select></label>
        {nationality === "Other" && <label>Specify nationality<input required maxLength={100} value={otherNationality} onChange={e=>setOtherNationality(e.target.value)} /></label>}
        <label>Occupation / profession<select value={occupation} onChange={e=>{setOccupation(e.target.value);setOtherOccupation("");}}><option value="">Select occupation</option>{["Student","Teacher / Lecturer","School Administrator","Civil Servant","Healthcare Worker","Business Owner / Trader","Farmer","Artisan / Technician","Driver / Transport Worker","Engineer","Accountant / Finance","IT / Technology","Religious Worker","Lawyer / Legal","Security / Armed Forces","NGO / Community Worker","Unemployed","Retired","Other"].map(s=><option key={s} value={s}>{s}</option>)}</select></label>
        {occupation === "Other" && <label>Specify occupation<input required maxLength={120} value={otherOccupation} onChange={e=>setOtherOccupation(e.target.value)} /></label>}
        <label>Emergency contact name<input maxLength={160} value={emergencyName} onChange={e=>setEmergencyName(e.target.value)} /></label>
        <label>Emergency contact relationship<select value={emergencyRelationship} onChange={e=>setEmergencyRelationship(e.target.value)}><option value="">Select relationship</option>{["Parent","Spouse","Child","Sibling","Guardian","Relative","Friend","Other"].map(s=><option key={s} value={s}>{s}</option>)}</select></label>
        <label>Emergency contact phone<input type="tel" maxLength={30} value={emergencyPhone} onChange={e=>setEmergencyPhone(e.target.value)} /></label>
        <label>Member photo (optional)<input type="file" accept="image/jpeg,image/png" onChange={e=>setPhotoFile(e.target.files?.[0] ?? null)} />{photoFile && <small>{photoFile.name} · {(photoFile.size / 1024).toFixed(0)} KB</small>}</label>
        <label>Administrative notes (restricted)<textarea rows={2} maxLength={1000} value={notes} onChange={e=>setNotes(e.target.value)} /></label>
        <label className="aasa-full-span" style={{display:"flex",alignItems:"flex-start",gap:".65rem"}}>
          <input type="checkbox" checked={membershipConsent} onChange={e=>setMembershipConsent(e.target.checked)} required={!editingId} style={{width:"auto",marginTop:".25rem"}} />
          <span>I confirm the details provided are accurate and consent to AASA using these details for membership administration and association communications. <strong>*</strong></span>
        </label>
        <button className="aasa-primary" disabled={busy}>{busy ? "Saving…" : editingId ? "Save member changes" : "Save pending member"}</button>
        {editingId && <button type="button" className="aasa-secondary" disabled={busy} onClick={()=>{setEditingId(null);setName("");setEmail("");setPhone("");setDob("");setGender("");setAddress("");setCityOfResidence("");setOtherCityOfResidence("");setNotes("");setEmergencyName("");setEmergencyRelationship("");setEmergencyPhone("");setOccupation("");setStateOfResidence("");setLga("");setWard(""); setOtherWardValue("");setMembershipConsent(false);setType("ordinary");setPhotoFile(null);}}>Cancel editing</button>}
      </form>
      <p className="aasa-muted">Required: full name, at least one contact method, and declaration for new registrations. Nationality, emergency contact, occupation and location are optional. Nigeria State, LGA, Ward and GRID3 City / Town options load from their respective data sources; City / Town and Ward are independently selected. Do not enter passwords, ID numbers or unnecessary sensitive information in notes. Member photos accept JPG/PNG up to 5 MB. Cards can be issued only after membership approval.</p>
    </section>
    <section className="aasa-panel">
      <div className="aasa-section-heading"><div><p className="aasa-kicker">OFFICIAL REGISTER</p><h3>Members</h3></div>
        <div className="aasa-register-filters"><input aria-label="Search members" placeholder="Search name, number, email, phone…" value={query} onChange={e=>setQuery(e.target.value)} />
        <select aria-label="Filter by membership status" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">All statuses</option><option value="pending">Pending</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="inactive">Inactive</option><option value="rejected">Rejected</option></select></div>
      </div>
      {filtered.length ? <div className="aasa-table-wrap"><table className="aasa-table"><thead><tr><th>Member no.</th><th>Name & details</th><th>Contact</th><th>Type</th><th>Status</th><th>Joined</th><th>Card</th><th>Review</th></tr></thead><tbody>{filtered.map(m=><tr key={m.id}>
        <td>{m.member_number}</td><td><strong>{m.full_name}</strong><br/><small>DOB: {m.date_of_birth || "—"} · Gender: {m.gender || "—"}</small>{m.address && <><br/><small>{m.address}</small></>}{(m.state_of_residence || m.local_government_area) && <><br/><small>{[m.local_government_area,m.state_of_residence].filter(Boolean).join(", ")}</small></>}{m.nationality && <><br/><small>Nationality: {m.nationality}</small></>}{m.country_of_residence && <><br/><small>Country: {m.country_of_residence}</small></>}{m.city_of_residence && <><br/><small>City/Town: {m.city_of_residence}</small></>}{m.ward && <><br/><small>Ward: {m.ward}</small></>}{m.occupation && <><br/><small>Occupation: {m.occupation}</small></>}{m.emergency_contact_name && <><br/><small>Emergency: {m.emergency_contact_name} ({m.emergency_contact_relationship || "contact"}) · {m.emergency_contact_phone || "—"}</small></>}{m.notes && <><br/><small>Admin note: {m.notes}</small></>}</td>
        <td>{m.email || "—"}<br/>{m.phone || "—"}</td><td>{m.membership_type}</td><td><span className="aasa-pill">{m.status}</span></td><td>{m.joined_on}</td>
        <td>{m.status==="active"&&m.email&&!m.auth_user_id&&<button type="button" className="aasa-secondary" disabled={busy} onClick={()=>void linkAccount(m)}>Link verified account</button>}{m.auth_user_id&&<small>Verified account linked</small>}{cards.filter(card=>card.member_id===m.id&&card.status==="active").map(card=><div key={card.id}>{card.card_number}<br/><small>Issued {new Date(card.issued_at).toLocaleDateString()}</small><br/><button type="button" className="aasa-secondary" disabled={busy} onClick={()=>void openCard(m,card)}>View / print</button><button type="button" className="aasa-link" disabled={busy} onClick={()=>void revokeCard(card)}>Revoke card</button></div>)}{m.status==="active"&&!cards.some(card=>card.member_id===m.id&&card.status==="active")&&<button type="button" className="aasa-secondary" disabled={busy} onClick={()=>void issueCard(m)}>Issue card</button>}</td>
        <td><button type="button" className="aasa-secondary" disabled={busy} onClick={()=>{setEditingId(m.id);setName(m.full_name);setEmail(m.email??"");setPhone(m.phone??"");setDob(m.date_of_birth??"");setGender(m.gender??"");setAddress(m.address??"");setCityOfResidence(m.city_of_residence??"");setOtherCityOfResidence("");setNotes(m.notes??"");setEmergencyName(m.emergency_contact_name??"");setEmergencyRelationship(m.emergency_contact_relationship??"");setEmergencyPhone(m.emergency_contact_phone??"");setOccupation(["Student","Teacher / Lecturer","School Administrator","Civil Servant","Healthcare Worker","Business Owner / Trader","Farmer","Artisan / Technician","Driver / Transport Worker","Engineer","Accountant / Finance","IT / Technology","Religious Worker","Lawyer / Legal","Security / Armed Forces","NGO / Community Worker","Unemployed","Retired","Other"].includes(m.occupation??"") ? (m.occupation??"") : "Other");setOtherOccupation(m.occupation && !["Student","Teacher / Lecturer","School Administrator","Civil Servant","Healthcare Worker","Business Owner / Trader","Farmer","Artisan / Technician","Driver / Transport Worker","Engineer","Accountant / Finance","IT / Technology","Religious Worker","Lawyer / Legal","Security / Armed Forces","NGO / Community Worker","Unemployed","Retired"].includes(m.occupation) ? m.occupation : "");setCountryOfResidence(["Nigeria","Niger","Cameroon","Chad","Ghana","Other"].includes(m.country_of_residence??"") ? (m.country_of_residence??"Nigeria") : "Other");setOtherCountry(m.country_of_residence && !["Nigeria","Niger","Cameroon","Chad","Ghana"].includes(m.country_of_residence) ? m.country_of_residence : "");setStateOfResidence(m.state_of_residence??"");setLga(m.local_government_area??"");setWard(m.ward??"");setOtherWardValue("");setNationality(["Nigerian","Nigerien","Cameroonian","Chadian","Ghanaian","Other"].includes(m.nationality??"") ? (m.nationality??"Nigerian") : "Other");setOtherNationality(m.nationality && !["Nigerian","Nigerien","Cameroonian","Chadian","Ghanaian"].includes(m.nationality) ? m.nationality : "");setMembershipConsent(m.membership_consent??false);setType(m.membership_type);setPhotoFile(null);window.scrollTo({top:0,behavior:"smooth"});}}>Edit details</button><br/>{m.status === "pending" ? <><button type="button" className="aasa-secondary" disabled={busy} onClick={()=>void setStatus(m,"active")}>Approve</button> <button type="button" className="aasa-link" disabled={busy} onClick={()=>void setStatus(m,"rejected")}>Reject</button></> : m.status === "active" ? <button type="button" className="aasa-secondary" disabled={busy} onClick={()=>void setStatus(m,"suspended")}>Suspend</button> : m.status === "suspended" ? <button type="button" className="aasa-secondary" disabled={busy} onClick={()=>void setStatus(m,"active")}>Reactivate</button> : "—"}</td>
      </tr>)}</tbody></table></div> : <p className="aasa-muted">No matching membership records. Add verified records using the form above.</p>}
    </section>{notice && <p className="aasa-notice" role="status">{notice}</p>}{error && <p className="aasa-error" role="alert">{error}</p>}
    {cardPreview && <div className="aasa-card-overlay" role="dialog" aria-modal="true" aria-label="Membership card preview">
      <div className="aasa-card-dialog"><div className="aasa-card-actions"><strong>Membership card preview</strong><button type="button" className="aasa-secondary" onClick={()=>setCardPreview(null)}>Close</button></div>
        <article className="aasa-print-card"><div className="aasa-print-card-head"><strong>AASA</strong><span>ABU-AIMAN STUDENTS’ ASSOCIATION<br/><small>العلم نور</small></span></div>
          <div className="aasa-print-card-body">{cardPreview.photoUrl ? <img className="aasa-member-photo" src={cardPreview.photoUrl} alt={cardPreview.member.full_name} /> : <div className="aasa-member-photo aasa-photo-placeholder">PHOTO</div>}
            <div className="aasa-print-card-details"><h2>{cardPreview.member.full_name}</h2><p>Member: {cardPreview.member.member_number}</p><p>Card: {cardPreview.card.card_number}</p><p>{cardPreview.member.membership_type.toUpperCase()} MEMBER</p><p>Issued: {new Date(cardPreview.card.issued_at).toLocaleDateString()}</p><p>Status: ACTIVE</p></div>
            <img className="aasa-card-qr" src={cardPreview.qrUrl} alt="QR code to verify this membership card" /></div>
          <footer>Scan QR to verify membership status. Not a government-issued identity document.</footer>
        </article><button type="button" className="aasa-primary" onClick={()=>window.print()}>Print membership card</button>
      </div>
    </div>}
  </div>;
}
