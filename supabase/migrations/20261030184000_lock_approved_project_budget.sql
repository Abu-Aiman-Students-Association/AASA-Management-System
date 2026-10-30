-- Prevent project managers from changing an approved budget or altering a final report under review.
create or replace function public.aasa_guard_project_approval_fields()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if row(new.approval_status,new.approved_budget,new.approved_by,new.approved_at,new.approval_note)
     is distinct from row(old.approval_status,old.approved_budget,old.approved_by,old.approved_at,old.approval_note)
     and not (
       old.approval_status='rejected' and new.approval_status='pending'
       and new.approved_budget is null and new.approved_by is null and new.approved_at is null and new.approval_note is null
       and public.aasa_has_permission('projects.manage')
     )
     and not public.aasa_has_permission('projects.approve') then
    raise exception 'Project budget approval requires projects.approve permission' using errcode='42501';
  end if;
  if new.budget_request is distinct from old.budget_request and old.approval_status='approved' then
    raise exception 'An approved project budget is locked; a separate budget amendment workflow is required';
  end if;
  if row(new.completion_status,new.completion_requested_by,new.completion_requested_at)
     is distinct from row(old.completion_status,old.completion_requested_by,old.completion_requested_at)
     and not (
       new.completion_status='pending'
       and new.completion_requested_by=(select auth.uid())
       and public.aasa_has_permission('projects.manage')
     )
     and not public.aasa_has_permission('projects.approve') then
    raise exception 'Project completion request requires projects.manage permission' using errcode='42501';
  end if;
  if row(new.completion_reviewed_by,new.completion_reviewed_at,new.completion_review_note)
     is distinct from row(old.completion_reviewed_by,old.completion_reviewed_at,old.completion_review_note)
     and not (
       new.completion_status='pending'
       and new.completion_requested_by=(select auth.uid())
       and new.completion_reviewed_by is null
       and new.completion_reviewed_at is null
       and new.completion_review_note is null
       and public.aasa_has_permission('projects.manage')
     )
     and not public.aasa_has_permission('projects.approve') then
    raise exception 'Project completion review requires projects.approve permission' using errcode='42501';
  end if;
  if new.completion_report is distinct from old.completion_report and old.completion_status='pending'
     and not public.aasa_has_permission('projects.approve') then
    raise exception 'A final report awaiting review cannot be edited by the project manager';
  end if;
  if new.completion_status='pending' and (
    new.status not in ('active','paused') or length(btrim(coalesce(new.completion_report,'')))<50
  ) then
    raise exception 'A completion request requires an active or paused project and a final report of at least 50 characters';
  end if;
  if new.project_owner_member_id is distinct from old.project_owner_member_id then
    raise exception 'Project owner is retained as a historical assignment; add or remove team members instead';
  end if;
  if new.status='approved' and new.approval_status<>'approved' then
    raise exception 'A project cannot be marked approved before its budget is approved';
  end if;
  if new.status='active' and new.approval_status<>'approved' then
    raise exception 'Only an approved project can become active';
  end if;
  if new.status='completed' and new.completion_status<>'approved' then
    raise exception 'Project completion must be approved before closing';
  end if;
  if new.status is distinct from old.status and not (
    (old.status='planned' and new.status in ('approved','cancelled')) or
    (old.status='approved' and new.status in ('active','cancelled')) or
    (old.status='active' and new.status in ('paused','cancelled','completed')) or
    (old.status='paused' and new.status in ('active','cancelled','completed'))
  ) then
    raise exception 'This project status transition is not permitted';
  end if;
  new.updated_at=now();
  return new;
end;
$$;
revoke all on function public.aasa_guard_project_approval_fields() from public, anon, authenticated;
