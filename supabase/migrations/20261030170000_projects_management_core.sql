-- AASA Projects & Development module.
-- Adds the approved project workflow without inserting demo records.
-- All exposed tables explicitly grant only authenticated/service roles and enforce RLS.
create table if not exists public.aasa_projects (
  id uuid primary key default gen_random_uuid(),
  project_code text not null unique default ('AASA-PRJ-' || to_char(now(),'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  title text not null check (length(btrim(title)) between 3 and 180),
  proposal text not null check (length(btrim(proposal)) between 10 and 5000),
  objectives text not null check (length(btrim(objectives)) between 10 and 5000),
  expected_outcomes text not null check (length(btrim(expected_outcomes)) between 5 and 5000),
  project_owner_member_id uuid not null references public.aasa_members(id) on delete restrict,
  assigned_committee_id uuid references public.aasa_committees(id) on delete set null,
  budget_request numeric(14,2) not null default 0 check (budget_request >= 0),
  approved_budget numeric(14,2) check (approved_budget is null or approved_budget >= 0),
  currency text not null default 'NGN' check (currency ~ '^[A-Z]{3}$'),
  start_date date,
  target_end_date date,
  actual_end_date date,
  status text not null default 'planned' check (status in ('planned','approved','active','paused','completed','cancelled')),
  approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected')),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  approval_note text check (approval_note is null or length(approval_note) <= 2000),
  completion_status text not null default 'not_requested' check (completion_status in ('not_requested','pending','approved','rejected')),
  completion_report text check (completion_report is null or length(completion_report) <= 12000),
  completion_requested_by uuid references auth.users(id),
  completion_requested_at timestamptz,
  completion_reviewed_by uuid references auth.users(id),
  completion_reviewed_at timestamptz,
  completion_review_note text check (completion_review_note is null or length(completion_review_note) <= 2000),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (target_end_date is null or start_date is null or target_end_date >= start_date),
  check ((approval_status = 'approved' and approved_by is not null and approved_at is not null) or approval_status <> 'approved'),
  check ((completion_status in ('pending','approved','rejected') and completion_requested_by is not null and completion_requested_at is not null) or completion_status = 'not_requested')
);

create table if not exists public.aasa_project_members (
  project_id uuid not null references public.aasa_projects(id) on delete cascade,
  member_id uuid not null references public.aasa_members(id) on delete restrict,
  project_role text not null default 'team_member' check (project_role in ('owner','team_lead','team_member','observer')),
  assigned_by uuid not null references auth.users(id),
  assigned_at timestamptz not null default now(),
  primary key (project_id, member_id)
);

create table if not exists public.aasa_project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.aasa_projects(id) on delete cascade,
  title text not null check (length(btrim(title)) between 2 and 180),
  description text check (description is null or length(description) <= 3000),
  due_date date,
  status text not null default 'planned' check (status in ('planned','in_progress','completed','blocked')),
  completed_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.aasa_project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.aasa_projects(id) on delete cascade,
  milestone_id uuid references public.aasa_project_milestones(id) on delete set null,
  title text not null check (length(btrim(title)) between 2 and 180),
  description text check (description is null or length(description) <= 3000),
  assigned_to_member_id uuid references public.aasa_members(id) on delete set null,
  due_date date,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'todo' check (status in ('todo','in_progress','blocked','completed','cancelled')),
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  completion_note text check (completion_note is null or length(completion_note) <= 2000),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'completed' or progress_percent = 100)
);

create table if not exists public.aasa_project_progress_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.aasa_projects(id) on delete cascade,
  reporting_period date not null default current_date,
  progress_percent integer not null check (progress_percent between 0 and 100),
  report_body text not null check (length(btrim(report_body)) between 10 and 6000),
  submitted_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.aasa_project_risks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.aasa_projects(id) on delete cascade,
  title text not null check (length(btrim(title)) between 3 and 180),
  description text not null check (length(btrim(description)) between 10 and 3000),
  likelihood text not null default 'medium' check (likelihood in ('low','medium','high')),
  impact text not null default 'medium' check (impact in ('low','medium','high')),
  mitigation_plan text check (mitigation_plan is null or length(mitigation_plan) <= 3000),
  status text not null default 'open' check (status in ('open','mitigating','accepted','closed')),
  owner_member_id uuid references public.aasa_members(id) on delete set null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.aasa_project_documents (
  project_id uuid not null references public.aasa_projects(id) on delete cascade,
  document_id uuid not null references public.aasa_documents(id) on delete restrict,
  added_by uuid not null references auth.users(id),
  added_at timestamptz not null default now(),
  primary key (project_id, document_id)
);

