import { useEffect, useState } from "react";
import AdminDashboard from "./AdminDashboard";
import MemberDashboard from "./MemberDashboard";
import VerifyMemberCard from "./VerifyMemberCard";
import { supabase } from "./lib/supabase";
import "./admin.css";

type Route = "loading" | "admin" | "member";

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const [route, setRoute] = useState<Route>("loading");

  useEffect(() => {
    if (params.has("verify")) return;
    let alive = true;
    async function resolveAccount(session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) {
      if (!alive) return;
      if (!session?.user) { setRoute("admin"); return; }
      setRoute("loading");
      const userId = session.user.id;
      try {
        const [{ data: profile }, { data: roleRows }] = await Promise.all([
          supabase.from("profiles").select("account_status").eq("user_id", userId).maybeSingle(),
          supabase.from("user_roles").select("role_id,roles(role_key),expires_at").eq("user_id", userId).is("revoked_at", null)
        ]);
        const now = Date.now();
        const hasActiveAdminRole = profile?.account_status === "active" && (roleRows ?? []).some((row: any) => {
          const roleKey = row.roles?.role_key;
          const unexpired = !row.expires_at || Date.parse(row.expires_at) > now;
          return Boolean(roleKey && unexpired);
        });
        if (hasActiveAdminRole) { if (alive) setRoute("admin"); return; }
      } catch {
        // A member must never gain administrator access from a failed role lookup.
      }
      try {
        const { data: member, error } = await supabase.from("aasa_members").select("id")
          .eq("auth_user_id", userId).eq("status", "active").maybeSingle();
        if (!error && member) { if (alive) setRoute("member"); return; }
      } catch {
        // Fall through to the locked administration sign-in screen.
      }
      if (alive) setRoute("admin");
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => { void resolveAccount(session); }, 0);
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) { if (alive) setRoute("admin"); return; }
      void resolveAccount(data.session);
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  if (params.has("verify")) return <VerifyMemberCard token={params.get("verify") || ""} />;
  if (route === "loading") return <main className="aasa-admin"><section className="aasa-content"><p className="aasa-kicker">AASA · SECURE ACCESS</p><h1>Checking your account…</h1></section></main>;
  return route === "member" ? <MemberDashboard /> : <AdminDashboard />;
}
