-- Alumni graduation evidence and verified active-member linkage.
-- Additive migration: existing membership data is never modified.

alter table public.aasa_alumni_records
  add column if not exists graduation_evidence_reference text,
  add column if not exists graduation_verification_status text not null default 'pending',
  add column if not exists graduation_verified_at timestamptz,
  add column if not exists graduation_verified_by uuid,
  add column if not exists graduation_review_notes text;

alter table public.aasa_alumni_records
  alter column member_id set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.aasa_alumni_records'::regclass and conname='aasa_alumni_graduation_status_check') then
    alter table public.aasa_alumni_records
      add constraint aasa_alumni_graduation_status_check
      check (graduation_verification_status in ('pending','verified','rejected'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.aasa_alumni_records'::regclass and conname='aasa_alumni_verified_evidence_check') then
    alter table public.aasa_alumni_records
      add constraint aasa_alumni_verified_evidence_check
      check (
        graduation_verification_status <> 'verified'
        or (
          graduation_year is not null
          and graduation_year >= 1900
          and qualification is not null and length(btrim(qualification)) > 0
          and institution is not null and length(btrim(institution)) > 0
          and graduation_evidence_reference is not null and length(btrim(graduation_evidence_reference)) > 0
          and graduation_verified_at is not null
          and graduation_verified_by is not null
        )
      );
  end if;
end $$;

-- Enforce the same rule at the database boundary, not only in the UI.
create or replace function public.aasa_require_active_alumni_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.aasa_members m
    where m.id = new.member_id
      and m.status = 'active'
      and coalesce(m.is_test_record, false) = false
  ) then
    raise exception 'Alumni records can only link to an active, non-test AASA member'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists aasa_alumni_require_active_member on public.aasa_alumni_records;
create trigger aasa_alumni_require_active_member
before insert or update of member_id on public.aasa_alumni_records
for each row execute function public.aasa_require_active_alumni_member();

revoke all on function public.aasa_require_active_alumni_member() from public, anon, authenticated;
