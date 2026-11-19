-- Free, isolated PostgreSQL integration test for the Alumni follow-up migration.
-- Runs only inside the disposable GitHub Actions PostgreSQL service; never production.

create role anon;
create role authenticated;

create schema auth;
create function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  module_key text not null,
  action_key text not null,
  permission_key text not null unique,
  description text not null default ''
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  role_key text not null unique
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id),
  permission_id uuid not null references public.permissions(id),
  primary key (role_id, permission_id)
);

create table public.aasa_alumni_records (
  id uuid primary key default gen_random_uuid(),
  member_id uuid,
  created_by uuid,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

insert into public.roles (role_key) values ('association_admin');

\i supabase/migrations/20261118220000_complete_alumni_permissions_and_integrity.sql
-- A second application proves that the migration is idempotent.
\i supabase/migrations/20261118220000_complete_alumni_permissions_and_integrity.sql

do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.permissions
  where permission_key in ('alumni.read', 'alumni.manage');
  if v_count <> 2 then
    raise exception 'Expected both Alumni permissions, got %', v_count;
  end if;

  select count(*) into v_count
  from public.role_permissions rp
  join public.roles r on r.id = rp.role_id
  join public.permissions p on p.id = rp.permission_id
  where r.role_key = 'association_admin'
    and p.permission_key in ('alumni.read', 'alumni.manage');
  if v_count <> 2 then
    raise exception 'Association Administrator must receive both Alumni permissions; got %', v_count;
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'aasa_alumni_records_member_id_unique'
  ) then
    raise exception 'Unique member-link index was not created';
  end if;
end;
$$;

-- A simulated authenticated user cannot spoof audit identity on insert or update.
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);

do $$
declare
  v_id uuid;
  v_created_by uuid;
  v_updated_by uuid;
  v_first_updated_at timestamptz;
begin
  insert into public.aasa_alumni_records (member_id, created_by, updated_by)
  values (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222'
  )
  returning id into v_id;

  select created_by, updated_by, updated_at
  into v_created_by, v_updated_by, v_first_updated_at
  from public.aasa_alumni_records
  where id = v_id;

  if v_created_by <> '11111111-1111-4111-8111-111111111111'::uuid
     or v_updated_by <> '11111111-1111-4111-8111-111111111111'::uuid then
    raise exception 'Insert audit identity was not enforced';
  end if;

  perform pg_sleep(0.02);

  update public.aasa_alumni_records
  set created_by = '22222222-2222-4222-8222-222222222222',
      updated_by = '22222222-2222-4222-8222-222222222222',
      updated_at = '2000-01-01T00:00:00Z'
  where id = v_id;

  select created_by, updated_by, updated_at
  into v_created_by, v_updated_by, v_first_updated_at
  from public.aasa_alumni_records
  where id = v_id;

  if v_created_by <> '11111111-1111-4111-8111-111111111111'::uuid then
    raise exception 'An update changed the original created_by identity';
  end if;
  if v_updated_by <> '11111111-1111-4111-8111-111111111111'::uuid then
    raise exception 'An update spoofed updated_by';
  end if;
  if v_first_updated_at <= '2000-01-01T00:00:00Z'::timestamptz then
    raise exception 'updated_at was not refreshed by the trigger';
  end if;
end;
$$;

-- A second profile for the same member must be rejected by the unique index.
do $$
declare
  v_member_id uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
begin
  insert into public.aasa_alumni_records (member_id) values (v_member_id);
  begin
    insert into public.aasa_alumni_records (member_id) values (v_member_id);
    raise exception 'Duplicate alumni profile was unexpectedly accepted';
  exception
    when unique_violation then null;
  end;
end;
$$;

\echo Alumni migration integration checks passed.
