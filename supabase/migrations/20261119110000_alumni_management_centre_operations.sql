-- Alumni Management Centre operational records.
-- Education, employment, reunions, chapters, mentorship and non-financial engagement.
-- This migration creates structure only; it inserts no alumni or event sample data.

create table if not exists public.aasa_alumni_education_history (
  id uuid primary key default gen_random_uuid(),
  alumni_id uuid not null references public.aasa_alumni_records(id) on delete cascade,
  institution text not null check (char_length(btrim(institution)) between 2 and 200),
  qualification text not null check (char_length(btrim(qualification)) between 2 and 160),
  field_of_study text,
  start_year integer check (start_year is null or start_year between 1900 and 2100),
  end_year integer check (end_year is null or end_year between 1900 and 2100),
  evidence_reference text,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  review_notes text,
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_year is null or start_year is null or end_year >= start_year),
  check (evidence_reference is null or char_length(evidence_reference) <= 500),
  check (review_notes is null or char_length(review_notes) <= 1000)
);
create index if not exists aasa_alumni_education_profile_idx on public.aasa_alumni_education_history(alumni_id, end_year desc);

create table if not exists public.aasa_alumni_employment_history (
  id uuid primary key default gen_random_uuid(),
  alumni_id uuid not null references public.aasa_alumni_records(id) on delete cascade,
  employer text not null check (char_length(btrim(employer)) between 2 and 180),
  job_title text not null check (char_length(btrim(job_title)) between 2 and 160),
  industry text,
  location text,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date),
  check (not is_current or end_date is null)
);
create index if not exists aasa_alumni_employment_profile_idx on public.aasa_alumni_employment_history(alumni_id, start_date desc);

create table if not exists public.aasa_alumni_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 3 and 180),
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue text,
  capacity integer check (capacity is null or capacity > 0),
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled')),
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at),
  check (description is null or char_length(description) <= 8000),
  check (venue is null or char_length(venue) <= 300)
);
create index if not exists aasa_alumni_events_start_idx on public.aasa_alumni_events(starts_at desc);

create table if not exists public.aasa_alumni_event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.aasa_alumni_events(id) on delete cascade,
  alumni_id uuid not null references public.aasa_alumni_records(id) on delete cascade,
  registration_status text not null default 'invited' check (registration_status in ('invited','registered','attended','cancelled')),
  note text,
  registered_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id, alumni_id),
  check (note is null or char_length(note) <= 1000)
);
create index if not exists aasa_alumni_event_registration_event_idx on public.aasa_alumni_event_registrations(event_id, registration_status);

create table if not exists public.aasa_alumni_chapters (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 2 and 140),
  region text,
  location text,
  description text,
  status text not null default 'active' check (status in ('active','inactive')),
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (region is null or char_length(region) <= 120),
  check (location is null or char_length(location) <= 180),
  check (description is null or char_length(description) <= 3000)
);
create index if not exists aasa_alumni_chapters_region_idx on public.aasa_alumni_chapters(region, status);

create table if not exists public.aasa_alumni_chapter_members (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.aasa_alumni_chapters(id) on delete cascade,
  alumni_id uuid not null references public.aasa_alumni_records(id) on delete cascade,
  chapter_role text not null default 'member' check (chapter_role in ('member','coordinator','secretary','chairperson')),
  joined_at date not null default current_date,
  left_at date,
  added_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (left_at is null or left_at >= joined_at)
);
create unique index if not exists aasa_alumni_chapter_active_member_uidx on public.aasa_alumni_chapter_members(chapter_id, alumni_id) where left_at is null;
create index if not exists aasa_alumni_chapter_members_profile_idx on public.aasa_alumni_chapter_members(alumni_id);

create table if not exists public.aasa_alumni_mentorships (
  id uuid primary key default gen_random_uuid(),
  mentor_alumni_id uuid not null references public.aasa_alumni_records(id) on delete restrict,
  mentee_member_id uuid not null references public.aasa_members(id) on delete restrict,
  topic text not null check (char_length(btrim(topic)) between 3 and 180),
  goals text,
  status text not null default 'proposed' check (status in ('proposed','active','completed','declined','cancelled')),
  starts_on date,
  ends_on date,
  notes text,
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on),
  check (goals is null or char_length(goals) <= 3000),
  check (notes is null or char_length(notes) <= 3000)
);
create index if not exists aasa_alumni_mentorship_mentor_idx on public.aasa_alumni_mentorships(mentor_alumni_id, status);
create index if not exists aasa_alumni_mentorship_mentee_idx on public.aasa_alumni_mentorships(mentee_member_id, status);

