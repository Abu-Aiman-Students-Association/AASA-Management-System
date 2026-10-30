-- Keep project budget and approval details visible only to project managers/approvers.
drop policy if exists aasa_projects_read_authorised on public.aasa_projects;
create policy aasa_projects_read_authorised on public.aasa_projects for select to authenticated
using (public.aasa_has_permission('projects.manage') or public.aasa_has_permission('projects.approve'));

-- Member-facing task summary returns only assigned task and project identity fields.
create or replace function public.aasa_list_my_project_tasks()
returns table(
  task_id uuid, project_id uuid, project_code text, project_title text,
  title text, description text, due_date date, priority text, status text,
  progress_percent integer, completion_note text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_member_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select m.id into v_member_id from public.aasa_members m
  where m.auth_user_id=auth.uid() and m.status='active' limit 1;
  if v_member_id is null then raise exception 'An active linked member record is required' using errcode='42501'; end if;
  return query
    select t.id,t.project_id,p.project_code,p.title,t.title,t.description,t.due_date,t.priority,t.status,t.progress_percent,t.completion_note
    from public.aasa_project_tasks t
    join public.aasa_projects p on p.id=t.project_id
    join public.aasa_project_members pm on pm.project_id=t.project_id and pm.member_id=v_member_id
    where t.assigned_to_member_id=v_member_id
      and t.status not in ('completed','cancelled')
      and p.status not in ('completed','cancelled')
    order by t.due_date nulls last,t.created_at;
end;
$$;
revoke all on function public.aasa_list_my_project_tasks() from public, anon;
grant execute on function public.aasa_list_my_project_tasks() to authenticated;

-- An assigned member may update their own task only while its project is active.
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
    and exists(select 1 from public.aasa_projects p where p.id=t.project_id and p.status='active')
    and t.status<>'cancelled';
  if not found then raise exception 'Task is not assigned to you or its project is not active' using errcode='42501'; end if;
end;
$$;
revoke all on function public.aasa_update_own_project_task(uuid,text,integer,text) from public, anon;
grant execute on function public.aasa_update_own_project_task(uuid,text,integer,text) to authenticated;
