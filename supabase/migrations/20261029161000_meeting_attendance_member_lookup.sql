create or replace function public.aasa_list_members_for_meeting_attendance()
returns table(id uuid, full_name text, member_number text, status text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.aasa_has_permission('meetings.manage') then
    raise exception 'Meeting management permission required' using errcode = '42501';
  end if;
  return query
    select m.id, m.full_name, m.member_number, m.status
    from public.aasa_members m
    where m.status = 'active'
       or exists(select 1 from public.aasa_meeting_attendance a where a.member_id = m.id)
    order by m.full_name;
end;
$$;
revoke all on function public.aasa_list_members_for_meeting_attendance() from public;
grant execute on function public.aasa_list_members_for_meeting_attendance() to authenticated;
