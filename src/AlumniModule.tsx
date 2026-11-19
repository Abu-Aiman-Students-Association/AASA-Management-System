import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "./lib/supabase";

type AlumniRecord = {
  id: string;
  member_id: string | null;
  graduation_year: number | null;
  qualification: string | null;
  institution: string | null;
  current_occupation: string | null;
  employer: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  location: string | null;
  engagement_status: "active" | "inactive" | "deceased";
  notes: string | null;
  created_at: string;
  graduation_evidence_reference: string | null;
  graduation_verification_status: "pending" | "verified" | "rejected";
  graduation_verified_at: string | null;
  graduation_verified_by: string | null;
  graduation_review_notes: string | null;
};
type MemberOption = { id: string; member_number: string; full_name: string; status: string };
type FormState = {
  member_id: string;
  graduation_year: string;
  qualification: string;
  institution: string;
  current_occupation: string;
  employer: string;
  contact_email: string;
  contact_phone: string;
  location: string;
  engagement_status: "active" | "inactive" | "deceased";
  notes: string;
  graduation_evidence_reference: string;
  graduation_review_notes: string;
};
const emptyForm: FormState = {
  member_id: "", graduation_year: "", qualification: "", institution: "",
  current_occupation: "", employer: "", contact_email: "", contact_phone: "",
  location: "", engagement_status: "active", notes: "", graduation_evidence_reference: "", graduation_review_notes: ""
};
const copy = {
  en: {
    eyebrow: "ALUMNI RELATIONS · VERIFIED MEMBER LINKAGE", title: "Alumni register",
    intro: "Maintain alumni profiles linked to the original AASA membership record. Membership remains the single source of identity.",
    total: "Alumni records", active: "Active alumni", inactive: "Inactive / deceased",
    add: "Add alumni record", edit: "Update alumni record", save: "Save record", saving: "Saving…",
    cancel: "Cancel", refresh: "Refresh", search: "Search name, member number, institution…",
    member: "AASA member", choose: "Select a verified member", year: "Graduation year",
    qualification: "Qualification", institution: "Institution", occupation: "Current occupation",
    employer: "Employer", email: "Contact email", phone: "Contact phone", location: "Location",
    status: "Engagement status", notes: "Notes", activeStatus: "Active", inactiveStatus: "Inactive",
    deceased: "Deceased", memberName: "Member", yearLabel: "Graduation", actions: "Actions",
    noRecords: "No alumni records yet. Add a genuine alumni record when the association has verified the member's graduation details.",
    noMembers: "Member lookup is unavailable. The account needs Membership read permission to link an alumni record.",
    readOnly: "Read-only access", export: "Export CSV", saved: "Alumni record saved.",
    required: "Select an existing AASA member and enter a valid graduation year.",
    loadError: "Could not load alumni records.", saveError: "Could not save the alumni record.",
    linked: "Linked to membership", noLink: "Membership record unavailable", evidence: "Graduation evidence reference", reviewNotes: "Verification review notes", verification: "Graduation verification", pending: "Pending verification", verified: "Verified", rejected: "Rejected", verify: "Approve graduation", reject: "Reject evidence", requiredEvidence: "Qualification, institution and evidence reference are required before approval.", rejectReason: "Add a review note explaining why this evidence is rejected before submitting the decision.",
  },
  ha: {
    eyebrow: "ALAƘAR TSOFFIN MEMBOBI · HAƊIN BAYANAI", title: "Rajistar tsofaffin membobi",
    intro: "Adana bayanan tsofaffin membobi tare da haɗa su da ainihin bayanan membobinsu na AASA.",
    total: "Jimillar bayanai", active: "Masu aiki", inactive: "Marasa aiki / rasu",
    add: "Ƙara tsohon memba", edit: "Gyara bayanin tsohon memba", save: "Ajiye", saving: "Ana ajiyewa…",
    cancel: "Soke", refresh: "Sabunta", search: "Nemi suna, lambar memba ko makaranta…",
    member: "Memba na AASA", choose: "Zaɓi ingantaccen memba", year: "Shekarar kammala karatu",
    qualification: "Takardar karatu", institution: "Makaranta", occupation: "Aikin yanzu",
    employer: "Ma'aikaci", email: "Imel", phone: "Lambar waya", location: "Wuri",
    status: "Matsayin hulɗa", activeStatus: "Mai aiki", inactiveStatus: "Ba ya aiki",
    deceased: "Ya rasu", notes: "Ƙarin bayani", memberName: "Memba", yearLabel: "Shekara", actions: "Ayyuka",
    noRecords: "Babu bayanan tsofaffin membobi tukuna. A saka bayanan gaskiya bayan an tabbatar.",
    noMembers: "Ba a samu damar neman membobi ba. Ana buƙatar izinin karanta Membership.",
    readOnly: "Izinin karantawa kawai", export: "Fitar da CSV", saved: "An ajiye bayanin tsohon memba.",
    required: "Zaɓi memba na AASA sannan ka shigar da shekarar kammala karatu da ta dace.",
    loadError: "An kasa loda bayanan tsofaffin membobi.", saveError: "An kasa ajiye bayanin.",
    linked: "An haɗa da Membership", noLink: "Ba a samu bayanan memba ba", evidence: "Shaidar kammala karatu (lamba/mahada)", reviewNotes: "Bayanan tantancewa", verification: "Tabbacin kammala karatu", pending: "Ana jiran tantancewa", verified: "An tantance", rejected: "An ƙi shaida", verify: "Amince da kammala karatu", reject: "Ƙi shaidar", requiredEvidence: "Dole a cika takardar karatu, makaranta da bayanin shaida kafin amincewa.", rejectReason: "A rubuta dalilin ƙin shaidar a bayanan tantancewa kafin aika hukuncin.",
  },
  ar: {
    eyebrow: "علاقات الخريجين · ربط العضوية الموثقة", title: "سجل الخريجين",
    intro: "إدارة ملفات الخريجين المرتبطة بسجل عضوية AASA الأصلي مع الحفاظ على هوية موحدة.",
    total: "إجمالي السجلات", active: "الخريجون النشطون", inactive: "غير نشط / متوفى",
    add: "إضافة سجل خريج", edit: "تحديث سجل الخريج", save: "حفظ السجل", saving: "جارٍ الحفظ…",
    cancel: "إلغاء", refresh: "تحديث", search: "ابحث بالاسم أو رقم العضوية أو المؤسسة…",
    member: "عضو AASA", choose: "اختر عضواً موثقاً", year: "سنة التخرج",
    qualification: "المؤهل", institution: "المؤسسة التعليمية", occupation: "المهنة الحالية",
    employer: "جهة العمل", email: "البريد الإلكتروني", phone: "الهاتف", location: "الموقع",
    status: "حالة التواصل", activeStatus: "نشط", inactiveStatus: "غير نشط",
    deceased: "متوفى", notes: "ملاحظات", memberName: "العضو", yearLabel: "التخرج", actions: "الإجراءات",
    noRecords: "لا توجد سجلات خريجين بعد. أضف بيانات حقيقية بعد التحقق من التخرج.",
    noMembers: "البحث عن الأعضاء غير متاح. يلزم إذن قراءة العضوية لربط سجل الخريج.",
    readOnly: "صلاحية القراءة فقط", export: "تصدير CSV", saved: "تم حفظ سجل الخريج.",
    required: "اختر عضواً موجوداً في AASA وأدخل سنة تخرج صحيحة.",
    loadError: "تعذر تحميل سجلات الخريجين.", saveError: "تعذر حفظ سجل الخريج.",
    linked: "مرتبط بسجل العضوية", noLink: "سجل العضو غير متاح", evidence: "مرجع إثبات التخرج", reviewNotes: "ملاحظات المراجعة", verification: "التحقق من التخرج", pending: "بانتظار التحقق", verified: "تم التحقق", rejected: "مرفوض", verify: "اعتماد التخرج", reject: "رفض الإثبات", requiredEvidence: "المؤهل والمؤسسة ومرجع الإثبات مطلوبة قبل الاعتماد.", rejectReason: "يرجى كتابة سبب رفض الإثبات في ملاحظات المراجعة قبل اعتماد القرار.",
  }
};
const csvCell = (value: unknown) => '"' + String(value ?? "").replace(/"/g, '""') + '"';

export default function AlumniModule({ userId, canManage, canLookupMembers, lang }: {
  userId: string; canManage: boolean; canLookupMembers: boolean; lang: "en" | "ha" | "ar";
}) {
  const t = copy[lang];
  const [records, setRecords] = useState<AlumniRecord[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: readError } = await supabase
      .from("aasa_alumni_records")
      .select("id,member_id,graduation_year,qualification,institution,current_occupation,employer,contact_email,contact_phone,location,engagement_status,notes,created_at,graduation_evidence_reference,graduation_verification_status,graduation_verified_at,graduation_verified_by,graduation_review_notes")
      .order("graduation_year", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (readError) {
      setError(readError.message || t.loadError);
      setRecords([]);
      setLoading(false);
      return;
    }
    setRecords((data ?? []) as AlumniRecord[]);
    if (canLookupMembers) {
      const { data: memberRows, error: memberError } = await supabase
        .from("aasa_members")
        .select("id,member_number,full_name,status")
        .eq("is_test_record", false)
        .eq("status", "active")
        .order("full_name", { ascending: true });
      if (!memberError) setMembers((memberRows ?? []) as MemberOption[]);
    }
    setLoading(false);
  }, [canLookupMembers, t.loadError]);

  useEffect(() => { void load(); }, [load]);

  const memberById = useMemo(() => new Map(members.map(member => [member.id, member])), [members]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return records;
    return records.filter(record => {
      const member = record.member_id ? memberById.get(record.member_id) : undefined;
      return [
        member?.full_name ?? "", member?.member_number ?? "", record.institution ?? "",
        record.qualification ?? "", record.current_occupation ?? "", record.location ?? ""
      ].some(value => value.toLowerCase().includes(q));
    });
  }, [records, query, memberById]);

  function startEdit(record: AlumniRecord) {
    setEditingId(record.id);
    setForm({
      member_id: record.member_id ?? "",
      graduation_year: record.graduation_year?.toString() ?? "",
      qualification: record.qualification ?? "",
      institution: record.institution ?? "",
      current_occupation: record.current_occupation ?? "",
      employer: record.employer ?? "",
      contact_email: record.contact_email ?? "",
      contact_phone: record.contact_phone ?? "",
      location: record.location ?? "",
      engagement_status: record.engagement_status,
      notes: record.notes ?? "",
      graduation_evidence_reference: record.graduation_evidence_reference ?? "",
      graduation_review_notes: record.graduation_review_notes ?? ""
    });
    setNotice("");
    setError("");
  }
  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setNotice("");
    setError("");
  }
  async function reviewGraduation(record: AlumniRecord, decision: "verified" | "rejected") {
    if (!canManage) return;
    if (decision === "verified" && (!record.graduation_year || !record.qualification?.trim() || !record.institution?.trim() || !record.graduation_evidence_reference?.trim())) {
      setError(t.requiredEvidence);
      return;
    }
    if (decision === "rejected" && !record.graduation_review_notes?.trim()) {
      setError(t.rejectReason);
      startEdit(record);
      return;
    }
    const { error: reviewError } = await supabase.from("aasa_alumni_records").update({
      graduation_verification_status: decision,
      graduation_verified_at: decision === "verified" ? new Date().toISOString() : null,
      graduation_verified_by: decision === "verified" ? userId : null,
      graduation_review_notes: record.graduation_review_notes?.trim() || null,
      updated_by: userId
    }).eq("id", record.id);
    if (reviewError) setError(reviewError.message || t.saveError);
    else { setNotice(decision === "verified" ? t.verified : t.rejected); await load(); }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!canManage || saving) return;
    const year = Number(form.graduation_year);
    const currentYear = new Date().getFullYear();
    if (!form.member_id || !Number.isInteger(year) || year < 1900 || year > currentYear) {
      setError(t.required);
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    const payload = {
      member_id: form.member_id,
      graduation_year: year,
      qualification: form.qualification.trim() || null,
      institution: form.institution.trim() || null,
      current_occupation: form.current_occupation.trim() || null,
      employer: form.employer.trim() || null,
      contact_email: form.contact_email.trim().toLowerCase() || null,
      contact_phone: form.contact_phone.trim() || null,
      location: form.location.trim() || null,
      engagement_status: form.engagement_status,
      notes: form.notes.trim() || null,
      graduation_evidence_reference: form.graduation_evidence_reference.trim() || null,
      graduation_review_notes: form.graduation_review_notes.trim() || null,
      updated_by: userId
    };
    const existing = editingId ? records.find(record => record.id === editingId) : undefined;
    const graduationChanged = !!existing && (
      existing.graduation_year !== year ||
      (existing.qualification ?? "") !== (payload.qualification ?? "") ||
      (existing.institution ?? "") !== (payload.institution ?? "") ||
      (existing.graduation_evidence_reference ?? "") !== (payload.graduation_evidence_reference ?? "")
    );
    const result = editingId
      ? await supabase.from("aasa_alumni_records").update({ ...payload, ...(graduationChanged ? { graduation_verification_status: "pending", graduation_verified_at: null, graduation_verified_by: null } : {}) }).eq("id", editingId)
      : await supabase.from("aasa_alumni_records").insert({ ...payload, graduation_verification_status: "pending", created_by: userId });
    if (result.error) {
      setError(result.error.message || t.saveError);
    } else {
      setNotice(t.saved);
      resetForm();
      await load();
    }
    setSaving(false);
  }

  function exportCsv() {
    const rows = [
      ["Member number", "Full name", "Graduation year", "Qualification", "Institution", "Evidence reference", "Graduation verification", "Occupation", "Employer", "Email", "Phone", "Location", "Engagement status", "Notes"],
      ...filtered.map(record => {
        const member = record.member_id ? memberById.get(record.member_id) : undefined;
        return [member?.member_number ?? "", member?.full_name ?? record.member_id ?? "", record.graduation_year ?? "", record.qualification, record.institution, record.graduation_evidence_reference, record.graduation_verification_status, record.current_occupation, record.employer, record.contact_email, record.contact_phone, record.location, record.engagement_status, record.notes];
      })
    ];
    const blob = new Blob(["\uFEFF" + rows.map(row => row.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "AASA-alumni-register.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <div className="aasa-module-work">
    <section className="aasa-governance-hero">
      <div><p className="aasa-kicker">{t.eyebrow}</p><h3>{t.title}</h3><p>{t.intro}</p></div>
      <span className="aasa-pill active">{canManage ? "Manage access" : t.readOnly}</span>
    </section>
    {notice && <p className="aasa-notice" role="status">{notice}</p>}
    {error && <p className="aasa-error" role="alert">{error}</p>}
    <div className="aasa-overview-cards">
      <article><small>{t.total}</small><strong>{records.length}</strong></article>
      <article><small>{t.active}</small><strong>{records.filter(record => record.engagement_status === "active").length}</strong></article>
      <article><small>{t.inactive}</small><strong>{records.filter(record => record.engagement_status !== "active").length}</strong></article>
    </div>
    <section className="aasa-panel">
      <div className="aasa-section-heading">
        <div><p className="aasa-kicker">AASA · ALUMNI REGISTER</p><h3>{t.title}</h3></div>
        <div className="aasa-case-actions">
          <button className="aasa-secondary" type="button" onClick={() => void load()} disabled={loading || saving}>{loading ? "…" : t.refresh}</button>
          <button className="aasa-secondary" type="button" onClick={exportCsv} disabled={!filtered.length}>{t.export}</button>
        </div>
      </div>
      <div className="aasa-register-filters"><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t.search} aria-label={t.search} /></div>
      {canManage && <form className="aasa-member-form" onSubmit={save}>
        <label>{t.member}<select required value={form.member_id} onChange={event => setForm(previous => ({ ...previous, member_id: event.target.value }))} disabled={!canLookupMembers || saving}>
          <option value="">{t.choose}</option>
          {members.map(member => <option key={member.id} value={member.id}>{member.full_name} · {member.member_number} · {member.status}</option>)}
        </select></label>
        <label>{t.year}<input type="number" min="1900" max={new Date().getFullYear()} required value={form.graduation_year} onChange={event => setForm(previous => ({ ...previous, graduation_year: event.target.value }))} /></label>
        <label>{t.qualification}<input required value={form.qualification} onChange={event => setForm(previous => ({ ...previous, qualification: event.target.value }))} maxLength={160} /></label>
        <label>{t.institution}<input required value={form.institution} onChange={event => setForm(previous => ({ ...previous, institution: event.target.value }))} maxLength={200} /></label>
        <label className="aasa-full-span">{t.evidence}<input required value={form.graduation_evidence_reference} onChange={event => setForm(previous => ({ ...previous, graduation_evidence_reference: event.target.value }))} placeholder="Certificate number or secure document reference" maxLength={500} /></label>
        <label className="aasa-full-span">{t.reviewNotes}<textarea rows={2} value={form.graduation_review_notes} onChange={event => setForm(previous => ({ ...previous, graduation_review_notes: event.target.value }))} maxLength={1000} /></label>
        <label>{t.occupation}<input value={form.current_occupation} onChange={event => setForm(previous => ({ ...previous, current_occupation: event.target.value }))} maxLength={160} /></label>
        <label>{t.employer}<input value={form.employer} onChange={event => setForm(previous => ({ ...previous, employer: event.target.value }))} maxLength={160} /></label>
        <label>{t.email}<input type="email" value={form.contact_email} onChange={event => setForm(previous => ({ ...previous, contact_email: event.target.value }))} maxLength={254} /></label>
        <label>{t.phone}<input type="tel" value={form.contact_phone} onChange={event => setForm(previous => ({ ...previous, contact_phone: event.target.value }))} maxLength={40} /></label>
        <label>{t.location}<input value={form.location} onChange={event => setForm(previous => ({ ...previous, location: event.target.value }))} maxLength={180} /></label>
        <label>{t.status}<select value={form.engagement_status} onChange={event => setForm(previous => ({ ...previous, engagement_status: event.target.value as FormState["engagement_status"] }))}>
          <option value="active">{t.activeStatus}</option><option value="inactive">{t.inactiveStatus}</option><option value="deceased">{t.deceased}</option>
        </select></label>
        <label className="aasa-full-span">{t.notes}<textarea rows={3} value={form.notes} onChange={event => setForm(previous => ({ ...previous, notes: event.target.value }))} maxLength={2000} /></label>
        {!canLookupMembers && <p className="aasa-error aasa-full-span">{t.noMembers}</p>}
        <div className="aasa-case-actions aasa-full-span">
          <button className="aasa-primary" type="submit" disabled={saving || !canLookupMembers}>{saving ? t.saving : t.save}</button>
          {editingId && <button className="aasa-secondary" type="button" onClick={resetForm} disabled={saving}>{t.cancel}</button>}
        </div>
      </form>}
      <div className="aasa-table-wrap"><table className="aasa-table">
        <thead><tr><th>{t.memberName}</th><th>{t.yearLabel}</th><th>{t.qualification}</th><th>{t.institution}</th><th>{t.verification}</th><th>{t.status}</th>{canManage && <th>{t.actions}</th>}</tr></thead>
        <tbody>{filtered.map(record => {
          const member = record.member_id ? memberById.get(record.member_id) : undefined;
          return <tr key={record.id}>
            <td><strong>{member?.full_name ?? (record.member_id ? record.member_id.slice(0, 8) + "…" : t.noLink)}</strong><br/><small>{member?.member_number ?? t.noLink}</small></td>
            <td>{record.graduation_year ?? "—"}</td><td>{record.qualification ?? "—"}</td><td>{record.institution ?? "—"}</td>
            <td><span className={"aasa-pill " + (record.graduation_verification_status === "verified" ? "active" : "")}>{record.graduation_verification_status === "verified" ? t.verified : record.graduation_verification_status === "rejected" ? t.rejected : t.pending}</span></td>
            <td><span className="aasa-pill">{record.engagement_status}</span></td>
            {canManage && <td><div className="aasa-case-actions"><button className="aasa-secondary" type="button" onClick={() => startEdit(record)}>{t.edit}</button>{record.graduation_verification_status !== "verified" && record.graduation_year && record.qualification && record.institution && record.graduation_evidence_reference && <button className="aasa-primary" type="button" onClick={() => void reviewGraduation(record, "verified")}>{t.verify}</button>}{record.graduation_verification_status !== "rejected" && <button className="aasa-secondary" type="button" onClick={() => void reviewGraduation(record, "rejected")}>{t.reject}</button>}</div></td>}
          </tr>;
        })}</tbody>
      </table></div>
      {!filtered.length && !loading && <p className="aasa-muted">{t.noRecords}</p>}
      {loading && <p className="aasa-muted">Loading…</p>}
    </section>
  </div>;
}
