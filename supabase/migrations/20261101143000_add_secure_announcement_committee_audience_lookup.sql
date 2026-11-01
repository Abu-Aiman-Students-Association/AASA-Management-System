create or replace function public.aasa_list_announcement_committees()
returns table(id uuid,name text)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null or not public.aasa_has_permission('announcements.publish') then
    raise exception 'Not authorised to list announcement audiences';
  end if;
  return query
  select c.id,c.name
  from public.aasa_committees c
  where c.status = 'active'
  order by c.name;
end;
$function$;
revoke all on function public.aasa_list_announcement_committees() from public, anon;
grant execute on function public.aasa_list_announcement_committees() to authenticated;
