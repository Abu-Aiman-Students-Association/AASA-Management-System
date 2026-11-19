-- Alumni career opportunity board and verified-alumni interest tracking.
create table if not exists public.aasa_alumni_career_opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 3 and 180),
  company text not null check (char_length(btrim(company)) between 2 and 180),
  industry text,
  location text,
  employment_type text not null default 'full_time' check (employment_type in ('full_time','part_time','contract','internship','volunteer')),
  description text,
  application_url text,
  closing_date date,
  status text not null default 'open' check (status in ('open','closed')),
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (description is null or char_length(description) <= 8000),
  check (application_url is null or (char_length(application_url) <= 1000 and application_url ~ '^https?://'))
);
create index if not exists aasa_alumni_career_opportunities_open_idx on public.aasa_alumni_career_opportunities(status,closing_date);

create table if not exists public.aasa_alumni_opportunity_applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.aasa_alumni_career_opportunities(id) on delete cascade,
  alumni_id uuid not null references public.aasa_alumni_records(id) on delete cascade,
  application_status text not null default 'interested' check (application_status in ('interested','referred','applied','interviewing','offered','declined','withdrawn')),
  notes text,
  recorded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(opportunity_id,alumni_id),
  check (notes is null or char_length(notes) <= 3000)
);
create index if not exists aasa_alumni_opportunity_applications_profile_idx on public.aasa_alumni_opportunity_applications(alumni_id,created_at desc);

alter table public.aasa_alumni_career_opportunities enable row level security;
alter table public.aasa_alumni_opportunity_applications enable row level security;
revoke all on public.aasa_alumni_career_opportunities from anon;
revoke all on public.aasa_alumni_opportunity_applications from anon;
grant select,insert,update,delete on public.aasa_alumni_career_opportunities to authenticated;
grant select,insert,update,delete on public.aasa_alumni_opportunity_applications to authenticated;
grant all on public.aasa_alumni_career_opportunities to service_role;
grant all on public.aasa_alumni_opportunity_applications to service_role;

drop policy if exists aasa_alumni_career_opportunities_read on public.aasa_alumni_career_opportunities;
create policy aasa_alumni_career_opportunities_read on public.aasa_alumni_career_opportunities
for select to authenticated using (public.aasa_has_permission('alumni.read') or public.aasa_has_permission('alumni.manage'));
drop policy if exists aasa_alumni_career_opportunities_insert on public.aasa_alumni_career_opportunities;
create policy aasa_alumni_career_opportunities_insert on public.aasa_alumni_career_opportunities
for insert to authenticated with check (public.aasa_has_permission('alumni.manage'));
drop policy if exists aasa_alumni_career_opportunities_update on public.aasa_alumni_career_opportunities;
create policy aasa_alumni_career_opportunities_update on public.aasa_alumni_career_opportunities
for update to authenticated using (public.aasa_has_permission('alumni.manage')) with check (public.aasa_has_permission('alumni.manage'));
drop policy if exists aasa_alumni_career_opportunities_delete on public.aasa_alumni_career_opportunities;
create policy aasa_alumni_career_opportunities_delete on public.aasa_alumni_career_opportunities
for delete to authenticated using (public.aasa_has_permission('alumni.manage'));

drop policy if exists aasa_alumni_opportunity_applications_read on public.aasa_alumni_opportunity_applications;
create policy aasa_alumni_opportunity_applications_read on public.aasa_alumni_opportunity_applications
for select to authenticated using (public.aasa_has_permission('alumni.read') or public.aasa_has_permission('alumni.manage'));
drop policy if exists aasa_alumni_opportunity_applications_insert on public.aasa_alumni_opportunity_applications;
create policy aasa_alumni_opportunity_applications_insert on public.aasa_alumni_opportunity_applications
for insert to authenticated with check (public.aasa_has_permission('alumni.manage'));
drop policy if exists aasa_alumni_opportunity_applications_update on public.aasa_alumni_opportunity_applications;
create policy aasa_alumni_opportunity_applications_update on public.aasa_alumni_opportunity_applications
for update to authenticated using (public.aasa_has_permission('alumni.manage')) with check (public.aasa_has_permission('alumni.manage'));
drop policy if exists aasa_alumni_opportunity_applications_delete on public.aasa_alumni_opportunity_applications;
create policy aasa_alumni_opportunity_applications_delete on public.aasa_alumni_opportunity_applications
for delete to authenticated using (public.aasa_has_permission('alumni.manage'));

drop trigger if exists aasa_alumni_career_opportunities_audit on public.aasa_alumni_career_opportunities;
create trigger aasa_alumni_career_opportunities_audit before insert or update or delete on public.aasa_alumni_career_opportunities
for each row execute function public.aasa_alumni_touch_and_audit();
drop trigger if exists aasa_alumni_opportunity_applications_audit on public.aasa_alumni_opportunity_applications;
create trigger aasa_alumni_opportunity_applications_audit before insert or update or delete on public.aasa_alumni_opportunity_applications
for each row execute function public.aasa_alumni_touch_and_audit();
drop trigger if exists aasa_alumni_opportunity_verified_guard on public.aasa_alumni_opportunity_applications;
create trigger aasa_alumni_opportunity_verified_guard before insert or update of alumni_id on public.aasa_alumni_opportunity_applications
for each row execute function public.aasa_require_verified_alumni('alumni_id');

create or replace function public.aasa_validate_alumni_opportunity_application()
returns trigger
language plpgsql
security definer
set search_path = ''
as $opportunity_guard$
declare
  v_status text;
  v_closing_date date;
begin
  select status,closing_date into v_status,v_closing_date
  from public.aasa_alumni_career_opportunities
  where id=new.opportunity_id for update;
  if tg_op='INSERT' then
    if v_status is distinct from 'open' or (v_closing_date is not null and v_closing_date < current_date) then
      raise exception 'Alumni interest can only be recorded for open opportunities before their closing date' using errcode='23514';
    end if;
  elsif new.opportunity_id is distinct from old.opportunity_id then
    if v_status is distinct from 'open' or (v_closing_date is not null and v_closing_date < current_date) then
      raise exception 'Alumni interest can only be recorded for open opportunities before their closing date' using errcode='23514';
    end if;
  end if;
  return new;
end;
$opportunity_guard$;
revoke all on function public.aasa_validate_alumni_opportunity_application() from public,anon,authenticated;
drop trigger if exists aasa_alumni_opportunity_open_guard on public.aasa_alumni_opportunity_applications;
create trigger aasa_alumni_opportunity_open_guard before insert or update of opportunity_id on public.aasa_alumni_opportunity_applications
for each row execute function public.aasa_validate_alumni_opportunity_application();
