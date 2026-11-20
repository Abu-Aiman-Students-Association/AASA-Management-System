import { useEffect, useState } from "react";
import AdminDashboard from "./AdminDashboard";
import AdminPortalSelection from "./AdminPortalSelection";
import MemberLogin from "./MemberLogin";
import MemberDashboard from "./MemberDashboard";
import VerifyMemberCard from "./VerifyMemberCard";
import PublicMemberRegistration from "./PublicMemberRegistration";
import { supabase } from "./lib/supabase";
import "./admin.css";

type Route = "loading" | "choose" | "admin" | "member_login" | "member";
type AdminAccessMode = "super_admin" | "association_admin";

export default function App() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("register")) return <PublicMemberRegistration />;
  const requestedPortal = params.get("portal");
  const initialMode: AdminAccessMode = requestedPortal === "super-admin" ? "super_admin" : "association_admin";
  const [route, setRoute] = useState<Route>("loading");
  const [adminMode, setAdminMode] = useState<AdminAccessMode>(initialMode);

  useEffect(() => {
    if (params.has("verify")) return;
    let alive = true;
    async function resolveAccount(session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) {
      if (!alive) return;
      if (!session?.user) {
        if (requestedPortal === "member") { setRoute("member_login"); }
        else if (params.has("portal")) {
          setAdminMode(params.get("portal") === "super-admin" ? "super_admin" : "association_admin");
          setRoute("admin");
        } else {
          setRoute("choose");
        }
        return;
      }
      setRoute("loading");
      const userId = session.user.id;
      try {
        const [{ data: profile }, { data: roleRows }] = await Promise.all([
          supabase.from("profiles").select("account_status").eq("user_id", userId).maybeSingle(),
          supabase.from("user_roles").select("role_id,roles(role_key),expires_at").eq("user_id", userId).is("revoked_at", null)
        ]);
        const now = Date.now();
        const activeRoleKeys = (roleRows ?? []).filter((row: any) => !row.expires_at || Date.parse(row.expires_at) > now)
          .map((row: any) => row.roles?.role_key).filter((key: unknown): key is string => typeof key === "string");
        const hasAdminPortalRole = profile?.account_status === "active" &&
          activeRoleKeys.some((key: string) => key === "super_admin" || key === "platform_admin" || key === "association_admin");
        if (hasAdminPortalRole) {
          const mode: AdminAccessMode = requestedPortal === "super-admin" ? "super_admin"
            : requestedPortal === "association-admin" ? "association_admin"
            : activeRoleKeys.includes("super_admin") || activeRoleKeys.includes("platform_admin") ? "super_admin" : "association_admin";
          if (alive) { setAdminMode(mode); setRoute("admin"); }
          return;
        }
      } catch {
        // A member must never gain administrator access from a failed role lookup.
      }
      try {
        const { data: member, error } = await supabase.from("aasa_members").select("id")
          .eq("auth_user_id", userId).eq("status", "active").maybeSingle();
        if (!error && member) { if (alive) setRoute("member"); return; }
      } catch {
        // Fall through to the locked administrator sign-in screen.
      }
      if (alive) {
        setAdminMode(initialMode);
        setRoute(requestedPortal === "member" ? "member_login" : params.has("portal") ? "admin" : "choose");
      }
    }

    // Ignore Supabase's initial cached-session event until the role check below completes.
    // This prevents the auth listener racing the Super Admin sign-out guard.
    let bootstrapComplete = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!bootstrapComplete) return;
      window.setTimeout(() => { void resolveAccount(session); }, 0);
    });
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (error) {
        if (alive) setRoute(requestedPortal === "member" ? "member_login" : params.has("portal") ? "admin" : "choose");
        bootstrapComplete = true;
        return;
      }
      // Do not silently restore a remembered Super Admin session after a fresh page load.
      // The administrator must explicitly request a new email OTP sign-in.
      if (data.session?.user) {
        const { data: roleRows, error: roleError } = await supabase.from("user_roles")
          .select("roles(role_key),expires_at").eq("user_id", data.session.user.id).is("revoked_at", null);
        if (roleError) {
          // Fail closed: never restore a cached administrator session when its role cannot be verified.
          if (alive) setRoute(requestedPortal === "member" ? "member_login" : params.has("portal") ? "admin" : "choose");
          bootstrapComplete = true;
          return;
        }
        const now = Date.now();
        const activeRoleKeys = (roleRows ?? [])
          .filter((row: any) => !row.expires_at || Date.parse(row.expires_at) > now)
          .map((row: any) => row.roles?.role_key);
        if (activeRoleKeys.some((key: unknown) => key === "super_admin" || key === "platform_admin")) {
          // Local scope clears this browser only; it does not revoke the administrator's other devices.
          await supabase.auth.signOut({ scope: "local" });
          if (alive) setRoute(requestedPortal === "super-admin" ? "admin" : "choose");
          bootstrapComplete = true;
          return;
        }
      }
      bootstrapComplete = true;
      void resolveAccount(data.session);
    }).catch(() => {
      if (alive) setRoute(requestedPortal === "member" ? "member_login" : params.has("portal") ? "admin" : "choose");
      bootstrapComplete = true;
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  if (params.has("verify")) return <VerifyMemberCard token={params.get("verify") || ""} />;
  if (route === "loading") return <main className="aasa-admin"><section className="aasa-content"><p className="aasa-kicker">AASA · SECURE ACCESS</p><h1>Checking your account…</h1></section></main>;
  if (route === "choose") return <AdminPortalSelection />;
  if (route === "member_login") return <MemberLogin />;
  return route === "member" ? <MemberDashboard /> : <AdminDashboard accessMode={adminMode} />;
}
