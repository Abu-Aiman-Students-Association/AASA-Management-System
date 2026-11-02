drop policy if exists aasa_complaint_appeals_review_update on public.aasa_complaint_appeals;
create policy aasa_complaint_appeals_review_update on public.aasa_complaint_appeals for update to authenticated
using (public.aasa_has_permission('complaints.review') or public.aasa_has_permission('complaints.manage'))
with check (public.aasa_has_permission('complaints.review') or public.aasa_has_permission('complaints.manage'));
grant update on public.aasa_complaint_appeals to authenticated;
create or replace function public.aasa_review_complaint_appeal(p_appeal_id uuid,p_status text,p_outcome text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not (public.aasa_has_permission('complaints.review') or public.aasa_has_permission('complaints.manage')) then
    raise exception 'Complaint review permission required';
  end if;
  if p_status not in ('UNDER_REVIEW','UPHELD','REJECTED') then raise exception 'Invalid appeal status'; end if;
  if char_length(btrim(coalesce(p_outcome,'')))<10 or char_length(p_outcome)>12000 then
    raise exception 'Outcome must be between 10 and 12000 characters';
  end if;
  update public.aasa_complaint_appeals set status=p_status,outcome=btrim(p_outcome),
    reviewer_id=coalesce(reviewer_id,auth.uid()),
    decided_by=case when p_status in ('UPHELD','REJECTED') then auth.uid() else decided_by end,
    decided_at=case when p_status in ('UPHELD','REJECTED') then now() else decided_at end,updated_at=now()
  where id=p_appeal_id;
  if not found then raise exception 'Appeal not found'; end if;
end; $$;
revoke all on function public.aasa_review_complaint_appeal(uuid,text,text) from public,anon;
grant execute on function public.aasa_review_complaint_appeal(uuid,text,text) to authenticated;
