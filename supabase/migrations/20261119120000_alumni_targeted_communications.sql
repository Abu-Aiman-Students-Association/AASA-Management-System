-- Alumni-targeted in-app communications, independent from general association announcements.
-- No email/SMS/WhatsApp delivery is claimed or configured here.

create table if not exists public.aasa_alumni_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 3 and 180),
  body text not null check (char_length(btrim(body)) between 3 and 12000),
  audience_type text not null check (audience_type in ('all_verified','chapter','location','graduation_year')),
  audience_chapter_id uuid references public.aasa_alumni_chapters(id) on delete restrict,
  audience_location text,
  audience_graduation_year integer,
  status text not null default 'published' check (status in ('published','archived')),
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (audience_type='all_verified' and audience_chapter_id is null and audience_location is null and audience_graduation_year is null)
    or (audience_type='chapter' and audience_chapter_id is not null and audience_location is null and audience_graduation_year is null)
    or (audience_type='location' and audience_chapter_id is null and char_length(btrim(coalesce(audience_location,''))) between 2 and 180 and audience_graduation_year is null)
    or (audience_type='graduation_year' and audience_chapter_id is null and audience_location is null and audience_graduation_year between 1900 and 2100)
  )
);
create index if not exists aasa_alumni_announcements_published_idx on public.aasa_alumni_announcements(published_at desc) where status='published';

alter table public.aasa_notifications
  add column if not exists alumni_announcement_id uuid references public.aasa_alumni_announcements(id) on delete set null;
create unique index if not exists aasa_notifications_alumni_announcement_recipient_uidx
  on public.aasa_notifications(alumni_announcement_id,recipient_user_id)
  where alumni_announcement_id is not null;

alter table public.aasa_alumni_announcements enable row level security;
revoke all on public.aasa_alumni_announcements from anon, authenticated;
grant select on public.aasa_alumni_announcements to authenticated;
grant all on public.aasa_alumni_announcements to service_role;
drop policy if exists aasa_alumni_announcements_read on public.aasa_alumni_announcements;
create policy aasa_alumni_announcements_read on public.aasa_alumni_announcements
for select to authenticated
using (public.aasa_has_permission('alumni.read') or public.aasa_has_permission('alumni.manage'));

drop trigger if exists aasa_alumni_announcements_activity_audit on public.aasa_alumni_announcements;
create trigger aasa_alumni_announcements_activity_audit
before insert or update or delete on public.aasa_alumni_announcements
for each row execute function public.aasa_alumni_touch_and_audit();

create or replace function public.aasa_publish_alumni_announcement(
  p_title text,
  p_body text,
  p_audience_type text,
  p_chapter_id uuid default null,
  p_location text default null,
  p_graduation_year integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $alumni_announcement$
declare
  v_user uuid := auth.uid();
  v_announcement_id uuid;
  v_recipients integer := 0;
begin
  if v_user is null or not public.aasa_has_permission('alumni.manage') then
    raise exception 'Alumni management permission required to publish an alumni announcement';
  end if;
  if char_length(btrim(coalesce(p_title,''))) not between 3 and 180 then
    raise exception 'Announcement title must be between 3 and 180 characters';
  end if;
  if char_length(btrim(coalesce(p_body,''))) not between 3 and 12000 then
    raise exception 'Announcement message must be between 3 and 12000 characters';
  end if;
  if p_audience_type not in ('all_verified','chapter','location','graduation_year') then
    raise exception 'Unsupported alumni announcement audience';
  end if;
  if (p_audience_type='chapter') <> (p_chapter_id is not null)
    or (p_audience_type='location') <> (nullif(btrim(coalesce(p_location,'')),'') is not null)
    or (p_audience_type='graduation_year') <> (p_graduation_year is not null) then
    raise exception 'Provide exactly the audience filter required for the selected audience type';
  end if;
  if p_audience_type='chapter' and not exists (
    select 1 from public.aasa_alumni_chapters c where c.id=p_chapter_id and c.status='active'
  ) then raise exception 'Selected alumni chapter is not active'; end if;
  if p_audience_type='graduation_year' and p_graduation_year not between 1900 and 2100 then
    raise exception 'Graduation year is outside the supported range';
  end if;

  insert into public.aasa_alumni_announcements(
    title,body,audience_type,audience_chapter_id,audience_location,audience_graduation_year,created_by
  ) values (
    btrim(p_title),btrim(p_body),p_audience_type,p_chapter_id,
    nullif(btrim(coalesce(p_location,'')),''),p_graduation_year,v_user
  ) returning id into v_announcement_id;

  with recipients as (
    select distinct m.auth_user_id as user_id
    from public.aasa_alumni_records ar
    join public.aasa_members m on m.id=ar.member_id
    where ar.graduation_verification_status='verified'
      and ar.engagement_status='active'
      and m.status='active'
      and coalesce(m.is_test_record,false)=false
      and m.auth_user_id is not null
      and (
        p_audience_type='all_verified'
        or (p_audience_type='chapter' and exists (
          select 1 from public.aasa_alumni_chapter_members cm
          where cm.alumni_id=ar.id and cm.chapter_id=p_chapter_id and cm.left_at is null
        ))
        or (p_audience_type='location' and lower(btrim(coalesce(ar.location,'')))=lower(btrim(p_location)))
        or (p_audience_type='graduation_year' and ar.graduation_year=p_graduation_year)
      )
  ), delivered as (
    insert into public.aasa_notifications(
      recipient_user_id,channel,title,message,delivery_status,alumni_announcement_id
    )
    select user_id,'IN_APP',btrim(p_title),btrim(p_body),'DELIVERED',v_announcement_id
    from recipients
    on conflict (alumni_announcement_id,recipient_user_id)
      where alumni_announcement_id is not null do nothing
    returning id
  )
  select count(*) into v_recipients from delivered;

  if v_recipients=0 then
    raise exception 'No active, linked and verified alumni were found for this audience';
  end if;

  return pg_catalog.jsonb_build_object(
    'announcement_id',v_announcement_id,
    'recipient_count',v_recipients,
    'channel','in_app',
    'status','published'
  );
end;
$alumni_announcement$;

revoke all on function public.aasa_publish_alumni_announcement(text,text,text,uuid,text,integer) from public,anon;
grant execute on function public.aasa_publish_alumni_announcement(text,text,text,uuid,text,integer) to authenticated;

create or replace function public.aasa_archive_alumni_announcement(p_announcement_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $alumni_archive$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null or not public.aasa_has_permission('alumni.manage') then
    raise exception 'Alumni management permission required to archive an alumni announcement';
  end if;
  update public.aasa_alumni_announcements
  set status='archived',updated_by=v_user,updated_at=now()
  where id=p_announcement_id and status='published';
  if not found then raise exception 'Published alumni announcement not found'; end if;
  return true;
end;
$alumni_archive$;
revoke all on function public.aasa_archive_alumni_announcement(uuid) from public,anon;
grant execute on function public.aasa_archive_alumni_announcement(uuid) to authenticated;
