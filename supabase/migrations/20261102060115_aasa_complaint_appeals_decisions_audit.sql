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
drop policy if exists aasa_complaint_appeals_read on public.aasa_complaint_appeals;
create policy aasa_complaint_appeals_read on public.aasa_complaint_appeals
for select to authenticated using (
  submitted_by = (select auth.uid())
  or exists (select 1 from public.aasa_complaints c where c.id = complaint_id
    and (public.aasa_has_permission('complaints.review') or public.aasa_has_permission('complaints.manage')))
);
drop policy if exists aasa_complaint_appeals_submit on public.aasa_complaint_appeals;
create policy aasa_complaint_appeals_submit on public.aasa_complaint_appeals
for insert to authenticated with check (
  submitted_by = (select auth.uid())
  and exists (select 1 from public.aasa_complaints c where c.id = complaint_id
    and c.submitted_by = (select auth.uid())
    and c.status in ('DECISION_RECORDED','RESOLVED','CLOSED'))
);
grant select, insert on public.aasa_complaint_appeals to authenticated;
revoke all on public.aasa_complaint_appeals from anon;

create or replace function public.aasa_audit_complaint_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_action text; v_entity text; v_id text; v_details jsonb := '{}'::jsonb;
begin
  if tg_table_name = 'aasa_complaint_appeals' then
    v_action := 'complaints.appeal_submitted'; v_entity := 'complaint_appeal'; v_id := new.id::text;
    v_details := jsonb_build_object('complaint_id', new.complaint_id, 'status', new.status);
  else
    v_entity := 'complaint'; v_id := new.id::text;
    if tg_op = 'INSERT' then
      v_action := 'complaints.submitted';
      v_details := jsonb_build_object('case_ref', new.case_ref, 'category', new.category, 'priority', new.priority);
    else
      if old.assigned_reviewer_id is distinct from new.assigned_reviewer_id then
        v_action := 'complaints.assigned'; v_details := jsonb_build_object('assigned_reviewer_id', new.assigned_reviewer_id);
      elsif old.decision is distinct from new.decision then
        v_action := 'complaints.decision_recorded'; v_details := jsonb_build_object('status', new.status);
      elsif old.status is distinct from new.status then
        v_action := 'complaints.status_changed'; v_details := jsonb_build_object('from', old.status, 'to', new.status);
      else return new;
      end if;
    end if;
  end if;
  insert into public.aasa_audit_log(actor_user_id, action_key, entity_type, entity_id, details)
  values (v_actor, v_action, v_entity, v_id, v_details);
  return new;
end; $$;
revoke all on function public.aasa_audit_complaint_activity() from public, anon, authenticated;
drop trigger if exists aasa_complaints_audit_activity on public.aasa_complaints;
create trigger aasa_complaints_audit_activity after insert or update on public.aasa_complaints
for each row execute function public.aasa_audit_complaint_activity();
drop trigger if exists aasa_complaint_appeals_audit_activity on public.aasa_complaint_appeals;
create trigger aasa_complaint_appeals_audit_activity after insert on public.aasa_complaint_appeals
for each row execute function public.aasa_audit_complaint_activity();
