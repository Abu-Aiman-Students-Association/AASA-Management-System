create or replace function public.aasa_assign_complaint_to_self(p_complaint_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not (public.aasa_has_permission('complaints.review') or public.aasa_has_permission('complaints.manage')) then
    raise exception 'Complaint review permission required';
  end if;
  update public.aasa_complaints set assigned_reviewer_id=auth.uid(),
    status=case when status='SUBMITTED' then 'UNDER_REVIEW' else status end, updated_at=now()
  where id=p_complaint_id and submitted_by<>auth.uid()
    and (assigned_reviewer_id is null or assigned_reviewer_id=auth.uid());
  if not found then raise exception 'Complaint is unavailable or assigned to another reviewer'; end if;
end; $$;
revoke all on function public.aasa_assign_complaint_to_self(uuid) from public,anon;
grant execute on function public.aasa_assign_complaint_to_self(uuid) to authenticated;
