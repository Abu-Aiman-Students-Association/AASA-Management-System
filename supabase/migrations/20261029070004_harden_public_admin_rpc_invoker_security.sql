-- Keep the public RPC wrappers invoker-security. Privileged work is delegated to
-- private SECURITY DEFINER functions that enforce auth.uid(), role/permission checks,
-- designated-account protections, and audit logging.
CREATE OR REPLACE FUNCTION public.admin_list_accounts()
RETURNS TABLE(user_id uuid, email text, full_name text, preferred_language text, account_status text, assigned_roles text[], created_at timestamptz)
LANGUAGE sql
SECURITY INVOKER
SET search_path = 'pg_catalog', 'public', 'private', 'auth'
AS $function$
  SELECT * FROM private.admin_list_accounts();
$function$;

CREATE OR REPLACE FUNCTION public.admin_manage_account(
  p_target_user_id uuid,
  p_action text,
  p_role_key text DEFAULT NULL,
  p_account_status text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = 'pg_catalog', 'public', 'private', 'auth'
AS $function$
  SELECT private.admin_manage_account(p_target_user_id, p_action, p_role_key, p_account_status);
$function$;

CREATE OR REPLACE FUNCTION public.claim_initial_super_admin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  RETURN private.claim_initial_super_admin();
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_list_accounts() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_manage_account(uuid, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_initial_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_accounts() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_manage_account(uuid, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_initial_super_admin() TO authenticated, service_role;
