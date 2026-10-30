import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply(405, { error: "Method not allowed" });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return reply(401, { error: "Sign-in required" });
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return reply(401, { error: "Valid sign-in required" });
    const { data: allowed, error: permissionError } = await userClient.rpc("aasa_has_permission", {
      p_permission: "membership.review",
    });
    if (permissionError || allowed !== true) return reply(403, { error: "membership.review permission required" });
    const body = await req.json().catch(() => ({}));
    const memberId = typeof body.member_id === "string" ? body.member_id : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(memberId)) {
      return reply(400, { error: "A valid member_id is required" });
    }
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: member, error: memberError } = await admin.from("aasa_members")
      .select("id, member_number, full_name, email, status, auth_user_id").eq("id", memberId).maybeSingle();
    if (memberError) return reply(500, { error: "Could not load membership record" });
    if (!member) return reply(404, { error: "Member not found" });
    if (member.status !== "active") return reply(409, { error: "Only approved active members can be invited" });
    if (!member.email?.trim()) return reply(422, { error: "Member has no email address" });
    if (member.auth_user_id) return reply(409, { error: "Member already has a linked account" });
    const email = member.email.trim().toLowerCase();
    let existingUser: any = null;
    for (let page = 1; page <= 10; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) return reply(500, { error: "Could not check existing authentication accounts" });
      existingUser = data.users.find((u: any) => (u.email || "").toLowerCase() === email) || null;
      if (existingUser || data.users.length < 1000) break;
    }
    let result: "invited" | "resent" = "invited";
    if (existingUser) {
      if (existingUser.email_confirmed_at) return reply(409, { error: "A confirmed account already uses this email. Use verified-account linking." });
      const { error } = await admin.auth.resend({ type: "signup", email });
      if (error) return reply(502, { error: "Invitation resend failed. Check Auth email/SMTP configuration.", detail: error.message });
      result = "resent";
    } else {
      const { error } = await admin.auth.admin.inviteUserByEmail(email);
      if (error) return reply(502, { error: "Invitation email could not be sent. Check Auth email/SMTP configuration.", detail: error.message });
    }
    await admin.from("aasa_audit_log").insert({
      actor_user_id: user.id,
      action_key: result === "invited" ? "membership.account.invitation_sent" : "membership.account.invitation_resent",
      entity_type: "aasa_members", entity_id: member.id,
      details: { member_number: member.member_number, email, result },
    });
    return reply(200, { status: result, member_number: member.member_number, email });
  } catch (error) {
    return reply(500, { error: error instanceof Error ? error.message : "Unexpected invitation error" });
  }
});
