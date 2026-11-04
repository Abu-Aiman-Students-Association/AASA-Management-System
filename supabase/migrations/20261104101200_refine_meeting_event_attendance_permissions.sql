drop policy if exists "aasa_meetings_read_permission" on public.aasa_meetings;
create policy "aasa_meetings_read_permission"
on public.aasa_meetings
for select
to authenticated
using (
  public.aasa_has_permission('meetings.manage')
  or (meeting_type='event' and public.aasa_has_permission('events.manage'))
  or public.aasa_has_permission('attendance.record')
);

drop policy if exists "aasa_meetings_create_permission" on public.aasa_meetings;
create policy "aasa_meetings_create_permission"
on public.aasa_meetings
for insert
to authenticated
with check (
  (
    (meeting_type='event' and public.aasa_has_permission('events.manage'))
    or (meeting_type<>'event' and public.aasa_has_permission('meetings.manage'))
  )
  and created_by=auth.uid()
);

drop policy if exists "aasa_meetings_update_permission" on public.aasa_meetings;
create policy "aasa_meetings_update_permission"
on public.aasa_meetings
for update
to authenticated
using (
  (meeting_type='event' and public.aasa_has_permission('events.manage'))
  or (meeting_type<>'event' and public.aasa_has_permission('meetings.manage'))
)
with check (
  (meeting_type='event' and public.aasa_has_permission('events.manage'))
  or (meeting_type<>'event' and public.aasa_has_permission('meetings.manage'))
);

drop policy if exists "aasa_meeting_attendance_read_permission" on public.aasa_meeting_attendance;
create policy "aasa_meeting_attendance_read_permission"
on public.aasa_meeting_attendance
for select
to authenticated
using (
  public.aasa_has_permission('meetings.manage')
  or public.aasa_has_permission('attendance.record')
);

drop policy if exists "aasa_meeting_attendance_create_permission" on public.aasa_meeting_attendance;
create policy "aasa_meeting_attendance_create_permission"
on public.aasa_meeting_attendance
for insert
to authenticated
with check (
  (
    public.aasa_has_permission('meetings.manage')
    or public.aasa_has_permission('attendance.record')
  )
  and recorded_by=auth.uid()
);

drop policy if exists "aasa_meeting_attendance_update_permission" on public.aasa_meeting_attendance;
create policy "aasa_meeting_attendance_update_permission"
on public.aasa_meeting_attendance
for update
to authenticated
using (
  public.aasa_has_permission('meetings.manage')
  or public.aasa_has_permission('attendance.record')
)
with check (
  public.aasa_has_permission('meetings.manage')
  or public.aasa_has_permission('attendance.record')
);

create or replace function public.aasa_list_members_for_meeting_attendance()
returns table(id uuid, full_name text, member_number text, status text)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null
     or not (
       public.aasa_has_permission('meetings.manage')
       or public.aasa_has_permission('attendance.record')
     ) then
    raise exception 'Meeting attendance permission required' using errcode='42501';
  end if;

  return query
    select m.id,m.full_name,m.member_number,m.status
    from public.aasa_members m
    where m.status='active'
       or exists (
         select 1 from public.aasa_meeting_attendance a
         where a.member_id=m.id
       )
    order by m.full_name;
end;
$function$;

revoke all on function public.aasa_list_members_for_meeting_attendance() from public, anon, authenticated;
grant execute on function public.aasa_list_members_for_meeting_attendance() to authenticated;