create index if not exists aasa_projects_status_idx on public.aasa_projects(status, approval_status);
create index if not exists aasa_projects_owner_idx on public.aasa_projects(project_owner_member_id);
create index if not exists aasa_project_members_member_idx on public.aasa_project_members(member_id);
create index if not exists aasa_project_milestones_project_idx on public.aasa_project_milestones(project_id, due_date);
create index if not exists aasa_project_tasks_project_idx on public.aasa_project_tasks(project_id, status, due_date);
create index if not exists aasa_project_tasks_assignee_idx on public.aasa_project_tasks(assigned_to_member_id, status);
create index if not exists aasa_project_progress_project_idx on public.aasa_project_progress_reports(project_id, reporting_period desc);
create index if not exists aasa_project_risks_project_idx on public.aasa_project_risks(project_id, status);

-- Project permissions: existing projects.manage grants remain unchanged.
insert into public.permissions(permission_key,module_key,description)
values ('projects.approve','projects','Approve or reject project budgets and completion reports.')
on conflict (permission_key) do nothing;

insert into public.role_permissions(role_id,permission_id)
select r.id,p.id
from public.roles r cross join public.permissions p
where r.role_key='association_admin' and p.permission_key='projects.approve'
on conflict do nothing;

-- Minimal member picker: does not expose contact details or unrelated profile fields.
create or replace function public.aasa_list_project_assignable_members()
returns table(id uuid, full_name text, member_number text, has_login boolean)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null or not public.aasa_has_permission('projects.manage') then
    raise exception 'Not authorised to list project team members' using errcode='42501';
  end if;
  return query
    select m.id,m.full_name,m.member_number,(m.auth_user_id is not null)
    from public.aasa_members m
    where m.status='active'
    order by m.full_name
    limit 1000;
end;
$$;
revoke all on function public.aasa_list_project_assignable_members() from public, anon;
grant execute on function public.aasa_list_project_assignable_members() to authenticated;

-- Team members may read only projects to which their active member record is assigned.
create or replace function public.aasa_is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.aasa_project_members pm
    join public.aasa_members m on m.id=pm.member_id
    where pm.project_id=p_project_id
      and m.auth_user_id=auth.uid()
      and m.status='active'
  );
$$;
revoke all on function public.aasa_is_project_member(uuid) from public, anon;
grant execute on function public.aasa_is_project_member(uuid) to authenticated;

-- Add the project owner to the team automatically, preserving one transaction for creation.
create or replace function public.aasa_add_project_owner_to_team()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not exists(select 1 from public.aasa_members where id=new.project_owner_member_id and status='active') then
    raise exception 'Project owner must be an active AASA member';
  end if;
  insert into public.aasa_project_members(project_id,member_id,project_role,assigned_by)
  values(new.id,new.project_owner_member_id,'owner',new.created_by)
  on conflict(project_id,member_id) do update set project_role='owner';
  return new;
end;
$$;
revoke all on function public.aasa_add_project_owner_to_team() from public, anon, authenticated;
drop trigger if exists aasa_projects_add_owner_to_team on public.aasa_projects;
create trigger aasa_projects_add_owner_to_team
after insert on public.aasa_projects
for each row execute function public.aasa_add_project_owner_to_team();

create or replace function public.aasa_guard_project_approval_fields()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if row(new.approval_status,new.approved_budget,new.approved_by,new.approved_at,new.approval_note)
     is distinct from row(old.approval_status,old.approved_budget,old.approved_by,old.approved_at,old.approval_note)
     and not public.aasa_has_permission('projects.approve') then
    raise exception 'Project budget approval requires projects.approve permission' using errcode='42501';
  end if;
  if row(new.completion_status,new.completion_requested_by,new.completion_requested_at,new.completion_reviewed_by,new.completion_reviewed_at,new.completion_review_note)
     is distinct from row(old.completion_status,old.completion_requested_by,old.completion_requested_at,old.completion_reviewed_by,old.completion_reviewed_at,old.completion_review_note)
     and not public.aasa_has_permission('projects.approve') then
    raise exception 'Project completion review requires projects.approve permission' using errcode='42501';
  end if;
  if new.status='active' and new.approval_status<>'approved' then
    raise exception 'Only an approved project can become active';
  end if;
  if new.status='completed' and new.completion_status<>'approved' then
    raise exception 'Project completion must be approved before closing';
  end if;
  new.updated_at=now();
  return new;
