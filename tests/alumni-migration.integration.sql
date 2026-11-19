-- Free, isolated PostgreSQL integration test for the Alumni follow-up migration.
-- Runs only inside the disposable GitHub Actions PostgreSQL service; never production.

create role anon;
create role authenticated;
create role service_role;

create schema auth;
create table auth.users (id uuid primary key);
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

create function public.aasa_has_permission(text) returns boolean language sql stable as $perm$ select true $perm$;
create table public.aasa_projects (id uuid primary key default gen_random_uuid());
create table public.aasa_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id),
  channel text not null,
  title text not null,
  message text not null,
  delivery_status text not null,
  announcement_id uuid
);
create table public.aasa_alumni_records (
  id uuid primary key default gen_random_uuid(),
  member_id uuid,
  graduation_year integer,
  qualification text,
  institution text,
  location text,
  engagement_status text not null default 'active',
  created_by uuid,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

create table public.aasa_members (
  id uuid primary key,
  status text not null,
  is_test_record boolean not null default false,
  auth_user_id uuid references auth.users(id)
);
insert into public.aasa_members (id,status,is_test_record) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','active',false),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','active',false),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','pending',false),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','active',true);

insert into auth.users(id) values ('11111111-1111-4111-8111-111111111111');
insert into public.roles (role_key) values ('association_admin');

\i supabase/migrations/20261118220000_complete_alumni_permissions_and_integrity.sql
\i supabase/migrations/20261119090914_alumni_graduation_verification_and_active_member_link.sql
\i supabase/migrations/20261119110000_alumni_management_centre_operations.sql
\i supabase/migrations/20261119120000_alumni_targeted_communications.sql
-- Reapplying both migrations proves idempotency.
\i supabase/migrations/20261118220000_complete_alumni_permissions_and_integrity.sql
\i supabase/migrations/20261119090914_alumni_graduation_verification_and_active_member_link.sql
\i supabase/migrations/20261119110000_alumni_management_centre_operations.sql
\i supabase/migrations/20261119120000_alumni_targeted_communications.sql

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

-- Operational tables exist, have RLS enabled, and start empty.
do $alumni_test$
declare v_count integer; v_table text;
begin
  foreach v_table in array array[
    'aasa_alumni_education_history','aasa_alumni_employment_history','aasa_alumni_events',
    'aasa_alumni_event_registrations','aasa_alumni_chapters','aasa_alumni_chapter_members',
    'aasa_alumni_mentorships','aasa_alumni_mentorship_sessions','aasa_alumni_engagement_activities','aasa_alumni_activity_log'
  ] loop
    if to_regclass('public.' || v_table) is null then raise exception 'Missing Alumni operations table: %', v_table; end if;
    if not (select relrowsecurity from pg_class where oid=to_regclass('public.' || v_table)) then
      raise exception 'RLS is not enabled for %', v_table;
    end if;
  end loop;
  select count(*) into v_count from public.aasa_alumni_events;
  if v_count <> 0 then raise exception 'Migration must not create sample alumni events'; end if;
end;
$alumni_test$;

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

-- Pending and test members cannot be linked, even if a client bypasses the UI.
do $$
begin
  begin
    insert into public.aasa_alumni_records (member_id) values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
    raise exception 'Pending member was unexpectedly accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.aasa_alumni_records (member_id) values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
    raise exception 'Test member was unexpectedly accepted';
  exception when check_violation then null;
  end;
end;
$$;

-- Verified graduation cannot be set without evidence and reviewer audit fields.
do $$
begin
  begin
    update public.aasa_alumni_records
    set graduation_verification_status='verified'
    where member_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    raise exception 'Unsubstantiated graduation was unexpectedly verified';
  exception when check_violation then null;
  end;
end;
$$;

-- Rejection must remain possible when evidence is incomplete, with a recorded rationale.
update public.aasa_alumni_records
set graduation_verification_status = 'rejected',
    graduation_review_notes = 'Evidence reference missing; request a valid certificate record.'
where member_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

do $$
begin
  if not exists (
    select 1 from public.aasa_alumni_records
    where member_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      and graduation_verification_status = 'rejected'
      and graduation_review_notes is not null
      and graduation_verified_at is null
      and graduation_verified_by is null
  ) then
    raise exception 'Incomplete evidence could not be rejected with a review rationale';
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

-- Verified-alumni operational linkage and append-only audit behaviour.
do $alumni_operations_test$
declare
  v_alumni_id uuid;
  v_chapter_id uuid;
  v_audit_count integer;
  v_education_id uuid;
  v_mentorship_id uuid;
