create or replace function public.aasa_link_own_member_account()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_member_id uuid;
  v_matches integer;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select lower(trim(email)) into v_email
  from auth.users where id = v_uid and email_confirmed_at is not null;
  if v_email is null or v_email = '' then raise exception 'A confirmed email address is required'; end if;

  select count(*), min(id::text)::uuid into v_matches, v_member_id
  from public.aasa_members
  where status = 'active' and lower(trim(email)) = v_email;
  if v_matches = 0 then raise exception 'No active membership record matches this confirmed email'; end if;
  if v_matches > 1 then raise exception 'More than one active membership record matches this email; administrator review is required'; end if;
  if exists (select 1 from public.aasa_members where auth_user_id = v_uid and id <> v_member_id) then
    raise exception 'This account is already linked to another member';
  end if;
  if exists (select 1 from public.aasa_members where id = v_member_id and auth_user_id is not null and auth_user_id <> v_uid) then
    raise exception 'This membership record is already linked to another account';
  end if;

  update public.aasa_members set auth_user_id = v_uid, updated_at = now()
  where id = v_member_id and auth_user_id is distinct from v_uid;
  if found then
    insert into public.aasa_audit_log(actor_user_id, action_key, entity_type, entity_id, details)
    values (v_uid, 'membership.account.self_link', 'aasa_members', v_member_id::text,
            jsonb_build_object('confirmed_email_match', true));
  end if;
  return jsonb_build_object('status', 'linked', 'member_id', v_member_id);
end;
$$;
revoke all on function public.aasa_link_own_member_account() from public;
grant execute on function public.aasa_link_own_member_account() to authenticated;
