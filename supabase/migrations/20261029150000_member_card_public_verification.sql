-- Public card verification exposes only minimal details for an active card.
-- The private routine is not in an exposed schema; the public wrapper is invoker-security.
create or replace function private.verify_aasa_member_card(p_qr_token uuid)
returns table(valid boolean, member_number text, full_name text, membership_type text, issued_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select (c.status = 'active' and m.status = 'active') as valid,
         m.member_number, m.full_name, m.membership_type, c.issued_at
  from public.aasa_member_cards c
  join public.aasa_members m on m.id = c.member_id
  where c.qr_token = p_qr_token limit 1
$$;
revoke all on function private.verify_aasa_member_card(uuid) from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.verify_aasa_member_card(uuid) to anon, authenticated;
create or replace function public.aasa_verify_member_card(p_qr_token uuid)
returns table(valid boolean, member_number text, full_name text, membership_type text, issued_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select * from private.verify_aasa_member_card(p_qr_token)
$$;
revoke all on function public.aasa_verify_member_card(uuid) from public;
grant execute on function public.aasa_verify_member_card(uuid) to anon, authenticated;
