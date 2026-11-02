create or replace function public.aasa_record_complaint_decision(p_complaint_id uuid,p_decision text,p_status text default 'DECISION_RECORDED')
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not (public.aasa_has_permission('complaints.review') or public.aasa_has_permission('complaints.manage')) then
    raise exception 'Complaint review permission required';
  end if;
  if char_length(btrim(coalesce(p_decision,'')))<10 or char_length(p_decision)>12000 then
    raise exception 'Decision must be between 10 and 12000 characters';
  end if;
  if p_status not in ('DECISION_RECORDED','RESOLVED','CLOSED','APPEAL') then raise exception 'Invalid decision status'; end if;
  update public.aasa_complaints set decision=btrim(p_decision),decision_recorded_by=auth.uid(),
    decision_recorded_at=now(),status=p_status,updated_at=now()
  where id=p_complaint_id and submitted_by<>auth.uid() and assigned_reviewer_id=auth.uid();
  if not found then raise exception 'Assign this complaint to yourself before recording a decision'; end if;
end; $$;
revoke all on function public.aasa_record_complaint_decision(uuid,text,text) from public,anon;
grant execute on function public.aasa_record_complaint_decision(uuid,text,text) to authenticated;
