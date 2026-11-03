import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const token = (await req.json())?.token;
    if (typeof token !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
      return json({ valid: false });
    }

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: card, error: cardError } = await db
      .from("aasa_member_cards")
      .select("member_id,card_number,issued_at")
      .eq("qr_token", token)
      .eq("status", "active")
      .maybeSingle();

    if (cardError || !card) return json({ valid: false });

    const { data: member, error: memberError } = await db
      .from("aasa_members")
      .select("member_number,full_name,membership_type,status")
      .eq("id", card.member_id)
      .maybeSingle();

    if (memberError || !member || member.status !== "active") return json({ valid: false });

    // Public QR verification intentionally returns only non-sensitive membership facts.
    // Photos, phone numbers, email, date of birth, address, location and emergency contacts
    // remain private to authorised association officers.
    return json({
      valid: true,
      card_number: card.card_number,
      issued_at: card.issued_at,
      member: {
        member_number: member.member_number,
        full_name: member.full_name,
        membership_type: member.membership_type,
      },
    });
  } catch {
    return json({ error: "Verification unavailable" }, 500);
  }
});