begin
  select id into v_alumni_id from public.aasa_alumni_records
  where member_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  insert into public.aasa_alumni_chapters(name,region,created_by)
  values ('Borno Alumni Chapter','Borno','11111111-1111-4111-8111-111111111111')
  returning id into v_chapter_id;

  begin
    insert into public.aasa_alumni_chapter_members(chapter_id,alumni_id,added_by)
    values (v_chapter_id,v_alumni_id,'11111111-1111-4111-8111-111111111111');
    raise exception 'Unverified alumni was unexpectedly admitted to a chapter';
  exception when check_violation then null;
  end;

  update public.aasa_alumni_records
  set graduation_year=2020,
      qualification='Bachelor degree',
      institution='AASA test university',
      graduation_evidence_reference='TEST-CERT-001',
      graduation_verification_status='verified',
      graduation_verified_at=now(),
      graduation_verified_by='11111111-1111-4111-8111-111111111111'
  where id=v_alumni_id;

  insert into public.aasa_alumni_chapter_members(chapter_id,alumni_id,added_by)
  values (v_chapter_id,v_alumni_id,'11111111-1111-4111-8111-111111111111');

  insert into public.aasa_alumni_education_history(alumni_id,institution,qualification,evidence_reference,created_by)
  values (v_alumni_id,'Verified university','BSc','EDU-CERT-01','11111111-1111-4111-8111-111111111111')
  returning id into v_education_id;
  update public.aasa_alumni_education_history
  set verification_status='verified',verified_at=now(),verified_by='11111111-1111-4111-8111-111111111111'
  where id=v_education_id;

  update public.aasa_alumni_education_history
  set verified_by='22222222-2222-4222-8222-222222222222'
  where id=v_education_id;
  if not exists (select 1 from public.aasa_alumni_education_history
    where id=v_education_id and verified_by='11111111-1111-4111-8111-111111111111') then
    raise exception 'Education verification reviewer identity could be spoofed';
  end if;

  begin
    insert into public.aasa_alumni_education_history(alumni_id,institution,qualification,verification_status,created_by)
    values (v_alumni_id,'Another university','Diploma','verified','11111111-1111-4111-8111-111111111111');
    raise exception 'Education record without evidence was unexpectedly verified';
  exception when check_violation then null;
  end;

  update public.aasa_alumni_records
  set graduation_year=2019,
      qualification='Diploma',
      institution='AASA test college',
      graduation_evidence_reference='TEST-CERT-002',
      graduation_verification_status='verified',
      graduation_verified_at=now(),
      graduation_verified_by='11111111-1111-4111-8111-111111111111'
  where member_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  -- Event capacity is enforced even when two different verified alumni are registered.
  insert into public.aasa_alumni_events(title,starts_at,capacity,created_by)
  values ('Test reunion',now()+interval '10 days',1,'11111111-1111-4111-8111-111111111111')
  returning id into v_chapter_id;
  insert into public.aasa_alumni_event_registrations(event_id,alumni_id,registered_by)
  values (v_chapter_id,v_alumni_id,'11111111-1111-4111-8111-111111111111');
  begin
    insert into public.aasa_alumni_event_registrations(event_id,alumni_id,registered_by)
    select v_chapter_id,id,'11111111-1111-4111-8111-111111111111'
    from public.aasa_alumni_records where member_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    raise exception 'Alumni event capacity was unexpectedly exceeded';
  exception when check_violation then null;
  end;

  update public.aasa_alumni_events set status='completed' where id=v_chapter_id;
  update public.aasa_alumni_event_registrations
  set registration_status='attended'
  where event_id=v_chapter_id and alumni_id=v_alumni_id;
  begin
    insert into public.aasa_alumni_event_registrations(event_id,alumni_id,registered_by)
    select v_chapter_id,id,'11111111-1111-4111-8111-111111111111'
    from public.aasa_alumni_records where member_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    raise exception 'Late registration after event completion was unexpectedly accepted';
  exception when check_violation then null;
  end;

  begin
    insert into public.aasa_alumni_mentorships(mentor_alumni_id,mentee_member_id,topic,created_by)
    values (v_alumni_id,'cccccccc-cccc-4ccc-8ccc-cccccccccccc','Career guidance','11111111-1111-4111-8111-111111111111');
    raise exception 'Inactive mentee was unexpectedly accepted';
  exception when check_violation then null;
  end;

  insert into public.aasa_alumni_mentorships(mentor_alumni_id,mentee_member_id,topic,status,created_by)
  values (v_alumni_id,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Career guidance','active','11111111-1111-4111-8111-111111111111')
  returning id into v_mentorship_id;
  insert into public.aasa_alumni_mentorship_sessions(mentorship_id,session_at,topic,duration_minutes,recorded_by)
  values (v_mentorship_id,now(),'CV and interview preparation',45,'11111111-1111-4111-8111-111111111111');

  select count(*) into v_audit_count from public.aasa_alumni_activity_log
  where entity_type in ('aasa_alumni_records','aasa_alumni_chapters','aasa_alumni_chapter_members');
  if v_audit_count < 3 then
    raise exception 'Alumni operational activity was not recorded in the audit log';
  end if;

  if has_table_privilege('anon','public.aasa_alumni_events','select') then
    raise exception 'Anonymous users must not read Alumni events';
  end if;
end;
$alumni_operations_test$;

-- Targeted Alumni announcements reach only active, verified and non-test alumni accounts.
do $alumni_comms_test$
declare
  v_result jsonb;
  v_count integer;
begin
  update public.aasa_members
  set auth_user_id='11111111-1111-4111-8111-111111111111'
  where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  select count(*) into v_count
  from public.aasa_alumni_records ar
  join public.aasa_members m on m.id=ar.member_id
  where ar.graduation_verification_status='verified'
    and ar.engagement_status='active'
    and m.status='active'
    and coalesce(m.is_test_record,false)=false
    and m.auth_user_id is not null;
  if v_count < 1 then raise exception 'Integration fixture did not create an eligible verified alumni recipient'; end if;

  v_result := public.aasa_publish_alumni_announcement(
    'Alumni test announcement','Test message for verified alumni','all_verified',null,null,null
  );
  select count(*) into v_count from public.aasa_notifications
  where alumni_announcement_id=(v_result->>'announcement_id')::uuid
    and recipient_user_id='11111111-1111-4111-8111-111111111111'
    and channel='IN_APP' and delivery_status='DELIVERED';
  if v_count <> 1 then raise exception 'Targeted alumni announcement was not delivered in-app'; end if;
end;
$alumni_comms_test$;



\echo Alumni migration integration checks passed.
