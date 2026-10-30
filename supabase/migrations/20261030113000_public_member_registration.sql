-- Public member registration: submissions enter the existing review queue as pending.
create or replace function public.aasa_submit_member_application(p_application jsonb)
returns table(member_number text, status text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_name text := nullif(btrim(p_application->>'full_name'), '');
  v_email text := nullif(lower(btrim(p_application->>'email')), '');
  v_phone text := nullif(btrim(p_application->>'phone'), '');
  v_gender text := nullif(p_application->>'gender', '');
  v_member_number text := 'AASA-' || to_char(current_date, 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  v_id uuid;
begin
  if v_name is null or length(v_name) < 2 or length(v_name) > 160 then
    raise exception 'Enter a valid full name (2–160 characters).';
  end if;
  if v_email is null and v_phone is null then
    raise exception 'Enter an email address or phone number.';
  end if;
  if v_email is not null and (length(v_email) > 254 or v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$') then
    raise exception 'Enter a valid email address.';
  end if;
  if v_phone is not null and length(v_phone) > 40 then
    raise exception 'Phone number is too long.';
  end if;
  if v_gender is not null and v_gender not in ('female','male','prefer_not_to_say') then
    raise exception 'Invalid gender selection.';
  end if;
  if coalesce((p_application->>'membership_consent')::boolean, false) is not true then
    raise exception 'Please accept the membership declaration.';
  end if;
  if (v_email is not null and exists(select 1 from public.aasa_members m where lower(m.email)=v_email and m.status <> 'rejected'))
     or (v_phone is not null and exists(select 1 from public.aasa_members m where regexp_replace(coalesce(m.phone,''), '[^0-9]', '', 'g')=regexp_replace(v_phone, '[^0-9]', '', 'g') and m.status <> 'rejected')) then
    raise exception 'An application or membership with this email address or phone number already exists. Contact the association office if you need help.';
  end if;

  insert into public.aasa_members (
    member_number, full_name, email, phone, date_of_birth, gender, address,
    country_of_residence, state_of_residence, local_government_area,
    city_of_residence, ward, nationality, membership_type, status,
    membership_consent, joined_on
  ) values (
    v_member_number, v_name, v_email, v_phone,
    nullif(p_application->>'date_of_birth','')::date,
    v_gender,
    nullif(left(btrim(p_application->>'address'),500),''),
    nullif(left(btrim(p_application->>'country_of_residence'),100),''),
    nullif(left(btrim(p_application->>'state_of_residence'),120),''),
    nullif(left(btrim(p_application->>'local_government_area'),120),''),
    nullif(left(btrim(p_application->>'city_of_residence'),120),''),
    nullif(left(btrim(p_application->>'ward'),120),''),
    nullif(left(btrim(p_application->>'nationality'),100),''),
    'ordinary', 'pending', true, current_date
  ) returning id into v_id;

  insert into public.audit_events(actor_user_id, action_key, target_type, target_id, outcome, details)
  values (null, 'membership.application.submit', 'aasa_member', v_id::text, 'success',
    jsonb_build_object('member_number', v_member_number, 'submission_channel', 'public_registration'));

  return query select v_member_number, 'pending'::text;
end;
$$;

revoke all on function public.aasa_submit_member_application(jsonb) from public;
grant execute on function public.aasa_submit_member_application(jsonb) to anon, authenticated;
