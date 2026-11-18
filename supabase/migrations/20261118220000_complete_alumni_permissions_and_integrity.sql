-- Complete Alumni Management role access and record integrity.
-- Idempotent and safe to apply after the original alumni foundation migration.
-- No association or membership records are inserted or modified.

insert into public.permissions (module_key, action_key, permission_key, description)
values
  ('alumni', 'read', 'alumni.read', 'Read alumni records'),
  ('alumni', 'manage', 'alumni.manage', 'Create and manage alumni records')
on conflict (permission_key) do update
set module_key = excluded.module_key,
    action_key = excluded.action_key,
    description = excluded.description;

-- Association Administrators are responsible for association-wide member services.
-- Super Admin is handled by the existing aasa_has_permission() system-role rule.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p
  on p.permission_key in ('alumni.read', 'alumni.manage')
where r.role_key = 'association_admin'
on conflict (role_id, permission_id) do nothing;

-- One alumni profile per original membership identity.
-- Existing production currently has zero alumni rows; this index also prevents
-- duplicate profiles if two administrators submit the same member concurrently.
create unique index if not exists aasa_alumni_records_member_id_unique
  on public.aasa_alumni_records (member_id)
  where member_id is not null;

-- Keep updated_at accurate for every permitted edit.
create or replace function public.aasa_set_alumni_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists aasa_alumni_records_set_updated_at
  on public.aasa_alumni_records;

create trigger aasa_alumni_records_set_updated_at
before update on public.aasa_alumni_records
for each row execute function public.aasa_set_alumni_updated_at();

revoke all on function public.aasa_set_alumni_updated_at() from public, anon, authenticated;
