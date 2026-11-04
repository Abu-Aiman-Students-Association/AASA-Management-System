drop function if exists public.aasa_list_id_center_members();

create function public.aasa_list_id_center_members()
returns table (
  id uuid,
  member_number text,
  full_name text,
  email text,
  phone text,
  membership_type text,
  status text,
  address text,
  photo_path text,
  nationality text,
  country_of_residence text,
  state_of_residence text,
  local_government_area text,
  ward text,
  occupation text
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null or not public.aasa_has_permission('cards.read') then
    raise exception 'Not authorised to read ID Centre member details'
      using errcode = '42501';
  end if;

  return query
  select
    m.id, m.member_number, m.full_name, m.email, m.phone,
    m.membership_type, m.status, m.address, m.photo_path,
    m.nationality, m.country_of_residence, m.state_of_residence,
    m.local_government_area, m.ward, m.occupation
  from public.aasa_members m
  where m.status='active'
     or exists (
       select 1
       from public.aasa_member_cards c
       where c.member_id=m.id
     )
  order by m.created_at desc
  limit 500;
end;
$function$;

revoke all on function public.aasa_list_id_center_members() from public, anon, authenticated;
grant execute on function public.aasa_list_id_center_members() to authenticated;
