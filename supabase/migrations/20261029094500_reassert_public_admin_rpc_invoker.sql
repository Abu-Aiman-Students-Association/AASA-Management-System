-- Keep exposed PostgREST wrappers invoker-security. The private routines perform
-- privileged work only after checking auth.uid(), permissions/roles, and audit logging.
ALTER FUNCTION public.admin_list_accounts() SECURITY INVOKER;
ALTER FUNCTION public.admin_manage_account(uuid, text, text, text) SECURITY INVOKER;
ALTER FUNCTION public.claim_initial_super_admin() SECURITY INVOKER;

-- The private schema is not exposed through PostgREST. These grants let the
-- authenticated invoker wrappers delegate to the guarded private routines.
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.admin_list_accounts() TO authenticated;
GRANT EXECUTE ON FUNCTION private.admin_manage_account(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.claim_initial_super_admin() TO authenticated;
