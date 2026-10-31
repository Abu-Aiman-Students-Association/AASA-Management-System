import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import QRCode from "qrcode";

type Member = {
  id: string; member_number: string; full_name: string; email: string | null;
  phone: string | null; membership_type: string; status: string; joined_on: string;
  date_of_birth: string | null; gender: string | null; address: string | null;
  photo_path: string | null; nationality: string | null; country_of_residence: string | null;
  state_of_residence: string | null; local_government_area: string | null; ward: string | null;
  occupation: string | null; city_of_residence: string | null;
};
type Card = { id: string; member_id: string; card_number: string; qr_token: string; status: string; issued_at: string; revoked_at: string | null };
type Preview = { member: Member; card: Card; photoUrl: string; qrUrl: string };
const capitals: Record<string,string> = { Abia:"Umuahia",Adamawa:"Yola","Akwa Ibom":"Uyo",Anambra:"Awka",Bauchi:"Bauchi",Bayelsa:"Yenagoa",Benue:"Makurdi",Borno:"Maiduguri","Cross River":"Calabar",Delta:"Asaba",Ebonyi:"Abakaliki",Edo:"Benin City",Ekiti:"Ado-Ekiti",Enugu:"Enugu","Federal Capital Territory (FCT)":"Abuja",Gombe:"Gombe",Imo:"Owerri",Jigawa:"Dutse",Kaduna:"Kaduna",Kano:"Kano",Katsina:"Katsina",Kebbi:"Birnin Kebbi",Kogi:"Lokoja",Kwara:"Ilorin",Lagos:"Ikeja",Nasarawa:"Lafia",Niger:"Minna",Ogun:"Abeokuta",Ondo:"Akure",Osun:"Osogbo",Oyo:"Ibadan",Plateau:"Jos",Rivers:"Port Harcourt",Sokoto:"Sokoto",Taraba:"Jalingo",Yobe:"Damaturu",Zamfara:"Gusau" };
const memberFields = "id,member_number,full_name,email,phone,membership_type,status,joined_on,date_of_birth,gender,address,photo_path,nationality,country_of_residence,state_of_residence,local_government_area,ward,occupation,city_of_residence";
export default function IDCenterModule({ lang, canIssue, canRevoke }: { lang: "en"|"ha"|"ar"; canIssue: boolean; canRevoke: boolean }) {
  const [members,setMembers] = useState<Member[]>([]);
  const [cards,setCards] = useState<Card[]>([]);
  const [query,setQuery] = useState("");
  const [filter,setFilter] = useState("all");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const [preview,setPreview] = useState<Preview|null>(null);
  const t = {
    en:{intro:"Issue, manage, print and verify official AASA membership identity cards.",total:"Total cards",active:"Active cards",revoked:"Revoked / expired",eligible:"Members eligible",register:"OFFICIAL ID REGISTER",search:"Search member name, member number or card number…",all:"All card statuses",activeFilter:"Active",revokedFilter:"Revoked",expired:"Expired",member:"Member",memberNo:"ID number",cardNo:"Card number",issued:"Issued",status:"Status",actions:"Actions",issue:"Issue ID card",view:"View / print",revoke:"Revoke card",none:"No ID card records found.",refresh:"Refresh",print:"Print membership card",close:"Close",confirm:"Revoke this identity card? The QR verification will no longer show it as valid.",loadError:"Could not load ID records. Check membership read permissions.",issuedNotice:"Identity card issued.",revokedNotice:"Identity card revoked.",eligibleNote:"Active members without an active ID card",front:"OFFICIAL MEMBERSHIP CARD",back:"AASA · MEMBER VERIFICATION",verify:"VERIFY MEMBERSHIP",scan:"Scan to confirm identity and current membership status.",details:"MEMBER DETAILS",notGovernment:"This card belongs to the named member. Not a government-issued identity document.",activeMember:"ACTIVE MEMBER",notActive:"NOT ACTIVE",memberType:"MEMBERSHIP TYPE",nationality:"NATIONALITY",country:"COUNTRY",state:"STATE",capital:"STATE CAPITAL",lga:"LGA",ward:"WARD",occupation:"OCCUPATION",phone:"PHONE",address:"ADDRESS",noPhoto:"PHOTO"},
    ha:{intro:"Samar da katin shaidar memba na AASA, sarrafawa, bugawa da tabbatarwa.",total:"Jimillar katuna",active:"Katuna masu aiki",revoked:"An soke / sun ƙare",eligible:"Membobin da suka cancanta",register:"JERIN KATUNAN SHAIDA",search:"Nemi suna, lambar memba ko lambar kati…",all:"Dukkan matsayi",activeFilter:"Mai aiki",revokedFilter:"An soke",expired:"Ya ƙare",member:"Memba",memberNo:"Lambar shaida",cardNo:"Lambar kati",issued:"An bayar",status:"Matsayi",actions:"Ayyuka",issue:"Bayar da katin shaida",view:"Duba / buga",revoke:"Soke kati",none:"Ba a sami katin shaida ba.",refresh:"Sabunta",print:"Buga katin memba",close:"Rufe",confirm:"A soke wannan kati? QR ɗinsa ba zai sake nuna shi a matsayin ingantacce ba.",loadError:"An kasa loda bayanan kati. Duba izinin karanta membobi.",issuedNotice:"An bayar da katin shaida.",revokedNotice:"An soke katin shaida.",eligibleNote:"Membobin da suke aiki amma ba su da kati mai aiki",front:"KATIN SHAIDAR MEMBA",back:"AASA · TABBATAR DA MEMBA",verify:"TABBATAR DA MEMBA",scan:"Duba QR domin tabbatar da mutum da matsayin membobinsa.",details:"BAYANAN MEMBA",notGovernment:"Katin na wanda aka rubuta sunansa ne. Ba katin shaidar gwamnati ba ne.",activeMember:"MEMBA MAI AIKI",notActive:"BA YA AIKI",memberType:"NAU'IN MEMBA",nationality:"ƘASA",country:"Ƙasar zama",state:"JIHA",capital:"BABBAR BIRNI",lga:"KARAMAR HUKUMA",ward:"UNGUWA",occupation:"SANA'A",phone:"WAYA",address:"ADIRESHI",noPhoto:"HOTO"},
    ar:{intro:"إصدار بطاقات عضوية AASA الرسمية وإدارتها وطباعتها والتحقق منها.",total:"إجمالي البطاقات",active:"البطاقات النشطة",revoked:"ملغاة / منتهية",eligible:"الأعضاء المؤهلون",register:"سجل بطاقات الهوية الرسمي",search:"ابحث بالاسم أو رقم العضو أو البطاقة…",all:"كل الحالات",activeFilter:"نشطة",revokedFilter:"ملغاة",expired:"منتهية",member:"العضو",memberNo:"رقم الهوية",cardNo:"رقم البطاقة",issued:"تاريخ الإصدار",status:"الحالة",actions:"الإجراءات",issue:"إصدار بطاقة",view:"عرض / طباعة",revoke:"إلغاء البطاقة",none:"لا توجد بطاقات.",refresh:"تحديث",print:"طباعة بطاقة العضوية",close:"إغلاق",confirm:"هل تريد إلغاء هذه البطاقة؟ لن يظهر رمز QR على أنه صالح بعد ذلك.",loadError:"تعذر تحميل سجلات الهوية. تحقق من صلاحية قراءة العضوية.",issuedNotice:"تم إصدار بطاقة الهوية.",revokedNotice:"تم إلغاء بطاقة الهوية.",eligibleNote:"الأعضاء النشطون الذين لا يملكون بطاقة نشطة",front:"بطاقة العضوية الرسمية",back:"AASA · التحقق من العضوية",verify:"التحقق من العضوية",scan:"امسح للتأكد من الهوية وحالة العضوية الحالية.",details:"بيانات العضو",notGovernment:"هذه البطاقة تخص العضو المذكور وليست وثيقة هوية حكومية.",activeMember:"عضو نشط",notActive:"غير نشط",memberType:"نوع العضوية",nationality:"الجنسية",country:"بلد الإقامة",state:"الولاية",capital:"عاصمة الولاية",lga:"المنطقة المحلية",ward:"الحي",occupation:"المهنة",phone:"الهاتف",address:"العنوان",noPhoto:"صورة"}
  }[lang];
  async function load() {
    setError("");
    const [m,c] = await Promise.all([
      supabase.from("aasa_members").select(memberFields).order("created_at",{ascending:false}).limit(500),
      supabase.from("aasa_member_cards").select("id,member_id,card_number,qr_token,status,issued_at,revoked_at").order("issued_at",{ascending:false}).limit(1000)
    ]);
    if(m.error) throw m.error;
    if(c.error) throw c.error;
    setMembers((m.data??[]) as Member[]);
    setCards((c.data??[]) as Card[]);
  }
  useEffect(()=>{void load().catch(e=>setError(e instanceof Error?e.message:"Could not load ID records."));},[]);
  const memberById = useMemo(()=>new Map(members.map(m=>[m.id,m])),[members]);
  const activeCount = cards.filter(c=>c.status==="active").length;
  const revokedCount = cards.filter(c=>c.status==="revoked"||c.status==="expired").length;
  const eligible = members.filter(m=>m.status==="active"&&!cards.some(c=>c.member_id===m.id&&c.status==="active")).length;
  const filtered = cards.filter(c=>{
    const m=memberById.get(c.member_id);
    const matchesStatus=filter==="all"||c.status===filter;
    const q=query.trim().toLowerCase();
    const matchesQuery=!q||[m?.full_name??"",m?.member_number??"",c.card_number].some(v=>v.toLowerCase().includes(q));
    return matchesStatus&&matchesQuery;
  });
  async function issue(member: Member) {
    setBusy(true);setError("");setNotice("");
    try { const {error:e}=await supabase.rpc("aasa_issue_member_card",{p_member_id:member.id});if(e)throw e;await load();setNotice(t.issuedNotice); }
    catch(e){setError(e instanceof Error?e.message:"Could not issue identity card.");}
    finally{setBusy(false);}
  }
  async function revoke(card: Card) {
    if(!window.confirm(t.confirm))return;
    setBusy(true);setError("");setNotice("");
    try {const {error:e}=await supabase.rpc("aasa_revoke_member_card",{p_card_id:card.id});if(e)throw e;await load();setNotice(t.revokedNotice);}
    catch(e){setError(e instanceof Error?e.message:"Could not revoke identity card.");}
    finally{setBusy(false);}
  }
  async function openCard(card: Card) {
    const member=memberById.get(card.member_id);if(!member)return;
    setBusy(true);setError("");
    try {
      let photoUrl="";
      if(member.photo_path){const {data,error:e}=await supabase.storage.from("aasa-documents").createSignedUrl(member.photo_path,300);if(e)throw e;photoUrl=data.signedUrl;}
      const verifyUrl=new URL(import.meta.env.BASE_URL,window.location.origin);verifyUrl.searchParams.set("verify",card.qr_token);
      const qrUrl=await QRCode.toDataURL(verifyUrl.toString(),{width:512,margin:4,errorCorrectionLevel:"M"});
      setPreview({member,card,photoUrl,qrUrl});
    } catch(e){setError(e instanceof Error?e.message:"Could not prepare card preview.");}
    finally{setBusy(false);}
  }
  const date=(value:string)=>new Date(value).toLocaleDateString();
  return <div className="aasa-module-work">
    <section className="aasa-overview-cards aasa-live-metrics">
      <article><span className="aasa-card-icon">▣</span><small>{t.total}</small><strong>{cards.length}</strong><p>AASA identity card register</p></article>
      <article><span className="aasa-card-icon">✓</span><small>{t.active}</small><strong>{activeCount}</strong><p>Cards currently marked active</p></article>
      <article><span className="aasa-card-icon">⊘</span><small>{t.revoked}</small><strong>{revokedCount}</strong><p>Revoked or expired card records</p></article>
      <article><span className="aasa-card-icon">♙</span><small>{t.eligible}</small><strong>{eligible}</strong><p>{t.eligibleNote}</p></article>
    </section>
    <section className="aasa-panel">
      <div className="aasa-section-heading"><div><p className="aasa-kicker">AASA ID CENTER · CARD OPERATIONS</p><h3>{t.register}</h3><p className="aasa-muted">{t.intro}</p></div><button type="button" className="aasa-secondary" disabled={busy} onClick={()=>void load().catch(e=>setError(e instanceof Error?e.message:t.loadError))}>{t.refresh}</button></div>
      <div className="aasa-register-filters"><input aria-label={t.search} placeholder={t.search} value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label={t.status} value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">{t.all}</option><option value="active">{t.activeFilter}</option><option value="revoked">{t.revokedFilter}</option><option value="expired">{t.expired}</option></select></div>
      {filtered.length>0?<div className="aasa-table-wrap"><table className="aasa-table"><thead><tr><th>{t.member}</th><th>{t.memberNo}</th><th>{t.cardNo}</th><th>{t.issued}</th><th>{t.status}</th><th>{t.actions}</th></tr></thead><tbody>{filtered.map(card=>{const m=memberById.get(card.member_id);return <tr key={card.id}><td><strong>{m?.full_name??"—"}</strong><br/><small>{m?.email||m?.phone||""}</small></td><td>{m?.member_number??"—"}</td><td>{card.card_number}</td><td>{date(card.issued_at)}</td><td><span className={"aasa-pill "+(card.status==="active"?"active":"")}>{card.status}</span></td><td><button type="button" className="aasa-secondary" disabled={busy||!m} onClick={()=>void openCard(card)}>{t.view}</button>{canRevoke&&card.status==="active"&&<button type="button" className="aasa-link" disabled={busy} onClick={()=>void revoke(card)}>{t.revoke}</button>}</td></tr>;})}</tbody></table></div>:<p className="aasa-muted">{t.none}</p>}
    </section>
    {canIssue&&<section className="aasa-panel"><div className="aasa-section-heading"><div><p className="aasa-kicker">ISSUANCE · ACTIVE MEMBERS ONLY</p><h3>{t.eligible}</h3></div></div><div className="aasa-table-wrap"><table className="aasa-table"><thead><tr><th>{t.member}</th><th>{t.memberNo}</th><th>{t.status}</th><th>{t.actions}</th></tr></thead><tbody>{members.filter(m=>m.status==="active"&&!cards.some(c=>c.member_id===m.id&&c.status==="active")).map(m=><tr key={m.id}><td><strong>{m.full_name}</strong></td><td>{m.member_number}</td><td><span className="aasa-pill active">{m.status}</span></td><td><button type="button" className="aasa-primary" disabled={busy} onClick={()=>void issue(m)}>{t.issue}</button></td></tr>)}</tbody></table></div>{eligible===0&&<p className="aasa-muted">{t.eligibleNote}: 0</p>}</section>}
    {notice&&<p className="aasa-notice" role="status">{notice}</p>}{error&&<p className="aasa-error" role="alert">{error}</p>}
    {preview&&<div className="aasa-card-overlay" role="dialog" aria-modal="true" aria-label="Membership card preview"><div className="aasa-card-dialog"><div className="aasa-card-actions"><strong>{t.view}</strong><button type="button" className="aasa-secondary" onClick={()=>setPreview(null)}>{t.close}</button></div><div className="aasa-card-sheet">
      <article className="aasa-print-card aasa-card-front"><div className="aasa-card-front-header"><img src={import.meta.env.BASE_URL+"aasa-school-logo.jpg"} alt="Official AASA crest"/><div className="aasa-card-brand"><strong>ABU-AIMAN STUDENTS’ ASSOCIATION</strong><span>رابطة طلاب مدرسة أبوأيمن لتحفيظ القرآن الكريم والدراسات الإسلامية</span><small>العلم نور</small></div><span className="aasa-card-kind">MEMBER</span><div className="aasa-card-national-emblem-wrap"><img className="aasa-card-national-emblem" src="https://upload.wikimedia.org/wikipedia/commons/b/bc/Coat_of_arms_of_Nigeria.svg" alt="Coat of Arms of the Federal Republic of Nigeria"/></div></div>
      <div className="aasa-card-front-main">{preview.photoUrl?<img className="aasa-member-photo" src={preview.photoUrl} alt={preview.member.full_name}/>:<div className="aasa-member-photo aasa-photo-placeholder">{t.noPhoto}</div>}<div className="aasa-card-identity"><small className="aasa-card-eyebrow">{t.front}</small><h2>{preview.member.full_name}</h2><small className="aasa-card-id-label">{t.memberNo}</small><p className="aasa-card-member-number">{preview.member.member_number}</p><div className="aasa-card-meta"><span><small>{t.memberType}</small><b>{preview.member.membership_type.toUpperCase()}</b></span><span><small>{t.issued}</small><b>{date(preview.card.issued_at)}</b></span></div></div></div>
      <div className="aasa-card-front-footer"><strong className={preview.member.status==="active"&&preview.card.status==="active"?"is-active":"is-inactive"}>{preview.member.status==="active"&&preview.card.status==="active"?t.activeMember:t.notActive}</strong><span>Card No. {preview.card.card_number}</span></div></article>
      <article className="aasa-print-card aasa-card-back"><div className="aasa-card-back-header"><img src={import.meta.env.BASE_URL+"aasa-school-logo.jpg"} alt="Official AASA crest"/><div><strong>{t.back}</strong><small>العلم نور · KNOWLEDGE IS LIGHT</small></div></div><div className="aasa-card-back-main"><div className="aasa-card-verification"><div className="aasa-card-qr-frame"><img className="aasa-card-qr" src={preview.qrUrl} alt="QR code to verify membership"/></div><div className="aasa-card-back-copy"><strong>{t.verify}</strong><p>{t.scan}</p><small>{t.memberNo}</small><b>{preview.member.member_number}</b><small>{t.cardNo}</small><b>{preview.card.card_number}</b></div></div>
      <div className="aasa-card-member-details"><strong className="aasa-card-details-title">{t.details}</strong><div className="aasa-card-details-grid">{[[t.nationality,preview.member.nationality],[t.country,preview.member.country_of_residence],[t.state,preview.member.state_of_residence],[t.capital,preview.member.country_of_residence==="Nigeria"?capitals[preview.member.state_of_residence||""]:null],[t.lga,preview.member.local_government_area],[t.ward,preview.member.ward],[t.occupation,preview.member.occupation],[t.phone,preview.member.phone],[t.address,preview.member.address,"address"]].filter(x=>Boolean(x[1]?.trim())).map(([label,value,extra])=><span key={String(label)} className={extra==="address"?"aasa-card-detail-address":""}><small>{label}</small><b>{value}</b></span>)}</div></div></div><footer>{t.notGovernment}</footer></article>
    </div><button type="button" className="aasa-primary" onClick={()=>window.print()}>{t.print}</button></div></div>}
  </div>;
}
