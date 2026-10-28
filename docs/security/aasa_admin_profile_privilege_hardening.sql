-- Applied to Supabase project pedmroseihpaflbzqgkf on 2026-10-28.
-- Keep in sync with the production change documented in this directory.
revoke all privileges on table public.profiles, public.roles, public.permissions,
  public.role_permissions, public.user_roles, public.audit_events
  from anon, authenticated;

grant select on table public.profiles, public.roles, public.permissions,
  public.role_permissions, public.user_roles, public.audit_events to authenticated;
grant update (full_name, preferred_language) on table public.profiles to authenticated;

revoke all privileges on table public.profiles, public.roles, public.permissions,
  public.role_permissions, public.user_roles, public.audit_events from anon;

revoke all on function public.admin_list_accounts() from public, anon;
revoke all on function public.admin_manage_account(uuid, text, text, text) from public, anon;
revoke all on function public.claim_initial_super_admin() from public, anon;
grant execute on function public.admin_list_accounts() to authenticated;
grant execute on function public.admin_manage_account(uuid, text, text, text) to authenticated;
grant execute on function public.claim_initial_super_admin() to authenticated;
