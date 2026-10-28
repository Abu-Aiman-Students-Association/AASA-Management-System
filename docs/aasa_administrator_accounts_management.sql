-- AASA Administrator Accounts Management
-- Applied to Supabase project pedmroseihpaflbzqgkf as migration
-- 20261028125932_aasa_administrator_accounts_management.

create or replace function private.admin_list_accounts()
returns table (
  user_id uuid,
  email text,
  full_name text,
  preferred_language text,
  account_status text,
  assigned_roles text[],
  created_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $function$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if not (private.has_permission('platform.admins.manage') or private.has_role('super_admin')) then
    raise exception 'Administrator account management permission required' using errcode = '42501';
  end if;

  return query
  select u.id,
         u.email::text,
         p.full_name,
         p.preferred_language,
         p.account_status,
         coalesce(array_agg(distinct r.role_key order by r.role_key)
           filter (where r.role_key is not null), array[]::text[]),
         u.created_at
  from auth.users u
  join public.profiles p on p.user_id = u.id
  left join public.user_roles ur
    on ur.user_id = u.id
   and ur.revoked_at is null
   and (ur.expires_at is null or ur.expires_at > now())
  left join public.roles r on r.id = ur.role_id
  group by u.id, u.email, p.full_name, p.preferred_language, p.account_status, u.created_at
  order by u.created_at desc;
end;
$function$;

create or replace function private.admin_manage_account(
  p_target_user_id uuid,
  p_action text,
  p_role_key text default null,
  p_account_status text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $function$
declare
  v_actor uuid := auth.uid();
  v_target_email text;
  v_current_status text;
  v_role_id uuid;
  v_designated_user uuid;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if not (private.has_permission('platform.admins.manage') or private.has_role('super_admin')) then
    raise exception 'Administrator account management permission required' using errcode = '42501';
  end if;
  if p_target_user_id is null then
    raise exception 'Target account is required' using errcode = '22023';
  end if;

  select u.email, p.account_status
    into v_target_email, v_current_status
  from auth.users u
  join public.profiles p on p.user_id = u.id
  where u.id = p_target_user_id
  for update of p;

  if not found then
    raise exception 'Account not found' using errcode = 'P0002';
  end if;

  select claimed_by into v_designated_user
  from private.super_admin_bootstrap
  where singleton = true;

  if p_action = 'assign_platform_admin' or p_action = 'revoke_platform_admin' then
    if p_role_key is distinct from 'platform_admin' then
      raise exception 'Only the Platform Administrator role can be managed here' using errcode = '22023';
    end if;
    if p_target_user_id = v_designated_user then
      raise exception 'The designated permanent Super Admin account is protected' using errcode = '42501';
    end if;

    select id into v_role_id from public.roles where role_key = 'platform_admin';
    if v_role_id is null then
      raise exception 'Platform Administrator role is not configured' using errcode = 'P0002';
    end if;

    if p_action = 'assign_platform_admin' then
      if v_current_status <> 'active' then
        raise exception 'Activate the account before assigning an administrator role' using errcode = '22023';
      end if;
      insert into public.user_roles(user_id, role_id, assigned_by)
      values (p_target_user_id, v_role_id, v_actor)
      on conflict (user_id, role_id) do update
        set revoked_at = null, assigned_by = excluded.assigned_by, assigned_at = now();
    else
      update public.user_roles
         set revoked_at = now()
       where user_id = p_target_user_id and role_id = v_role_id and revoked_at is null;
    end if;

  elsif p_action = 'set_status' then
    if p_account_status not in ('pending','active','suspended','disabled') then
      raise exception 'Invalid account status' using errcode = '22023';
    end if;
    if p_target_user_id = v_actor and p_account_status <> 'active' then
      raise exception 'You cannot suspend or disable your own signed-in account' using errcode = '42501';
    end if;
    if p_target_user_id = v_designated_user and p_account_status <> 'active' then
      raise exception 'The designated permanent Super Admin account is protected' using errcode = '42501';
    end if;
    update public.profiles set account_status = p_account_status, updated_at = now()
    where user_id = p_target_user_id;
    if p_account_status <> 'active' then
      update public.user_roles set revoked_at = now()
      where user_id = p_target_user_id and revoked_at is null and role_id in
        (select id from public.roles where role_key in ('platform_admin'));
    end if;
  else
    raise exception 'Unsupported administrator account action' using errcode = '22023';
  end if;

  insert into public.audit_events(actor_user_id, action_key, target_type, target_id, outcome, details)
  values (
    v_actor,
    'administrator_account.' || p_action,
    'auth_user',
    p_target_user_id::text,
    'success',
    jsonb_build_object(
      'target_email', v_target_email,
      'role_key', case when p_action in ('assign_platform_admin','revoke_platform_admin') then p_role_key else null end,
      'account_status', case when p_action = 'set_status' then p_account_status else null end
    )
  );

  return jsonb_build_object('success', true, 'action', p_action, 'target_user_id', p_target_user_id);
end;
$function$;

revoke all on function private.admin_list_accounts() from public, anon;
revoke all on function private.admin_manage_account(uuid, text, text, text) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.admin_list_accounts() to authenticated;
grant execute on function private.admin_manage_account(uuid, text, text, text) to authenticated;

create or replace function public.admin_list_accounts()
returns table (
  user_id uuid,
  email text,
  full_name text,
  preferred_language text,
  account_status text,
  assigned_roles text[],
  created_at timestamptz
)
language sql
security invoker
set search_path = pg_catalog, public, private, auth
as $function$
  select * from private.admin_list_accounts();
$function$;

create or replace function public.admin_manage_account(
  p_target_user_id uuid,
  p_action text,
  p_role_key text default null,
  p_account_status text default null
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public, private, auth
as $function$
  select private.admin_manage_account(p_target_user_id, p_action, p_role_key, p_account_status);
$function$;

revoke all on function public.admin_list_accounts() from public, anon;
revoke all on function public.admin_manage_account(uuid, text, text, text) from public, anon;
grant execute on function public.admin_list_accounts() to authenticated;
grant execute on function public.admin_manage_account(uuid, text, text, text) to authenticated;
