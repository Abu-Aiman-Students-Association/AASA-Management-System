-- Confidential complaints, assignment, decisions, appeals, and audit trail.
alter table public.aasa_complaints
  add column if not exists decision_recorded_by uuid references auth.users(id),
  add column if not exists decision_recorded_at timestamptz;

create table if not exists public.aasa_complaint_appeals (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.aasa_complaints(id) on delete cascade,
  submitted_by uuid not null references auth.users(id),
  appeal_text text not null check (char_length(btrim(appeal_text)) between 10 and 12000),
  status text not null default 'SUBMITTED' check (status in ('SUBMITTED','UNDER_REVIEW','UPHELD','REJECTED','WITHDRAWN')),
  reviewer_id uuid references auth.users(id),
  outcome text,
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists aasa_complaint_appeals_complaint_created_idx
  on public.aasa_complaint_appeals (complaint_id, created_at desc);
alter table public.aasa_complaint_appeals enable row level security;

drop policy if exists aasa_complaints_submit on public.aasa_complaints;
create policy aasa_complaints_submit on public.aasa_complaints
for insert to authenticated
with check (
  submitted_by=(select auth.uid()) and status='SUBMITTED'
  and assigned_reviewer_id is null and decision is null
  and decision_recorded_by is null and decision_recorded_at is null
  and confidential=true
);

drop policy if exists aasa_complaint_appeals_read on public.aasa_complaint_appeals;
create policy aasa_complaint_appeals_read on public.aasa_complaint_appeals
for select to authenticated
using (
  submitted_by=(select auth.uid())
  or exists (select 1 from public.aasa_complaints c where c.id=complaint_id
    and (public.aasa_has_permission('complaints.review') or public.aasa_has_permission('complaints.manage')))
);
drop policy if exists aasa_complaint_appeals_submit on public.aasa_complaint_appeals;
create policy aasa_complaint_appeals_submit on public.aasa_complaint_appeals
for insert to authenticated
with check (
  submitted_by=(select auth.uid())
  and exists (select 1 from public.aasa_complaints c where c.id=complaint_id
    and c.submitted_by=(select auth.uid())
    and c.status in ('DECISION_RECORDED','RESOLVED','CLOSED'))
);
grant select,insert on public.aasa_complaint_appeals to authenticated;
revoke all on public.aasa_complaint_appeals from anon;

create or replace function public.aasa_audit_complaint_activity()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_actor uuid:=auth.uid(); v_action text; v_entity text; v_id text; v_details jsonb:='{}'::jsonb;
begin
 if tg_table_name='aasa_complaint_appeals' then
  v_entity:='complaint_appeal'; v_id:=new.id::text;
  if tg_op='INSERT' then
   v_action:='complaints.appeal_submitted';
   v_details:=jsonb_build_object('complaint_id',new.complaint_id,'status',new.status);
  else
   if old.status is distinct from new.status or old.outcome is distinct from new.outcome then
    v_action:='complaints.appeal_reviewed';
    v_details:=jsonb_build_object('complaint_id',new.complaint_id,'from',old.status,'to',new.status);
   else return new; end if;
  end if;
 else
  v_entity:='complaint'; v_id:=new.id::text;
  if tg_op='INSERT' then
   v_action:='complaints.submitted';
   v_details:=jsonb_build_object('case_ref',new.case_ref,'category',new.category,'priority',new.priority);
  else
   if old.assigned_reviewer_id is distinct from new.assigned_reviewer_id then
    v_action:='complaints.assigned'; v_details:=jsonb_build_object('assigned_reviewer_id',new.assigned_reviewer_id);
   elsif old.decision is distinct from new.decision then
    v_action:='complaints.decision_recorded'; v_details:=jsonb_build_object('status',new.status);
   elsif old.status is distinct from new.status then
    v_action:='complaints.status_changed'; v_details:=jsonb_build_object('from',old.status,'to',new.status);
   else return new; end if;
  end if;
 end if;
 insert into public.aasa_audit_log(actor_user_id,action_key,entity_type,entity_id,details)
 values(v_actor,v_action,v_entity,v_id,v_details);
 return new;
end; $$;
revoke all on function public.aasa_audit_complaint_activity() from public,anon,authenticated;
drop trigger if exists aasa_complaints_audit_activity on public.aasa_complaints;
create trigger aasa_complaints_audit_activity after insert or update on public.aasa_complaints
for each row execute function public.aasa_audit_complaint_activity();
drop trigger if exists aasa_complaint_appeals_audit_activity on public.aasa_complaint_appeals;
create trigger aasa_complaint_appeals_audit_activity after insert or update on public.aasa_complaint_appeals
for each row execute function public.aasa_audit_complaint_activity();

revoke update on public.aasa_complaints from authenticated;
revoke update on public.aasa_complaint_appeals from authenticated;

create or replace function public.aasa_assign_complaint_to_self(p_complaint_id uuid)
returns void language plpgsql security definer set search_path=''
as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if not (public.aasa_has_permission('complaints.review') or public.aasa_has_permission('complaints.manage')) then raise exception 'Complaint review permission required'; end if;
 update public.aasa_complaints set assigned_reviewer_id=auth.uid(),
  status=case when status='SUBMITTED' then 'UNDER_REVIEW' else status end,updated_at=now()
 where id=p_complaint_id and submitted_by<>auth.uid()
  and (assigned_reviewer_id is null or assigned_reviewer_id=auth.uid());
 if not found then raise exception 'Complaint is unavailable or assigned to another reviewer'; end if;
end; $$;

create or replace function public.aasa_record_complaint_decision(p_complaint_id uuid,p_decision text,p_status text default 'DECISION_RECORDED')
returns void language plpgsql security definer set search_path=''
as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if not (public.aasa_has_permission('complaints.review') or public.aasa_has_permission('complaints.manage')) then raise exception 'Complaint review permission required'; end if;
 if char_length(btrim(coalesce(p_decision,'')))<10 or char_length(p_decision)>12000 then raise exception 'Decision must be between 10 and 12000 characters'; end if;
 if p_status not in ('DECISION_RECORDED','RESOLVED','CLOSED','APPEAL') then raise exception 'Invalid decision status'; end if;
 update public.aasa_complaints set decision=btrim(p_decision),decision_recorded_by=auth.uid(),
  decision_recorded_at=now(),status=p_status,updated_at=now()
 where id=p_complaint_id and submitted_by<>auth.uid() and assigned_reviewer_id=auth.uid();
 if not found then raise exception 'Assign this complaint to yourself before recording a decision'; end if;
end; $$;

create or replace function public.aasa_review_complaint_appeal(p_appeal_id uuid,p_status text,p_outcome text)
returns void language plpgsql security definer set search_path=''
as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if not (public.aasa_has_permission('complaints.review') or public.aasa_has_permission('complaints.manage')) then raise exception 'Complaint review permission required'; end if;
 if p_status not in ('UNDER_REVIEW','UPHELD','REJECTED') then raise exception 'Invalid appeal status'; end if;
 if char_length(btrim(coalesce(p_outcome,'')))<10 or char_length(p_outcome)>12000 then raise exception 'Outcome must be between 10 and 12000 characters'; end if;
 update public.aasa_complaint_appeals set status=p_status,outcome=btrim(p_outcome),
  reviewer_id=coalesce(reviewer_id,auth.uid()),
  decided_by=case when p_status in ('UPHELD','REJECTED') then auth.uid() else decided_by end,
  decided_at=case when p_status in ('UPHELD','REJECTED') then now() else decided_at end,updated_at=now()
 where id=p_appeal_id and status in ('SUBMITTED','UNDER_REVIEW');
 if not found then raise exception 'Appeal not found or already decided'; end if;
end; $$;

revoke all on function public.aasa_assign_complaint_to_self(uuid) from public,anon;
revoke all on function public.aasa_record_complaint_decision(uuid,text,text) from public,anon;
revoke all on function public.aasa_review_complaint_appeal(uuid,text,text) from public,anon;
grant execute on function public.aasa_assign_complaint_to_self(uuid) to authenticated;
grant execute on function public.aasa_record_complaint_decision(uuid,text,text) to authenticated;
grant execute on function public.aasa_review_complaint_appeal(uuid,text,text) to authenticated;
