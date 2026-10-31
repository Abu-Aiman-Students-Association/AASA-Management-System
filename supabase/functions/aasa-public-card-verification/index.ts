import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", {headers:cors});
  if (req.method !== "POST") return new Response("Method not allowed",{status:405,headers:cors});
  try {
    const token = (await req.json()).token;
    if (typeof token !== "string" || !/^[0-9a-f-]{36}$/i.test(token)) return Response.json({valid:false},{headers:cors});
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(url,key,{auth:{persistSession:false}});
    const {data:card,error} = await db.from("aasa_member_cards").select("member_id,card_number,issued_at").eq("qr_token",token).eq("status","active").maybeSingle();
    if (error || !card) return Response.json({valid:false},{headers:cors});
    const {data:m} = await db.from("aasa_members").select("member_number,full_name,membership_type,status,membership_consent,photo_path,nationality,country_of_residence,state_of_residence,local_government_area,ward,occupation,phone,address").eq("id",card.member_id).maybeSingle();
    if (!m || m.status !== "active") return Response.json({valid:false},{headers:cors});
    const consent = m.membership_consent === true;
    let photo_url = null;
    if (consent && m.photo_path) { const {data} = await db.storage.from("aasa-documents").createSignedUrl(m.photo_path,600); photo_url = data?.signedUrl || null; }
    const member = {member_number:m.member_number,full_name:m.full_name,membership_type:m.membership_type,
      nationality:consent?m.nationality:null,country_of_residence:consent?m.country_of_residence:null,
      state_of_residence:consent?m.state_of_residence:null,local_government_area:consent?m.local_government_area:null,
      ward:consent?m.ward:null,occupation:consent?m.occupation:null,phone:consent?m.phone:null,
      address:consent?m.address:null,photo_url:consent?photo_url:null};
    return new Response(JSON.stringify({valid:true,consent_shared:consent,card_number:card.card_number,issued_at:card.issued_at,member}),{headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
  } catch { return Response.json({error:"Verification unavailable"},{status:500,headers:cors}); }
});