-- Engagement activities are non-financial. Monetary donations and dues remain in AASA Finance/Payments.
create table if not exists public.aasa_alumni_engagement_activities (
  id uuid primary key default gen_random_uuid(),
  alumni_id uuid not null references public.aasa_alumni_records(id) on delete cascade,
  activity_type text not null check (activity_type in ('volunteering','project','mentorship','reunion','professional_talk','other')),
  title text not null check (char_length(btrim(title)) between 3 and 180),
  description text,
  occurred_on date not null default current_date,
  hours numeric(7,2) check (hours is null or hours >= 0),
  related_project_id uuid references public.aasa_projects(id) on delete set null,
  recorded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (description is null or char_length(description) <= 4000)
);
create index if not exists aasa_alumni_engagement_profile_idx on public.aasa_alumni_engagement_activities(alumni_id, occurred_on desc);
create index if not exists aasa_alumni_engagement_type_idx on public.aasa_alumni_engagement_activities(activity_type, occurred_on desc);

-- Small, privacy-conscious audit trail: never copies contact details or free-text notes.
create table if not exists public.aasa_alumni_activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action_key text not null,
  entity_type text not null,
  entity_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists aasa_alumni_activity_log_created_idx on public.aasa_alumni_activity_log(created_at desc);

create or replace function public.aasa_alumni_touch_and_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_actor uuid := auth.uid();
begin
  if tg_op = 'UPDATE' then
    new.updated_at := now();
    if to_jsonb(new) ? 'created_by' then
      new.created_by := old.created_by;
      new.updated_by := v_actor;
    end if;
    if to_jsonb(new) ? 'registered_by' and v_actor is not null then new.registered_by := v_actor; end if;
    if to_jsonb(new) ? 'added_by' and v_actor is not null then new.added_by := v_actor; end if;
    if to_jsonb(new) ? 'recorded_by' and v_actor is not null then new.recorded_by := v_actor; end if;
    v_id := new.id;
  elsif tg_op = 'INSERT' then
    if to_jsonb(new) ? 'created_by' and v_actor is not null then
      new.created_by := v_actor;
      new.updated_by := v_actor;
    end if;
    if to_jsonb(new) ? 'registered_by' and v_actor is not null then new.registered_by := v_actor; end if;
    if to_jsonb(new) ? 'added_by' and v_actor is not null then new.added_by := v_actor; end if;
    if to_jsonb(new) ? 'recorded_by' and v_actor is not null then new.recorded_by := v_actor; end if;
    v_id := new.id;
  else
    v_id := old.id;
  end if;

  insert into public.aasa_alumni_activity_log(actor_user_id,action_key,entity_type,entity_id)
  values (v_actor, lower(tg_op), tg_table_name, v_id);

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.aasa_alumni_touch_and_audit() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'aasa_alumni_education_history','aasa_alumni_employment_history','aasa_alumni_events',
    'aasa_alumni_event_registrations','aasa_alumni_chapters','aasa_alumni_chapter_members',
    'aasa_alumni_mentorships','aasa_alumni_engagement_activities','aasa_alumni_activity_log'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end $$;

grant select,insert,update,delete on public.aasa_alumni_education_history to authenticated;
grant select,insert,update,delete on public.aasa_alumni_employment_history to authenticated;
grant select,insert,update,delete on public.aasa_alumni_events to authenticated;
grant select,insert,update,delete on public.aasa_alumni_event_registrations to authenticated;
grant select,insert,update,delete on public.aasa_alumni_chapters to authenticated;
grant select,insert,update,delete on public.aasa_alumni_chapter_members to authenticated;
grant select,insert,update,delete on public.aasa_alumni_mentorships to authenticated;
grant select,insert,update,delete on public.aasa_alumni_engagement_activities to authenticated;
grant select on public.aasa_alumni_activity_log to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'aasa_alumni_education_history','aasa_alumni_employment_history','aasa_alumni_events',
    'aasa_alumni_event_registrations','aasa_alumni_chapters','aasa_alumni_chapter_members',
    'aasa_alumni_mentorships','aasa_alumni_engagement_activities'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.aasa_has_permission(''alumni.read'') or public.aasa_has_permission(''alumni.manage''))', t || '_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.aasa_has_permission(''alumni.manage''))', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.aasa_has_permission(''alumni.manage'')) with check (public.aasa_has_permission(''alumni.manage''))', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.aasa_has_permission(''alumni.manage''))', t || '_delete', t);
    execute format('drop trigger if exists %I on public.%I', t || '_audit', t);
    execute format('create trigger %I before insert or update or delete on public.%I for each row execute function public.aasa_alumni_touch_and_audit()', t || '_audit', t);
  end loop;
end $$;

drop policy if exists aasa_alumni_activity_log_read on public.aasa_alumni_activity_log;
create policy aasa_alumni_activity_log_read on public.aasa_alumni_activity_log
for select to authenticated using (public.aasa_has_permission('alumni.read') or public.aasa_has_permission('alumni.manage'));

-- The audit log is written only by the security-definer trigger above.
revoke insert,update,delete on public.aasa_alumni_activity_log from authenticated;

-- No public or anonymous access to alumni operational data.
