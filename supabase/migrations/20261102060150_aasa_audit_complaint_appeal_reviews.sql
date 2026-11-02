create unique index if not exists aasa_complaint_one_open_appeal_idx
on public.aasa_complaint_appeals(complaint_id) where status in ('SUBMITTED','UNDER_REVIEW');

create or replace function public.aasa_audit_complaint_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_action text; v_entity text; v_id text; v_details jsonb := '{}'::jsonb;
begin
  if tg_table_name='aasa_complaint_appeals' then
    v_entity:='complaint_appeal'; v_id:=new.id::text;
    if tg_op='INSERT' then v_action:='complaints.appeal_submitted';
    else v_action:='complaints.appeal_reviewed'; end if;
    v_details:=jsonb_build_object('complaint_id',new.complaint_id,'status',new.status);
  else
    v_entity:='complaint'; v_id:=new.id::text;
    if tg_op='INSERT' then v_action:='complaints.submitted';
      v_details:=jsonb_build_object('case_ref',new.case_ref,'category',new.category,'priority',new.priority);
    elsif old.assigned_reviewer_id is distinct from new.assigned_reviewer_id then
      v_action:='complaints.assigned'; v_details:=jsonb_build_object('assigned_reviewer_id',new.assigned_reviewer_id);
    elsif old.decision is distinct from new.decision then
      v_action:='complaints.decision_recorded'; v_details:=jsonb_build_object('status',new.status);
    elsif old.status is distinct from new.status then
      v_action:='complaints.status_changed'; v_details:=jsonb_build_object('from',old.status,'to',new.status);
    else return new; end if;
  end if;
  insert into public.aasa_audit_log(actor_user_id,action_key,entity_type,entity_id,details)
  values(v_actor,v_action,v_entity,v_id,v_details);
  return new;
end; $$;
revoke all on function public.aasa_audit_complaint_activity() from public,anon,authenticated;
drop trigger if exists aasa_complaint_appeals_audit_activity on public.aasa_complaint_appeals;
create trigger aasa_complaint_appeals_audit_activity after insert or update on public.aasa_complaint_appeals
for each row execute function public.aasa_audit_complaint_activity();
