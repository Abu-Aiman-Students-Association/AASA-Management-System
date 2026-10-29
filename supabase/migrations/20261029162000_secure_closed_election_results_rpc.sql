create or replace function public.aasa_get_closed_election_results()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_result jsonb;
begin
  if auth.uid() is null or not public.aasa_has_permission('elections.results.review') then
    raise exception 'Election results review permission required' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'election_id', e.id,
    'title', e.title,
    'status', e.status,
    'opens_at', e.opens_at,
    'closes_at', e.closes_at,
    'certified_by', e.certified_by,
    'ballot_count', (select count(*) from public.aasa_secret_ballots b where b.election_id=e.id),
    'positions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position_id', p.id,
        'position_title', p.title,
        'candidates', coalesce((
          select jsonb_agg(jsonb_build_object(
            'candidate_id', c.id,
            'candidate_name', m.full_name,
            'member_number', m.member_number,
            'votes', (select count(*) from public.aasa_secret_ballots b where b.election_id=e.id and b.position_id=p.id and b.candidate_id=c.id)
          ) order by m.full_name)
          from public.aasa_election_candidates c
          join public.aasa_members m on m.id=c.member_id
          where c.election_id=e.id and c.position_id=p.id and c.status='approved'
        ), '[]'::jsonb)
      ) order by p.title)
      from public.aasa_positions p
      where exists(select 1 from public.aasa_election_candidates c where c.election_id=e.id and c.position_id=p.id and c.status='approved')
    ), '[]'::jsonb)
  ) order by e.closes_at desc), '[]'::jsonb)
  into v_result
  from public.aasa_elections e
  where e.status in ('closed','certified');
  return v_result;
end;
$$;
revoke all on function public.aasa_get_closed_election_results() from public;
grant execute on function public.aasa_get_closed_election_results() to authenticated;