end;
$$;
drop trigger if exists aasa_projects_guard_approval on public.aasa_projects;
create trigger aasa_projects_guard_approval
before update on public.aasa_projects
for each row execute function public.aasa_guard_project_approval_fields();

create or replace function public.aasa_review_project_budget(
  p_project_id uuid,
  p_decision text,
  p_approved_budget numeric default null,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null or not public.aasa_has_permission('projects.approve') then
    raise exception 'Not authorised to review project budgets' using errcode='42501';
  end if;
  if p_decision not in ('approved','rejected') then
    raise exception 'Decision must be approved or rejected';
  end if;
  if p_note is not null and length(p_note)>2000 then raise exception 'Review note is too long'; end if;
  if p_decision='approved' and (p_approved_budget is null or p_approved_budget<0) then
    raise exception 'Enter a valid approved budget';
  end if;
  update public.aasa_projects
  set approval_status=p_decision,
      approved_budget=case when p_decision='approved' then p_approved_budget else null end,
      approved_by=auth.uid(),
      approved_at=now(),
      approval_note=nullif(btrim(p_note),''),
      status=case when p_decision='approved' then 'approved' else 'planned' end,
      updated_at=now()
  where id=p_project_id and approval_status='pending';
  if not found then raise exception 'Project not found or budget is no longer awaiting review'; end if;
end;
$$;
revoke all on function public.aasa_review_project_budget(uuid,text,numeric,text) from public, anon;
grant execute on function public.aasa_review_project_budget(uuid,text,numeric,text) to authenticated;

create or replace function public.aasa_request_project_completion(p_project_id uuid,p_final_report text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null or not public.aasa_has_permission('projects.manage') then
    raise exception 'Not authorised to submit project completion' using errcode='42501';
  end if;
  if p_final_report is null or length(btrim(p_final_report))<50 or length(p_final_report)>12000 then
    raise exception 'The final report must contain at least 50 characters and no more than 12,000';
  end if;
  update public.aasa_projects
  set completion_status='pending',completion_report=btrim(p_final_report),
      completion_requested_by=auth.uid(),completion_requested_at=now(),
      completion_reviewed_by=null,completion_reviewed_at=null,completion_review_note=null,
      updated_at=now()
  where id=p_project_id and status in ('active','paused') and completion_status in ('not_requested','rejected');
  if not found then raise exception 'Project is not ready for completion review'; end if;
end;
$$;
revoke all on function public.aasa_request_project_completion(uuid,text) from public, anon;
grant execute on function public.aasa_request_project_completion(uuid,text) to authenticated;

create or replace function public.aasa_review_project_completion(p_project_id uuid,p_decision text,p_note text default null)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null or not public.aasa_has_permission('projects.approve') then
    raise exception 'Not authorised to review project completion' using errcode='42501';
  end if;
  if p_decision not in ('approved','rejected') then raise exception 'Decision must be approved or rejected'; end if;
  if p_note is not null and length(p_note)>2000 then raise exception 'Review note is too long'; end if;
  update public.aasa_projects
  set completion_status=p_decision,
      completion_reviewed_by=auth.uid(),completion_reviewed_at=now(),
      completion_review_note=nullif(btrim(p_note),''),
      status=case when p_decision='approved' then 'completed' else 'active' end,
      actual_end_date=case when p_decision='approved' then current_date else null end,
      updated_at=now()
  where id=p_project_id and completion_status='pending';
  if not found then raise exception 'Project not found or completion is no longer awaiting review'; end if;
end;
$$;
revoke all on function public.aasa_review_project_completion(uuid,text,text) from public, anon;
grant execute on function public.aasa_review_project_completion(uuid,text,text) to authenticated;

create or replace function public.aasa_update_own_project_task(
  p_task_id uuid,p_status text,p_progress_percent integer,p_completion_note text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_member_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_status not in ('todo','in_progress','blocked','completed') then raise exception 'Invalid task status'; end if;
  if p_progress_percent is null or p_progress_percent<0 or p_progress_percent>100 then raise exception 'Progress must be between 0 and 100'; end if;
  if p_completion_note is not null and length(p_completion_note)>2000 then raise exception 'Task note is too long'; end if;
  select id into v_member_id from public.aasa_members where auth_user_id=auth.uid() and status='active' limit 1;
  if v_member_id is null then raise exception 'An active linked member record is required' using errcode='42501'; end if;
  update public.aasa_project_tasks t
  set status=p_status,progress_percent=case when p_status='completed' then 100 else p_progress_percent end,
      completion_note=nullif(btrim(p_completion_note),''),updated_at=now()
  where t.id=p_task_id and t.assigned_to_member_id=v_member_id
    and exists(select 1 from public.aasa_project_members pm where pm.project_id=t.project_id and pm.member_id=v_member_id)
    and t.status<>'cancelled';
  if not found then raise exception 'Task is not assigned to your active project membership' using errcode='42501'; end if;
end;
$$;
revoke all on function public.aasa_update_own_project_task(uuid,text,integer,text) from public, anon;
grant execute on function public.aasa_update_own_project_task(uuid,text,integer,text) to authenticated;

-- Row-level security and explicit Data API grants (required for tables created on/after 2026-10-30).
do $$
declare t text;
begin
  foreach t in array array['aasa_projects','aasa_project_members','aasa_project_milestones','aasa_project_tasks','aasa_project_progress_reports','aasa_project_risks','aasa_project_documents'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('grant all on table public.%I to service_role',t);
  end loop;
end $$;
grant select,insert,update on public.aasa_projects to authenticated;
grant select,insert,delete on public.aasa_project_members to authenticated;
grant select,insert,update on public.aasa_project_milestones to authenticated;
grant select,insert,update on public.aasa_project_tasks to authenticated;
grant select,insert on public.aasa_project_progress_reports to authenticated;
grant select,insert,update on public.aasa_project_risks to authenticated;
grant select,insert,delete on public.aasa_project_documents to authenticated;
revoke all on all tables in schema public from anon;

drop policy if exists aasa_projects_read_authorised on public.aasa_projects;
create policy aasa_projects_read_authorised on public.aasa_projects for select to authenticated
using (public.aasa_has_permission('projects.manage') or public.aasa_has_permission('projects.approve') or public.aasa_is_project_member(id));
drop policy if exists aasa_projects_create_manager on public.aasa_projects;
create policy aasa_projects_create_manager on public.aasa_projects for insert to authenticated
with check (public.aasa_has_permission('projects.manage') and created_by=(select auth.uid()));
drop policy if exists aasa_projects_update_manager on public.aasa_projects;
create policy aasa_projects_update_manager on public.aasa_projects for update to authenticated
using (public.aasa_has_permission('projects.manage')) with check (public.aasa_has_permission('projects.manage'));

drop policy if exists aasa_project_members_read_authorised on public.aasa_project_members;
create policy aasa_project_members_read_authorised on public.aasa_project_members for select to authenticated
using (public.aasa_has_permission('projects.manage') or public.aasa_has_permission('projects.approve') or public.aasa_is_project_member(project_id));
drop policy if exists aasa_project_members_manage on public.aasa_project_members;
create policy aasa_project_members_manage on public.aasa_project_members for insert to authenticated
with check (public.aasa_has_permission('projects.manage') and assigned_by=(select auth.uid()));
drop policy if exists aasa_project_members_remove on public.aasa_project_members;
create policy aasa_project_members_remove on public.aasa_project_members for delete to authenticated
using (public.aasa_has_permission('projects.manage'));

drop policy if exists aasa_project_milestones_read on public.aasa_project_milestones;
create policy aasa_project_milestones_read on public.aasa_project_milestones for select to authenticated
using (public.aasa_has_permission('projects.manage') or public.aasa_is_project_member(project_id));
drop policy if exists aasa_project_milestones_create on public.aasa_project_milestones;
create policy aasa_project_milestones_create on public.aasa_project_milestones for insert to authenticated
with check (public.aasa_has_permission('projects.manage') and created_by=(select auth.uid()));
drop policy if exists aasa_project_milestones_update on public.aasa_project_milestones;
create policy aasa_project_milestones_update on public.aasa_project_milestones for update to authenticated
using (public.aasa_has_permission('projects.manage')) with check (public.aasa_has_permission('projects.manage'));

drop policy if exists aasa_project_tasks_read on public.aasa_project_tasks;
create policy aasa_project_tasks_read on public.aasa_project_tasks for select to authenticated
using (public.aasa_has_permission('projects.manage') or public.aasa_is_project_member(project_id));
drop policy if exists aasa_project_tasks_create on public.aasa_project_tasks;
create policy aasa_project_tasks_create on public.aasa_project_tasks for insert to authenticated
with check (public.aasa_has_permission('projects.manage') and created_by=(select auth.uid()));
drop policy if exists aasa_project_tasks_update_manager on public.aasa_project_tasks;
create policy aasa_project_tasks_update_manager on public.aasa_project_tasks for update to authenticated
using (public.aasa_has_permission('projects.manage')) with check (public.aasa_has_permission('projects.manage'));

drop policy if exists aasa_project_progress_read on public.aasa_project_progress_reports;
create policy aasa_project_progress_read on public.aasa_project_progress_reports for select to authenticated
using (public.aasa_has_permission('projects.manage') or public.aasa_is_project_member(project_id));
drop policy if exists aasa_project_progress_create on public.aasa_project_progress_reports;
create policy aasa_project_progress_create on public.aasa_project_progress_reports for insert to authenticated
with check ((public.aasa_has_permission('projects.manage') or public.aasa_is_project_member(project_id)) and submitted_by=(select auth.uid()));

drop policy if exists aasa_project_risks_read on public.aasa_project_risks;
create policy aasa_project_risks_read on public.aasa_project_risks for select to authenticated
using (public.aasa_has_permission('projects.manage') or public.aasa_is_project_member(project_id));
drop policy if exists aasa_project_risks_create on public.aasa_project_risks;
create policy aasa_project_risks_create on public.aasa_project_risks for insert to authenticated
with check (public.aasa_has_permission('projects.manage') and created_by=(select auth.uid()));
drop policy if exists aasa_project_risks_update on public.aasa_project_risks;
create policy aasa_project_risks_update on public.aasa_project_risks for update to authenticated
using (public.aasa_has_permission('projects.manage')) with check (public.aasa_has_permission('projects.manage'));

drop policy if exists aasa_project_documents_read on public.aasa_project_documents;
create policy aasa_project_documents_read on public.aasa_project_documents for select to authenticated
using (public.aasa_has_permission('projects.manage') or public.aasa_is_project_member(project_id));
drop policy if exists aasa_project_documents_create on public.aasa_project_documents;
create policy aasa_project_documents_create on public.aasa_project_documents for insert to authenticated
with check (public.aasa_has_permission('projects.manage') and added_by=(select auth.uid()));
drop policy if exists aasa_project_documents_remove on public.aasa_project_documents;
create policy aasa_project_documents_remove on public.aasa_project_documents for delete to authenticated
using (public.aasa_has_permission('projects.manage'));

-- Audit each project record mutation; progress reports are append-only.
drop trigger if exists aasa_projects_audit on public.aasa_projects;
create trigger aasa_projects_audit after insert or update on public.aasa_projects for each row execute function public.aasa_write_audit_log();
drop trigger if exists aasa_project_members_audit on public.aasa_project_members;
create trigger aasa_project_members_audit after insert or delete on public.aasa_project_members for each row execute function public.aasa_write_audit_log();
drop trigger if exists aasa_project_milestones_audit on public.aasa_project_milestones;
create trigger aasa_project_milestones_audit after insert or update on public.aasa_project_milestones for each row execute function public.aasa_write_audit_log();
drop trigger if exists aasa_project_tasks_audit on public.aasa_project_tasks;
create trigger aasa_project_tasks_audit after insert or update on public.aasa_project_tasks for each row execute function public.aasa_write_audit_log();
drop trigger if exists aasa_project_progress_audit on public.aasa_project_progress_reports;
create trigger aasa_project_progress_audit after insert on public.aasa_project_progress_reports for each row execute function public.aasa_write_audit_log();
drop trigger if exists aasa_project_risks_audit on public.aasa_project_risks;
create trigger aasa_project_risks_audit after insert or update on public.aasa_project_risks for each row execute function public.aasa_write_audit_log();
drop trigger if exists aasa_project_documents_audit on public.aasa_project_documents;
create trigger aasa_project_documents_audit after insert or delete on public.aasa_project_documents for each row execute function public.aasa_write_audit_log();
