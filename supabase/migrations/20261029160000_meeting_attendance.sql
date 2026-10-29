-- AASA meeting attendance register. No sample attendance rows are inserted.
create table if not exists public.aasa_meeting_attendance (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.aasa_meetings(id) on delete cascade,
  member_id uuid not null references public.aasa_members(id) on delete restrict,
  attendance_status text not null default 'invited' check (attendance_status in ('invited','present','absent','excused')),
  note text,
  recorded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint aasa_meeting_attendance_meeting_member_key unique(meeting_id, member_id),
  constraint aasa_meeting_attendance_note_length check (note is null or length(note) <= 1000)
);
create index if not exists aasa_meeting_attendance_meeting_idx on public.aasa_meeting_attendance(meeting_id);
create index if not exists aasa_meeting_attendance_member_idx on public.aasa_meeting_attendance(member_id);
alter table public.aasa_meeting_attendance enable row level security;
grant select, insert, update on public.aasa_meeting_attendance to authenticated;
revoke all on public.aasa_meeting_attendance from anon;
drop policy if exists aasa_meeting_attendance_read_permission on public.aasa_meeting_attendance;
create policy aasa_meeting_attendance_read_permission on public.aasa_meeting_attendance for select to authenticated using (public.aasa_has_permission('meetings.manage'));
drop policy if exists aasa_meeting_attendance_create_permission on public.aasa_meeting_attendance;
create policy aasa_meeting_attendance_create_permission on public.aasa_meeting_attendance for insert to authenticated with check (public.aasa_has_permission('meetings.manage') and recorded_by = auth.uid());
drop policy if exists aasa_meeting_attendance_update_permission on public.aasa_meeting_attendance;
create policy aasa_meeting_attendance_update_permission on public.aasa_meeting_attendance for update to authenticated using (public.aasa_has_permission('meetings.manage')) with check (public.aasa_has_permission('meetings.manage'));
drop policy if exists aasa_meeting_attendance_delete_super_admin_only on public.aasa_meeting_attendance;
create policy aasa_meeting_attendance_delete_super_admin_only on public.aasa_meeting_attendance for delete to authenticated using (public.aasa_has_permission('platform.super_admin.bootstrap'));
drop trigger if exists aasa_meeting_attendance_audit on public.aasa_meeting_attendance;
create trigger aasa_meeting_attendance_audit after insert or update or delete on public.aasa_meeting_attendance for each row execute function public.aasa_write_audit_log();
