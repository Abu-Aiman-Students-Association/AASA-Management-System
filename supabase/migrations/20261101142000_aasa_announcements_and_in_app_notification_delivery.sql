create table if not exists public.aasa_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 3 and 180),
  body text not null check (char_length(btrim(body)) between 3 and 12000),
  audience_type text not null check (audience_type in ('all_members','executives','committee')),
  audience_committee_id uuid references public.aasa_committees(id) on delete restrict,
  status text not null default 'published' check (status in ('published','archived')),
  created_by uuid not null references auth.users(id) on delete restrict,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check ((audience_type = 'committee' and audience_committee_id is not null)
      or (audience_type <> 'committee' and audience_committee_id is null))
);

alter table public.aasa_notifications
  add column if not exists announcement_id uuid references public.aasa_announcements(id) on delete set null,
  add column if not exists read_at timestamptz;

create unique index if not exists aasa_notifications_announcement_recipient_uidx
  on public.aasa_notifications(announcement_id, recipient_user_id)
  where announcement_id is not null;
create index if not exists aasa_announcements_published_idx
  on public.aasa_announcements(published_at desc) where status = 'published';
create index if not exists aasa_notifications_recipient_created_idx
  on public.aasa_notifications(recipient_user_id, created_at desc);

alter table public.aasa_announcements enable row level security;
revoke all on public.aasa_announcements from anon, authenticated;
grant select on public.aasa_announcements to authenticated;

drop policy if exists aasa_announcements_read_authorised on public.aasa_announcements;
create policy aasa_announcements_read_authorised
on public.aasa_announcements for select to authenticated
using (
  status = 'published'
  and (
    public.aasa_has_permission('announcements.read')
    or public.aasa_has_permission('announcements.publish')
  )
);

create or replace function public.aasa_publish_announcement(
  p_title text,
  p_body text,
  p_audience_type text,
  p_committee_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_announcement_id uuid;
  v_recipients integer := 0;
begin
  if v_user is null or not public.aasa_has_permission('announcements.publish') then
    raise exception 'Not authorised to publish announcements';
  end if;
  if char_length(btrim(coalesce(p_title,''))) not between 3 and 180 then
    raise exception 'Announcement title must be between 3 and 180 characters';
  end if;
  if char_length(btrim(coalesce(p_body,''))) not between 3 and 12000 then
    raise exception 'Announcement message must be between 3 and 12000 characters';
  end if;
  if p_audience_type not in ('all_members','executives','committee') then
    raise exception 'Unsupported announcement audience';
  end if;
  if (p_audience_type = 'committee') <> (p_committee_id is not null) then
    raise exception 'Select a committee only for committee announcements';
  end if;
  if p_audience_type = 'committee' and not exists (
    select 1 from public.aasa_committees c
    where c.id = p_committee_id and c.status = 'active'
  ) then
    raise exception 'Selected committee is not active';
  end if;

  insert into public.aasa_announcements(title,body,audience_type,audience_committee_id,created_by)
  values (btrim(p_title),btrim(p_body),p_audience_type,p_committee_id,v_user)
  returning id into v_announcement_id;

  with recipients as (
    select distinct m.auth_user_id as user_id
    from public.aasa_members m
    where m.status = 'active'
      and m.auth_user_id is not null
      and (
        p_audience_type = 'all_members'
        or (p_audience_type = 'executives' and exists (
          select 1 from public.user_roles ur
          join public.roles r on r.id = ur.role_id
          where ur.user_id = m.auth_user_id
            and ur.revoked_at is null
            and (ur.expires_at is null or ur.expires_at > now())
            and r.role_key not in ('ordinary_member','platform_admin')
            and r.is_active = true
        ))
        or (p_audience_type = 'committee' and exists (
          select 1 from public.aasa_committee_members cm
          where cm.member_id = m.id and cm.committee_id = p_committee_id
            and cm.left_on is null and cm.ended_at is null
        ))
      )
  ), inserted as (
    insert into public.aasa_notifications(
      recipient_user_id,channel,title,message,delivery_status,announcement_id
    )
    select user_id,'in_app',btrim(p_title),btrim(p_body),'DELIVERED',v_announcement_id
    from recipients
    on conflict (announcement_id,recipient_user_id)
      where announcement_id is not null do nothing
    returning id
  )
  select count(*) into v_recipients from inserted;

  if v_recipients = 0 then
    raise exception 'No active, linked recipients were found for this audience';
  end if;

  return pg_catalog.jsonb_build_object(
    'announcement_id',v_announcement_id,
    'recipient_count',v_recipients,
    'status','published'
  );
end;
$function$;

create or replace function public.aasa_mark_notification_read(p_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_updated integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  update public.aasa_notifications
  set read_at = coalesce(read_at,now()), delivery_status = 'READ'
  where id = p_notification_id
    and recipient_user_id = auth.uid();
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$function$;

revoke all on function public.aasa_publish_announcement(text,text,text,uuid) from public, anon;
grant execute on function public.aasa_publish_announcement(text,text,text,uuid) to authenticated;
revoke all on function public.aasa_mark_notification_read(uuid) from public, anon;
grant execute on function public.aasa_mark_notification_read(uuid) to authenticated;
