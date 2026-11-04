insert into public.permissions (permission_key,module_key,description,action_key)
select 'cards.read','id_center','Read and print official AASA membership identity cards','read'
where not exists (
  select 1 from public.permissions where permission_key='cards.read'
);

update public.permissions
set module_key='id_center',
    description='Read and print official AASA membership identity cards',
    action_key='read'
where permission_key='cards.read';

insert into public.role_permissions (role_id,permission_id)
select distinct existing.role_id, read_permission.id
from public.role_permissions existing
join public.permissions capability on capability.id=existing.permission_id
join public.permissions read_permission on read_permission.permission_key='cards.read'
where capability.permission_key in ('cards.issue','cards.revoke')
  and not exists (
    select 1 from public.role_permissions current_grant
    where current_grant.role_id=existing.role_id
      and current_grant.permission_id=read_permission.id
  );

drop policy if exists "aasa_member_cards_read_permission" on public.aasa_member_cards;
create policy "aasa_member_cards_read_permission"
on public.aasa_member_cards
for select
to authenticated
using (public.aasa_has_permission('cards.read'));

drop policy if exists "aasa_member_photos_read" on storage.objects;
create policy "aasa_member_photos_read"
on storage.objects
for select
to authenticated
using (
  bucket_id='aasa-member-photos'
  and (
    public.aasa_has_permission('membership.read')
    or public.aasa_has_permission('cards.read')
  )
);

drop policy if exists "aasa_legacy_member_photos_read" on storage.objects;
create policy "aasa_legacy_member_photos_read"
on storage.objects
for select
to authenticated
using (
  bucket_id='aasa-documents'
  and (
    name like '%/member-photo-%'
    or name like 'member-applications/%'
  )
  and (
    public.aasa_has_permission('membership.read')
    or public.aasa_has_permission('cards.read')
  )
);

create or replace function public.aasa_list_id_center_members()
returns table (
  id uuid,
  member_number text,
  full_name text,
  email text,
  phone text,
  membership_type text,
  status text,
  joined_on date,
  date_of_birth date,
  gender text,
  address text,
  photo_path text,
  nationality text,
  country_of_residence text,
  state_of_residence text,
  local_government_area text,
  ward text,
  occupation text,
  city_of_residence text
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
    m.membership_type, m.status, m.joined_on, m.date_of_birth,
    m.gender, m.address, m.photo_path, m.nationality,
    m.country_of_residence, m.state_of_residence,
    m.local_government_area, m.ward, m.occupation, m.city_of_residence
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

create or replace function public.aasa_issue_member_card(p_member_id uuid)
returns public.aasa_member_cards
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_card public.aasa_member_cards;
  v_num text;
begin
  if not public.aasa_has_permission('cards.issue') then
    raise exception 'Not authorised to issue membership cards';
  end if;
  if not exists (
    select 1 from public.aasa_members
    where id=p_member_id
      and status='active'
      and photo_path is not null
      and length(btrim(photo_path))>0
  ) then
    raise exception 'Only active members with a verified photograph may receive a card';
  end if;
  if exists (
    select 1 from public.aasa_member_cards
    where member_id=p_member_id and status='active'
  ) then
    raise exception 'This member already has an active card';
  end if;
  v_num := 'AASA-'||extract(year from now())::text||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  insert into public.aasa_member_cards(member_id,card_number,issued_by)
  values(p_member_id,v_num,auth.uid())
  returning * into v_card;
  insert into public.aasa_audit_log(actor_user_id,action_key,entity_type,entity_id,details)
  values(auth.uid(),'membership.card.issue','aasa_member_cards',v_card.id::text,jsonb_build_object('member_id',p_member_id,'card_number',v_num));
  return v_card;
end;
$function$;

create or replace function public.aasa_revoke_member_card(p_card_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not public.aasa_has_permission('cards.revoke') then
    raise exception 'Not authorised to revoke membership cards';
  end if;
  update public.aasa_member_cards
  set status='revoked',revoked_by=auth.uid(),revoked_at=now()
  where id=p_card_id and status='active';
  if not found then
    raise exception 'Active card not found';
  end if;
  insert into public.aasa_audit_log(actor_user_id,action_key,entity_type,entity_id,details)
  values(auth.uid(),'membership.card.revoke','aasa_member_cards',p_card_id::text,'{"status":"revoked"}'::jsonb);
end;
$function$;

revoke all on function public.aasa_list_id_center_members() from public, anon, authenticated;
grant execute on function public.aasa_list_id_center_members() to authenticated;
revoke all on function public.aasa_issue_member_card(uuid) from public, anon, authenticated;
grant execute on function public.aasa_issue_member_card(uuid) to authenticated;
revoke all on function public.aasa_revoke_member_card(uuid) from public, anon, authenticated;
grant execute on function public.aasa_revoke_member_card(uuid) to authenticated;
